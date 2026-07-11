import json
import os

project_dir = "c:\\Automato\\projects\\fractions_and_decimals_proper"

dialogues = [
    # Part 1: Conceptual Hook (10 Scenes)
    "Hello everyone! Welcome to Episode 1: What is a Fraction?",
    "Today, we have a very special treat.",
    "We found this giant, delicious piece of bamboo!",
    "Ooh! Bamboo! I love bamboo! Can I have it all?",
    "Hold on there, Monkey! We need to share it.",
    "Share it? But I'm so hungry!",
    "It's only fair if we divide this bamboo equally between the two of us.",
    "Hmm. Divide it? Like, chop it in pieces?",
    "Exactly! We need to make sure we both get the exact same amount.",
    "Let's figure out the best way to divide this bamboo equally!",
    
    # Part 2: Non-Examples & Constraints (7 Scenes)
    "I know! I'll take this giant piece, and you take that tiny little piece!",
    "Wait, that's not equal at all!",
    "But we both got a piece! Isn't that sharing?",
    "Sharing means EQUAL parts. One piece can't be bigger than the other.",
    "Oh, I see. So if my piece is bigger, it's not a fraction?",
    "Right! Fractions only work when every single part is exactly the same size.",
    "Okay, okay. Let's try cutting it fairly this time.",
    
    # Part 3: Defining the Rational Form (10 Scenes)
    "There! Now we have two identical pieces.",
    "They look exactly the same size to me!",
    "Since we broke the whole bamboo into two equal parts...",
    "...each part is called one-half!",
    "One-half? How do we write that in math?",
    "We write it as a fraction: 1 over 2.",
    "The top number is the Numerator. It shows how many parts we have.",
    "The bottom number is the Denominator. It shows the total number of equal parts.",
    "So 1 part out of 2 total parts is 1/2. I get it!",
    "You're a natural mathematician, Monkey!",
    
    # Part 4: The Decimal Base Shift (12 Scenes)
    "Now, what if we wanted to share with lots of friends?",
    "We would need more pieces!",
    "Let's divide the bamboo into ten equal parts.",
    "Wow! Look at all those little pieces!",
    "Let's count them together to be sure.",
    "1, 2, 3...",
    "4, 5, 6...",
    "7, 8, 9, 10!",
    "Perfect. Since there are 10 equal parts, each part is one-tenth.",
    "We write that as the fraction 1/10.",
    "Ten parts makes it so easy to count!",
    "And when we use tenths, we can easily write them as decimals, too!",
    
    # Part 5: Operational Subtraction & Notation (12 Scenes)
    "All this math is making my tummy rumble...",
    "Monkey, what are you doing?",
    "Chomp! Chomp! Chomp! I just ate three pieces!",
    "Oh boy. Well, let's use math to explain what just happened.",
    "Monkey just ate three out of the ten equal parts.",
    "So I ate three-tenths!",
    "Exactly. As a fraction, we write that as 3 over 10.",
    "But you mentioned decimals earlier! How do we write that as a decimal?",
    "Because our denominator is 10, it fits perfectly into the tenths place value column.",
    "We write a zero in the units place, a decimal point, and a three in the tenths place.",
    "Zero point three! 0.3! It means 3 tenths!",
    "Yes! 3/10 and 0.3 mean the exact same thing.",
    
    # Part 6: Evaluative Assessment (7 Scenes)
    "Now for a quick quiz! How much bamboo is left?",
    "Let's see. There were 10 pieces, and I ate 3.",
    "So there are 1, 2, 3, 4, 5, 6, 7 pieces left!",
    "Right! 7 pieces out of 10 total pieces.",
    "As a fraction, that is 7/10.",
    "And as a decimal, it's 0.7!",
    "You got it! 7/10 equals 0.7.",
    
    # Part 7: Applied Synthesis Framework (7 Scenes)
    "Let's head to the classroom and solve a real-world problem.",
    "Imagine we have a bamboo running track that is exactly 1.0 kilometers long.",
    "I love running!",
    "Monkey runs 4/10 of the track, and stops for some juice.",
    "Then, he runs another 0.2 kilometers.",
    "Phew! That's a lot of running!",
    "The question is: How much track is left to run?",
    
    # Part 8: Algorithmic Execution & Resolution (7 Scenes)
    "Step 1: Let's convert Monkey's first run into a decimal.",
    "4/10 is the same as 0.4 kilometers!",
    "Step 2: Add the two distances Monkey ran together.",
    "0.4 km plus 0.2 km equals 0.6 kilometers!",
    "Step 3: Subtract the distance ran from the total length of the track.",
    "The whole track is 1.0 km. So 1.0 minus 0.6 leaves... 0.4 kilometers remaining!",
    "Fantastic job! Now we know all about fractions and decimals!"
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
        if "Monkey" in sub and not sub.startswith("Monkey"):
            is_panda = True # Panda talking about monkey
        elif sub.startswith("Monkey:") or "I love" in sub or "Chomp!" in sub or "I know!" in sub or "I'm so" in sub or "I ate" in sub:
            is_panda = False
            sub = sub.replace("Monkey: ", "")
        
        sub = sub.replace("Panda: ", "").replace("Monkey: ", "")
        
        step_id = f"scene_{part_idx+1:02d}_{i+1:03d}"
        
        # Make the speaker gesture and the other idle
        panda_pose = "gesture-positive" if is_panda else "idle"
        monkey_pose = "gesture-positive" if not is_panda else "idle"
        
        # Add a small hop for the speaker
        panda_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": 75}}]
        monkey_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": -75}}]
        
        if is_panda:
            panda_actions.extend([
                {"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": 1, "scale": 1.2, "rotationY": 75}},
                {"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": 75}}
            ])
        else:
            monkey_actions.extend([
                {"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": 1, "scale": 1.2, "rotationY": -75}},
                {"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": -75}}
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
