# 📁 examples/assets/ — Put Your Asset Files Here

This folder is for **example/demo asset files** used by the specs in `examples/video_specs/`.

## What Goes Here

- `truck.png` — A transparent PNG of a truck (for multiplication demos)
- `basket.png` — A transparent PNG of a basket (for addition demos)
- `apple.png` — A transparent PNG of an apple
- `box.png` — A transparent PNG of a box

## How to Use

1. Place your PNG files in this folder.
2. Copy them to `public/` when you want to use them in a render:
   ```bash
   copy examples\assets\truck.png public\truck.png
   ```

## Where to Get Free Transparent PNGs

- https://cleanpng.com — Search for any object, download transparent PNG
- https://pngwing.com — Large library of transparent PNGs
- https://freepng.pictures — Educational clip art
- https://www.flaticon.com — Clean flat icons with transparent backgrounds

## Tips for Good Sprites

- Use images with **transparent backgrounds** (PNG with alpha channel)
- Recommended size: **200×200px to 400×400px**
- The renderer can scale sprites up/down using the `scale` keyframe property
- Keep file sizes small (under 500KB each) for faster renders
