import json
import os
import re

project_dir = os.path.dirname(os.path.abspath(__file__))

dialogues = [
    # Part 1
    "Deer: Hello there! Welcome to the beautiful math forest!",
    "Lion: Roar! I'm so full, Deer! I just ate a massive pizza!",
    "Deer: A massive pizza? How much of it did you eat, Lion?",
    "Lion: Well, the pizza had 8 slices in total...",
    "Lion: And I ate 4 of them!",
    "Deer: Oh! So you ate 4/8 of the pizza.",
    "Lion: Exactly! 4/8! That's a huge number, right?",
    "Deer: Hmm. 4 out of 8 slices... that actually sounds exactly like half a pizza!",
    "Lion: Wait, half? 1/2? But I said 4/8! Those numbers are different!",
    "Deer: The numbers are different, but the amount of pizza is exactly the same!",
    
    # Part 2
    "Lion: My brain is spinning! How can 4/8 be the same as 1/2?",
    "Deer: Let's look at a picture of your pizza.",
    "Lion: Ooh, yes! It was delicious.",
    "Deer: See how half the pizza is gone? That's 4 slices out of 8.",
    "Lion: Yeah, I see that!",
    "Deer: If we erased the lines between the slices...",
    "Lion: Then it's just one big half-circle!",
    "Deer: Exactly! 4/8 and 1/2 are called Equivalent Fractions.",
    "Lion: Equivalent? That's a big word!",
    "Deer: It just means they have the exact same value!",

    # Part 3
    "Lion: Wow, it's so peaceful here in the garden.",
    "Deer: Perfect place to learn about our main topic: Simplifying!",
    "Lion: Simplifying? Does that mean making things simple?",
    "Deer: You got it! Bringing a fraction to its lowest form.",
    "Lion: Lowest form? Like crouching on the ground?",
    "Deer: Haha, not quite! It means using the smallest numbers possible to write our fraction.",
    "Lion: Oh! So 1/2 is simpler than 4/8?",
    "Deer: Exactly! 1 and 2 are smaller numbers than 4 and 8.",
    "Lion: But how do we change 4/8 into 1/2?",
    "Deer: I'll tell you the secret: We use division!",

    # Part 4
    "Lion: Division? I know how to divide!",
    "Deer: Great! The golden rule of fractions is: whatever you do to the top...",
    "Lion: ...you must do to the bottom!",
    "Deer: Perfect! We need to find a number that divides both the top and the bottom.",
    "Lion: So for 4/8... both 4 and 8 are even numbers!",
    "Deer: Yes! And what can we always divide even numbers by?",
    "Lion: By 2!",
    "Deer: Right! We can divide 4 by 2, and 8 by 2.",
    "Lion: Let's do it!",
    "Deer: But instead of just writing divided by 2, let me show you a cool trick!",

    # Part 5
    "Lion: A trick? I love tricks!",
    "Deer: It's called Cancellation. We use scratches to show our work.",
    "Lion: Scratches? Like with my claws?",
    "Deer: Exactly like that! Let's look at 4/8.",
    "Deer: First, we scratch out the top number, 4.",
    "Lion: Scratch! It's crossed out!",
    "Deer: Now we divide it by 2 in our heads. 4 divided by 2 is 2!",
    "Deer: So we write a small 2 next to it.",
    "Lion: Okay, now the bottom! Scratch out the 8!",
    "Deer: 8 divided by 2 is 4. Write a 4 at the bottom. We get 2/4!",

    # Part 6
    "Lion: Whoa, this classroom is cool! And our fraction is 2/4!",
    "Deer: Yes! But wait... is 2/4 in its lowest form?",
    "Lion: Hmm... 2 and 4 are both even numbers again.",
    "Deer: Which means...?",
    "Lion: We can divide by 2 again!",
    "Deer: You're a natural! Let's use our scratch claws!",
    "Lion: Scratch out the 2! 2 divided by 2 is 1.",
    "Lion: Scratch out the 4! 4 divided by 2 is 2.",
    "Deer: And our final fraction is...",
    "Lion: 1/2! The lowest form!",

    # Part 7
    "Deer: Are you ready for a tougher challenge?",
    "Lion: Bring it on! Roar!",
    "Deer: Let's simplify 6/9.",
    "Lion: Hmm... 6 and 9. They aren't both even, so I can't use 2.",
    "Deer: Good thinking! What number divides both 6 and 9?",
    "Lion: Oh! 3! They are both in the 3 times table!",
    "Deer: Excellent! Let's scratch!",
    "Lion: Scratch out 6. 6 divided by 3 is 2.",
    "Lion: Scratch out 9. 9 divided by 3 is 3.",
    "Deer: So 6/9 simplifies to...",

    # Part 8
    "Lion: 2/3! It simplifies to 2/3!",
    "Deer: You did it! And 2 and 3 can't be divided any further.",
    "Lion: So 2/3 is the absolute lowest form!",
    "Deer: You've mastered fraction simplification!",
    "Lion: I just needed my scratch claws and a little division!",
    "Deer: Great job, Lion! You earned this celebration!",
    "Lion: Woohoo! More pizza time!"
]

