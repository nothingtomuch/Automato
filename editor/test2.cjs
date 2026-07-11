const fs = require('fs');

function buildCharacterStateBlock(charState, nextBlock, fallbackHost) {
  const pose = charState?.pose ?? 'idle';
  const type = charState?.type ?? fallbackHost ?? 'bunny';
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

const characters = [
  { type: 'panda', pose: 'idle' },
  { type: 'monkey', pose: 'eat' }
];

const chain = buildCharacterStateChain(characters, 'panda');
console.log(JSON.stringify(chain, null, 2));

