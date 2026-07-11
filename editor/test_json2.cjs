const csCode = "  {\"type\": \"panda\"},\n  {\"type\": \"monkey\"},\n";
let modified = csCode;
if (modified.endsWith(',\n')) modified = modified.slice(0, -2) + '\n';
try {
  console.log("Parsed:", JSON.parse('[' + modified + ']'));
} catch (e) {
  console.log("Error:", e.message);
}
