import * as Blockly from 'blockly';

const jsonGenerator = new Blockly.Generator('JSON');
jsonGenerator.INDENT = '  ';

Blockly.Blocks['scene'] = {
  init: function() {
    this.appendStatementInput("CHAR").setCheck(null);
  }
};
jsonGenerator.forBlock['scene'] = function(block) {
  let csCode = jsonGenerator.statementToCode(block, 'CHAR');
  return "SCENE[\n" + csCode + "]\n";
};

Blockly.Blocks['character_state'] = {
  init: function() {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput("panda"), "type");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};
jsonGenerator.forBlock['character_state'] = function(block) {
  return '{"type": "' + block.getFieldValue('type') + '"},\n';
};

const workspace = new Blockly.Workspace();
const sceneBlock = workspace.newBlock('scene');
const char1 = workspace.newBlock('character_state');
char1.setFieldValue('panda', 'type');
const char2 = workspace.newBlock('character_state');
char2.setFieldValue('monkey', 'type');

char1.nextConnection.connect(char2.previousConnection);
sceneBlock.getInput('CHAR').connection.connect(char1.previousConnection);

const code = jsonGenerator.blockToCode(sceneBlock);
console.log(code);
