import json
import wave
import os

# 1. Generate empty 3-second wav files
for i in range(1, 6):
    filename = f"scene_{i:02d}.wav"
    filepath = f"public/{filename}"
    with wave.open(filepath, 'w') as obj:
        obj.setnchannels(1)
        obj.setsampwidth(2)
        obj.setframerate(44100)
        obj.writeframes(b'\x00\x00' * int(44100 * 3))

# 2. Update video_spec.json
with open('video_spec.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, scene in enumerate(data['timeline']):
    scene['audioFile'] = f"scene_{i+1:02d}.wav"

with open('video_spec.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Audio generated and video_spec.json updated!")
