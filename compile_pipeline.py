#!/usr/bin/env python3
"""
compile_pipeline.py — Timeline Enrichment Compiler
====================================================
Transforms a raw AI-generated video_spec.json into a production-ready
render_props.json payload for the Remotion + Three.js 3D canvas.

Pipeline steps:
  1. Load & validate the raw video_spec.json
  2. For each timeline scene, measure audio duration via ffprobe
  3. Convert duration → exact frame counts at 30 FPS
  4. Validate / fallback characterState.pose against allowed GLTF animations
  5. Aggregate global metadata (totalFrames, totalDurationSeconds, fps)
  6. Write enriched payload to ./dist/render_props.json

Usage:
    python compile_pipeline.py                          # uses default paths
    python compile_pipeline.py --input path/to/spec.json --output path/to/out.json
"""

import json
import os
import subprocess
import sys
import argparse
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FPS: int = 30

# Canonical set of baked GLTF animations shipped with Kenney's Cube Pets.
# Any pose not in this set will be silently degraded to the fallback.
ALLOWED_POSES: list[str] = ["idle", "waving", "carrying", "excited", "jumping", "dance", "eat", "gesture-positive", "gesture-negative"]
FALLBACK_POSE: str = "idle"

# Project-relative paths (resolved from the directory this script lives in)
SCRIPT_DIR   = Path(__file__).resolve().parent
PUBLIC_DIR   = SCRIPT_DIR / "public"
DIST_DIR     = SCRIPT_DIR / "dist"
DEFAULT_INPUT  = SCRIPT_DIR / "video_spec.json"
DEFAULT_OUTPUT = DIST_DIR   / "render_props.json"


# ---------------------------------------------------------------------------
# Audio helpers
# ---------------------------------------------------------------------------

