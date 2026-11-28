// 퀴즈 문제 만들기(quiz-engine.js)를 수천 번 돌려, 정답이 둘이 되거나 보기가 겹치는 문제가 한 번도 없는지·난이도가 정말 올라가는지 확인한다.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('../', import.meta.url)).replace(/\\/g, '/');
const A = REPO + 'assets/';
const ctx = { console }; vm.createContext(ctx);
for (const f of ['ksl-data.js', 'ksl2-data.js', 'ksl3-data.js', 'media-index.js', 'sign-topics.js', 'braille.js', 'ueb-g2.js', 'braille-core.js', 'quiz-engine.js']) vm.runInContext(fs.readFileSync(A + f, 'utf8'), ctx, { filename: f });
const QZ = vm.runInContext('QZ', ctx), KB = vm.runInContext('KB', ctx);
const mul = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let fails = 0; const bad = [];
const ok = (cond, msg) => { if (!cond) { fails++; if (bad.length < 25) bad.push(msg); } };
const sec = t => console.log('\n── ' + t + ' ──');
const nm = s => String(s).replace(/\s+/g, '');
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const N = Number(process.argv[2] || 400);

sec('수어: 단어 등급');
console.log('문제로 쓸 수 있는 단어', QZ.eligible.length, '/ 전체', QZ.words.length, '(영상이 같은 단어 ' + QZ.dupIds.size + '개 제외)');
console.log('하', QZ.byTier[1].length, '/ 중', QZ.byTier[2].length, '/ 상', QZ.byTier[3].length);
for (const t of [1, 2, 3]) console.log('  ' + QZ.LEVELS[t] + ' 예:', QZ.byTier[t].slice(0, 16).map(w => w.w).join(', '));
ok(QZ.byTier[1].length >= 150 && QZ.byTier[2].length >= 150 && QZ.byTier[3].length >= 100, '등급별 단어 수가 모자람');

