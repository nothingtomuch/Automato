import { specToBlocklyState } from './src/decompiler';
import * as fs from 'fs';

const spec = JSON.parse(fs.readFileSync('../../projects/fractions_and_decimals/part1.json', 'utf8'));
const state = specToBlocklyState(spec);
console.log(JSON.stringify(state, null, 2));