def probe_audio_duration(audio_path: Path) -> float:
    """
    Use ffprobe to return the exact duration (seconds) of an audio file.

    Returns a float >= 0.0, or raises RuntimeError if measurement fails.
    We deliberately do NOT silence subprocess stderr so that genuine
    ffprobe errors surface during development; set capture_output=True
    on both streams if you need fully silent CI output.
    """
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio asset not found: {audio_path}")

    cmd = [
        "ffprobe",
        "-v", "error",                     # suppress all non-error output
        "-show_entries", "format=duration", # ask only for container duration
        "-of", "default=noprint_wrappers=1:nokey=1",  # bare float output
        str(audio_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,          # seconds — avoids hanging on corrupt files
            check=True,          # raises CalledProcessError on non-zero exit
        )
    except FileNotFoundError:
        raise RuntimeError(
            "ffprobe not found. Install FFmpeg (https://ffmpeg.org/download.html) "
            "and ensure it is on your PATH."
        )
    except subprocess.CalledProcessError as exc:
        stderr_text = exc.stderr.decode(errors="replace").strip()
        raise RuntimeError(
            f"ffprobe failed for '{audio_path}': {stderr_text}"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"ffprobe timed out processing '{audio_path}'")

    raw = result.stdout.decode().strip()
    if not raw:
        raise RuntimeError(
            f"ffprobe returned no duration for '{audio_path}'. "
            "The file may be empty or use an unsupported container."
        )

    try:
        return float(raw)
    except ValueError:
        raise RuntimeError(
            f"ffprobe returned a non-numeric duration '{raw}' for '{audio_path}'"
        )


def duration_to_frames(seconds: float, fps: int = FPS) -> int:
    """Convert a duration in seconds to an integer frame count at *fps*."""
    return int(round(seconds * fps))


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validate_pose(pose: str, step_id: str) -> str:
    """
    Return *pose* if it is in ALLOWED_POSES, otherwise log a warning and
    return FALLBACK_POSE.  The original value is preserved in a companion
    field (`originalPose`) so downstream tooling can audit the fallback.
    """
    if pose in ALLOWED_POSES:
        return pose

    print(
        f"  [WARN] stepId='{step_id}': pose '{pose}' is not a recognised "
        f"GLTF animation. Falling back to '{FALLBACK_POSE}'."
    )
    return FALLBACK_POSE


def validate_required_fields(spec: dict) -> None:
    """
    Lightweight structural validation of the raw spec dict.
    Raises ValueError with a descriptive message on the first violation found.
    """
    if "meta" not in spec:
        raise ValueError("video_spec is missing the top-level 'meta' object.")
    if "timeline" not in spec:
        raise ValueError("video_spec is missing the top-level 'timeline' array.")
    if not isinstance(spec["timeline"], list):
        raise ValueError("'timeline' must be an array.")
    if len(spec["timeline"]) == 0:
        raise ValueError("'timeline' must contain at least one scene block.")

    required_meta_keys = {"videoId", "targetAge", "hostCharacter"}
    missing = required_meta_keys - set(spec["meta"].keys())
    if missing:
        raise ValueError(f"'meta' is missing required keys: {missing}")

    for i, scene in enumerate(spec["timeline"]):
        ctx = f"timeline[{i}]"
        for key in ("stepId", "audioFile", "characterState"):
            if key not in scene:
                raise ValueError(f"{ctx} is missing required key '{key}'.")
        if "pose" not in scene["characterState"]:
            raise ValueError(f"{ctx}.characterState is missing 'pose'.")


# ---------------------------------------------------------------------------
# Core enrichment logic
# ---------------------------------------------------------------------------

def enrich_scene(scene: dict, public_dir: Path) -> dict:
    """
    Enrich a single timeline scene block with frame-timing data and
    validated character state.  Returns a *new* dict (original is untouched).

    Fields added / mutated:
      - characterState.pose          validated (or fallback) pose string
      - characterState.originalPose  present only when a fallback occurred
      - durationSeconds              float — measured audio duration
      - durationInFrames             int   — frames at FPS
      - startFrame                   int   — set to 0 here; caller must patch
      - fps                          int   — FPS constant for downstream use
      - audioError                   str   — present only when audio probe fails
    """
    step_id   = scene.get("stepId", "unknown")
    enriched  = json.loads(json.dumps(scene))  # deep copy without extra deps

    # ── Pose validation ────────────────────────────────────────────────────
    raw_pose      = enriched["characterState"]["pose"]
    validated     = validate_pose(raw_pose, step_id)
    enriched["characterState"]["pose"] = validated
    if validated != raw_pose:
        enriched["characterState"]["originalPose"] = raw_pose

    # ── Audio measurement ──────────────────────────────────────────────────
    # audioFile paths in the spec are relative to ./public/
    relative_audio = enriched["audioFile"].lstrip("/")    # normalise any leading slash
    # Strip a leading "assets/" if the spec already prefixes it, then resolve
    # against public_dir so we look in ./public/assets/audio/…
    audio_path = public_dir / relative_audio

    try:
        duration_secs  = probe_audio_duration(audio_path)
        duration_frames = duration_to_frames(duration_secs)
        print(
            f"  [OK]   stepId='{step_id}': "
            f"{duration_secs:.3f}s -> {duration_frames} frames  ({audio_path.name})"
        )
    except (FileNotFoundError, RuntimeError) as exc:
        # Graceful degradation: mark the scene as errored but keep compiling.
        # A zero-duration placeholder lets Remotion skip the scene rather than crash.
        print(f"  [ERR]  stepId='{step_id}': {exc}")
        duration_secs   = 0.0
        duration_frames = 0
        enriched["audioError"] = str(exc)

    enriched["durationSeconds"]   = round(duration_secs, 6)
    enriched["durationInFrames"]  = duration_frames
    enriched["startFrame"]        = 0   # patched in the next pass (see below)
    enriched["fps"]               = FPS

    return enriched


def assign_start_frames(enriched_timeline: list[dict]) -> list[dict]:
    """
    Walk the already-enriched timeline and stamp each scene with an absolute
    startFrame offset so Remotion can seek to any scene without summing frames.
    """
    cursor = 0
    for scene in enriched_timeline:
        scene["startFrame"] = cursor
        cursor += scene["durationInFrames"]
    return enriched_timeline


def compile(input_path: Path, output_path: Path) -> None:
    """
    Main orchestration function.

    1. Load raw spec
    2. Validate structure
    3. Enrich each scene
    4. Assign absolute start frames
    5. Inject global metadata
    6. Write output
    """
    print(f"\n{'='*60}")
    print(f"  Remotion Pipeline Compiler — v1.0")
    print(f"{'='*60}")
    print(f"  Input  : {input_path}")
    print(f"  Output : {output_path}")
    print(f"  FPS    : {FPS}")
    print(f"  Public : {PUBLIC_DIR}")
    print(f"{'='*60}\n")

    # ── Step 1: Load ───────────────────────────────────────────────────────
    try:
        raw_text = input_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"[FATAL] Input file not found: {input_path}")
        sys.exit(1)
    except OSError as exc:
        print(f"[FATAL] Cannot read input file: {exc}")
        sys.exit(1)

    try:
        spec = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        print(f"[FATAL] Input is not valid JSON: {exc}")
        sys.exit(1)

    # ── Step 2: Structural validation ─────────────────────────────────────
    try:
        validate_required_fields(spec)
    except ValueError as exc:
        print(f"[FATAL] Schema validation failed: {exc}")
        sys.exit(1)

    print(f"Loaded spec: videoId='{spec['meta']['videoId']}'  "
          f"scenes={len(spec['timeline'])}\n")

    # ── Step 3: Enrich each scene ──────────────────────────────────────────
    print("Probing audio and enriching timeline scenes:")
    enriched_timeline = [
        enrich_scene(scene, PUBLIC_DIR)
        for scene in spec["timeline"]
    ]

    # ── Step 4: Assign absolute start frames ──────────────────────────────
    enriched_timeline = assign_start_frames(enriched_timeline)

    # ── Step 5: Aggregate global metadata ─────────────────────────────────
    total_frames   = sum(s["durationInFrames"] for s in enriched_timeline)
    total_seconds  = round(total_frames / FPS, 6)
    errored_scenes = [s["stepId"] for s in enriched_timeline if "audioError" in s]

    meta = {
        **spec["meta"],                     # preserve all original meta fields
        "fps":                  FPS,
        "totalFrames":          total_frames,
        "totalDurationSeconds": total_seconds,
        "sceneCount":           len(enriched_timeline),
        "compiledAt":           _utc_iso(),
        "allowedPoses":         ALLOWED_POSES,
    }

    if errored_scenes:
        meta["audioErrors"] = errored_scenes
        print(
            f"\n  [WARN] {len(errored_scenes)} scene(s) had audio probe errors "
            f"and will render with 0-frame duration: {errored_scenes}"
        )

    render_props = {
        "meta":     meta,
        "timeline": enriched_timeline,
    }

    # ── Step 6: Write output ───────────────────────────────────────────────
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        output_path.write_text(
            json.dumps(render_props, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    except OSError as exc:
        print(f"\n[FATAL] Cannot write output file: {exc}")
        sys.exit(1)

    # ── Summary ────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  Compilation complete")
    print(f"  Total frames  : {total_frames}")
    print(f"  Total duration: {total_seconds:.2f}s  "
          f"({int(total_seconds // 60)}m {total_seconds % 60:.1f}s)")
    print(f"  Output written: {output_path}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Tiny utility — ISO-8601 timestamp without non-stdlib deps
# ---------------------------------------------------------------------------

def _utc_iso() -> str:
    """Return the current UTC time as an ISO-8601 string (no tzinfo dep)."""
    import datetime
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Remotion timeline enrichment compiler — "
                    "converts a raw video_spec.json to a frame-timed render_props.json.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--input", "-i",
        type=Path,
        default=DEFAULT_INPUT,
        metavar="PATH",
        help=f"Path to the raw video_spec.json  (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=DEFAULT_OUTPUT,
        metavar="PATH",
        help=f"Destination path for render_props.json  (default: {DEFAULT_OUTPUT})",
    )
    return parser


if __name__ == "__main__":
    args = _build_arg_parser().parse_args()
    compile(
        input_path  = args.input.resolve(),
        output_path = args.output.resolve(),
    )
