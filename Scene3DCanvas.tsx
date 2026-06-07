import { ThreeCanvas as Canvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, staticFile, getInputProps } from "remotion";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SpriteOverlay } from "./src/SpriteOverlay";
import { ConfettiOverlay } from "./src/ConfettiOverlay";
import { interpolate } from "remotion";

// Internal component to load and animate the GLB mesh
const CubePetModel = ({ character, pose, keyframes }: { character: string; pose: string; keyframes?: any[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);

  // Dynamically resolve the path verified by your Python script!
  const modelPath = staticFile(`animal-${character}.glb`);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      if (!groupRef.current) return;

      // Add the model to our React-Three group reference
      const model = gltf.scene;
      groupRef.current.add(model);

      // Set up the animation system from the GLB tracks
      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      // Find the exact animation track (idle, dance, eat, gesture-positive, gesture-negative)
      const clip = THREE.AnimationClip.findByName(gltf.animations, pose);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
        activeActionRef.current = action;
      }
    });

    // Cleanup tracks on scene unmount
    return () => {
      if (groupRef.current) groupRef.current.clear();
    };
  }, [modelPath, pose]);

  // Force the 3D animation timeline to lock directly onto Remotion's frame clock!
  // By updating the mixer during the render phase (before the canvas paints), we prevent a 1-frame lag/flicker.
  if (mixerRef.current) {
    const timeInSeconds = frame / fps;
    mixerRef.current.setTime(timeInSeconds);
  }

  // Interpolate keyframes for 3D properties
  let currentX = 0;
  let currentY = -1;
  let currentScale = 1.2; // Default smaller scale
  let currentRotationY = 0;
  let currentRotationZ = 0;

  if (keyframes && keyframes.length > 0) {
    const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
    const inputFrames = sorted.map((k) => k.frame);

    const safeInterp = (prop: string, def: number) => {
      const values = sorted.map((k) => (k[prop] !== undefined ? k[prop] : def));
      if (values.length === 1) return values[0];
      return interpolate(frame, inputFrames, values, {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    };

    currentX = safeInterp("x", 0);
    currentY = safeInterp("y", -1);
    currentScale = safeInterp("scale", 1.2);
    currentRotationY = safeInterp("rotationY", 0);
    currentRotationZ = safeInterp("rotationZ", 0);
  }

  return (
    <group
      ref={groupRef}
      position={[currentX, currentY, 0]}
      scale={currentScale}
      rotation={[0, currentRotationY * (Math.PI / 180), currentRotationZ * (Math.PI / 180)]}
    />
  );
};

// Main Scene Canvas Layout
export const Scene3DCanvas = ({ sceneData }: any) => {
  const { hostCharacter } = getInputProps().meta; // Grab the current global pet host
  const { pose, keyframes } = sceneData.characterState;
  
  const bgImage = sceneData.environment?.background 
    ? staticFile(sceneData.environment.background)
    : undefined;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* 0. Background Layer */}
      {bgImage && (
        <img
          src={bgImage}
          alt="background"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      )}

      {/* 1. The 3D Render Environment */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
        <Canvas width={1920} height={1080}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          <CubePetModel character={hostCharacter} pose={pose} keyframes={keyframes} />
        </Canvas>
      </div>

      {/* 2. Overlaid 2D Subtitles (Clean typography for 6-7 year olds) */}
      <div style={{
        position: "absolute",
        bottom: 80,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 20
      }}>
        <h1 style={{
          fontFamily: "Comic Sans MS, Arial, sans-serif", // Kid-friendly readable print
          fontSize: "64px",
          color: "#FFF",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: "20px 40px",
          borderRadius: "20px",
          textAlign: "center",
          maxWidth: "80%"
        }}>
          {sceneData.subtitle}
        </h1>
      </div>

      {/* 3. 2D Animated Sprites Layer */}
      {sceneData.sprites && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10 }}>
          <SpriteOverlay sprites={sceneData.sprites} />
        </div>
      )}

      {/* 4. Confetti Effects Layer */}
      {sceneData.effects?.confetti && <ConfettiOverlay />}
    </div>
  );
};