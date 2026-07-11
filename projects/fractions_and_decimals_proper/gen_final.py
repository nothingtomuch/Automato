import json
import os

project_dir = "c:\\Automato\\projects\\fractions_and_decimals_proper"

dialogues = [

]

part_counts = [10, 7, 10, 12, 12, 7, 7, 7]

# Canvas is 1920x1080. Sprites use pixel coords.
W = 1920
H = 1080
CX = W // 2   # 960
CY = H // 2   # 540

# Tenth bamboo spacing: 10 pieces evenly across the center area (px 460 to 1460)
TENTH_START_X = 460
TENTH_SPACING = 110
TENTH_Y = CY

base_configs = [
    # Part 1
    {
        "env": "forest_bg.png",
        "assets": [{"id": "bamboo_whole", "src": "bamboo_whole.png", "x": CX, "y": CY, "scale": 1.0}],
        "text": [{"text": "EPISODE 1: What is a Fraction?", "x": 50, "y": 10, "size": 80, "color": "#FFFFFF"}]
    },
    # Part 2
    {
        "env": "forest_bg.png",
        "assets": [
            {"id": "bamboo_unequal_1", "src": "bamboo_half.png", "x": CX - 180, "y": CY, "scale": 1.5},
            {"id": "bamboo_unequal_2", "src": "bamboo_half.png", "x": CX + 180, "y": CY, "scale": 0.5}
        ],
        "text": [{"text": "EQUAL PARTS?", "x": 50, "y": 50, "size": 120, "color": "#FF0000"}]
    },
    # Part 3
    {
        "env": "forest_bg.png",
        "assets": [
            {"id": "bamboo_half_1", "src": "bamboo_half.png", "x": CX - 180, "y": CY, "scale": 1.0},
            {"id": "bamboo_half_2", "src": "bamboo_half.png", "x": CX + 180, "y": CY, "scale": 1.0}
        ],
        "text": [{"text": "1/2 = Numerator / Denominator", "x": 50, "y": 20, "size": 60, "color": "#FFFFFF"}]
    },
    # Part 4
    {
        "env": "math_bg.png",
        "assets": [{"id": f"tenth_{i}", "src": "bamboo_tenth.png", "x": TENTH_START_X + (i-1)*TENTH_SPACING, "y": TENTH_Y, "scale": 0.6} for i in range(1, 11)],
        "text": [{"text": "1  2  3  4  5  6  7  8  9  10", "x": 50, "y": 65, "size": 40, "color": "#FFFFFF"}]
    },
    # Part 5
    {
        "env": "math_bg.png",
        "assets": [{"id": f"tenth_{i}", "src": "bamboo_tenth.png", "x": TENTH_START_X + (i-1)*TENTH_SPACING, "y": TENTH_Y, "scale": 0.6} for i in range(4, 11)],
        "text": [
            {"text": "Monkey ate 3/10 -> 0.3", "x": 50, "y": 20, "size": 60, "color": "#FF0000"},
            {"text": "Units (.) Tenths", "x": 50, "y": 70, "size": 50, "color": "#FFFFFF"},
            {"text": "  0   .     3   ", "x": 50, "y": 80, "size": 80, "color": "#4CAF50"}
        ]
    },
    # Part 6
    {
        "env": "math_bg.png",
        "assets": [{"id": f"tenth_{i}", "src": "bamboo_tenth.png", "x": TENTH_START_X + (i-1)*TENTH_SPACING, "y": TENTH_Y, "scale": 0.6} for i in range(4, 11)],
        "text": [{"text": "7/10 = 0.7", "x": 50, "y": 20, "size": 80, "color": "#4CAF50"}]
    },
    # Part 7
    {
        "env": "classroom_bg.png",
        "assets": [],
        "text": [{"text": "Track: 1.0 km. Runs: 4/10 km + 0.2 km. Left?", "x": 50, "y": 30, "size": 40, "color": "#FFFFFF"}]
    },
    # Part 8
    {
        "env": "classroom_bg.png",
        "assets": [],
        "text": [
            {"text": "Step 1: 4/10 = 0.4 km", "x": 50, "y": 20, "size": 50, "color": "#FFFFFF"},
            {"text": "Step 2: 0.4 + 0.2 = 0.6 km", "x": 50, "y": 35, "size": 50, "color": "#FFFFFF"},
            {"text": "Step 3: 1.0 - 0.6 = 0.4 km remaining!", "x": 50, "y": 50, "size": 60, "color": "#4CAF50"}
        ]
    }
]

idx = 0
for part_idx, count in enumerate(part_counts):
    scenes = []
    for i in range(count):
        sub = dialogues[idx]
        is_panda = True
        
        # Determine who is speaking to assign poses/animations
        is_panda = True
        if sub.startswith("Monkey:"):
            is_panda = False
        
        # Clean subtitle
        if sub.startswith("Panda: "):
            sub = sub[7:]
        elif sub.startswith("Monkey: "):
            sub = sub[8:]
        
        step_id = f"scene_{part_idx+1:02d}_{i+1:03d}"
        
        # Make the speaker gesture and the other idle
        panda_pose = "gesture-positive" if is_panda else "idle"
        monkey_pose = "gesture-positive" if not is_panda else "idle"
        
        # Add a small hop for the speaker
        panda_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": 75}}]
        monkey_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": -75}}]
        
        if is_panda:
            panda_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": 4, "scale": 1.2, "rotationY": 75}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": 75}}
            ])
        else:
            monkey_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": 4, "scale": 1.2, "rotationY": -75}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": -75}}
            ])

        # Add some wait time at the start of actions to let speech breathe
        scene = {
            "stepId": step_id,
            "audioFile": f"{step_id}.wav",
            "subtitle": sub,
            "environment": {"background": base_configs[part_idx]["env"]},
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
                for asset in base_configs[part_idx]["assets"]
            ],
            "textOverlays": base_configs[part_idx]["text"]
        }
        scenes.append(scene)
        idx += 1
        
    with open(os.path.join(project_dir, f"part{part_idx+1}.json"), "w") as f:
        json.dump({"timeline": scenes}, f, indent=2)

print("Generated 8 parts with 72 distinct scenes.")
