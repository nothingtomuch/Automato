import json
import os
import re

# ==============================================================================
# EXPONENTS BASICS — Long Video Generator
# Characters: Elephant (Teacher, left) | Fox (Learner, right)
# Setting: Forest (parts 1-3) → Math Lab (parts 4-6) → Classroom (parts 7-8)
# Total Scenes: 75  |  Target Age: 12-13
# ==============================================================================

project_dir = os.path.dirname(os.path.abspath(__file__))

dialogues = [
    # ── PART 1: Introduction — What Even ARE Exponents? (10 scenes) ──────────────
    'Elephant: "Yo Fox! Check this out — two times two times two times two times two. What is that?"',
    'Fox: "Ugh, that\'s like... I have to keep multiplying? Give me a sec — two, four, eight, sixteen, thirty-two!"',
    'Elephant: "Thirty-two! Nice. But what if I said — two to the power of five — and you just knew the answer?"',
    'Fox: "Wait... two to the power of FIVE? What does \'to the power\' even mean?"',
    'Elephant: "Great question! An exponent is just a shortcut. Instead of writing two times two times two times two times two — we write two raised to five."',
    'Fox: "Oh! So the big number — two — is the BASE, and the five floating up top is... something special?"',
    'Elephant: "Exactly! That tiny floating number is called the EXPONENT — or the POWER. It tells you HOW MANY TIMES to multiply the base by itself."',
    'Fox: "So two to the power of five literally means — two times itself, five times. That\'s genius! Why didn\'t anyone tell me this before?"',
    'Elephant: "Ha! Math has been hiding these shortcuts from you. But not anymore. Let\'s crack them all open today."',
    'Fox: "I am SO ready. Hit me with everything, Elephant!"',

    # ── PART 2: Reading & Writing Exponents (9 scenes) ───────────────────────────
    'Elephant: "Alright — let\'s start with how we READ and WRITE exponential expressions. See this: three to the power of four."',
    'Fox: "Three to the power of four. So... three is the base, four is the exponent. Got it!"',
    'Elephant: "Perfect. Now — what does three to the power of four actually EQUAL?"',
    'Fox: "It means three times three times three times three. That\'s... nine... times three is twenty-seven... times three is eighty-one!"',
    'Elephant: "Boom! Eighty-one. You just evaluated an exponent like a pro. The EXPANDED form is three times three times three times three. The EXPONENTIAL form is three to the power of four."',
    'Fox: "Oh that\'s sick — so exponential form is the compact version, and expanded form is the full multiplication spelled out."',
    'Elephant: "Spot on. Now quick drill — write five to the power of three in expanded form and solve it."',
    'Fox: "Five to the power of three means five times five times five. That\'s twenty-five times five — one hundred and twenty-five!"',
    'Elephant: "One hundred and twenty-five! Perfect. Exponents are just shorthand for repeated multiplication — never forget that."',

    # ── PART 3: Special Exponents — Zero & One (9 scenes) ────────────────────────
    'Elephant: "Time for the sneaky ones — what happens when the exponent is ZERO or ONE?"',
    'Fox: "Hmm. Ten to the power of one... that\'s ten times itself once — so just ten?"',
    'Elephant: "Exactly right! Any number to the power of ONE is just the number itself. Seven to the one is seven. Ninety-nine to the one is ninety-nine."',
    'Fox: "That makes sense — you\'re multiplying by itself just once. But what about ZERO? Like... ten to the power of ZERO?"',
    'Elephant: "Ah — the legendary exponent zero! This one surprises everyone. Ten to the power of zero equals... ONE."',
    'Fox: "WHAT. Ten to the zero is ONE?! That makes no sense — you\'re multiplying ten... zero times?!"',
    'Elephant: "I know it feels weird! Here\'s the trick to remember it. Think about the pattern: ten to the three is a thousand, ten to the two is one hundred, ten to the one is ten. Each time the exponent drops by one, you DIVIDE by ten."',
    'Fox: "Ohhhh! So ten divided by ten is... one! So ten to the zero HAS to be one! The pattern forces it!"',
    'Elephant: "You got it! This works for ANY non-zero base — a to the power of zero ALWAYS equals one. That\'s the Zero Exponent Law!"',

    # ── PART 4: Product Rule (Law 1) (10 scenes) ─────────────────────────────────
    'Elephant: "Now we step into the BIG LEAGUES — the Laws of Exponents. Law One: the Product Rule."',
    'Fox: "Product means multiplication, right? So this law is about multiplying expressions with exponents?"',
    'Elephant: "Exactly. Here\'s the law: a to the m, multiplied by a to the n, equals a to the m PLUS n."',
    'Fox: "So when you multiply two powers with the SAME base... you just ADD the exponents?"',
    'Elephant: "That\'s it! Let\'s prove it. Two to the three times two to the four — let\'s expand both."',
    'Fox: "Two to the three is two times two times two. Two to the four is two times two times two times two. Together that\'s seven twos multiplied!"',
    'Elephant: "Seven twos — which is two to the seven. And three plus four equals seven! The law works perfectly."',
    'Fox: "That\'s actually beautiful. Instead of expanding and counting, I just ADD the exponents. Huge shortcut!"',
    'Elephant: "Now you try — what is five to the four times five to the three?"',
    'Fox: "Same base — five! Four plus three equals seven. So the answer is five to the seven. That\'s seventy-eight thousand, one hundred and twenty-five!"',

    # ── PART 5: Quotient Rule (Law 2) (9 scenes) ──────────────────────────────────
    'Elephant: "Fantastic! Law Two — the Quotient Rule. a to the m DIVIDED BY a to the n equals a to the m MINUS n."',
    'Fox: "So dividing powers with the same base — you SUBTRACT the exponents instead of adding? That\'s the opposite of the product rule!"',
    'Elephant: "Exactly the opposite! Let\'s verify. Three to the five divided by three to the two."',
    'Fox: "Expanded: three to the five is three times three times three times three times three. Divided by three times three — the two threes cancel out, leaving three cubed!"',
    'Elephant: "And five minus two equals three. Quotient rule confirmed! The cancelled factors are why subtraction works."',
    'Fox: "Oh I love when the math actually shows WHY the rule is true, not just memorise it blindly."',
    'Elephant: "Always understand the WHY. Now — what if the exponent on the bottom is BIGGER? Like two to the three divided by two to the seven?"',
    'Fox: "Three minus seven is... negative four. So the answer is two to the NEGATIVE four? Negative exponents are a thing?!"',
    'Elephant: "Oh yes they are! And they\'re actually really elegant — but we\'ll circle back to those. For now, just know the rule still works even with negative results."',

    # ── PART 6: Power Rule (Law 3) (9 scenes) ─────────────────────────────────────
    'Elephant: "Law Three — the Power Rule! When you raise a power to ANOTHER power: a to the m, all in brackets, raised to the n — equals a to the m TIMES n."',
    'Fox: "So now it\'s multiplication of exponents? Product law adds, quotient law subtracts, power law MULTIPLIES. I need a second to process this."',
    'Elephant: "Take your time! Let\'s make it concrete. Two to the three, raised to the power of four."',
    'Fox: "That means two to the three, multiplied by itself four times. So I\'m adding three, four times — that\'s three times four equals twelve. Two to the twelve!"',
    'Elephant: "Perfect reasoning! You re-discovered the rule yourself. Three times four is twelve — the answer is two to the twelve, which is four thousand and ninety-six."',
    'Fox: "That\'s massive. Exponents can get HUGE fast."',
    'Elephant: "That\'s the power of exponents — pun intended. They represent explosive growth. Now, there\'s a bonus variant: a times b, all in brackets, to the power n — equals a to the n times b to the n."',
    'Fox: "So the exponent distributes over multiplication inside the bracket? Like two times three, to the power of four — that\'s two to the four times three to the four?"',
    'Elephant: "Spot on! Sixteen times eighty-one — twelve hundred and ninety-six. And six to the four is also twelve hundred and ninety-six. The law checks out!"',

    # ── PART 7: Negative Exponents & Recap (10 scenes) ────────────────────────────
    'Elephant: "Alright Fox, you\'ve crushed three laws. Now let\'s tackle NEGATIVE exponents. What does a to the negative n actually mean?"',
    'Fox: "Based on the quotient rule pattern — I\'m guessing it\'s like going \'below one\' on the power scale?"',
    'Elephant: "Sharp! a to the negative n equals ONE divided by a to the n. It\'s the RECIPROCAL. Two to the negative three equals one over two to the three, which is one over eight."',
    'Fox: "So negative exponents don\'t give you negative NUMBERS — they give you fractions! Ten to the negative two is one over hundred, which is zero point zero one!"',
    'Elephant: "Exactly! Negative exponents represent very SMALL numbers — fractions. This is massive in science — like the size of an atom is ten to the negative ten metres!"',
    'Fox: "Whoa. So exponents work in both directions — huge numbers going up, tiny fractions going down. It\'s like a number superpower."',
    'Elephant: "Perfect description. Let\'s do a quick recap of ALL the laws we\'ve covered."',
    'Fox: "Okay — Product Rule: same base, multiply, ADD exponents. Quotient Rule: same base, divide, SUBTRACT exponents. Power Rule: power of a power, MULTIPLY exponents."',
    'Elephant: "And Zero Exponent: anything to the zero is one. Negative Exponent: flip it to a fraction. You just rattled off five laws from memory!"',
    'Fox: "Wait — I actually know all of these now?! When did THAT happen?!"',

    # ── PART 8: Real-World Application + Challenge (9 scenes) ─────────────────────
    'Elephant: "One more thing before we celebrate — let\'s see exponents in the REAL WORLD."',
    'Fox: "Yes! What\'s the point of all this if I can\'t use it outside of class?"',
    'Elephant: "Science uses it constantly. The speed of light is about three times ten to the power of eight metres per second. That\'s three hundred million metres per second!"',
    'Fox: "And instead of writing three hundred million, scientists just write three times ten to the eight? That\'s... actually so much easier."',
    'Elephant: "That\'s called Scientific Notation — and it\'s built entirely on exponents. Computers measure storage in powers of two — one kilobyte is two to the ten bytes!"',
    'Fox: "Two to the ten is one thousand and twenty-four. So a kilobyte is actually one thousand and twenty-four bytes, not one thousand exactly!"',
    'Elephant: "You just learned something most adults don\'t know! Alright — final challenge. Simplify: two to the three, times two to the four, divided by two to the five, all raised to the power of two."',
    'Fox: "Okay okay — inside the bracket: three plus four minus five equals two. So it\'s two to the two, raised to the power of two. That\'s two to the two times two equals two to the four — which is sixteen!"',
    'Elephant: "SIXTEEN! Perfect! You combined all three laws in one expression. Fox, you are officially an Exponent Expert!"',
]

