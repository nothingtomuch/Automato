import json
import os

def gen_scenes(base_scene, count, start_index):
    scenes = []
    for i in range(count):
        scene = json.loads(json.dumps(base_scene)) # deep copy
        scene["stepId"] = f"{base_scene['stepId']}_{i+1:03d}"
        scene["audioFile"] = f"{base_scene['stepId']}_{i+1:03d}.wav"
        scenes.append(scene)
    return scenes

# Define base scenes
base_scenes = [
    {
        "stepId": "scene_01",
        "subtitle": "Let's divide this bamboo equally!",
        "environment": { "background": "forest_bg.png" },
        "characters": [
            { "type": "panda", "pose": "idle", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 25, "y": 50, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "run", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 50, "y": 50, "scale": 1.0 } }, { "type": "glide", "duration": 2.0, "targetState": { "x": 75, "y": 50, "scale": 1.0 } }] }
        ],
        "assets": [{ "id": "bamboo_whole", "src": "bamboo_whole.png", "x": 50, "y": 50, "scale": 1.0 }],
        "textOverlays": [{ "text": "EPISODE 1: What is a Fraction?", "x": 50, "y": 10, "size": 80, "color": "#FFFFFF" }]
    },
    {
        "stepId": "scene_02",
        "subtitle": "Wait, that's not equal!",
        "environment": { "background": "forest_bg.png" },
        "characters": [
            { "type": "panda", "pose": "gesture-negative", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 25, "y": 50, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "dance", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 75, "y": 50, "scale": 1.0 } }] }
        ],
        "assets": [],
        "textOverlays": [{ "text": "EQUAL PARTS?", "x": 50, "y": 50, "size": 120, "color": "#FF0000" }]
    },
    {
        "stepId": "scene_03",
        "subtitle": "Fractions represent equal parts.",
        "environment": { "background": "forest_bg.png" },
        "characters": [
            { "type": "panda", "pose": "gesture-positive", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 25, "y": 50, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "idle", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 75, "y": 50, "scale": 1.0 } }] }
        ],
        "assets": [{ "id": "bamboo_half_1", "src": "bamboo_half.png", "x": 40, "y": 50, "scale": 1.0 }, { "id": "bamboo_half_2", "src": "bamboo_half.png", "x": 60, "y": 50, "scale": 1.0 }],
        "textOverlays": [{ "text": "1/2 = Numerator (Parts We Have) / Denominator (Total Equal Parts)", "x": 50, "y": 20, "size": 60, "color": "#FFFFFF" }]
    },
    {
        "stepId": "scene_04",
        "subtitle": "What if we use ten equal parts?",
        "environment": { "background": "math_bg.png" },
        "characters": [
            { "type": "panda", "pose": "walk", "actions": [{ "type": "glide", "duration": 1.5, "targetState": { "x": 15, "y": 50, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "idle", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 85, "y": 50, "scale": 1.0 } }] }
        ],
        "assets": [
            { "id": f"tenth_{i}", "src": "bamboo_tenth.png", "x": 27 + (i-1)*5, "y": 50, "scale": 1.0 } for i in range(1, 11)
        ],
        "textOverlays": [{ "text": "1  2  3  4  5  6  7  8  9  10", "x": 50, "y": 65, "size": 40, "color": "#FFFFFF" }]
    },
    {
        "stepId": "scene_05",
        "subtitle": "Monkey ate three tenths!",
        "environment": { "background": "math_bg.png" },
        "characters": [
            { "type": "panda", "pose": "gesture-positive", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 15, "y": 50, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "eat", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 85, "y": 50, "scale": 1.0 } }] }
        ],
        "assets": [
            { "id": f"tenth_{i}", "src": "bamboo_tenth.png", "x": 27 + (i-1)*5, "y": 50, "scale": 1.0 } for i in range(4, 11)
        ],
        "textOverlays": [{ "text": "Monkey ate 3/10 -> 0.3", "x": 32, "y": 50, "size": 60, "color": "#FF0000" }]
    },
    {
        "stepId": "scene_06",
        "subtitle": "How much is left?",
        "environment": { "background": "math_bg.png" },
        "characters": [
            { "type": "panda", "pose": "dance", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 15, "y": 50, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "gesture-negative", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 85, "y": 50, "scale": 1.0 } }] }
        ],
        "assets": [
            { "id": f"tenth_{i}", "src": "bamboo_tenth.png", "x": 27 + (i-1)*5, "y": 50, "scale": 1.0 } for i in range(4, 11)
        ],
        "textOverlays": [{ "text": "7/10 = 0.7", "x": 50, "y": 20, "size": 80, "color": "#4CAF50" }]
    },
    {
        "stepId": "scene_07",
        "subtitle": "Let's solve a real problem!",
        "environment": { "background": "classroom_bg.png" },
        "characters": [
            { "type": "panda", "pose": "gesture-positive", "actions": [{ "type": "glide", "duration": 1.0, "targetState": { "x": 50, "y": 60, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "idle", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 80, "y": 60, "scale": 1.0 } }] }
        ],
        "assets": [],
        "textOverlays": [{ "text": "Panda has a 1.0 meter bamboo track. Monkey runs 4/10 of it, stops for juice, and then runs another 0.2 meters. How much track is left?", "x": 50, "y": 30, "size": 40, "color": "#FFFFFF" }]
    },
    {
        "stepId": "scene_08",
        "subtitle": "We subtract the total ran from the whole!",
        "environment": { "background": "classroom_bg.png" },
        "characters": [
            { "type": "panda", "pose": "dance", "actions": [{ "type": "glide", "duration": 0.1, "targetState": { "x": 20, "y": 60, "scale": 1.0 } }] },
            { "type": "monkey", "pose": "gesture-positive", "actions": [{ "type": "glide", "duration": 1.5, "targetState": { "x": 80, "y": 60, "scale": 1.0 } }] }
        ],
        "assets": [],
        "textOverlays": [
            { "text": "Step 1: 4/10 = 0.4 meters", "x": 50, "y": 20, "size": 50, "color": "#FFFFFF" },
            { "text": "Step 2: 0.4 + 0.2 = 0.6 meters", "x": 50, "y": 35, "size": 50, "color": "#FFFFFF" },
            { "text": "Step 3: 1.0 - 0.6 = 0.4 meters remaining!", "x": 50, "y": 50, "size": 60, "color": "#4CAF50" }
        ]
    }
]

counts = [10, 7, 10, 12, 12, 7, 7, 7] # total 72 scenes (6 minutes)

project_dir = "c:\\Automato\\projects\\fractions_and_decimals_proper"

for idx, (base_scene, count) in enumerate(zip(base_scenes, counts)):
    part_num = idx + 1
    scenes = gen_scenes(base_scene, count, 0)
    with open(os.path.join(project_dir, f"part{part_num}.json"), "w") as f:
        json.dump({"timeline": scenes}, f, indent=2)

print("Generated 8 parts.")
