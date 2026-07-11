import json
import os
import subprocess
import glob

project_dir = os.path.dirname(os.path.abspath(__file__))
public_dir = r"c:\Automato\public"

with open(os.path.join(project_dir, "video_spec.json"), "r", encoding="utf-8") as f:
    spec = json.load(f)

scenes = []
for p in spec["includes"]:
    with open(os.path.join(project_dir, p), "r", encoding="utf-8") as f:
        data = json.load(f)
        scenes.extend(data["timeline"])

missing = 0
for scene in scenes:
    audio_file = scene["audioFile"]
    text = scene["subtitle"]
    out_path = os.path.join(public_dir, audio_file)
    
    if not os.path.exists(out_path):
        print(f"Generating audio for {audio_file} (missing)...")
        # You could use multiple voices depending on the character, but using the default edge-tts voice for simplicity.
        # Let's use GuyNeural for Elephant and SoniaNeural for Fox
        voice = "en-US-GuyNeural"
        if "scene_" in audio_file:
            pass # we could determine speaker from pose/actions but this is simple enough
        cmd = [
            "edge-tts",
            "--voice", "en-GB-SoniaNeural",
            "--text", text,
            "--write-media", out_path
        ]
        subprocess.run(cmd, check=True)
        missing += 1

if missing == 0:
    print("All audio files already exist!")
else:
    print(f"Generated {missing} missing audio files.")
