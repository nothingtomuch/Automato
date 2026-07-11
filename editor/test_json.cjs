const csCode = {"type": "panda", "pose": "idle", "actions": []},\n{"type": "monkey", "pose": "eat", "actions": []},\n;

let modified = csCode;
if (modified.endsWith(',\n')) modified = modified.slice(0, -2) + '\n';
console.log("Modified:", modified);
console.log("Parsed:", JSON.parse('[' + modified + ']'));