sec('수어: 문제 ' + (N * 3 * 10) + '개 만들어 점검');
const stat = {};
for (const lv of [1, 2, 3]) {
  QZ.setRng(mul(1000 + lv));
  const S = stat[lv] = { pv: 0, sv: 0, simSum: [], tiers: { 1: 0, 2: 0, 3: 0 }, ans: { 1: 0, 2: 0, 3: 0 }, info: 0 };
  for (let n = 0; n < N; n++) {
    const quiz = QZ.makeSignQuiz(lv);
    ok(quiz.length === 10, `수어 ${lv}: 문제 수 ${quiz.length}`);
    ok(new Set(quiz.map(q => nm(q.answer))).size === quiz.length, `수어 ${lv}: 한 퀴즈에 같은 단어가 두 번`);
    const mix = { 1: 0, 2: 0, 3: 0 }; quiz.forEach(q => { mix[QZ.wordById(q.id).tier]++; });
    const want = lv === 1 ? [10, 0, 0] : lv === 2 ? [3, 7, 0] : [0, 4, 6];
    ok(mix[1] === want[0] && mix[2] === want[1] && mix[3] === want[2], `수어 ${lv}: 등급 배분 ${JSON.stringify(mix)}`);
    for (const q of quiz) {
      const w = QZ.wordById(q.id); S.ans[w.tier]++; if (QZ.info(w)) S.info++;
      ok(QZ.isEligible(w), '문제로 쓸 수 없는 단어가 나옴 ' + w.w);
      if (q.ck === 'sv') {
        S.sv++;
        ok(q._opts.length === 4 && new Set(q._opts.map(nm)).size === 4 && q._opts.includes(q.answer), `영상→뜻 보기 이상 ${q.answer} ${q._opts}`);
        const others = q._opts.filter(o => o !== q.answer).map(o => QZ.words.find(x => x.w === o && QZ.isEligible(x) && !QZ.conflict(w, x)) );
        ok(others.every(Boolean), `영상→뜻: 정답과 뜻이 겹치는 보기 ${q.answer} / ${q._opts}`);
        for (const o of q._opts.filter(o => o !== q.answer)) { const ws = QZ.words.filter(x => x.w === o); ok(ws.some(x => !QZ.conflict(w, x) && QZ.isEligible(x)), '보기 충돌 ' + q.answer + '/' + o); }
      } else {
        S.pv++;
        const ids = q.clips.map(c => c.id);
        ok(q.clips.length === 4 && new Set(ids).size === 4 && ids.includes(q.id) && ids.filter(i => i === q.id).length === 1, `뜻→영상 보기 이상 ${q.answer}`);
        ok(new Set(q.clips.map(c => nm(c.name))).size === 4, `뜻→영상: 이름이 같은 보기 ${q.answer}`);
        ok(q.clips.every(c => c.src && !QZ.dupIds.has(c.id)), `뜻→영상: 영상 없음/겹침 ${q.answer}`);
        for (const c of q.clips) if (c.id !== q.id) { const x = QZ.wordById(c.id); ok(!QZ.conflict(w, x), `뜻→영상: 뜻이 겹치는 보기 ${q.answer}/${c.name}`); S.tiers[x.tier]++; S.simSum.push(QZ.sim(w, x)); }
      }
    }
  }
  const tot = S.sv + S.pv;
  console.log(`${QZ.LEVELS[lv]}: 영상→뜻 ${S.sv} / 뜻→영상 ${S.pv} (${Math.round(S.pv / tot * 100)}%) · 정답 등급 하${S.ans[1]} 중${S.ans[2]} 상${S.ans[3]} · 손모양 정보 있는 문제 ${Math.round(S.info / tot * 100)}% · 뜻→영상 보기 등급 하${S.tiers[1]} 중${S.tiers[2]} 상${S.tiers[3]} · 보기 비슷한 정도 평균 ${mean(S.simSum).toFixed(2)}`);
}
ok(mean(stat[1].simSum) < mean(stat[2].simSum) + 0.05 && mean(stat[2].simSum) < mean(stat[3].simSum), '수어: 난이도가 올라갈수록 보기가 비슷해지지 않음');
// 영상→뜻 보기의 비슷한 정도(이름으로 찾은 단어 기준)도 비교
for (const lv of [1, 2, 3]) {
  QZ.setRng(mul(2000 + lv)); const sims = [];
  for (let n = 0; n < 150; n++) for (const q of QZ.makeSignQuiz(lv)) if (q.ck === 'sv') { const w = QZ.wordById(q.id); for (const o of q._opts.filter(x => x !== q.answer)) { const x = QZ.eligible.find(e => e.w === o && QZ.sim(w, e) >= 0); if (x) sims.push(QZ.sim(w, QZ.eligible.filter(e => e.w === o).sort((a, b) => QZ.sim(w, b) - QZ.sim(w, a))[0])); } }
  console.log(`  영상→뜻 보기 비슷한 정도 ${QZ.LEVELS[lv]}: ${mean(sims).toFixed(2)}`);
}
// 저장·복원 왕복
QZ.setRng(mul(77)); let rt = 0;
for (let n = 0; n < 300; n++) for (const lv of [1, 2, 3]) for (const q of QZ.makeSignQuiz(lv)) { const r = QZ.restore(JSON.parse(JSON.stringify(QZ.compact(q)))); rt++; ok(r && r.ck === q.ck && r.id === q.id && JSON.stringify(r._opts) === JSON.stringify(q._opts), '수어 저장·복원 불일치 ' + q.answer); }
console.log('저장·복원 왕복', rt, '개 확인');
// 내 단어장 퀴즈
QZ.setRng(mul(5)); for (let n = 0; n < 100; n++) { const fav = QZ.words.filter(() => Math.random() < 0.02).slice(0, 8); const q = QZ.makeFavQuiz(fav, 2); ok(q.every(x => QZ.favOk(QZ.wordById(x.id))) && q.length === Math.min(10, fav.filter(QZ.favOk).length), '단어장 퀴즈 이상'); }

sec('점자: 글자 목록');
const its = QZ.brailleItems(); const byScope = {}, byTier = {}, fam = {};
its.forEach(i => { byScope[i.scope] = (byScope[i.scope] || 0) + 1; byTier[i.tier] = (byTier[i.tier] || 0) + 1; fam[i.fam] = (fam[i.fam] || 0) + 1; });
console.log('글자·부호·약자 항목', its.length, '개 / 범위별', JSON.stringify(byScope), '/ 등급별 ' + JSON.stringify(byTier));
console.log('보기 묶음 크기', JSON.stringify(fam));
console.log('같은 묶음에서 점 모양이 같아 하나만 쓴 것:', QZ.droppedItems().join(' ') || '없음');
ok(new Set(its.map(i => i.answer)).size === its.length, '항목 이름이 겹침');
ok(Object.values(fam).every(n => n >= 4), '보기 묶음이 4개 미만');
// 약자 항목은 변환기 결과와 같아야 한다
for (const i of its.filter(i => /\(약자\)$/.test(i.answer))) { const s = i.answer.replace('(약자)', ''); const got = KB.convert(s, { contract: true }).cells.map(c => c.dots); ok(JSON.stringify(got) === JSON.stringify(i.cells), '약자 불일치 ' + s); }
for (const i of its.filter(i => /\(약어\)$/.test(i.answer))) { const s = i.answer.replace('(약어)', ''); const got = KB.convert(s, { contract: true }).cells.map(c => c.dots); ok(JSON.stringify(got) === JSON.stringify(i.cells), '약어 불일치 ' + s); }
const wp = QZ.wordPool(); const wb = {}; wp.forEach(w => { const k = w.scope + '/' + w.kind + '/등급' + w.tier; wb[k] = (wb[k] || 0) + 1; });
console.log('낱말', wp.length, '개:', JSON.stringify(wb));
for (const w of wp) { const a = JSON.stringify(KB.convert(w.answer, { contract: false }).cells.map(c => c.dots)), b = JSON.stringify(KB.convert(w.answer, { contract: true }).cells.map(c => c.dots)); ok((a === b) === (w.kind === 'w'), '낱말 종류 이상 ' + w.answer); ok(JSON.stringify(w.cells) === (w.kind === 'w' ? a : b), '낱말 점 이상 ' + w.answer); }