# 2. SCENE COUNT PER PART
part_counts = [10, 9, 9, 10, 9, 9, 10, 9]

# Verify total
assert sum(part_counts) == len(dialogues), f"Mismatch: {sum(part_counts)} counts vs {len(dialogues)} dialogues"

# ── Canvas ────────────────────────────────────────────────────────────────────
W = 1920
H = 1080
CX = W // 2   # 960
CY = H // 2   # 540

# ── Character type names (must match .glb filenames in public/) ───────────────
ELEPHANT = "elephant"
FOX = "fox"

def get_math_stack_dsl(scene_idx):
    blocks = [
        "- label 2¹\n      desc Value: 2\n      color #06b6d4",
        "- label 2²\n      desc Value: 4\n      color #10b981",
        "- label 2³\n      desc Value: 8\n      color #f59e0b",
        "- label 2⁴\n      desc Value: 16\n      color #f43f5e",
        "- label 2⁵\n      desc Value: 32\n      color #a855f7"
    ]
    visible = min(len(blocks), max(1, (scene_idx // 2) + 1))
    active_blocks = "\n    ".join(blocks[:visible])
    return f"infographic list-pyramid-badge-card\ntheme gradient-vibrant\ndata\n  lists\n    {active_blocks}"

def get_base_config(part_idx, scene_index_in_part):
    # Backgrounds: Forest (1-3) | Math (4-6) | Classroom (7-8)
    forest_bg    = "forest_bg.png"
    math_bg      = "math_bg.png"
    classroom_bg = "classroom_bg.png"

    configs = [
        # Part 1 — Intro to Exponents (Forest)
        {
            "env": forest_bg,
            "assets": [],
            "infographics": [
                {"dsl": get_math_stack_dsl(scene_index_in_part), "x": 50, "y": 60, "width": "800px", "height": "800px", "scale": 1.5}
            ],
            "text": [
                {"text": "2 × 2 × 2 × 2 × 2 = ?", "x": 50, "y": 20, "size": 90, "color": "#FFD700"}
            ] if scene_index_in_part == 0 else [
                {"text": "2 × 2 × 2 × 2 × 2 = 32", "x": 50, "y": 20, "size": 90, "color": "#FFD700"}
            ] if scene_index_in_part == 1 else [
                {"text": "2^5 = 32", "x": 50, "y": 20, "size": 120, "color": "#00E5FF"}
            ] if scene_index_in_part >= 2 and scene_index_in_part <= 4 else [
                {"text": "Base: 2   Exponent: 5", "x": 50, "y": 20, "size": 80, "color": "#FF9100"}
            ] if scene_index_in_part >= 5 else [
                {"text": "2^5 = 2 × 2 × 2 × 2 × 2", "x": 50, "y": 20, "size": 90, "color": "#76FF03"}
            ]
        },
        # Part 2 — Reading & Writing Exponents (Forest)
        {
            "env": forest_bg,
            "assets": [],
            "infographics": [
                {"dsl": get_math_stack_dsl(scene_index_in_part + 5), "x": 50, "y": 60, "width": "800px", "height": "800px", "scale": 1.5}
            ],
            "text": [
                {"text": "3^4 = ?", "x": 50, "y": 20, "size": 120, "color": "#00E5FF"}
            ] if scene_index_in_part <= 1 else [
                {"text": "3^4 = 3 × 3 × 3 × 3 = 81", "x": 50, "y": 20, "size": 90, "color": "#00E5FF"}
            ] if scene_index_in_part <= 5 else [
                {"text": "5^3 = ?", "x": 50, "y": 20, "size": 120, "color": "#FF6B6B"}
            ] if scene_index_in_part == 6 else [
                {"text": "5^3 = 5 × 5 × 5 = 125", "x": 50, "y": 20, "size": 90, "color": "#FF6B6B"}
            ]
        },
        # Part 3 — Zero & One Exponents (Forest)
        {
            "env": forest_bg,
            "assets": [
                {"id": "number_line", "src": "exponent_number_line.png", "x": CX, "y": CY + 250, "scale": 1.5}
            ],
            "text": [
                {"text": "10^1 = 10", "x": 50, "y": 20, "size": 100, "color": "#FF6B6B"}
            ] if scene_index_in_part <= 2 else [
                {"text": "10^0 = ?", "x": 50, "y": 20, "size": 100, "color": "#FF6B6B"}
            ] if scene_index_in_part == 3 else [
                {"text": "10^0 = 1", "x": 50, "y": 20, "size": 120, "color": "#76FF03"}
            ] if scene_index_in_part <= 5 else [
                {"text": "10^3=1000  10^2=100  10^1=10  10^0=1", "x": 50, "y": 20, "size": 65, "color": "#FFD700"}
            ]
        },
        # Part 4 — Product Rule (Math Lab)
        {
            "env": math_bg,
            "assets": [
                {"id": "laws_scroll", "src": "exponent_laws_scroll.png", "x": CX, "y": CY - 30, "scale": 1.0}
            ],
            "text": [
                {"text": "Product Rule: a^m × a^n = a^(m+n)", "x": 50, "y": 15, "size": 65, "color": "#76FF03"}
            ] if scene_index_in_part <= 3 else [
                {"text": "2^3 × 2^4 = 2^(3+4) = 2^7", "x": 50, "y": 15, "size": 80, "color": "#76FF03"}
            ] if scene_index_in_part <= 7 else [
                {"text": "5^4 × 5^3 = 5^7 = 78,125", "x": 50, "y": 15, "size": 80, "color": "#76FF03"}
            ]
        },
        # Part 5 — Quotient Rule (Math Lab)
        {
            "env": math_bg,
            "assets": [
                {"id": "laws_scroll", "src": "exponent_laws_scroll.png", "x": CX, "y": CY - 30, "scale": 1.0}
            ],
            "text": [
                {"text": "Quotient Rule: a^m ÷ a^n = a^(m-n)", "x": 50, "y": 15, "size": 65, "color": "#FF9100"}
            ] if scene_index_in_part <= 1 else [
                {"text": "3^5 ÷ 3^2 = 3^(5-2) = 3^3", "x": 50, "y": 15, "size": 80, "color": "#FF9100"}
            ] if scene_index_in_part <= 5 else [
                {"text": "2^3 ÷ 2^7 = 2^(3-7) = 2^(-4)", "x": 50, "y": 15, "size": 80, "color": "#FF9100"}
            ]
        },
        # Part 6 — Power Rule (Math Lab)
        {
            "env": math_bg,
            "assets": [
                {"id": "laws_scroll", "src": "exponent_laws_scroll.png", "x": CX, "y": CY - 30, "scale": 1.0}
            ],
            "text": [
                {"text": "Power Rule: (a^m)^n = a^(m×n)", "x": 50, "y": 15, "size": 70, "color": "#EA80FC"}
            ] if scene_index_in_part <= 1 else [
                {"text": "(2^3)^4 = 2^(3×4) = 2^12", "x": 50, "y": 15, "size": 80, "color": "#EA80FC"}
            ] if scene_index_in_part <= 5 else [
                {"text": "(a×b)^n = a^n × b^n", "x": 50, "y": 15, "size": 80, "color": "#EA80FC"}
            ] if scene_index_in_part == 6 else [
                {"text": "(2×3)^4 = 2^4 × 3^4", "x": 50, "y": 15, "size": 80, "color": "#EA80FC"}
            ]
        },
        # Part 7 — Negative Exponents & Recap (Classroom)
        {
            "env": classroom_bg,
            "assets": [
                {"id": "number_line", "src": "exponent_number_line.png", "x": CX, "y": CY + 250, "scale": 1.5}
            ],
            "text": [
                {"text": "a^(-n) = 1 / a^n", "x": 50, "y": 15, "size": 90, "color": "#FF4081"}
            ] if scene_index_in_part <= 1 else [
                {"text": "2^(-3) = 1 / 2^3 = 1 / 8", "x": 50, "y": 15, "size": 80, "color": "#FF4081"}
            ] if scene_index_in_part <= 2 else [
                {"text": "10^(-2) = 1 / 100 = 0.01", "x": 50, "y": 15, "size": 80, "color": "#FF4081"}
            ] if scene_index_in_part <= 5 else [
                {"text": "The Laws of Exponents Recap!", "x": 50, "y": 15, "size": 80, "color": "#FFD700"}
            ]
        },
        # Part 8 — Real World & Challenge (Classroom)
        {
            "env": classroom_bg,
            "assets": [],
            "text": [
                {"text": "Speed of Light = 3 × 10^8 m/s", "x": 50, "y": 20, "size": 75, "color": "#64FFDA"}
            ] if scene_index_in_part <= 3 else [
                {"text": "1 Kilobyte = 2^10 bytes = 1,024 bytes", "x": 50, "y": 20, "size": 65, "color": "#64FFDA"}
            ] if scene_index_in_part <= 5 else [
                {"text": "[(2^3 × 2^4) ÷ 2^5]^2 = ?", "x": 50, "y": 20, "size": 90, "color": "#FF4081"}
            ] if scene_index_in_part == 6 else [
                {"text": "[(2^7) ÷ 2^5]^2 = (2^2)^2", "x": 50, "y": 20, "size": 80, "color": "#FF4081"}
            ] if scene_index_in_part == 7 else [
                {"text": "2^4 = 16. You are an Expert!", "x": 50, "y": 20, "size": 80, "color": "#76FF03"}
            ]
        },
    ]
    return configs[part_idx]


# ── Scene generation ──────────────────────────────────────────────────────────
idx = 0
for part_idx, count in enumerate(part_counts):
    scenes = []
    for i in range(count):
        sub = dialogues[idx]
        is_elephant = True  # Elephant is on the left (teacher)

        if sub.startswith("Fox:"):
            is_elephant = False
        elif sub.startswith("Elephant:"):
            is_elephant = True
        else:
            is_elephant = True

        # Strip speaker prefix for subtitle display
        sub_text = re.sub(r'^.*?:\s*"?', "", sub).rstrip('"')

        step_id = f"scene_{part_idx+1:02d}_{i+1:03d}"

        # Poses
        elephant_pose = "gesture-positive" if is_elephant else "idle"
        fox_pose      = "gesture-positive" if not is_elephant else "idle"

        # Base Rotations for 3/4 profile facing each other
        elephant_rot = 75
        fox_rot      = -75

        elephant_actions = [{"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": elephant_rot}}]
        fox_actions      = [{"type": "glide", "duration": 0.1, "targetState": {"x":  4, "y": -1, "scale": 1.2, "rotationY": fox_rot}}]

        # Hop animation for the speaker
        if is_elephant:
            elephant_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": 4, "scale": 1.2, "rotationY": elephant_rot}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": elephant_rot}}
            ])
        else:
            fox_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": 4, "scale": 1.2, "rotationY": fox_rot}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": fox_rot}}
            ])

        config = get_base_config(part_idx, i)

        scene = {
            "stepId": step_id,
            "audioFile": f"{step_id}.wav",
            "subtitle": sub_text,
            "environment": {"background": config["env"]},
            "characters": [
                {
                    "type": ELEPHANT,
                    "pose": elephant_pose,
                    "actions": elephant_actions
                },
                {
                    "type": FOX,
                    "pose": fox_pose,
                    "actions": fox_actions
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

        if "infographics" in config:
            scene["infographics"] = config["infographics"]

        # Confetti on the very last scene!
        if idx == len(dialogues) - 1:
            scene["effects"] = {"confetti": True}

        scenes.append(scene)
        idx += 1

    with open(os.path.join(project_dir, f"part{part_idx+1}.json"), "w", encoding="utf-8") as f:
        json.dump({"timeline": scenes}, f, indent=2)

# === video_spec.json ===
project_name = os.path.basename(project_dir)
video_spec = {
    "meta": {
        "videoId": project_name,
        "targetAge": "12-13",
        "hostCharacter": "elephant",
        "themeColor": "#FFD700",
        "fps": 30
    },
    "includes": [f"part{i+1}.json" for i in range(len(part_counts))]
}
with open(os.path.join(project_dir, "video_spec.json"), "w", encoding="utf-8") as f:
    json.dump(video_spec, f, indent=2)

print(f"Generated {len(part_counts)} parts with {idx} distinct scenes.")
print(f"video_spec.json written to: {project_dir}")
