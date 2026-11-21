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
// 통일영어점자 2급 낱말(assets/ueb-g2.js): 공개 변환기 결과와 같게 나오는지(고정본)
const UEB = createRequire(import.meta.url)('../assets/ueb-g2.js');
const uebFrozen = JSON.parse(fs.readFileSync(new URL('./ueb-frozen.json', import.meta.url), 'utf8')).words; let uebFail = 0, uebN = 0;
for (const [w, b] of Object.entries(uebFrozen)) { uebN++; if (UEB.toUnicode(w, { lower: true }) !== b) { uebFail++; if (uebFail <= 10) console.log('불일치(영어 낱말)', w, UEB.toUnicode(w, { lower: true }), b); } }
// 대소문자가 섞인 낱말·하이픈 낱말·대문자 낱말(변환기 전체 경로): 로마자표·종료표 사이의 점자가 고정본과 같은지
const piecesFrozen = JSON.parse(fs.readFileSync(new URL('./ueb-frozen-pieces.json', import.meta.url), 'utf8')).pieces; let pcFail = 0, pcN = 0;
const uniOf = cells => cells.filter(c => c.kind !== '줄바꿈').map(c => c.kind === '띄어쓰기' ? ' ' : c.unsupported ? '?' : String.fromCodePoint(0x2800 + c.dots.reduce((x, d) => x | (1 << (d - 1)), 0))).join('');
for (const [w, b] of Object.entries(piecesFrozen)) { pcN++; const got = uniOf(KB.convert(w, { contract: true }).cells).replace(/^⠴/, '').replace(/⠲$/, ''); if (got !== b) { pcFail++; if (pcFail <= 10) console.log('불일치(섞인·하이픈·대문자 낱말)', w, got, b); } }
console.log(`섞인·하이픈·대문자 낱말 ${pcN}개 중 일치 ${pcN - pcFail}, 불일치 ${pcFail}`); fail += pcFail ? 1 : 0;
console.log(`영어 낱말 ${uebN}개 중 일치 ${uebN - uebFail}, 불일치 ${uebFail}`); fail += uebFail ? 1 : 0;
// 제65~72항 기호(화폐·단위·화살표·기호): 규정 예시와 점 하나까지 같아야 한다
const symbols = JSON.parse(fs.readFileSync(new URL('./symbol-cases.json', import.meta.url), 'utf8'));
for (const c of symbols.cases) { total++; if (norm(c.brf) !== run(c.text)) { fail++; console.log('불일치(기호)', c.ref, c.text, '\n  기대', norm(c.brf), '\n  엔진', run(c.text)); } }
console.log(`전체 ${total}개 중 일치 ${total - fail}, 불일치 ${fail}`);
process.exit(fail ? 1 : 0);
