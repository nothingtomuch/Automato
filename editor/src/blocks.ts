import * as Blockly from 'blockly';
import { FieldColour } from '@blockly/field-colour';

export const defineBlocks = () => {
  const jsonGenerator = new Blockly.Generator('JSON');
  jsonGenerator.INDENT = '  ';

  const ANIMAL_MODELS: [string, string][] = [
    ["Beaver", "beaver"], ["Bee", "bee"], ["Bunny", "bunny"], ["Cat", "cat"],
    ["Caterpillar", "caterpillar"], ["Chick", "chick"], ["Cow", "cow"], ["Crab", "crab"],
    ["Deer", "deer"], ["Dog", "dog"], ["Elephant", "elephant"], ["Fish", "fish"],
    ["Fox", "fox"], ["Giraffe", "giraffe"], ["Hog", "hog"], ["Koala", "koala"],
    ["Lion", "lion"], ["Monkey", "monkey"], ["Panda", "panda"], ["Parrot", "parrot"],
    ["Penguin", "penguin"], ["Pig", "pig"], ["Polar Bear", "polar"], ["Tiger", "tiger"]
  ];

  // ── Video Spec Block ──────────────────────────────────────────────────────────
  Blockly.Blocks['video_spec'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🎬 Video Spec")
          .appendField("ID:")
          .appendField(new Blockly.FieldTextInput("my_video"), "videoId");
      this.appendDummyInput()
          .appendField("Age:")
          .appendField(new Blockly.FieldDropdown([
            ["3-5 Years", "3-5"], ["6-7 Years", "6-7"], ["8-10 Years", "8-10"], ["11+ Years", "11+"]
          ]), "targetAge")
          .appendField("FPS:")
          .appendField(new Blockly.FieldNumber(30, 1, 120), "fps");
      this.appendDummyInput()
          .appendField("Host:")
          .appendField(new Blockly.FieldDropdown(ANIMAL_MODELS), "hostCharacter")
          .appendField("Theme:")
          .appendField(new FieldColour("#FF5733"), "themeColor");
      this.appendStatementInput("TIMELINE")
          .setCheck(["Scene", "IncludeSpec"])
          .appendField("Timeline:");
      this.setColour(230);
      this.setTooltip("Root container for your video.");
    }
  };

  jsonGenerator.forBlock['video_spec'] = function(block: Blockly.Block) {
    const videoId       = block.getFieldValue('videoId');
    const targetAge     = block.getFieldValue('targetAge');
    const fps           = block.getFieldValue('fps');
    const hostCharacter = block.getFieldValue('hostCharacter');
    const themeColor    = block.getFieldValue('themeColor');

    const scenes: any[]   = [];
    const includes: string[] = [];

    let child = block.getInputTargetBlock('TIMELINE');
    while (child) {
      if (child.type === 'include_spec') {
        includes.push(child.getFieldValue('filename'));
      } else if (child.type === 'scene') {
        try {
          const code  = jsonGenerator.blockToCode(child) as string;
          const clean = code.replace(/,\s*$/, '');
          scenes.push(JSON.parse(clean));
        } catch { /* skip bad blocks */ }
      }
      child = child.getNextBlock();
    }

    const obj: any = {
      meta: { videoId, targetAge, hostCharacter, themeColor, fps: Number(fps) }
    };
    if (includes.length > 0) obj.includes = includes;
    else obj.timeline = scenes;
    return JSON.stringify(obj, null, 2);
  };

  // ── Include Spec Block ────────────────────────────────────────────────────────
  Blockly.Blocks['include_spec'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("📎 Include:")
          .appendField(new Blockly.FieldTextInput("part1.json"), "filename");
      this.setPreviousStatement(true, ["Scene", "IncludeSpec"]);
      this.setNextStatement(true,     ["Scene", "IncludeSpec"]);
      this.setColour(45);
      this.setTooltip("Reference an external part JSON file.");
    }
  };

  jsonGenerator.forBlock['include_spec'] = function(block: Blockly.Block) {
    return JSON.stringify({ _include: block.getFieldValue('filename') }) + ',\n';
  };

  // ── Scene Block — with auto-naming ────────────────────────────────────────────
  Blockly.Blocks['scene'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🎭 Scene ID:")
          .appendField(new Blockly.FieldTextInput("scene_01"), "stepId");
      this.appendDummyInput()
          .appendField("🔊 Audio:")
          .appendField(new Blockly.FieldTextInput("scene_01.wav"), "audioFile")
          .appendField("🔗 Auto")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "autoNameAudio");
      this.appendDummyInput()
          .appendField("💬 Subtitle:")
          .appendField(new Blockly.FieldTextInput("Hello!"), "subtitle");
      this.appendDummyInput()
          .appendField("🖼 BG:")
          .appendField(new Blockly.FieldDropdown([
            ["Forest",    "forest_bg.png"],
            ["Classroom", "classroom_bg.png"],
            ["Kitchen",   "kitchen_bg.png"],
            ["Space",     "space_bg.png"],
            ["Ocean",     "ocean_bg.png"],
            ["Desert",    "desert_bg.png"],
            ["Garden",    "garden_bg.png"],
            ["Custom…",   "CUSTOM"],
          ]), "backgroundDropdown")
          .appendField(new Blockly.FieldTextInput("my_bg.png"), "backgroundCustom");
      this.appendStatementInput("CHARACTER_STATE")
          .setCheck("CharacterState")
          .appendField("🐻 Character:");
      this.appendStatementInput("GRID_ACTIONS")
          .setCheck("GridAction")
          .appendField("🍎 Grid:");
      this.appendStatementInput("TEXT_OVERLAYS")
          .setCheck("TextOverlay")
          .appendField("✏️ Text:");
      this.appendDummyInput()
          .appendField("🎉 Confetti:")
          .appendField(new Blockly.FieldCheckbox("FALSE"), "confetti");
      this.setPreviousStatement(true, ["Scene", "IncludeSpec"]);
      this.setNextStatement(true,     ["Scene", "IncludeSpec"]);
      this.setColour(160);
    },
    // Auto-name audioFile when stepId changes (if auto checkbox is on)
    onchange: function(e: Blockly.Events.Abstract) {
      if (e.type !== Blockly.Events.BLOCK_CHANGE) return;
      const evt = e as any;
      if (evt.blockId !== this.id) return;
      if (evt.name === 'stepId' && this.getFieldValue('autoNameAudio') === 'TRUE') {
        const sid = this.getFieldValue('stepId');
        this.setFieldValue(sid + '.wav', 'audioFile');
      }
    }
  };

  jsonGenerator.forBlock['scene'] = function(block: Blockly.Block) {
    const stepId      = block.getFieldValue('stepId');
    const audioFile   = block.getFieldValue('audioFile');
    const subtitle    = block.getFieldValue('subtitle');
    const bgDd        = block.getFieldValue('backgroundDropdown');
    const bgCustom    = block.getFieldValue('backgroundCustom');
    const background  = bgDd === 'CUSTOM' ? bgCustom : bgDd;
    const confetti    = block.getFieldValue('confetti') === 'TRUE';

    let csCode = jsonGenerator.statementToCode(block, 'CHARACTER_STATE');
    const charState = csCode ? JSON.parse(csCode) : { pose: 'idle', actions: [] };

    let gridCode = jsonGenerator.statementToCode(block, 'GRID_ACTIONS');
    if (gridCode.endsWith(',\n')) gridCode = gridCode.slice(0, -2) + '\n';
    const gridActions = gridCode ? JSON.parse(`[${gridCode}]`) : [];

    const obj: any = {
      stepId, audioFile, subtitle,
      environment: { background },
      characterState: charState,
    };
    if (gridActions.length > 0) obj.gridActions = gridActions;

    // Text overlays
    let textCode = jsonGenerator.statementToCode(block, 'TEXT_OVERLAYS');
    if (textCode.endsWith(',\n')) textCode = textCode.slice(0, -2) + '\n';
    const textOverlays = textCode ? JSON.parse(`[${textCode}]`) : [];
    if (textOverlays.length > 0) obj.textOverlays = textOverlays;

    if (confetti) obj.effects = { confetti: true };
    return JSON.stringify(obj) + ',\n';
  };

  // ── Character State ───────────────────────────────────────────────────────────
  Blockly.Blocks['character_state'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Pose:")
          .appendField(new Blockly.FieldDropdown([
            ["Idle", "idle"], ["Walk", "walk"], ["Run", "run"], ["Dance", "dance"],
            ["Eat", "eat"], ["Gesture +", "gesture-positive"], ["Gesture −", "gesture-negative"],
          ]), "pose");
      this.appendStatementInput("ACTIONS")
          .setCheck("Action")
          .appendField("Animations:");
      this.setPreviousStatement(true, "CharacterState");
      this.setColour(290);
    }
  };

  jsonGenerator.forBlock['character_state'] = function(block: Blockly.Block) {
    const pose = block.getFieldValue('pose');
    let actCode = jsonGenerator.statementToCode(block, 'ACTIONS');
    if (actCode.endsWith(',\n')) actCode = actCode.slice(0, -2) + '\n';
    const actions = actCode ? JSON.parse(`[${actCode}]`) : [];
    return JSON.stringify({ pose, actions });
  };

  // ── Glide ─────────────────────────────────────────────────────────────────────
  Blockly.Blocks['action_glide'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Glide")
          .appendField(new Blockly.FieldNumber(1.0, 0), "duration")
          .appendField("s →")
          .appendField("X:")
          .appendField(new Blockly.FieldDropdown([
            ["Center","0"], ["Left ½","-4"], ["Left Edge","-8"], ["Off Left","-15"],
            ["Right ½","4"], ["Right Edge","8"], ["Off Right","15"],
          ]), "x")
          .appendField("Y:")
          .appendField(new Blockly.FieldDropdown([
            ["Floor","-1"], ["Center","0"], ["Top","5"], ["Below","-5"],
          ]), "y")
          .appendField("Scale:")
          .appendField(new Blockly.FieldNumber(1.2), "scale");
      this.appendDummyInput()
          .appendField("RotX:")
          .appendField(new Blockly.FieldNumber(0), "rotationX")
          .appendField("Y:")
          .appendField(new Blockly.FieldNumber(0), "rotationY")
          .appendField("Z:")
          .appendField(new Blockly.FieldNumber(0), "rotationZ");
      this.setPreviousStatement(true, "Action");
      this.setNextStatement(true,     "Action");
      this.setColour(65);
    }
  };

  jsonGenerator.forBlock['action_glide'] = function(block: Blockly.Block) {
    return JSON.stringify({
      type: 'glide', duration: Number(block.getFieldValue('duration')),
      targetState: {
        x: Number(block.getFieldValue('x')), y: Number(block.getFieldValue('y')),
        scale: Number(block.getFieldValue('scale')),
        rotationX: Number(block.getFieldValue('rotationX')),
        rotationY: Number(block.getFieldValue('rotationY')),
        rotationZ: Number(block.getFieldValue('rotationZ')),
      }
    }) + ',\n';
  };

  // ── Wait ──────────────────────────────────────────────────────────────────────
  Blockly.Blocks['action_wait'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Wait")
          .appendField(new Blockly.FieldNumber(1.0, 0), "duration")
          .appendField("seconds");
      this.setPreviousStatement(true, ["Action", "GridAction"]);
      this.setNextStatement(true,     ["Action", "GridAction"]);
      this.setColour(65);
    }
  };
  jsonGenerator.forBlock['action_wait'] = function(block: Blockly.Block) {
    return JSON.stringify({ type: 'wait', duration: Number(block.getFieldValue('duration')) }) + ',\n';
  };

  // ── Grid Init ─────────────────────────────────────────────────────────────────
  Blockly.Blocks['grid_init'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Grid")
          .appendField(new Blockly.FieldTextInput("items"), "gridId")
          .appendField(":")
          .appendField(new Blockly.FieldNumber(3, 0), "initialCount")
          .appendField("×")
          .appendField(new Blockly.FieldTextInput("apple.png"), "src");
      this.appendDummyInput()
          .appendField("X:")
          .appendField(new Blockly.FieldNumber(300), "startX")
          .appendField("Y:")
          .appendField(new Blockly.FieldNumber(700), "startY")
          .appendField("Gap:")
          .appendField(new Blockly.FieldNumber(200), "spacingX");
      this.setPreviousStatement(true, "GridAction");
      this.setNextStatement(true,     "GridAction");
      this.setColour(210);
    }
  };
  jsonGenerator.forBlock['grid_init'] = function(block: Blockly.Block) {
    return JSON.stringify({
      type: 'grid_init', gridId: block.getFieldValue('gridId'),
      initialCount: Number(block.getFieldValue('initialCount')), src: block.getFieldValue('src'),
      startX: Number(block.getFieldValue('startX')), startY: Number(block.getFieldValue('startY')),
      spacingX: Number(block.getFieldValue('spacingX')),
    }) + ',\n';
  };

  // ── Grid Add ──────────────────────────────────────────────────────────────────
  Blockly.Blocks['grid_add'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Add")
          .appendField(new Blockly.FieldNumber(1, 1), "count")
          .appendField("to grid")
          .appendField(new Blockly.FieldTextInput("items"), "gridId");
      this.setPreviousStatement(true, "GridAction");
      this.setNextStatement(true,     "GridAction");
      this.setColour(210);
    }
  };
  jsonGenerator.forBlock['grid_add'] = function(block: Blockly.Block) {
    return JSON.stringify({ type: 'grid_add', gridId: block.getFieldValue('gridId'), count: Number(block.getFieldValue('count')) }) + ',\n';
  };

  // ── Grid Destroy ──────────────────────────────────────────────────────────────
  Blockly.Blocks['grid_destroy'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Remove item")
          .appendField(new Blockly.FieldNumber(1, 1), "index")
          .appendField("from grid")
          .appendField(new Blockly.FieldTextInput("items"), "gridId");
      this.setPreviousStatement(true, "GridAction");
      this.setNextStatement(true,     "GridAction");
      this.setColour(210);
    }
  };
  jsonGenerator.forBlock['grid_destroy'] = function(block: Blockly.Block) {
    return JSON.stringify({ type: 'grid_destroy', gridId: block.getFieldValue('gridId'), index: Number(block.getFieldValue('index')) }) + ',\n';
  };

  // ── Text Overlay ──────────────────────────────────────────────────────────────
  Blockly.Blocks['text_overlay'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("✏️ Text:")
          .appendField(new Blockly.FieldTextInput("2 + 2 = 4"), "text");
      this.appendDummyInput()
          .appendField("X%:")
          .appendField(new Blockly.FieldNumber(50, 0, 100), "x")
          .appendField("Y%:")
          .appendField(new Blockly.FieldNumber(35, 0, 100), "y")
          .appendField("Size:")
          .appendField(new Blockly.FieldNumber(80, 10, 300), "size");
      this.appendDummyInput()
          .appendField("Color:")
          .appendField(new FieldColour("#ffffff"), "color")
          .appendField("BG:")
          .appendField(new FieldColour("#000000"), "bg")
          .appendField("Show BG:")
          .appendField(new Blockly.FieldCheckbox("FALSE"), "showBg");
      this.setPreviousStatement(true, "TextOverlay");
      this.setNextStatement(true,     "TextOverlay");
      this.setColour(20);
      this.setTooltip("Show floating text on screen (math equations, labels, etc.)");
    }
  };
  jsonGenerator.forBlock['text_overlay'] = function(block: Blockly.Block) {
    const text    = block.getFieldValue('text');
    const x       = Number(block.getFieldValue('x'));
    const y       = Number(block.getFieldValue('y'));
    const size    = Number(block.getFieldValue('size'));
    const color   = block.getFieldValue('color');
    const bg      = block.getFieldValue('bg');
    const showBg  = block.getFieldValue('showBg') === 'TRUE';
    const obj: any = { text, x, y, size, color };
    if (showBg) obj.bg = bg + 'cc'; // semi-transparent
    return JSON.stringify(obj) + ',\n';
  };

  return jsonGenerator;
};
