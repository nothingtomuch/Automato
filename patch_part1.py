import json

path = r'C:\Automato\projects\fractions_and_decimals\part1.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

count = 0
for scene in data.get('timeline', []):
    has_monkey = any(c.get('type') == 'monkey' for c in scene.get('characters', []))
    if not has_monkey:
        if 'characters' not in scene:
            scene['characters'] = []
        scene['characters'].append({
            'type': 'monkey',
            'pose': 'idle',
            'actions': []
        })
        count += 1

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Added monkey to {count} scenes in part1.json")
