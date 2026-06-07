# 🔧 Troubleshooting Guide

This guide covers every common error you may encounter and exactly how to fix it.

---

## Table of Contents

1. [Installation Errors](#installation-errors)
2. [Compile Pipeline Errors (`python compile_pipeline.py`)](#compile-pipeline-errors)
3. [Render Errors (`npx remotion render ...`)](#render-errors)
4. [Video Looks Wrong](#video-looks-wrong)
5. [Getting Help](#getting-help)

---

## Installation Errors

### ❌ `'node' is not recognized as an internal or external command`
**Cause:** Node.js is not installed or not on PATH.
**Fix:** Download and install Node.js from https://nodejs.org. Restart your terminal after installing.

---

### ❌ `'python' is not recognized...` or `'python3' is not recognized...`
**Cause:** Python is not installed or not on PATH.
**Fix:** 
- Download Python from https://python.org/downloads
- **CRITICAL on Windows:** Check ✅ "Add Python to PATH" during installation
- Restart your terminal after installing

---

### ❌ `'ffprobe' is not recognized` or `'ffmpeg' is not recognized`
**Cause:** FFmpeg is not installed or not on PATH.
**Fix (Windows):**
1. Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/ (get the "release essentials" zip)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your system PATH:
   - Press Windows key → search "environment variables" → Edit the system environment variables
   - Click "Environment Variables" → find "Path" under System Variables → Edit → New → type `C:\ffmpeg\bin`
4. Open a **new** terminal and test: `ffprobe -version`

**Fix (Mac):**
```bash
brew install ffmpeg
```

**Fix (Linux):**
```bash
sudo apt install ffmpeg
```

---

### ❌ `npm install` fails with permission errors
**Fix (Windows):** Run your terminal as Administrator (right-click → "Run as administrator")
**Fix (Mac/Linux):** Do NOT use `sudo npm install`. Instead fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-with-npm-locally

---

### ❌ `npm install` fails with `ERESOLVE` or dependency conflicts
**Fix:**
```bash
npm install --legacy-peer-deps
```

---

## Compile Pipeline Errors

### ❌ `[FATAL] Input file not found`
**Cause:** `video_spec.json` doesn't exist in the Automato folder.
**Fix:** Make sure you've saved your `video_spec.json` in `C:\Automato\video_spec.json`

---

### ❌ `[FATAL] Input is not valid JSON`
**Cause:** Your JSON has a syntax error (missing comma, extra comma, unquoted key, etc.)
**Fix:**
1. Copy your JSON into https://jsonlint.com
2. Click "Validate JSON" — it will highlight exactly where the error is
3. Common mistakes:
   - Trailing comma: `{ "a": 1, }` ← remove the last comma
   - Missing quotes: `{ pose: "idle" }` ← should be `{ "pose": "idle" }`
   - Single quotes: `{ "a": 'hello' }` ← must be double quotes

---

### ❌ `[FATAL] Schema validation failed: 'meta' is missing required keys`
**Cause:** Your `meta` object is missing `videoId`, `targetAge`, or `hostCharacter`.
**Fix:** Ensure your `meta` has all three:
```json
"meta": {
  "videoId": "my_video",
  "targetAge": "6-7",
  "hostCharacter": "parrot"
}
```

---

### ❌ `[FATAL] Schema validation failed: timeline[0] is missing required key 'audioFile'`
**Cause:** A scene is missing its `audioFile` field.
**Fix:** Every scene must have `audioFile`. Example:
```json
{ "stepId": "scene_01", "audioFile": "scene_01.wav", "characterState": { "pose": "idle" } }
```

---

### ❌ `[ERR] stepId='scene_01': Audio asset not found`
**Cause:** The audio file listed in `audioFile` doesn't exist in the `public/` folder.
**Fix:** 
- Check that `public/scene_01.wav` exists (note: **no leading slash** in the filename)
- Make sure the filename in the JSON matches exactly (case-sensitive on Mac/Linux)
- If you don't have audio yet, use the setup script to generate silent placeholders:
  ```bash
  python setup_audio.py
  ```

---

### ❌ `[WARN] pose 'run' is not a recognised GLTF animation. Falling back to 'idle'`
**Cause:** You used a pose name that doesn't exist in the character models.
**Fix:** Only use these exact pose names:
`idle`, `dance`, `eat`, `gesture-positive`, `gesture-negative`, `waving`, `carrying`, `excited`, `jumping`

---

## Render Errors

### ❌ `Error: Could not find composition with id "EducationalVideo"`
**Cause:** The Remotion composition name doesn't match.
**Fix:** Run exactly:
```bash
npx remotion render EducationalVideo out.mp4 --props=dist/render_props.json
```
Note: Capital E, capital V in `EducationalVideo`.

---

### ❌ `Error: Cannot find module 'remotion'` or similar module errors
**Cause:** npm packages not installed.
**Fix:**
```bash
npm install
```

---

### ❌ `Error loading image with src: http://localhost:3000/public/apple.png` (404)
**Cause:** A file referenced in your JSON's `sprites[].src` or `environment.background` doesn't exist in `public/`.
**Fix:** 
- Check that the file exists in `C:\Automato\public\apple.png`
- The filename is case-sensitive on Mac/Linux
- If you want to test without the real image, create a placeholder:
  ```bash
  python -c "
  from PIL import Image
  img = Image.new('RGBA', (200, 200), (255, 0, 0, 128))
  img.save('public/apple.png')
  "
  ```
  Or simply copy any PNG file into public/ and rename it.

---

### ❌ `Error loading image with src: ...jungle_clearing.png` (404)
**Cause:** Background image file missing.
**Fix:** Either:
1. Add your real background image to `public/` with the correct filename, OR
2. Remove the `environment` block from your scene JSON if you don't want a background

---

### ❌ `Minified React error #130` or `React error: Element type is invalid`
**Cause:** A component is broken or returning `undefined`.
**Fix:** This is an internal code error — please report it with the full error message.

---

### ❌ Render gets stuck at 0 frames and doesn't progress
**Cause:** A scene has a broken sprite or component that crashes on frame 0.
**Fix:** 
1. Remove all `sprites` from your JSON temporarily
2. Re-run the render — if it works, add sprites back one by one to find the broken one

---

### ❌ `THREE.Clock: This module has been deprecated`
**Cause:** Warning from the Three.js library. **This is NOT an error** — it's just a warning.
**Fix:** Ignore it. It does not affect the output.

---

### ❌ Render is very slow (takes many minutes)
**Cause:** Normal — 3D rendering is computationally expensive, especially with many scenes.
**Expected times:**
- 15-second video (450 frames): ~1–2 minutes
- 1-minute video (1800 frames): ~5–10 minutes
**Tip:** You can reduce the resolution or frame rate for faster test renders:
```bash
npx remotion render EducationalVideo out.mp4 --props=dist/render_props.json --scale=0.5
```

---

## Video Looks Wrong

### 🐾 Character is not visible / all black
**Cause:** The 3D model file is missing.
**Fix:** Check that `public/animal-parrot.glb` exists (replace `parrot` with your character name).

---

### 🐾 Character is too big / fills the whole screen
**Fix:** Reduce `scale` in your character keyframes. Try `0.8` or `1.0`.

---

### 🐾 Character doesn't move
**Cause:** No `keyframes` in `characterState`, OR all keyframes have the same position.
**Fix:** Add at least 2 keyframes with different `x` values:
```json
"keyframes": [
  { "frame": 0, "x": -4, "y": -1, "scale": 1.2 },
  { "frame": 90, "x": 4, "y": -1, "scale": 1.2 }
]
```

---

### 🖼️ Background image is not showing
**Cause:** Wrong filename or missing file.
**Fix:** 
- Check the file exists in `public/`
- Use the exact filename INCLUDING extension in JSON: `"background": "forest.jpg"` (not `"forest"`)

---

### 🎯 Sprite is in the wrong position
**Cause:** Pixel coordinates are different from what you expected.
**Fix:** 
- Screen is 1920 wide × 1080 tall
- Center = `x: 960, y: 540`
- Bottom of screen ≈ `y: 850–900` (leave some room)
- To figure out position: imagine the 1920×1080 screen, count pixels from top-left corner

---

### 🎯 Sprite appears but is invisible
**Cause:** `opacity` is set to `0`.
**Fix:** Make sure at least one keyframe has `"opacity": 1`.

---

### 🎉 Confetti not appearing
**Cause:** `effects.confetti` is not set to `true`.
**Fix:**
```json
"effects": { "confetti": true }
```
Note: `true` is lowercase with no quotes.

---

### 🎵 Audio not playing in video
**Cause:** Audio file is missing or corrupt.
**Fix:**
- Check that your `.wav` file exists in `public/`
- Test the file plays correctly in any media player
- WAV files must be standard PCM format (not compressed)

---

## Getting Help

1. **Check the error message carefully** — it usually tells you exactly what went wrong.
2. **Validate your JSON** at https://jsonlint.com before running the compiler.
3. **Try a minimal example** from `examples/video_specs/` to confirm the system works, then add your content back.
4. **The render logs** are very detailed — read the full output for clues.
