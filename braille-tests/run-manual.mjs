import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const KB = require('../assets/braille-core.js');
const cases = JSON.parse(fs.readFileSync(new URL('./manual-cases.json', import.meta.url), 'utf8'));
let ok = 0;
for (const c of cases) {
  const exp = KB.brfToDots(c.brf.replace(/`/g, ' ').replace(/\n/g, ' ')).filter(x => x !== '');
  const r = KB.convert(c.text); const got = r.cells.map(x => x.dots.join('')).filter(x => x !== '');
  if (exp.join('|') === got.join('|')) ok++; else console.log(`불일치 [${c.ref}] ${c.text}\n  규정 ${c.brf.replace(/\n/g, '⏎')}\n  엔진 ${KB.toBrf(r.cells).replace(/ +/g, '`')}\n  지원안함 ${r.unsupported.join('')}`);
}
console.log(`수동 정리 예시 ${cases.length}개 중 일치 ${ok}`);
