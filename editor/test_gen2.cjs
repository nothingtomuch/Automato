const Blockly = require('blockly');
const jsonGenerator = new Blockly.Generator('JSON');
jsonGenerator.INDENT = '  ';

Blockly.Blocks['scene'] = {
  init: function() {
    this.appendStatementInput("CHARACTER_STATE").setCheck(null);
  }
};
jsonGenerator.forBlock['scene'] = function(block) {
  let csCode = jsonGenerator.statementToCode(block, 'CHARACTER_STATE');
  console.log("csCode is:", csCode);
  if (csCode.endsWith(',\n')) csCode = csCode.slice(0, -2) + '\n';
  const characters = csCode ? JSON.parse('[' + csCode + ']') : [];
  return JSON.stringify({ characters });
};

Blockly.Blocks['character_state'] = {
  init: function() {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput("panda"), "type");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};
jsonGenerator.forBlock['character_state'] = function(block) {
  const type = block.getFieldValue('type');
  return JSON.stringify({ type }) + ',\n';
};

const workspace = new Blockly.Workspace();
const sceneBlock = workspace.newBlock('scene');
const char1 = workspace.newBlock('character_state');
char1.setFieldValue('panda', 'type');
const char2 = workspace.newBlock('character_state');
char2.setFieldValue('monkey', 'type');

char1.nextConnection.connect(char2.previousConnection);
sceneBlock.getInput('CHARACTER_STATE').connection.connect(char1.previousConnection);

const code = jsonGenerator.blockToCode(sceneBlock);
