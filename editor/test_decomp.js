const fs = require('fs');

const ANIMAL_MODELS = [
  "beaver", "bee", "bunny", "cat", "caterpillar", "chick", "cow", "crab",
  "deer", "dog", "elephant", "fish", "fox", "giraffe", "hog", "koala",
  "lion", "monkey", "panda", "parrot", "penguin", "pig", "polar", "tiger"
];

function buildCharacterStateBlock(charState, nextBlock, fallbackHost) {
  const pose = charState?.pose ?? 'idle';
  const type = charState?.type ?? fallbackHost ?? 'bunny';
  const actions = charState?.actions ?? [];
  return {
    type: "character_state",
    fields: { type, pose },
    ...(nextBlock ? { next: { block: nextBlock } } : {})
  };
}

function buildCharacterStateChain(characters, fallbackHost) {
  if (!characters || characters.length === 0) return undefined;
  let current = undefined;
  for (let i = characters.length - 1; i >= 0; i--) {
    current = buildCharacterStateBlock(characters[i], current, fallbackHost);
  }
  return current;
}

const spec = JSON.parse(fs.readFileSync('C:/Automato/projects/fractions_and_decimals/part1.json', 'utf8'));

// mock just scene 5
const scene5 = spec.timeline[4];
const chain = buildCharacterStateChain(scene5.characters, 'panda');
console.log(JSON.stringify(chain, null, 2));