sec('점자: 문제 점검 (읽기·쓰기 × 범위 6 × 난이도 3 × ' + N + '회)');
const dists = { 1: [], 2: [], 3: [] };
for (const mode of ['read', 'write']) for (const sc of QZ.SCOPES.map(s => s.key)) for (const lv of [1, 2, 3]) {
  QZ.setRng(mul(mode.length * 100000 + sc.length * 1000 + lv * 10 + sc.charCodeAt(0)));
  const kinds = {}; let cnt = 0;
  for (let n = 0; n < N / 4; n++) {
    const quiz = QZ.makeBrailleQuiz(mode, sc, lv);
    ok(quiz.length === 10, `점자 ${mode}/${sc}/${lv}: 문제 수 ${quiz.length}`);
    ok(new Set(quiz.map(q => q.answer)).size === 10, `점자 ${mode}/${sc}/${lv}: 같은 문제가 두 번`);
    for (const q of quiz) {
      cnt++; kinds[q.bk] = (kinds[q.bk] || 0) + 1;
      ok(q.clue.length >= 1 && q.clue.every(c => Array.isArray(c)), '점 모양 이상 ' + q.answer);
      if (q.bk === 'n') { ok(/^[1-9]\d*$|^\d$/.test(q.answer), '숫자 이상 ' + q.answer); ok(JSON.stringify(KB.convert(q.answer, { contract: false }).cells.map(c => c.dots)) === JSON.stringify(q.clue), '숫자 점 이상 ' + q.answer); }
      if (q.bk === 'w' || q.bk === 'c') ok(JSON.stringify(KB.convert(q.answer, { contract: q.bk === 'c' }).cells.map(c => c.dots)) === JSON.stringify(q.clue), '낱말 점 이상 ' + q.answer);
      if (mode === 'read') {
        ok(q._opts.length === 4 && new Set(q._opts).size === 4 && q._opts.includes(q.answer), `읽기 보기 이상 ${q.answer} ${q._opts}`);
        const keys = q._opts.map(o => JSON.stringify(q.optCells[o])); ok(new Set(keys).size === 4, `읽기: 점 모양이 같은 보기 ${q.answer} ${q._opts}`);
        ok(JSON.stringify(q.optCells[q.answer]) === JSON.stringify(q.clue), '정답 점 불일치 ' + q.answer);
        const d = q._opts.filter(o => o !== q.answer).map(o => QZ.cdist(q.clue, q.optCells[o])); if (q.clue.length === 1 && q.bk === 'p') dists[lv].push(mean(d));
        if (sc !== 'all' && q.bk === 'p') ok(its.find(i => i.answer === q.answer).scope === sc, `범위 벗어남 ${sc} ${q.answer}`);
      }
    }
    if (mode === 'read' && n % 40 === 0) for (const q of quiz) { const r = QZ.restore(JSON.parse(JSON.stringify(QZ.compact(q)))); ok(r && JSON.stringify(r._opts) === JSON.stringify(q._opts) && JSON.stringify(r.clue) === JSON.stringify(q.clue), '점자 저장·복원 불일치 ' + q.answer); }
    if (mode === 'write' && n % 40 === 0) for (const q of quiz) { const r = QZ.restore(JSON.parse(JSON.stringify(QZ.compact(q)))); ok(r && r.answer === q.answer && JSON.stringify(r.clue) === JSON.stringify(q.clue), '쓰기 저장·복원 불일치 ' + q.answer); }
  }
  if (lv === 2) console.log(`${mode === 'read' ? '읽기' : '쓰기'} · ${QZ.SCOPES.find(s => s.key === sc).label.padEnd(5, '　')} 문제 종류 ${JSON.stringify(kinds)}`);
}
console.log('한 칸 글자 문제에서 정답과 보기의 점 모양 거리(클수록 많이 다름): 하', mean(dists[1]).toFixed(2), '/ 중', mean(dists[2]).toFixed(2), '/ 상', mean(dists[3]).toFixed(2));
ok(mean(dists[1]) > mean(dists[2]) && mean(dists[2]) > mean(dists[3]), '점자: 난이도가 올라갈수록 보기가 비슷해지지 않음');

console.log('\n' + (fails ? '실패 ' + fails + '건' : '모든 점검 통과'));
bad.forEach(b => console.log(' -', b));
process.exit(fails ? 1 : 0);
