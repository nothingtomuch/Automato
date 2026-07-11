import re

script_path = r"C:\Users\harji\.gemini\antigravity\brain\6a449029-27bb-484b-b737-6d9829abfdb3\script_draft.md"
with open(script_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

dialogues = []
for line in lines:
    m = re.search(r"\d+\.\s+\*\*(.*?)\*\*:\s+\"(.*)\"", line)
    if m:
        speaker = m.group(1)
        text = m.group(2)
        # escape quotes
        text = text.replace('"', '\\"')
        dialogues.append(f'    "{speaker}: {text}"')

new_dialogues_str = "dialogues = [\n" + ",\n".join(dialogues) + "\n]"

with open("c:/Automato/projects/fractions_and_decimals_proper/gen_final.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace dialogues
content = re.sub(r"dialogues\s*=\s*\[.*?\]", new_dialogues_str, content, flags=re.DOTALL)

# Fix logic
old_logic = """        # Determine who is speaking to assign poses/animations
        if "Monkey" in sub and not sub.startswith("Monkey"):
            is_panda = True # Panda talking about monkey
        elif sub.startswith("Monkey:") or "I love" in sub or "Chomp!" in sub or "I know!" in sub or "I'm so" in sub or "I ate" in sub:
            is_panda = False
            sub = sub.replace("Monkey: ", "")
        
        sub = sub.replace("Panda: ", "").replace("Monkey: ", "")"""

new_logic = """        # Determine who is speaking to assign poses/animations
        is_panda = True
        if sub.startswith("Monkey:"):
            is_panda = False
        
        # Clean subtitle
        if sub.startswith("Panda: "):
            sub = sub[7:]
        elif sub.startswith("Monkey: "):
            sub = sub[8:]"""
            
content = content.replace(old_logic, new_logic)

# Fix jumps
old_jump = """        if is_panda:
            panda_actions.extend([
                {"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": 1, "scale": 1.2, "rotationY": 75}},
                {"type": "glide", "duration": 0.1, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": 75}}
            ])
        else:
            monkey_actions.extend([
                {"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": 1, "scale": 1.2, "rotationY": -75}},
                {"type": "glide", "duration": 0.1, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": -75}}
            ])"""
            
new_jump = """        if is_panda:
            panda_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": 4, "scale": 1.2, "rotationY": 75}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": -4, "y": -1, "scale": 1.2, "rotationY": 75}}
            ])
        else:
            monkey_actions.extend([
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": 4, "scale": 1.2, "rotationY": -75}},
                {"type": "glide", "duration": 0.25, "targetState": {"x": 4, "y": -1, "scale": 1.2, "rotationY": -75}}
            ])"""
            
content = content.replace(old_jump, new_jump)

with open("c:/Automato/projects/fractions_and_decimals_proper/gen_final.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed gen_final.py")
