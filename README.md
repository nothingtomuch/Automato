# 🎬 Automato — AI-Powered Educational Video Studio

> Create animated, educational kids' videos with a 3D character, keyframed 2D sprites, background images, and confetti — all driven by a single JSON file.

---

## 📋 Table of Contents

1. [What Is This?](#what-is-this)
2. [Installation](#installation)
3. [Quick Start — Your First Video in 5 Minutes](#quick-start)
4. [Creating a Video with AI](#creating-a-video-with-ai)
5. [The Full JSON Schema Reference](#json-schema-reference)
6. [Available Characters](#available-characters)
7. [Available Animations (Poses)](#available-animations)
8. [Coordinate System Explained](#coordinate-system)
9. [Asset Guide](#asset-guide)
10. [Troubleshooting](#troubleshooting)

---

## What Is This?

Automato is a video generation pipeline built on top of [Remotion](https://remotion.dev). You describe your video in a `video_spec.json` file, run two commands, and get a polished MP4 with:

- 🐾 An animated 3D cube-style animal character (parrot, monkey, etc.)
- 🌳 A full-screen background image (forest, classroom, etc.)
- 🍎 Keyframable 2D transparent PNG sprites (apples, trucks, boxes, baskets…)
- 🎉 Confetti effects for celebration scenes
- 💬 Subtitles synced to audio

---

## Installation

### Prerequisites

You need these installed **before** using Automato. Follow each link for official instructions:

### 1. Node.js (v18 or higher)
Download from **https://nodejs.org/en/download**

- Choose the **LTS** version (Long Term Support)
- Run the installer, keep all defaults
- **Verify:** Open a new terminal and type:
  ```
  node --version
  ```
  You should see something like `v20.11.0`

### 2. Python (v3.10 or higher)
Download from **https://www.python.org/downloads/**

- On Windows: check **"Add Python to PATH"** before clicking Install
- **Verify:**
  ```
  python --version
  ```

### 3. FFmpeg
FFmpeg is needed to measure audio durations.

**Windows:**
1. Go to https://ffmpeg.org/download.html → Windows builds → download from **gyan.dev**
2. Extract the zip to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your system PATH:
   - Search "Environment Variables" in Start Menu
   - Edit `Path` → Add `C:\ffmpeg\bin`
4. **Verify:**
   ```
   ffmpeg -version
   ```

**Mac (via Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install ffmpeg
```

### 4. Install Automato Dependencies

Open a terminal in the `C:\Automato` folder and run:
```bash
npm install
```
This installs all JavaScript packages (takes 1-2 minutes, only needed once).

---

## Quick Start

### Step 1 — Edit your video spec
Open `video_spec.json` and describe your video (or use AI — see next section).

### Step 2 — Add your audio files
Put your `.wav` audio files in the `public/` folder. Name them to match `audioFile` in your JSON (e.g. `scene_01.wav`).

### Step 3 — Add your images
Put background images (`.jpg` or `.png`) and sprite PNGs (transparent!) in `public/`.

### Step 4 — Compile
```bash
python compile_pipeline.py
```
This validates your JSON and calculates frame timings from your audio files.

### Step 5 — Render
```bash
npx remotion render EducationalVideo out.mp4 --props=dist/render_props.json
```

Your video will appear as `out.mp4` in the project folder.

---

## Creating a Video with AI

See [`examples/AI_PROMPT.md`](examples/AI_PROMPT.md) for a ready-to-copy prompt you can paste into any AI assistant (ChatGPT, Gemini, Claude, etc.) to generate your `video_spec.json` automatically.

See also the example specs in [`examples/video_specs/`](examples/video_specs/) for inspiration.

---

## JSON Schema Reference

```json
{
  "meta": {
    "videoId": "my_video_001",
    "targetAge": "6-7",
    "hostCharacter": "parrot",
    "themeColor": "#FFDE4D",
    "fps": 30
  },
  "timeline": [
    {
      "stepId": "scene_01",
      "audioFile": "scene_01.wav",
      "subtitle": "Text shown at the bottom of the screen.",
      "environment": {
        "background": "forest.jpg"
      },
      "characterState": {
        "pose": "dance",
        "keyframes": [
          { "frame": 0,  "x": -4, "y": -1, "scale": 1.2, "rotationY": 0,   "rotationZ": 0 },
          { "frame": 45, "x": 0,  "y": -1, "scale": 1.2, "rotationY": 180, "rotationZ": 0 },
          { "frame": 90, "x": 4,  "y": -1, "scale": 1.2, "rotationY": 360, "rotationZ": 0 }
        ]
      },
      "sprites": [
        {
          "id": "apple_1",
          "src": "apple.png",
          "keyframes": [
            { "frame": 0,  "x": 200,  "y": 200, "scale": 1.0, "opacity": 0, "rotation": 0 },
            { "frame": 30, "x": 960,  "y": 540, "scale": 1.0, "opacity": 1, "rotation": 0 },
            { "frame": 90, "x": 1700, "y": 540, "scale": 1.0, "opacity": 1, "rotation": 0 }
          ]
        }
      ],
      "effects": {
        "confetti": true
      }
    }
  ]
}
```

### `meta` Fields

| Field | Required | Description |
|---|---|---|
| `videoId` | ✅ | Unique identifier for this video |
| `targetAge` | ✅ | Audience age, e.g. `"6-7"` |
| `hostCharacter` | ✅ | The 3D animal to use (see list below) |
| `themeColor` | ❌ | Hex colour for UI accents |
| `fps` | ❌ | Frames per second (default: 30) |

### `timeline[]` Scene Fields

| Field | Required | Description |
|---|---|---|
| `stepId` | ✅ | Unique scene name, e.g. `"scene_01_intro"` |
| `audioFile` | ✅ | Filename of the `.wav` file in `public/` |
| `subtitle` | ❌ | Text shown at the bottom of the frame |
| `environment.background` | ❌ | Image filename in `public/` (e.g. `"forest.jpg"`) |
| `characterState` | ✅ | Object controlling the 3D character |
| `sprites` | ❌ | Array of 2D animated overlay images |
| `effects.confetti` | ❌ | `true` to trigger confetti rain |

### `characterState` Fields

| Field | Required | Description |
|---|---|---|
| `pose` | ✅ | Animation to play (see list below) |
| `keyframes` | ❌ | Array of position/scale/rotation keyframes |

### Character Keyframe Properties (3D space)

| Property | Default | Description |
|---|---|---|
| `frame` | — | Which frame this keyframe applies to (relative to scene start) |
| `x` | `0` | Left/right position. Range: roughly **-5 (far left) to +5 (far right)** |
| `y` | `-1` | Up/down position. Range: roughly **-2 (bottom) to +2 (top)** — keep at -1 for "standing on ground" |
| `scale` | `1.2` | Size of the character. `1.2` = default, `2.0` = large, `0.6` = small |
| `rotationY` | `0` | Spin around vertical axis in degrees (0–360 for full spin) |
| `rotationZ` | `0` | Tilt sideways in degrees |

### Sprite Keyframe Properties (pixel space, 1920×1080)

| Property | Default | Description |
|---|---|---|
| `frame` | — | Which frame this keyframe applies to (relative to scene start) |
| `x` | `0` | Horizontal position in **pixels**. 0 = left edge, 1920 = right edge |
| `y` | `0` | Vertical position in **pixels**. 0 = top edge, 1080 = bottom edge |
| `scale` | `1` | Size multiplier |
| `opacity` | `1` | Transparency: 0 = invisible, 1 = fully visible |
| `rotation` | `0` | Rotation in degrees |

---

## Available Characters

Set `meta.hostCharacter` to any of these (lowercase, exact spelling):

`beaver`, `bee`, `bunny`, `cat`, `caterpillar`, `chick`, `cow`, `crab`, `deer`, `dog`,
`elephant`, `fish`, `fox`, `giraffe`, `hog`, `koala`, `lion`, `monkey`, `panda`, `parrot`,
`penguin`, `pig`, `polar`, `tiger`

---

## Available Animations

Set `characterState.pose` to one of:

| Pose | Description |
|---|---|
| `idle` | Standing still, subtle idle breathing |
| `static` | Completely frozen / no movement |
| `walk` | Walking in place |
| `run` | Running in place |
| `dance` | Fun dance move |
| `eat` | Eating animation |
| `gesture-positive` | Happy thumbs up / affirmative gesture |
| `gesture-negative` | Shaking head / disagreeing gesture |

---

## Coordinate System

The video uses **two separate coordinate systems**:

### 3D Character Coordinates (in `characterState.keyframes`)
```
       +2 (top)
        |
-5 ----+---- +5
(left)  |    (right)
       -2 (bottom)

Recommended y: always -1 (ground level)
Recommended scale: 0.8 (small) to 2.0 (large)
```

### 2D Sprite Coordinates (in `sprites[].keyframes`)
```
(0,0)-----------(1920,0)
  |                 |
  |   1920×1080     |
  |    screen       |
  |                 |
(0,1080)-------(1920,1080)

Center of screen = x:960, y:540
```

---

## Asset Guide

### Where to put files

| File type | Location | Example |
|---|---|---|
| Background images | `public/` | `public/forest.jpg` |
| Sprite PNGs (transparent) | `public/` | `public/apple.png` |
| Audio files | `public/` | `public/scene_01.wav` |

### Audio Requirements
- Format: **WAV** (recommended) or MP3
- The scene's duration is automatically calculated from the audio length
- A 3-second audio file = a 90-frame scene at 30fps

### Image Requirements
- **Backgrounds**: Any size — will be stretched to 1920×1080. JPEG or PNG.
- **Sprites**: Must have **transparent background** (PNG with alpha channel). Any size, but 200–500px is typical.

---

## Troubleshooting

See [`examples/TROUBLESHOOTING.md`](examples/TROUBLESHOOTING.md) for a full list of errors and fixes.
