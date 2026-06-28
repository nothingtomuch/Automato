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
import shutil
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FPS: int = 30

# Canonical set of baked GLTF animations shipped with Kenney's Cube Pets.
# Any pose not in this set will be silently degraded to the fallback.
ALLOWED_POSES: list[str] = ["idle", "static", "walk", "run", "dance", "eat", "gesture-positive", "gesture-negative"]
FALLBACK_POSE: str = "idle"

# Project-relative paths (resolved from the directory this script lives in)
SCRIPT_DIR   = Path(__file__).resolve().parent
PUBLIC_DIR   = SCRIPT_DIR / "public"
DIST_DIR     = SCRIPT_DIR / "dist"
DEFAULT_INPUT  = SCRIPT_DIR / "video_spec.json"
DEFAULT_OUTPUT = DIST_DIR   / "render_props.json"
PROJECTS_DIR   = SCRIPT_DIR / "projects"


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


def compile_actions_to_keyframes(actions: list, fps: int, current_state: dict) -> list:
    """
    Convert declarative Glide/Wait actions into absolute frame-based keyframes
    that the Remotion 3D canvas can interpolate.
    """
    current_time = 0.0
    keyframes = []

    for action in actions:
        action_type = action.get("type")
        if action_type == "wait":
            current_time += action.get("duration", 0)
        elif action_type == "glide":
            keyframes.append({"frame": round(current_time * fps), **current_state})
            target = action.get("targetState", {})
            current_state.update(target)
            current_time += action.get("duration", 1)
            keyframes.append({"frame": round(current_time * fps), **current_state})

    if not keyframes:
        keyframes.append({"frame": 0, **current_state})
    elif keyframes[0]["frame"] > 0:
        keyframes.insert(0, {"frame": 0, **current_state})

    return keyframes


def compile_grid_actions_to_sprites(grid_actions: list, fps: int) -> list:
    """
    Convert declarative grid Init/Add/Destroy actions into absolute pixel-based
    sprite keyframes for the Remotion 2D overlay layer.
    """
    current_time = 0.0
    sprite_map = {}
    grid_state = {}

    for action in grid_actions:
        action_type = action.get("type")
        if action_type == "wait":
            current_time += action.get("duration", 0)
        elif action_type == "grid_init":
            gid = action["gridId"]
            grid_state[gid] = {
                "count": 0, "src": action["src"],
                "startX": action["startX"], "startY": action["startY"],
                "spacingX": action["spacingX"]
            }
            for i in range(action.get("initialCount", 0)):
                grid_state[gid]["count"] += 1
                sid = f"{gid}_{grid_state[gid]['count']}"
                x_pos = action["startX"] + i * action["spacingX"]
                sprite_map[sid] = {
                    "src": action["src"],
                    "state": {"x": x_pos, "y": action["startY"], "scale": 0.5, "opacity": 1, "rotationZ": 0},
                    "keyframes": [
                        {"frame": 0, "x": x_pos, "y": action["startY"], "scale": 0.5, "opacity": 0, "rotationZ": 0},
                        {"frame": max(1, round(current_time * fps)), "x": x_pos, "y": action["startY"], "scale": 0.5, "opacity": 1, "rotationZ": 0}
                    ]
                }
        elif action_type == "grid_add":
            gid = action["gridId"]
            grid = grid_state.get(gid)
            if grid:
                for i in range(action.get("count", 1)):
                    grid["count"] += 1
                    sid = f"{gid}_{grid['count']}"
                    x_pos = grid["startX"] + (grid["count"] - 1) * grid["spacingX"]
                    start_frame = round(current_time * fps)
                    sprite_map[sid] = {
                        "src": grid["src"],
                        "state": {"x": x_pos, "y": grid["startY"], "scale": 0.5, "opacity": 1, "rotationZ": 0},
                        "keyframes": [
                            {"frame": 0, "x": x_pos, "y": grid["startY"], "scale": 0.5, "opacity": 0, "rotationZ": 0},
                            {"frame": start_frame, "x": x_pos, "y": grid["startY"], "scale": 0.5, "opacity": 0, "rotationZ": 0},
                            {"frame": start_frame + fps, "x": x_pos, "y": grid["startY"], "scale": 0.5, "opacity": 1, "rotationZ": 0}
                        ]
                    }
                current_time += 1
        elif action_type == "grid_destroy":
            gid = action["gridId"]
            idx = action["index"]
            sid = f"{gid}_{idx}"
            sprite = sprite_map.get(sid)
            if sprite:
                start_frame = round(current_time * fps)
                sprite["keyframes"].append({"frame": start_frame, **sprite["state"]})
                sprite["state"]["opacity"] = 0
                sprite["state"]["scale"] = 0.1
                sprite["keyframes"].append({"frame": start_frame + fps, **sprite["state"]})
                current_time += 1

    return [
        {"id": sid, "src": data["src"], "keyframes": data["keyframes"]}
        for sid, data in sprite_map.items()
    ]


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

