/**
 * decompiler.ts
 * Converts a raw video_spec.json payload back into a Blockly serialized
 * workspace state object.
 */

const KNOWN_BACKGROUNDS = [
  "forest_bg.png", "classroom_bg.png", "kitchen_bg.png",
  "space_bg.png", "ocean_bg.png", "desert_bg.png", "garden_bg.png"
];

const ANIMAL_MODELS = [
  "beaver", "bee", "bunny", "cat", "caterpillar", "chick", "cow", "crab",
  "deer", "dog", "elephant", "fish", "fox", "giraffe", "hog", "koala",
  "lion", "monkey", "panda", "parrot", "penguin", "pig", "polar", "tiger"
];

function snapX(val: number): string {
  const known = [0, -4, -8, -15, 4, 8, 15];
  const nearest = known.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a);
  return String(nearest);
}

function snapY(val: number): string {
  const known = [-1, 0, 5, -5];
  const nearest = known.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a);
  return String(nearest);
}

function buildGlideBlock(action: any, nextBlock?: any): any {
  const ts = action.targetState || {};
  return {
    type: "action_glide",
    fields: {
      duration: action.duration ?? 1,
      x: snapX(ts.x ?? 0),
      y: snapY(ts.y ?? -1),
      scale: ts.scale ?? 1.2,
      rotationX: ts.rotationX ?? 0,
      rotationY: ts.rotationY ?? 0,
      rotationZ: ts.rotationZ ?? 0,
    },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildWaitBlock(action: any, nextBlock?: any): any {
  return {
    type: "action_wait",
    fields: { duration: action.duration ?? 1 },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildActionChain(actions: any[]): any | undefined {
  if (!actions || actions.length === 0) return undefined;
  let current: any | undefined = undefined;
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i];
    if (a.type === 'glide') current = buildGlideBlock(a, current);
    else if (a.type === 'wait') current = buildWaitBlock(a, current);
  }
  return current;
}

function buildGridActionBlock(action: any, nextBlock?: any): any {
  let block: any;
  if (action.type === 'grid_init') {
    block = {
      type: "grid_init",
      fields: {
        gridId: action.gridId ?? "items",
        initialCount: action.initialCount ?? 1,
        src: action.src ?? "item.png",
        startX: action.startX ?? 300,
        startY: action.startY ?? 700,
        spacingX: action.spacingX ?? 200,
      }
    };
  } else if (action.type === 'grid_add') {
    block = { type: "grid_add", fields: { count: action.count ?? 1, gridId: action.gridId ?? "items" } };
  } else if (action.type === 'grid_destroy') {
    block = { type: "grid_destroy", fields: { index: action.index ?? 1, gridId: action.gridId ?? "items" } };
  } else if (action.type === 'wait') {
    block = { type: "action_wait", fields: { duration: action.duration ?? 1 } };
  } else {
    return nextBlock;
  }
  if (nextBlock) block.next = { block: nextBlock };
  return block;
}

function buildGridActionChain(gridActions: any[]): any | undefined {
  if (!gridActions || gridActions.length === 0) return undefined;
  let current: any | undefined = undefined;
  for (let i = gridActions.length - 1; i >= 0; i--) {
    current = buildGridActionBlock(gridActions[i], current);
  }
  return current;
}

function buildCharacterStateBlock(charState: any): any {
  const pose = charState?.pose ?? 'idle';
  const actions = charState?.actions ?? [];
  const actionChain = buildActionChain(actions);
  return {
    type: "character_state",
    fields: { pose },
    ...(actionChain ? { inputs: { ACTIONS: { block: actionChain } } } : {})
  };
}

function buildSceneBlock(scene: any, nextBlock?: any): any {
  const bg = scene.environment?.background ?? "";
  const isKnownBg = KNOWN_BACKGROUNDS.includes(bg);
  const charBlock = buildCharacterStateBlock(scene.characterState);
  const gridChain = buildGridActionChain(scene.gridActions ?? []);

  return {
    type: "scene",
    fields: {
      stepId: scene.stepId ?? "scene_01",
      audioFile: scene.audioFile ?? "audio.wav",
      subtitle: scene.subtitle ?? "",
      backgroundDropdown: isKnownBg ? bg : "CUSTOM",
      backgroundCustom: isKnownBg ? "my_bg.png" : bg,
      confetti: scene.effects?.confetti ? "TRUE" : "FALSE",
    },
    inputs: {
      CHARACTER_STATE: { block: charBlock },
      ...(gridChain ? { GRID_ACTIONS: { block: gridChain } } : {})
    },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildIncludeBlock(filename: string, nextBlock?: any): any {
  return {
    type: "include_spec",
    fields: { filename },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

export function specToBlocklyState(spec: any): any {
  const meta = spec.meta ?? {};
  const timeline: any[] = spec.timeline ?? [];
  const includes: string[] = spec.includes ?? [];

  const hostChar = ANIMAL_MODELS.includes(meta.hostCharacter) ? meta.hostCharacter : "cat";
  const targetAge = ["3-5", "6-7", "8-10", "11+"].includes(meta.targetAge) ? meta.targetAge : "6-7";

  // Build chain — either scene blocks or include_spec blocks
  let chain: any | undefined = undefined;

  if (includes.length > 0) {
    // Build include blocks from end to start
    for (let i = includes.length - 1; i >= 0; i--) {
      chain = buildIncludeBlock(includes[i], chain);
    }
  } else {
    // Build scene blocks from end to start
    for (let i = timeline.length - 1; i >= 0; i--) {
      chain = buildSceneBlock(timeline[i], chain);
    }
  }

  return {
    blocks: {
      languageVersion: 0,
      blocks: [{
        type: "video_spec",
        x: 30,
        y: 30,
        fields: {
          videoId: meta.videoId ?? "my_video",
          targetAge,
          fps: meta.fps ?? 30,
          hostCharacter: hostChar,
          themeColor: meta.themeColor ?? "#FF5733",
        },
        inputs: {
          ...(chain ? { TIMELINE: { block: chain } } : {})
        }
      }]
    }
  };
}
