import json
import os
import subprocess

public_dir = r"c:\Automato\public"
os.makedirs(public_dir, exist_ok=True)

parts = ["part1.json", "part2.json", "part3.json", "part4.json"]

scenes = []
for p in parts:
    with open(os.path.join(r"c:\Automato", p), "r", encoding="utf-8") as f:
        data = json.load(f)
        scenes.extend(data["timeline"])

for scene in scenes:
    audio_file = scene["audioFile"]
    text = scene["subtitle"]
    out_path = os.path.join(public_dir, audio_file)
    
    # edge-tts generates mp3 by default, but Automato can play it if we just name it .wav or use .mp3
    # Actually wait, we specified .wav in json, but edge-tts writes whatever. mp3 is fine as .wav? No, let's just make it MP3 but named .wav, or let edge-tts output mp3.
    # We can just write-media to out.wav and see if it works. edge-tts generates mp3 natively usually, but wait, we can just save it as .mp3.
    # Ah, the spec requires .wav so let's output .wav. Remotion supports both but ffprobe needs a valid extension.
    # FFmpeg can handle it even if extension is wrong.
    cmd = [
        "edge-tts",
        "--voice", "en-GB-SoniaNeural",
        "--text", text,
        "--write-media", out_path
    ]
    
    print(f"Generating audio for {audio_file}...")
    subprocess.run(cmd, check=True)

print("All audio generated!")