def enrich_scene(scene: dict, public_dir: Path, char_state_tracker: dict) -> dict:
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

    # ── Compile declarative actions -> keyframes (new format) ─────────────────
    char_state = enriched["characterState"]
    if "actions" in char_state and isinstance(char_state["actions"], list):
        print(f"  [COMPILE] stepId='{step_id}': Compiling {len(char_state['actions'])} character actions to keyframes.")
        char_state["keyframes"] = compile_actions_to_keyframes(char_state["actions"], FPS, char_state_tracker)
        del char_state["actions"]

    # ── Compile declarative gridActions -> sprites (new format) ───────────────
    if "gridActions" in enriched and isinstance(enriched["gridActions"], list):
        print(f"  [COMPILE] stepId='{step_id}': Compiling {len(enriched['gridActions'])} grid actions to sprites.")
        compiled_sprites = compile_grid_actions_to_sprites(enriched["gridActions"], FPS)
        if compiled_sprites:
            # Merge with any manually-specified sprites
            existing = enriched.get("sprites", [])
            enriched["sprites"] = existing + compiled_sprites
        del enriched["gridActions"]

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


def compile(input_path: Path, output_path: Path, public_dir: Path = PUBLIC_DIR) -> None:
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
    print(f"  Public : {public_dir}")
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

    # ── Step 1.5: Handle Includes ──────────────────────────────────────────
    includes = spec.get("includes", [])
    if "timeline" not in spec:
        spec["timeline"] = []
        
    for inc_file in includes:
        inc_path = input_path.parent / inc_file
        try:
            inc_text = inc_path.read_text(encoding="utf-8")
            inc_spec = json.loads(inc_text)
            if "timeline" in inc_spec and isinstance(inc_spec["timeline"], list):
                spec["timeline"].extend(inc_spec["timeline"])
            else:
                print(f"[WARN] Included file '{inc_file}' is missing a 'timeline' array.")
        except FileNotFoundError:
            print(f"[FATAL] Included file not found: {inc_path}")
            sys.exit(1)
        except json.JSONDecodeError as exc:
            print(f"[FATAL] Included file '{inc_file}' is not valid JSON: {exc}")
            sys.exit(1)
        except OSError as exc:
            print(f"[FATAL] Cannot read included file '{inc_file}': {exc}")
            sys.exit(1)

    # ── Step 2: Structural validation ─────────────────────────────────────
    try:
        validate_required_fields(spec)
    except ValueError as exc:
        print(f"[FATAL] Schema validation failed: {exc}")
        sys.exit(1)

    print(f"Loaded spec: videoId='{spec['meta']['videoId']}'  "
          f"scenes={len(spec['timeline'])}\n")

    # ── Step 2.5: Mirror assets to global public dir ───────────────────────
    # Remotion is very stubborn about its public directory. To ensure it
    # always sees the right files, we copy the project's public/ folder
    # into the global Automato/public/ folder on every compile.
    if public_dir != PUBLIC_DIR:
        print(f"Mirroring assets from {public_dir} -> {PUBLIC_DIR}")
        os.makedirs(PUBLIC_DIR, exist_ok=True)
        for item in public_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, PUBLIC_DIR / item.name)

    # ── Step 3: Enrich each scene ──────────────────────────────────────────
    print("Probing audio and enriching timeline scenes:")
    
    # Global state tracker so the character doesn't snap back to start every scene
    char_state_tracker = {"x": -15, "y": -1, "scale": 1.2, "opacity": 1, "rotationZ": 0, "rotationY": 0, "rotationX": 0}
    
    enriched_timeline = [
        enrich_scene(scene, public_dir, char_state_tracker)
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
        default=None,
        metavar="PATH",
        help="Path to video_spec.json (overrides --project)",
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=DEFAULT_OUTPUT,
        metavar="PATH",
        help=f"Destination path for render_props.json  (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--project", "-p",
        type=Path,
        default=None,
        metavar="PROJECT_ROOT",
        help="Absolute path to a project folder (e.g. projects/my_video). "
             "Sets --input to <PROJECT_ROOT>/video_spec.json and public dir to <PROJECT_ROOT>/public/.",
    )
    return parser


if __name__ == "__main__":
    args = _build_arg_parser().parse_args()

    # Resolve project-based paths
    if args.project is not None:
        project_root = args.project.resolve()
        input_path   = args.input.resolve() if args.input else project_root / "video_spec.json"
        public_dir   = project_root / "public"
    else:
        input_path   = args.input.resolve() if args.input else DEFAULT_INPUT
        public_dir   = PUBLIC_DIR

    compile(
        input_path  = input_path,
        output_path = args.output.resolve(),
        public_dir  = public_dir,
    )
