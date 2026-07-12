import * as Blockly from 'blockly';
import { FieldColour } from '@blockly/field-colour';

export const defineInfographicBlocks = () => {
  const dslGenerator = new Blockly.Generator('DSL');
  
  (dslGenerator as any).scrub_ = function(block: Blockly.Block, code: string, thisOnly: boolean): string {
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
    if (nextBlock && !thisOnly) {
      return code + '\n' + dslGenerator.blockToCode(nextBlock);
    }
    return code;
  };

  // ── Infographic Root ──────────────────────────────────────────────────────
  Blockly.Blocks['infographic_root'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("📊 Infographic")
          .appendField(new Blockly.FieldDropdown([
            ["🔀 Flowchart", "flowchart"],
            ["🟦 Power Tower (3D Cubes)", "power-tower"],
            ["🔺 List Pyramid", "list-pyramid-badge-card"],
            ["🔢 Number Line", "custom number-line"],
            ["📦 Custom Layout", "custom"]
          ]), "template");
      this.appendDummyInput()
          .appendField("Seconds per step:")
          .appendField(new Blockly.FieldNumber(1.5, 0.3, 10, 0.1), "secondsPerStep");
      this.appendStatementInput("ELEMENTS")
          .setCheck(null)
          .appendField("Steps / Elements:");
      this.setColour(180);
      this.setTooltip("The root block for your infographic or flowchart.");
    }
  };
  dslGenerator.forBlock['infographic_root'] = function(block: Blockly.Block) {
    const template = block.getFieldValue('template');
    const sps = block.getFieldValue('secondsPerStep') || 1.5;
    const elements = dslGenerator.statementToCode(block, 'ELEMENTS');
    if (template === 'custom') return elements;
    if (template === 'flowchart') return `infographic flowchart sps=${sps}\n${elements}`;
    return `infographic ${template}\n${elements}`;
  };

  // ── Flowchart Step ─────────────────────────────────────────────────────────
  Blockly.Blocks['flowchart_step'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Shape:")
          .appendField(new Blockly.FieldDropdown([
            ["▭ Operation (rect)", "rect"],
            ["◇ Decision (diamond)", "diamond"],
            ["⬭ Terminal (oval)", "oval"],
          ]), "shape")
          .appendField("Label:")
          .appendField(new Blockly.FieldTextInput("Step"), "label");
      this.appendDummyInput()
          .appendField("Edge label (→):")
          .appendField(new Blockly.FieldTextInput(""), "edgeLabel")
          .appendField("Color:")
          .appendField(new FieldColour("#5e9eff"), "color");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(200);
      this.setTooltip("A flowchart step. For decisions, the edge label goes on the main (Yes) path.");
    }
  };
  dslGenerator.forBlock['flowchart_step'] = function(block: Blockly.Block) {
    const shape = block.getFieldValue('shape');
    const label = block.getFieldValue('label').replace(/"/g, "'");
    const edgeLabel = block.getFieldValue('edgeLabel').replace(/"/g, "'");
    const color = block.getFieldValue('color');
    return `step ${shape} "${label}" edge="${edgeLabel}" color=${color}`;
  };

  // ── Flowchart Branch (No path of a decision) ───────────────────────────────
  Blockly.Blocks['flowchart_branch'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("↩ No-branch label:")
          .appendField(new Blockly.FieldTextInput("No"), "branchLabel");
      this.appendStatementInput("BRANCH_STEPS")
          .setCheck(null)
          .appendField("No path:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(30);
      this.setTooltip("Place this after a Decision step to define the 'No' branch.");
    }
  };
  dslGenerator.forBlock['flowchart_branch'] = function(block: Blockly.Block) {
    const branchLabel = block.getFieldValue('branchLabel').replace(/"/g, "'");
    const steps = dslGenerator.statementToCode(block, 'BRANCH_STEPS');
    return `branch "${branchLabel}" {\n${steps}\n}`;
  };


  // ── Container ─────────────────────────────────────────────────────────────
  Blockly.Blocks['infographic_container'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("📦 Container")
          .appendField(new Blockly.FieldDropdown([
            ["Stack", "stack"], ["Columns", "columns"]
          ]), "layout");
      this.appendStatementInput("CHILDREN")
          .setCheck(null)
          .appendField("Items:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("A container for aligning elements.");
    }
  };
  dslGenerator.forBlock['infographic_container'] = function(block: Blockly.Block) {
    const layout = block.getFieldValue('layout');
    const children = dslGenerator.statementToCode(block, 'CHILDREN');
    return `container ${layout} {\n${children}\n}`;
  };

  // ── Pyramid Layer ─────────────────────────────────────────────────────────
  Blockly.Blocks['infographic_pyramid'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🔺 Pyramid / Layers");
      this.appendStatementInput("ITEMS")
          .setCheck("PyramidItem")
          .appendField("Layers:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("A pyramid or stacked layer list.");
    }
  };
  dslGenerator.forBlock['infographic_pyramid'] = function(block: Blockly.Block) {
    let items = dslGenerator.statementToCode(block, 'ITEMS');
    return `infographic list-pyramid-badge-card\n${items}`;
  };

  Blockly.Blocks['infographic_pyramid_item'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Layer Label:")
          .appendField(new Blockly.FieldTextInput("Item"), "label");
      this.appendDummyInput()
          .appendField("Desc:")
          .appendField(new Blockly.FieldTextInput(""), "desc");
      this.appendDummyInput()
          .appendField("Color:")
          .appendField(new FieldColour("#FF5733"), "color");
      this.setPreviousStatement(true, "PyramidItem");
      this.setNextStatement(true, "PyramidItem");
      this.setColour(120);
    }
  };
  dslGenerator.forBlock['infographic_pyramid_item'] = function(block: Blockly.Block) {
    const label = block.getFieldValue('label');
    const desc = block.getFieldValue('desc');
    const color = block.getFieldValue('color');
    let out = `list {\n  label ${label}\n  color ${color}\n`;
    if (desc) out += `  desc ${desc}\n`;
    out += `}`;
    return out;
  };

  // ── Number Line ───────────────────────────────────────────────────────────
  Blockly.Blocks['infographic_number_line'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🔢 Number Line");
      this.appendStatementInput("STEPS")
          .setCheck("NumberLineStep")
          .appendField("Steps:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("A sequential number line or process.");
    }
  };
  dslGenerator.forBlock['infographic_number_line'] = function(block: Blockly.Block) {
    const steps = dslGenerator.statementToCode(block, 'STEPS');
    return `custom number-line\n${steps}`;
  };

  Blockly.Blocks['infographic_number_line_step'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Step:")
          .appendField(new Blockly.FieldTextInput("1"), "step")
          .appendField("Text:")
          .appendField(new Blockly.FieldTextInput("Do something"), "text");
      this.setPreviousStatement(true, "NumberLineStep");
      this.setNextStatement(true, "NumberLineStep");
      this.setColour(180);
    }
  };
  dslGenerator.forBlock['infographic_number_line_step'] = function(block: Blockly.Block) {
    const step = block.getFieldValue('step');
    const text = block.getFieldValue('text');
    return `step ${step} ${text}`;
  };

  // ── Text / Heading ────────────────────────────────────────────────────────
  Blockly.Blocks['infographic_text'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Heading/Text:")
          .appendField(new Blockly.FieldTextInput("My Title"), "text");
      this.appendDummyInput()
          .appendField("Size:")
          .appendField(new Blockly.FieldNumber(24, 10, 100), "size")
          .appendField("Color:")
          .appendField(new FieldColour("#ffffff"), "color");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
    }
  };
  dslGenerator.forBlock['infographic_text'] = function(block: Blockly.Block) {
    const text = block.getFieldValue('text');
    const size = block.getFieldValue('size');
    const color = block.getFieldValue('color');
    return `text "${text}" size=${size} color=${color}`;
  };

  // ── Badge / Card ──────────────────────────────────────────────────────────
  Blockly.Blocks['infographic_card'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Card/Badge Title:")
          .appendField(new Blockly.FieldTextInput("Title"), "title");
      this.appendDummyInput()
          .appendField("Content:")
          .appendField(new Blockly.FieldTextInput("Content goes here"), "content");
      this.appendDummyInput()
          .appendField("Color:")
          .appendField(new FieldColour("#4CAF50"), "color");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };
  dslGenerator.forBlock['infographic_card'] = function(block: Blockly.Block) {
    const title = block.getFieldValue('title');
    const content = block.getFieldValue('content');
    const color = block.getFieldValue('color');
    return `card {\n  title "${title}"\n  content "${content}"\n  color ${color}\n}`;
  };

  // ── Power Tower Cube ─────────────────────────────────────────────────────
  Blockly.Blocks['infographic_power_tower_cube'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("🟦 Cube Label:")
          .appendField(new Blockly.FieldTextInput("2^1"), "label");
      this.appendDummyInput()
          .appendField("Description:")
          .appendField(new Blockly.FieldTextInput(""), "desc");
      this.appendDummyInput()
          .appendField("Color:")
          .appendField(new FieldColour("#2979ff"), "color");
      this.setPreviousStatement(true, "PowerTowerCube");
      this.setNextStatement(true, "PowerTowerCube");
      this.setColour(230);
      this.setTooltip("A cube in the power tower (bottom cube first). Use ^ for superscripts: 2^3.");
    }
  };
  dslGenerator.forBlock['infographic_power_tower_cube'] = function(block: Blockly.Block) {
    const label = block.getFieldValue('label');
    const desc = block.getFieldValue('desc');
    const color = block.getFieldValue('color');
    let out = `cube {\n  label ${label}\n  color ${color}\n`;
    if (desc) out += `  desc ${desc}\n`;
    out += `}`;
    return out;
  };

  return dslGenerator;
};
