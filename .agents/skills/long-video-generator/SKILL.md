---
name: long-video-generator
description: Orchestrates the end-to-end creation of 5+ minute (70-80 scenes) Automato educational videos for children.
---

# Long Video Generator Skill

This skill allows you to build a full-length (5-8 minute) educational video without running into issues with coordinates, speaker extraction, text overlay timing, or asset generation.

Follow these phases exactly:

## Phase 0: Requirements Discussion (MANDATORY — Do This First!)
Before writing a single line of script or generating any asset, you MUST have a requirements conversation with the user. Think like a **film director in a pre-production meeting** — your job is to surface every detail that will affect the final video. Ask the following questions in a single, friendly message. Wait for the user's answers before proceeding.

**Ask the user:**
1. 🎯 **Topic & Learning Goal**: What is the exact topic? What should kids be able to DO after watching (e.g., "add fractions with the same denominator", not just "learn fractions")?
2. 🎂 **Target Age Group**: What age are the kids (5–7, 8–10, 11–13)? This determines vocabulary, pace, and complexity.
3. 🐾 **Characters**: Which two characters should host the video? (Default: Panda and Monkey). Should one be the "teacher" and one the "learner", or should they explore together?
4. 🌳 **Setting/Theme**: What world/background should the video take place in? (Forest, Space, Ocean, Classroom, etc.)
5. 🎨 **Key Visual Sprites**: What are the 2–3 most important physical objects that should appear on screen to illustrate the concept (e.g., a pizza, a number line, coins)?
6. 🧠 **Prior Knowledge**: What do the kids already know coming in? Should we assume they know basic addition? Counting to 100?
7. 💡 **Must-Include Tips**: Are there any specific mental math tricks or shortcuts you definitely want covered?
8. 🏁 **Tone**: Should the video be high-energy and silly (like a cartoon), or calm and clear (like a friendly tutor)?
9. 🧩 **Visual Breakdown Strategy**: For complex concepts (like flowcharts or multi-step math processes), should we break them down across multiple parts of the video, or focus heavily on one master diagram?

Only proceed to Phase 1 once you have answers to ALL of the above. If the user is unsure about any point, suggest a sensible default and confirm before continuing.

## Phase 1: Setup and Assets
1. **Create Project**: Create a new folder under `projects/` for the specific video (e.g., `projects/fractions_video/`).
2. **Generate Sprites**: Use your `generate_image` tool to create any sprites (e.g., a bamboo stick, a pie chart) required for the video.
   - **CRITICAL RULE**: NEVER generate AI images for mathematical facts or abstract diagrams (e.g., flowcharts, number lines, power towers, pyramids, equations). ALWAYS use the custom Infographic DSL for these. AI images are STRICTLY for characters, backgrounds, and decorative props.
3. **Remove Backgrounds**: We provide `scripts/remove_bg.py` in this skill. Run this script to strip the background from your generated images, ensuring they have transparency before you reference them in the video.

