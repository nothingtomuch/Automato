const csCode =   {"type": "panda"},\n  {"type": "monkey"},\n;
let modified = csCode;
if (modified.endsWith(',\n')) modified = modified.slice(0, -2) + '\n';
console.log("Modified:", modified);
console.log("Parsed:", JSON.parse('[' + modified + ']'));
