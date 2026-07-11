import os
from PIL import Image

def remove_white_bg(img_path):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()
    new_data = []
    threshold = 240
    for item in data:
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(img_path, "PNG")

public_dir = r'C:\Automato\projects\fractions_and_decimals\public'
for f in ['bamboo_whole.png', 'bamboo_half.png', 'bamboo_tenth.png']:
    path = os.path.join(public_dir, f)
    if os.path.exists(path):
        remove_white_bg(path)
        print(f"Processed {f}")
