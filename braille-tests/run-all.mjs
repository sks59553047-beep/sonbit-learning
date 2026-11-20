// 전체 시험: (1) 수동 정리 예시, (2) 규정 본문에서 자동으로 뽑아 엔진과 일치한 예시(고정본 frozen-cases.json)를 다시 확인.
// 하나라도 틀리면 종료 코드 1. 사용법: node run-all.mjs [--freeze]  (--freeze: 규정 본문에서 다시 뽑아 고정본 갱신)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const KB = createRequire(import.meta.url)('../assets/braille-core.js');
const norm = (s) => KB.brfToDots(s.replace(/`/g, ' ').replace(/\n/g, ' ')).filter(x => x !== '').join('|');
const run = (text) => KB.convert(text).cells.map(c => c.dots.join('')).filter(x => x !== '').join('|');
let fail = 0, total = 0;
const manual = JSON.parse(fs.readFileSync(new URL('./manual-cases.json', import.meta.url), 'utf8'));
for (const c of manual) { total++; if (norm(c.brf) !== run(c.text)) { fail++; console.log('불일치(수동)', c.ref, c.text); } }
if (process.argv.includes('--freeze')) {
  const all = [];
  for (const [a, b] of [[9, 19], [33, 48]]) { const out = execFileSync('node', ['run-regulation.mjs', String(a), String(b), '--json'], { cwd: fileURLToPath(new URL('.', import.meta.url)) }); const j = JSON.parse(fs.readFileSync(new URL(`./cases-p${a}-${b}.json`, import.meta.url), 'utf8')); all.push(...j.ok.map(x => ({ p: x.p, kind: x.kind, text: x.word, brf: x.brf }))); }
  fs.writeFileSync(new URL('./frozen-cases.json', import.meta.url), JSON.stringify(all, null, 1)); console.log('고정본 갱신', all.length);
}
const frozen = JSON.parse(fs.readFileSync(new URL('./frozen-cases.json', import.meta.url), 'utf8'));
for (const c of frozen) { total++; if (norm(c.brf) !== run(c.text)) { fail++; console.log('불일치(규정 자동)', 'p' + c.p, c.text); } }
// 제4장 로마자(2026-11-21): 대문자 약어 예시는 점 하나까지 같아야 하고, 범위 밖 영어는 점자를 만들지 않고 「지원 안 함」이어야 한다
const roman = JSON.parse(fs.readFileSync(new URL('./roman-cases.json', import.meta.url), 'utf8'));
for (const c of roman.cases) { total++; if (norm(c.brf) !== run(c.text)) { fail++; console.log('불일치(로마자)', c.ref, c.text, '\n  기대', norm(c.brf), '\n  엔진', run(c.text)); } }
for (const t of roman.unsupported) {
  total++; const r = KB.convert(t);
  if (!r.unsupported.length || r.cells.some(c => /로마자|대문자|1급/.test(c.kind))) { fail++; console.log('지원 안 함이어야 함(로마자)', t); }
}
console.log(`전체 ${total}개 중 일치 ${total - fail}, 불일치 ${fail}`);
process.exit(fail ? 1 : 0);