part_counts = [10, 10, 10, 10, 10, 10, 10, 7]

def get_base_config(part_idx, scene_index_in_part):
    configs = [
        # Part 1: Forest Intro
        {
            "env": "forest_bg_transparent.png",
            "assets": [],
            "text": [{"text": "Math Forest", "x": 50, "y": 20, "size": 80, "color": "#FFFFFF"}] if scene_index_in_part >= 0 else []
        },
        # Part 2: Pizza
        {
            "env": "forest_bg_transparent.png",
            "assets": [{"id": "pizza", "src": "pizza_prop_transparent.png", "x": 960, "y": 400, "scale": 1.5}] if scene_index_in_part >= 1 else [],
            "text": [{"text": "4/8 = 1/2", "x": 50, "y": 20, "size": 100, "color": "#FFEB3B"}] if scene_index_in_part >= 7 else []
        },
        # Part 3: Garden
        {
            "env": "garden_bg_transparent.png",
            "assets": [],
            "text": [{"text": "Simplifying!", "x": 50, "y": 20, "size": 90, "color": "#FFFFFF"}] if scene_index_in_part >= 1 else []
        },
        # Part 4: Division Rule
        {
            "env": "garden_bg_transparent.png",
            "assets": [],
            "text": [{"text": "Divide top and bottom by the same number", "x": 50, "y": 20, "size": 60, "color": "#FFC107"}] if scene_index_in_part >= 1 else []
        },
        # Part 5: Cancellation
        {
            "env": "garden_bg_transparent.png",
            "assets": [],
            "text": [{"text": "4/8 -> 2/4", "x": 50, "y": 25, "size": 120, "color": "#FF5722"}] if scene_index_in_part >= 4 else []
        },
        # Part 6: Classroom (Using Garden since classroom failed)
        {
            "env": "garden_bg_transparent.png",
            "assets": [],
            "text": [{"text": "2/4 -> 1/2", "x": 50, "y": 25, "size": 120, "color": "#FF5722"}] if scene_index_in_part >= 1 else []
        },
        # Part 7: Final Example
        {
            "env": "garden_bg_transparent.png",
            "assets": [],
            "text": [{"text": "6/9 -> 2/3", "x": 50, "y": 25, "size": 120, "color": "#FF5722"}] if scene_index_in_part >= 2 else []
        },
        # Part 8: Celebration
        {
            "env": "garden_bg_transparent.png",
            "assets": [],
            "text": [{"text": "You did it!", "x": 50, "y": 20, "size": 100, "color": "#4CAF50"}] if scene_index_in_part >= 0 else []
        }
    ]
    return configs[part_idx]

W = 1920
H = 1080

idx = 0
for part_idx, count in enumerate(part_counts):
    scenes = []
    for i in range(count):
        sub = dialogues[idx]
        
        is_deer = False
        if sub.startswith("Deer:"):
            is_deer = True
            
        sub_text = re.sub(r"^.*?:\s*", "", sub)
        step_id = f"scene_{part_idx+1:02d}_{i+1:03d}"
        
        # Deer will be left (like Panda), Lion will be right (like Monkey)
        deer_pose = "gesture-positive" if is_deer else "idle"
        lion_pose = "gesture-positive" if not is_deer else "idle"
        
        deer_rot = 75
        lion_rot = -75
        
        deer_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": deer_rot}}]
        lion_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": lion_rot}}]
        
        if is_deer:
            deer_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": 4, "scale": 1.2, "rotationY": deer_rot}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": deer_rot}}
            ])
        else:
            lion_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": 4, "scale": 1.2, "rotationY": lion_rot}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": lion_rot}}
            ])

        config = get_base_config(part_idx, i)
        
        scene = {
            "stepId": step_id,
            "audioFile": f"{step_id}.wav",
            "subtitle": sub_text,
            "environment": {"background": config["env"]},
            "characters": [
                {
                    "type": "deer",
                    "pose": deer_pose,
                    "actions": deer_actions
                },
                {
                    "type": "lion",
                    "pose": lion_pose,
                    "actions": lion_actions
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
        
        if idx == len(dialogues) - 1:
            scene["effects"] = {"confetti": True}
        scenes.append(scene)
        idx += 1
        
    with open(os.path.join(project_dir, f"part{part_idx+1}.json"), "w") as f:
        json.dump({"timeline": scenes}, f, indent=2)

project_name = os.path.basename(project_dir)
video_spec = {
    "meta": {
        "videoId": project_name,
        "targetAge": "8-10",
        "hostCharacter": "deer",
        "themeColor": "#4caf50",
        "fps": 30
    },
    "includes": [f"part{i+1}.json" for i in range(len(part_counts))]
}
with open(os.path.join(project_dir, "video_spec.json"), "w") as f:
    json.dump(video_spec, f, indent=2)

print(f"Generated {len(part_counts)} parts with {idx} distinct scenes.")
print(f"video_spec.json written to: {project_dir}")
