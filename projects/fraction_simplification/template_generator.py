import json
import os
import re

# ==============================================================================
# TEMPLATE GENERATOR SCRIPT FOR LONG AUTOMATO VIDEOS
# Copy this script into your new project directory (e.g. projects/my_video/gen_video.py)
# ==============================================================================

project_dir = os.path.dirname(os.path.abspath(__file__))

# 1. PASTE YOUR SCRIPT HERE
# Every single line must be prefixed with "Character:" 
dialogues = [
    # Part 1
    "Panda: Hello everyone! Welcome to our video.",
    "Monkey: I am so excited to learn today!",
    # Add all 70+ scenes here...
]

# 2. CONFIGURE YOUR SCENE COUNTS PER PART
# This must match the number of lines in `dialogues` grouped by logical parts.
part_counts = [2] # e.g. [10, 7, 10, 12, 12, 7, 7, 7]

# 3. CONFIGURE YOUR ASSETS & TEXT OVERLAYS
# Use the `scene_index` condition (i) to stagger when text appears!
def get_base_config(part_idx, scene_index_in_part):
    configs = [
        # Part 1 (part_idx = 0)
        {
            "env": "forest_bg.png",
            "assets": [],
            # Text positioning: Use y: 15 to 25 so it sits near the top and doesn't cover the characters in the middle!
            "text": [{"text": "Welcome!", "x": 50, "y": 20, "size": 80, "color": "#FFFFFF"}] if scene_index_in_part >= 0 else []
        },
        # Add configurations for all parts here.
    ]
    return configs[part_idx]

# Canvas configuration
W = 1920
H = 1080
CX = W // 2
CY = H // 2

# Generate Timeline
idx = 0
for part_idx, count in enumerate(part_counts):
    scenes = []
    for i in range(count):
        sub = dialogues[idx]
        is_panda = True
        
        # Determine who is speaking to assign poses/animations
        if sub.startswith("Monkey:"):
            is_panda = False
        elif sub.startswith("Panda:"):
            is_panda = True
        else:
            # Fallback if parsing fails
            is_panda = True
        
        # Strip speaker prefix for subtitle
        sub_text = re.sub(r"^.*?:\s*", "", sub)
        
        step_id = f"scene_{part_idx+1:02d}_{i+1:03d}"
        
        # Poses
        panda_pose = "gesture-positive" if is_panda else "idle"
        monkey_pose = "gesture-positive" if not is_panda else "idle"
        
        # Base Rotations for 3/4 profile facing each other
        panda_rot = 75
        monkey_rot = -75
        
        panda_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": panda_rot}}]
        monkey_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": monkey_rot}}]
        
        # Add a dynamic hop for whoever is speaking
        if is_panda:
            panda_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": 4, "scale": 1.2, "rotationY": panda_rot}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": panda_rot}}
            ])
        else:
            monkey_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": 4, "scale": 1.2, "rotationY": monkey_rot}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": monkey_rot}}
            ])

        config = get_base_config(part_idx, i)
        
        scene = {
            "stepId": step_id,
            "audioFile": f"{step_id}.wav",
            "subtitle": sub_text,
            "environment": {"background": config["env"]},
            "characters": [
                {
                    "type": "panda",
                    "pose": panda_pose,
                    "actions": panda_actions
                },
                {
                    "type": "monkey",
                    "pose": monkey_pose,
                    "actions": monkey_actions
                }
            ],
            "sprites": [
                {
                    "id": asset["id"],
                    "src": asset["src"],
                    "keyframes": [
                        {"frame": 0, "x": asset["x"], "y": asset["y"], "scale": asset.get("scale", 1.0)}
                    ]
                }
                for asset in config["assets"]
            ],
            "textOverlays": config["text"]
        }
        
        # Automatically add confetti on the very last scene!
        if idx == len(dialogues) - 1:
            scene["effects"] = {"confetti": True}
        scenes.append(scene)
        idx += 1
        
    with open(os.path.join(project_dir, f"part{part_idx+1}.json"), "w") as f:
        json.dump({"timeline": scenes}, f, indent=2)

# === Auto-generate video_spec.json ===
project_name = os.path.basename(project_dir)
video_spec = {
    "meta": {
        "videoId": project_name,
        "targetAge": "8-10",           # <-- Update this to match Phase 0 answers
        "hostCharacter": "panda",      # <-- Update to left character name
        "themeColor": "#4caf50",       # <-- Update to your theme colour
        "fps": 30
    },
    "includes": [f"part{i+1}.json" for i in range(len(part_counts))]
}
with open(os.path.join(project_dir, "video_spec.json"), "w") as f:
    json.dump(video_spec, f, indent=2)

print(f"Generated {len(part_counts)} parts with {idx} distinct scenes.")
print(f"video_spec.json written to: {project_dir}")
