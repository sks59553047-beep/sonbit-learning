// 규정 본문 예시(단어·문장)를 뽑아 변환 엔진과 대조한다. 사용법: node run-regulation.mjs <시작쪽> <끝쪽> [--json]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const KB = require('../assets/braille-core.js');
const txt = fs.readFileSync(new URL('./source/regulation-2024.txt', import.meta.url), 'utf8');
const pages = txt.split(/\n=====p/);
const [a, b] = [Number(process.argv[2] || 9), Number(process.argv[3] || 19)];
const dotsOf = (brf) => KB.brfToDots(brf.replace(/`/g, ' '));
const engine = (s) => KB.convert(s).cells.map(c => c.dots.join(''));
const nb = (arr) => arr.filter(x => x !== '');
const ok = [], bad = [], seen = new Set();
for (let p = a; p <= b; p++) {
  let s = pages[p].replace(/^\d+\s*\n?/, '').replace(/^\d*\s*￭[^￭]*￭\s*\d*/, '');
  // (1) 문장: 연속 두 칸 이상의 ` 로 나뉜 조각에서 '한글 조각 → 점자 조각' 짝 찾기
  const segs = s.split(/`{2,}/);
  const used = new Set();
  for (let i = 0; i < segs.length; i++) {
    if (!/[가-힣]/.test(segs[i])) continue;
    let j = i + 1, brfParts = [];
    while (j < segs.length && !/[가-힣]/.test(segs[j]) && segs[j].trim() !== '' ) { brfParts.push(segs[j]); j++; }
    if (!brfParts.length) continue;
    const B = brfParts.join('`');
    if (B.replace(/`/g, '').length < 6) continue;
    let exp; try { exp = nb(dotsOf(B)); } catch (e) { continue; }
    // 한글 조각의 끝에서부터 문장 시작 후보를 하나씩 늘려 가며 일치하는 것을 찾는다
    const S = segs[i];
    const starts = [0]; for (let k = 0; k < S.length; k++) if (/[.?!\]’”)]/.test(S[k])) starts.push(k + 1);
    let hit = null;
    for (const st of starts) { const cand = S.slice(st).trim(); if (!cand) continue; if (nb(engine(cand)).join('|') === exp.join('|')) { hit = cand; break; } }
    const key = 'S' + B; if (seen.has(key)) continue; seen.add(key);
    if (hit) { ok.push({ p, kind: '문장', word: hit, brf: B }); for (const x of B.split('`')) used.add(x); }
    else bad.push({ p, kind: '문장', word: S.slice(-60), brf: B, got: KB.toBrf(KB.convert(S.slice(Math.max(0, starts[starts.length - 1] ?? 0))).cells) });
  }
  // (2) 단어: 한글 낱말 바로 뒤의 점자 낱말
  const re = /([가-힣]+)\s*([!-~]{2,24})/g; let m;
  const sNoSent = s.replace(/[^\n]*`{2}[^\n]*/g, ' ');
  while ((m = re.exec(sNoSent))) {
    const word = m[1]; let brf = m[2].replace(/\[+$/, '');
    if (word === '다만' || word === '붙임' || /제$/.test(word) || /^\d{1,2}[\]\)]?$/.test(brf) || brf.length < 2) continue;
    let exp; try { exp = dotsOf(brf); } catch (e) { continue; }
    const key = 'W' + word + brf; if (seen.has(key)) continue; seen.add(key);
    let hitW = null; for (let k = 0; k < word.length; k++) { const w2 = word.slice(k); if (engine(w2).join('|') === exp.join('|')) { hitW = w2; break; } }
    if (hitW) ok.push({ p, kind: '단어', word: hitW, brf }); else bad.push({ p, kind: '단어', word, brf, got: KB.toBrf(KB.convert(word).cells) });
  }
}
console.log(`일치 ${ok.length} (문장 ${ok.filter(x => x.kind === '문장').length}, 단어 ${ok.filter(x => x.kind === '단어').length}) | 불일치 ${bad.length}`);
for (const x of bad) console.log(`p${x.p} [${x.kind}] ${x.word} | 규정 ${x.brf} | 엔진 ${x.got}`);
if (process.argv.includes('--json')) fs.writeFileSync(new URL('./cases-p' + a + '-' + b + '.json', import.meta.url), JSON.stringify({ ok, bad }, null, 1));
