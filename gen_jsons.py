import json
import os

target_age = "3-5"
host = "bunny"
bg = "garden_bg.png"
sprite = "banana.png"

def create_scene(step_num, audio, subtitle, pose="idle", x_glide=None, banana_count=0, confetti=False):
    step_id = f"scene_{step_num:02d}"
    
    scene = {
        "stepId": step_id,
        "audioFile": audio,
        "subtitle": subtitle,
        "environment": { "background": bg },
        "characterState": {
            "pose": pose,
            "actions": []
        }
    }
    
    if x_glide is not None:
        scene["characterState"]["actions"].append({
            "type": "glide",
            "duration": 0.5 if step_num > 1 else 1.5,
            "targetState": { "x": x_glide, "y": -1, "scale": 1.2, "rotationY": 0, "rotationZ": 0 }
        })
        
    if banana_count > 0:
        scene_sprites = []
        for j in range(banana_count):
            x_pos = 100 + (j % 5) * 150  # wrap after 5
            y_pos = 720 if j < 5 else 850
            
            # Simple static display since teaching emphasizes counting
            keyframes = [
                { "frame": 0, "x": x_pos, "y": y_pos, "scale": 0.5, "opacity": 1, "rotation": 0 }
            ]
            
            scene_sprites.append({
                "id": f"banana_{j}",
                "src": sprite,
                "keyframes": keyframes
            })
        scene["sprites"] = scene_sprites
        
    if confetti:
        scene["effects"] = { "confetti": True }
        
    return scene

script = [
  (1, "Hi! I'm the bunny! Today we are going to learn how to count.", "walk", 0, 0),
  (2, "Counting helps us know how many things we have! Let's count some bananas.", "gesture-positive", -4, 0),
  (3, "Look! One banana!", "gesture-positive", -4, 1),
  (4, "When we add one more...", "idle", -4, 1),
  (5, "We get Two bananas! One, Two.", "gesture-positive", -4, 2),
  (6, "Let's add another one. What comes after two?", "idle", -4, 2),
  (7, "Three! We have three bananas now.", "gesture-positive", -4, 3),
  (8, "And one more makes Four!", "gesture-positive", -4, 4),
  (9, "One more makes Five! Let's count them: one, two, three, four, five!", "dance", -4, 5),
  (10, "Great job! Now let's try something harder. Let's count to ten!", "dance", -4, 5),
  (11, "Six bananas!", "gesture-positive", -4, 6),
  (12, "Seven bananas!", "gesture-positive", -4, 7),
  (13, "Eight bananas!", "gesture-positive", -4, 8),
  (14, "Nine bananas!", "gesture-positive", -4, 9),
  (15, "And ten bananas! We did it!", "dance", -4, 10),
  (16, "Now it's your turn. How many bananas are here?", "idle", -4, 3),
  (17, "Did you say three? You're right!", "gesture-positive", -4, 3),
  (18, "Thanks for counting with me today. Bye bye!", "dance", 0, 0)
]

scenes = []
for item in script:
    num = item[0]
    subtitle = item[1]
    pose = item[2]
    x_pos = item[3]
    bananas = item[4]
    
    confetti = (num == 15 or num == 18)
    scenes.append(create_scene(num, f"scene_{num:02d}.wav", subtitle, pose, x_pos, bananas, confetti))

# Split into parts of 5 scenes per file
SCENES_PER_FILE = 5
part_files = []

for i in range(0, len(scenes), SCENES_PER_FILE):
    chunk = scenes[i:i + SCENES_PER_FILE]
    part_num = (i // SCENES_PER_FILE) + 1
    part_name = f"part{part_num}.json"
    part_files.append(part_name)
    
    with open(os.path.join("c:/Automato", part_name), "w", encoding="utf-8") as f:
        json.dump({ "timeline": chunk }, f, indent=2)

main_spec = {
    "meta": {
        "videoId": "bunny_teaches_counting",
        "targetAge": target_age,
        "hostCharacter": host,
        "themeColor": "#FFDE4D",
        "fps": 30
    },
    "includes": part_files
}

with open("c:/Automato/video_spec.json", "w", encoding="utf-8") as f:
    json.dump(main_spec, f, indent=2)

print(f"JSON specs generated with {len(scenes)} scenes across {len(part_files)} files!")
