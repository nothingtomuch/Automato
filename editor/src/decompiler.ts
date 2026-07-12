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

function buildCharacterStateBlock(charState: any, nextBlock?: any, fallbackHost?: string): any {
  const pose = charState?.pose ?? 'idle';
  const type = charState?.type ?? fallbackHost ?? 'bunny';
  const actions = charState?.actions ?? [];
  const actionChain = buildActionChain(actions);
  return {
    type: "character_state",
    fields: { type, pose },
    ...(actionChain ? { inputs: { ACTIONS: { block: actionChain } } } : {}),
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildCharacterStateChain(characters: any[], fallbackHost: string): any | undefined {
  if (!characters || characters.length === 0) return undefined;
  let current: any | undefined = undefined;
  for (let i = characters.length - 1; i >= 0; i--) {
    current = buildCharacterStateBlock(characters[i], current, fallbackHost);
  }
  return current;
}

function buildTextOverlayBlock(t: any, nextBlock?: any): any {
  const hasBg = !!t.bg;
  // Strip the trailing 'cc' alpha we added on export to recover the base hex
  const bgColor = hasBg ? t.bg.slice(0, 7) : '#000000';
  return {
    type: "text_overlay",
    fields: {
      text:    t.text   ?? '',
      x:       t.x      ?? 50,
      y:       t.y      ?? 35,
      size:    t.size   ?? 80,
      color:   t.color  ?? '#ffffff',
      bg:      bgColor,
      showBg:  hasBg ? 'TRUE' : 'FALSE',
    },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildTextOverlayChain(textOverlays: any[]): any | undefined {
  if (!textOverlays || textOverlays.length === 0) return undefined;
  let current: any | undefined = undefined;
  for (let i = textOverlays.length - 1; i >= 0; i--) {
    current = buildTextOverlayBlock(textOverlays[i], current);
  }
  return current;
}

function buildInfographicOverlayBlock(info: any, nextBlock?: any): any {
  return {
    type: "infographic_overlay",
    fields: {
      filename: info.filename ?? '',
      x:      info.x      ?? 50,
      y:      info.y      ?? 50,
      width:  info.width  ?? 400,
      height: info.height ?? 500,
      scale:  info.scale  ?? 1.5,
    },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildInfographicOverlayChain(infographics: any[]): any | undefined {
  if (!infographics || infographics.length === 0) return undefined;
  let current: any | undefined = undefined;
  for (let i = infographics.length - 1; i >= 0; i--) {
    current = buildInfographicOverlayBlock(infographics[i], current);
  }
  return current;
}

function buildSceneBlock(scene: any, nextBlock?: any, fallbackHost?: string): any {
  const bg = scene.environment?.background ?? "";
  const isKnownBg = KNOWN_BACKGROUNDS.includes(bg);
  
  // Support both new `characters` array and old `characterState`
  let charChain;
  if (scene.characters && Array.isArray(scene.characters)) {
    charChain = buildCharacterStateChain(scene.characters, fallbackHost ?? "bunny");
  } else {
    charChain = buildCharacterStateBlock(scene.characterState, undefined, fallbackHost ?? "bunny");
  }

  const gridChain   = buildGridActionChain(scene.gridActions ?? []);
  const textChain   = buildTextOverlayChain(scene.textOverlays ?? []);
  const infoChain   = buildInfographicOverlayChain(scene.infographics ?? []);

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
      ...(charChain  ? { CHARACTER_STATE:       { block: charChain  } } : {}),
      ...(gridChain  ? { GRID_ACTIONS:          { block: gridChain  } } : {}),
      ...(textChain  ? { TEXT_OVERLAYS:         { block: textChain  } } : {}),
      ...(infoChain  ? { INFOGRAPHIC_OVERLAYS:  { block: infoChain  } } : {}),
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

export function dslToBlocklyState(dsl: string): any {
  if (!dsl || !dsl.trim()) {
    return {
      blocks: {
        languageVersion: 0,
        blocks: [{
          type: "infographic_root",
          x: 30, y: 30,
          fields: { template: "flowchart", secondsPerStep: 1.5 }
        }]
      }
    };
  }
  
  const lines = dsl.split('\n').map(l => l.trim()).filter(Boolean);
  let template = "list-pyramid-badge-card";
  let firstLine = lines[0];
  let startIndex = 0;
  if (firstLine.startsWith("infographic ")) {
    const rest = firstLine.replace("infographic ", "").trim();
    if (rest.startsWith("flowchart")) {
      template = "flowchart";
      const spsM = rest.match(/sps=([\d.]+)/);
      const sps = spsM ? parseFloat(spsM[1]) : 1.5;

      // Parse step lines
      const stepRegex = /^step\s+(oval|rect|diamond)\s+"([^"]*)"\s+edge="([^"]*)"\s+color=(#[0-9a-fA-F]{3,8})/;
      const branchStartRegex = /^branch\s+"([^"]*)"\s*\{/;
      const steps: { shape: string; label: string; edgeLabel: string; color: string; branch?: { label: string; steps: any[] } }[] = [];

      let li = 1;
      while (li < lines.length) {
        const sm = lines[li].match(stepRegex);
        if (sm) {
          const step: any = { shape: sm[1], label: sm[2], edgeLabel: sm[3], color: sm[4] };
          li++;
          if (li < lines.length) {
            const bm = lines[li].match(branchStartRegex);
            if (bm) {
              const branchSteps: any[] = [];
              li++;
              while (li < lines.length && lines[li] !== '}') {
                const bsm = lines[li].match(stepRegex);
                if (bsm) branchSteps.push({ shape: bsm[1], label: bsm[2], edgeLabel: bsm[3], color: bsm[4] });
                li++;
              }
              step.branch = { label: bm[1], steps: branchSteps };
              li++; // skip }
            }
          }
          steps.push(step);
        } else { li++; }
      }

      // Build chain of flowchart_step blocks
      const buildStepChain = (stepArr: typeof steps): any => {
        if (stepArr.length === 0) return undefined;
        let chain: any = undefined;
        for (let i = stepArr.length - 1; i >= 0; i--) {
          const s = stepArr[i];
          let block: any = {
            type: "flowchart_step",
            fields: { shape: s.shape, label: s.label, edgeLabel: s.edgeLabel, color: s.color },
            ...(chain ? { next: { block: chain } } : {})
          };
          if (s.branch) {
            const branchChain = buildStepChain(s.branch.steps);
            block = {
              ...block,
              // Add branch block before the next chain
              next: {
                block: {
                  type: "flowchart_branch",
                  fields: { branchLabel: s.branch.label },
                  ...(branchChain ? { inputs: { BRANCH_STEPS: { block: branchChain } } } : {}),
                  ...(chain ? { next: { block: chain } } : {})
                }
              }
            };
          }
          chain = block;
        }
        return chain;
      };

      const stepChain = buildStepChain(steps);
      return {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: "infographic_root",
            x: 30, y: 30,
            fields: { template: "flowchart", secondsPerStep: sps },
            ...(stepChain ? { inputs: { ELEMENTS: { block: stepChain } } } : {})
          }]
        }
      };
    }
    template = rest.split(/\s/)[0]; // e.g. "power-tower"
    startIndex = 1;
  } else if (firstLine === "list-pyramid-badge-card" || firstLine === "custom number-line" || firstLine === "power-tower" || firstLine === "custom") {
    template = firstLine;
    startIndex = 1;
  } else if (firstLine.includes("power-tower") || firstLine.includes("power tower")) {
    template = "power-tower";
  } else if (firstLine.includes("pyramid")) {
    template = "list-pyramid-badge-card";
  } else if (firstLine.includes("number-line")) {
    template = "custom number-line";
  }

  // ── Power Tower: parse cube { } blocks ──────────────────────────────────────
  if (template === "power-tower") {
    const cubeRegex = /cube\s*\{([^}]+)\}/g;
    const cubes: { label: string; desc: string; color: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = cubeRegex.exec(dsl)) !== null) {
      const body = m[1];
      const label = (body.match(/label\s+(.+)/)?.[1] ?? '').trim();
      const desc  = (body.match(/desc\s+(.+)/)?.[1] ?? '').trim();
      const color = (body.match(/color\s+(#[0-9a-fA-F]{3,8})/)?.[1] ?? '#2979ff').trim();
      if (label) cubes.push({ label, desc, color });
    }

    let cubeChain: any = undefined;
    for (let i = cubes.length - 1; i >= 0; i--) {
      cubeChain = {
        type: "infographic_power_tower_cube",
        fields: { label: cubes[i].label, desc: cubes[i].desc, color: cubes[i].color },
        ...(cubeChain ? { next: { block: cubeChain } } : {})
      };
    }

    return {
      blocks: {
        languageVersion: 0,
        blocks: [{
          type: "infographic_root",
          x: 30, y: 30,
          fields: { template: "power-tower" },
          ...(cubeChain ? { inputs: { ELEMENTS: { block: cubeChain } } } : {})
        }]
      }
    };
  }
  
  // Robust parser for list items
  const parseItems = (lines: string[]) => {
    let items = [];
    let currentItem = null;
    let inList = false;
    
    for (let line of lines) {
      line = line.replace(/['"]/g, ''); // remove quotes
      if (line.includes("list {") || line === "list" || line === "{") {
        if (!currentItem) currentItem = { label: "", desc: "" };
        inList = true;
      } else if (line.includes("}") && currentItem) {
        items.push(currentItem);
        currentItem = null;
        inList = false;
      } else if (currentItem) {
        if (line.match(/^label\s*:?\s*/i)) currentItem.label = line.replace(/^label\s*:?\s*/i, "");
        if (line.match(/^desc\s*:?\s*/i)) currentItem.desc = line.replace(/^desc\s*:?\s*/i, "");
        // Handle fallback parsing if they just put text
        if (!line.toLowerCase().startsWith("label") && !line.toLowerCase().startsWith("desc")) {
          if (!currentItem.label) currentItem.label = line;
          else currentItem.desc += " " + line;
        }
      }
    }
    // Auto-close if missing }
    if (currentItem) items.push(currentItem);
    return items;
  };

  const items = parseItems(lines.slice(startIndex));
  
  const buildItemChain = (items: any[], isNumberLine = false) => {
    if (items.length === 0) return undefined;
    let chain: any = undefined;
    const blockType = isNumberLine ? "infographic_number_line_step" : "infographic_pyramid_item";
    for (let i = items.length - 1; i >= 0; i--) {
      chain = {
        type: blockType,
        fields: {
          label: items[i].label || `Step ${i+1}`,
          desc: items[i].desc || ""
        },
        ...(chain ? { next: { block: chain } } : {})
      };
    }
    return chain;
  };
  
  let elementsChain = undefined;
  if (template === "list-pyramid-badge-card" && items.length > 0) {
    elementsChain = {
      type: "infographic_pyramid",
      inputs: {
        ITEMS: { block: buildItemChain(items, false) }
      }
    };
  } else if (template === "custom number-line" && items.length > 0) {
    elementsChain = {
      type: "infographic_number_line",
      inputs: {
        STEPS: { block: buildItemChain(items, true) }
      }
    };
  } else if (items.length > 0) {
    // If it's custom or unknown, just use cards
    let chain: any = undefined;
    for (let i = items.length - 1; i >= 0; i--) {
      chain = {
        type: "infographic_card",
        fields: {
          title: items[i].label || `Card ${i+1}`,
          content: items[i].desc || ""
        },
        ...(chain ? { next: { block: chain } } : {})
      };
    }
    elementsChain = {
      type: "infographic_container",
      fields: { direction: "col" },
      inputs: { CHILDREN: { block: chain } }
    };
  }
  
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{
        type: "infographic_root",
        x: 30,
        y: 30,
        fields: { template },
        ...(elementsChain ? { inputs: { ELEMENTS: { block: elementsChain } } } : {})
      }]
    }
  };
}
