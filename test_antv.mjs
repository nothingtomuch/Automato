import { parseSyntax } from '@antv/infographic';
const dsl = `infographic list-pyramid-badge-card
theme gradient-vibrant
data
  lists
    - label 2^1
      desc Value: 2
      color #06b6d4
    - label 2^2
      desc Value: 4
      color #10b981`;
console.log(JSON.stringify(parseSyntax(dsl), null, 2));
