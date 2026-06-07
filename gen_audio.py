import asyncio
import edge_tts
import os

VOICE = "en-US-ChristopherNeural"

TEXTS = {
    "scene_01.wav": "Hi friends! I'm very hungry. Let's learn about fractions with pizza!",
    "scene_02.wav": "Look at this delicious pizza! Right now, it is one whole pizza. One over one.",
    "scene_03.wav": "But what if I want to share it with a friend? We can cut it right down the middle!",
    "scene_04.wav": "Now we have two equal pieces. When you divide a whole into two equal parts, each part is called a half.",
    "scene_05.wav": "We write a half as one over two. The two tells us how many pieces make a whole.",
    "scene_06.wav": "Two halves make one whole pizza. I think I'll eat this half right now. Mmmm, yummy!",
    "scene_07.wav": "Now only one half is left. You did a great job learning about fractions today!"
}

async def _main():
    for filename, text in TEXTS.items():
        filepath = os.path.join("public", filename)
        communicate = edge_tts.Communicate(text, VOICE)
        # edge-tts outputs mp3 by default, we will save as wav (ffprobe handles it fine anyway)
        # or we could use ffmpeg to convert, but mp3 is okay. We'll stick to .wav extension for consistency, 
        # even if it's mp3 encoding inside, remotion and ffprobe can read it.
        await communicate.save(filepath)
        print(f"Generated {filepath}")

if __name__ == "__main__":
    asyncio.run(_main())
