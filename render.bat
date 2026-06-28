@echo off
echo ========================================================
echo Automato Headless Render Pipeline
echo ========================================================

REM Step 1: Run the python compile pipeline
echo [1/2] Compiling video_spec.json to render_props.json...
python compile_pipeline.py
if %errorlevel% neq 0 (
    echo.
    echo ❌ Python compilation failed. Please check your video_spec.json.
    exit /b %errorlevel%
)

REM Step 2: Run Remotion renderer
echo.
echo [2/2] Rendering video via Remotion (Headless)...
npx remotion render src/index.ts EducationalVideo out.mp4 --props=dist/render_props.json
if %errorlevel% neq 0 (
    echo.
    echo ❌ Video rendering failed.
    exit /b %errorlevel%
)

echo.
echo ✅ Render complete! Video saved as out.mp4
