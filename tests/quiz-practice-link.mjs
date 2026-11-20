// 점자 퀴즈 해설의 연습 버튼: 한두 칸 정답은 「연습 패드에서 눌러 보기」, 세 칸 이상은 「글자 바꾸기에서 보기」(변환기에 정답 글자가 들어가고, 바뀐 점자가 퀴즈 정답과 같은지)
// 사용: node quiz-practice-link.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
await c.fresh(BASE + '?ql=' + Date.now(), 2500);
// 시험할 정답 고르기: 낱말(풀어쓰기·약자 사용), 여러 자리 숫자, 세 칸 이상 부호(있으면), 한 칸·두 칸 글자
const pick = JSON.parse(await ev(`JSON.stringify((() => {
  const w = QZ.wordPool(), items = QZ.brailleItems();
  const out = [];
  const ww = w.find(x => x.kind === 'w' && x.cells.length >= 3); if (ww) out.push({ k: 'w', a: ww.answer });
  const wc = w.find(x => x.kind === 'c' && x.cells.length >= 3); if (wc) out.push({ k: 'c', a: wc.answer });
  out.push({ k: 'n', a: '2025' });
  const p3 = items.find(x => x.cells.length >= 3); if (p3) out.push({ k: 'p', a: p3.answer });
  const one = items.find(x => x.cells.length === 1), two = items.find(x => x.cells.length === 2);
  out.push({ k: 'p', a: one.answer, small: 1 }, { k: 'p', a: two.answer, small: 2 });
  return out;
})())`));
for (const it of pick) for (const t of ['bu', 'br']) {
  await ev(`localStorage.setItem('sonbit:quizrun', JSON.stringify({v:2,kind:${JSON.stringify(t === 'bu' ? 'build' : 'braille')},mode:'practice',lv:2,scope:'all',i:0,score:0,lives:3,done:0,qs:[{t:'${t}',k:'${it.k}',a:${JSON.stringify(it.a)},l:2}],wrong:[]}))`);
  await c.goto(BASE + '?ql2=' + Date.now(), 1800);
  await ev(`document.querySelector('#homeNext [data-act="resume"]').click()`); await sleep(500);
  if (t === 'bu') await ev(`document.querySelector('#buildCheck').click()`); else await ev(`document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`);
  await sleep(300);
  const cells = await ev(`QZ.restore({t:'${t}',k:'${it.k}',a:${JSON.stringify(it.a)},l:2}).clue.length`);
  const label = `${t === 'bu' ? '쓰기' : '읽기'} 「${it.a}」(${cells}칸)`;
  if (it.small) {
    check(`${label} → 「연습 패드에서 눌러 보기」`, (await ev(`!!document.querySelector('#quizPad') && !document.querySelector('#quizConv')`)) === true);
    continue;
  }
  const has = await ev(`!!document.querySelector('#quizConv') && !document.querySelector('#quizPad') && document.querySelector('#quizConv').textContent === '글자 바꾸기에서 보기'`);
  await ev(`document.querySelector('#quizConv')?.click()`); await sleep(500);
  const r = JSON.parse(await ev(`JSON.stringify((() => {
    const clue = QZ.restore({t:'${t}',k:'${it.k}',a:${JSON.stringify(it.a)},l:2}).clue.map(c => c.join('-')).join('|');
    const val = document.querySelector('#bpInput').value;
    const got = KB.convert(val, { contract: document.querySelector('#bpContract').checked }).cells.filter(c => c.kind !== '띄어쓰기' && c.kind !== '줄바꿈').map(c => c.dots.join('-')).join('|');
    return { tab: document.querySelector('#view-braille').classList.contains('active') && !document.querySelector('#bp-convert').hidden, val, same: clue === got, shown: document.querySelectorAll('#bpCells .ccell').length };
  })())`));
  check(`${label} → 「글자 바꾸기에서 보기」 → 변환기에 「${r.val}」, 바뀐 점자가 퀴즈 정답과 같음`, has === true && r.tab && r.same && r.shown >= cells, JSON.stringify(r));
}
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
