import argparse
import os

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Error: Required libraries not found.")
    print("Please run: pip install rembg pillow")
    exit(1)

def remove_background(input_path, output_path):
    print(f"Processing: {input_path}")
    if not os.path.exists(input_path):
        print(f"Error: File '{input_path}' does not exist.")
        return

    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path, "PNG")
        print(f"Successfully saved to: {output_path}")
    except Exception as e:
        print(f"Error removing background: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove image background using rembg")
    parser.add_argument("input", help="Path to input image")
    parser.add_argument("output", help="Path to output PNG file")
    args = parser.parse_args()
    
    remove_background(args.input, args.output)