## Phase 2: Scripting (UX Driven)
* Think like an educational UX designer for children. Use storytelling, progressive disclosure, and engaging character dynamics.
* **Math Tips & Tricks**: Constantly look for opportunities to teach kids practical shortcuts (e.g., "when multiplying by 10, just add a zero at the end!") and design exercises that build strong mental math skills.
* **Length**: You MUST write 70-80 individual scenes (lines of dialogue) to ensure the video hits the 5-minute mark. DO NOT complain about the length or state that it will consume too many scenes; just do it.
* **Format**: Write your script in markdown, grouping into ~8 logical parts.
* **Speaker Tags**: Every single line of dialogue MUST start with explicit tags: `Character Name: "The dialogue here"`. E.g., `Panda: "Hello!"`
* **Text Positioning**: Characters occupy the center and bottom of the screen (`y: -1`). To ensure text overlays do not cover the characters, always position text at the top of the screen (`y: 15` to `y: 25`). When a large infographic is active on screen, momentarily scale characters down (`scale: 0.7`), shift them to the sides (`rotationY` tweaks), or fade them out so the diagram is clearly visible.
* **Scripture / Laws**: If you need to display written laws, rules, or scripture, use `generate_image` to create a blank scroll or parchment image sprite, and then use a `textOverlay` to place the actual text on top of it in the scene.
* **Celebration/Confetti**: Always trigger a confetti celebration at the end of the video (in the last scene) to reward the kids for completing the lesson! Use `"effects": {"confetti": true}` in the scene JSON.
* **Infographics & Flowcharts**: You can display visual diagrams in the video.
    **Progressive Disclosure (UX Focus)**: When displaying a flowchart or number line for an educational step, do not just drop the whole diagram at once. Coordinate the script scenes so the characters actively point to or narrate each step or cube as the `sps` (seconds per step) dictates, making the visual feel alive and synchronized with the dialogue.
    **⚠️ Syntax Guard**: When embedding the custom DSL inside a JSON file or scene config, you must strictly escape all double quotes inside the DSL string (e.g., use `\"Start\"` instead of `"Start"`) so the file remains valid JSON.
    1. **Flowcharts**: Use our custom flowchart DSL to show step-by-step algorithms (like long division). Create a JSON file (e.g. `infographic1.json`) with this exact format:
       ```json
       {
         "dsl": "infographic flowchart sps=1.5\nstep oval \"Start\" edge=\"\" color=#4caf50\nstep rect \"Action\" edge=\"\" color=#5e9eff\nstep diamond \"Question?\" edge=\"Yes\" color=#ff9800\nbranch \"No\" {\nstep rect \"Handle No\" edge=\"\" color=#e91e63\n}\nstep oval \"End\" edge=\"\" color=#4caf50"
       }
       ```
       - `sps`: seconds per step before the next node reveals
       - shapes: `oval` (start/end), `rect` (action), `diamond` (question)
       - `edge`: label for the arrow leaving this step
       - `branch "No" { ... }`: defines the "No" path branching off the previous diamond.
    2. **AntV Pyramids**: If rendering a pyramid hierarchy, use the legacy AntV syntax inside your JSON:
       ```json
       {
         "dsl": "infographic list-pyramid-badge-card\nlist {\n  label 2²\n  desc Value: 4\n  color #10b981\n}"
       }
       ```
    3. **Power Tower**: For 3D stacked cubes (like exponents), use this JSON format:
       ```json
       {
         "dsl": "infographic power-tower\ncube {\n  label 2^1\n  color #2979ff\n}\ncube {\n  label 2^2\n  color #00c853\n}"
       }
       ```
    4. **Number Line**: For sequential process steps or mathematical number lines, use this JSON format:
       ```json
       {
         "dsl": "infographic custom number-line\nstep 1 First step\nstep 2 Second step\nstep 3 Third step"
       }
       ```
    5. **Sizing**: In your scene generation, explicitly set large bounds (e.g., `width: "800px", height: "800px"`) for the `infographic` overlay so the chart is legible.
* **DRAFT CONFIRMATION (MANDATORY)**: After writing the script draft (and before moving to Phase 3), you MUST present the script to the user and explicitly ask for their approval. DO NOT proceed to Phase 3 until they confirm they are happy with the draft.

## Phase 3: Generator Script
1. Copy the `scripts/template_generator.py` from this skill directory into your newly created project directory.
2. Replace the `dialogues` array in the script with the EXACT 70-80 scenes you wrote, making sure the `Character Name: ` prefixes are intact.
3. Update the `part_counts` list in the script to match how many scenes are in each of your logical parts.
4. Update the `base_configs` in the script to load your new assets and define your `textOverlays`. 
    * *Crucial Timing Detail*: Do NOT put all your `textOverlays` in a part at once. The template allows you to inject text overlays conditionally based on the scene index `i` so they fade in gracefully EXACTLY when the speaker mentions them.
5. **Sanity Check**: Verify that the length of the `dialogues` array exactly matches the sum of the elements in `part_counts` before executing `template_generator.py` to prevent indexing errors during build time.
6. Run the script: `python template_generator.py`. This script perfectly handles `rotationY` (75 and -75) and dynamically creates `y: 4` hopping animations for whoever is speaking.

## Phase 4: Review and Publish
1. The generator script (Phase 3) will automatically produce **separate `part1.json`, `part2.json`, ...`partN.json` files** and a **`video_spec.json`** that references all of them via an `includes` array. The format is:
```json
{
  "meta": {
    "videoId": "<project_name>",
    "targetAge": "<e.g. 8-10>",
    "hostCharacter": "<left character name>",
    "themeColor": "<hex color>",
    "fps": 30
  },
  "includes": [
    "part1.json",
    "part2.json"
  ]
}
```
2. **DO NOT** generate audio, compile the pipeline, or render the video yourself.
3. Instead, use your `run_command` tool to start the Block Editor and Remotion Studio in the background for the user (run `npm run dev` in the editor directory and `npm run dev` in the main Automato directory). Set `WaitMsBeforeAsync` so the commands run in the background.
4. Tell the user that you have started the preview servers, and guide them to view the video in their browser. Tell them that when they are happy with the result, they should press the **Publish** button in the editor and download their final video from GitHub Actions.
