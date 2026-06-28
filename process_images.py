import os
import shutil
from PIL import Image

# Paths
bg_src = r"C:\Users\harji\.gemini\antigravity\brain\a9d77e5d-3591-4f80-bb1a-1a3cc20f4892\garden_bg_1782569291517.png"
banana_src = r"C:\Users\harji\.gemini\antigravity\brain\a9d77e5d-3591-4f80-bb1a-1a3cc20f4892\nano_banana_1782569303452.png"

public_dir = r"c:\Automato\public"
os.makedirs(public_dir, exist_ok=True)

bg_dest = os.path.join(public_dir, "garden_bg.png")
banana_dest = os.path.join(public_dir, "banana.png")

# Move and rename background
shutil.copy2(bg_src, bg_dest)

# Process banana (remove white background)
def remove_white_bg(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    # Tolerance for white-ish pixels
    threshold = 220
    for item in data:
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            # Change white to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, "PNG")

remove_white_bg(banana_src, banana_dest)
print("Images processed and moved to public/")
