// 이미 쓰던 사람(옛 방식으로 저장된 퀴즈 기록)이 새 버전을 열었을 때: 오류 없이 뜨고, 쓸 수 있는 기록만 남기는지
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const c = await open({ w: 390, h: 844, dpr: 1 });
const { ev, sleep } = c;
await c.fresh(BASE + '?m=' + Date.now(), 1500);
const old = {
  fav: ['KSL-0003', 'N205'],
  wrong: [
    { t: 'sv', i: 'KSL-0003' },                 // 옛 영상→뜻 (살아남아야 함)
    { t: 'st', i: 'KSL-0003' },                 // 옛 글 단서 문제 (없어짐)
    { t: 'br', a: 'ㄱ' },                       // 옛 점자 읽기 (살아남아야 함)
    { t: 'br', a: '가(약자)' },                 // 옛 라벨 그대로 (살아남아야 함)
    { t: 'bu', a: '.' },                        // 옛 문장부호 라벨 '.' (이제 '마침표(.)') → 없어짐
    { t: 'bu', a: 'ㅒ' },                       // 살아남아야 함
    { t: 'sv', i: 'NOPE-999' },                 // 없는 단어 (없어짐)
    { t: 'sv', i: 'KSL-0003' },                 // 중복 (하나로)
    { t: 'zz', a: 1 }, null, 'x'                // 쓰레기 (없어짐)
  ],
  quizrun: { v: 1, kind: 'sign', mode: 'practice', i: 3, score: 1, lives: 3, done: 3, qs: [{ t: 'sv', i: 'KSL-0003', o: ['감사합니다', '안녕', '미안합니다', '사랑'] }], wrong: [] }
};
await ev(`(()=>{const o=${JSON.stringify(old)};localStorage.setItem('sonbit:fav',JSON.stringify(o.fav));localStorage.setItem('sonbit:wrong',JSON.stringify(o.wrong));localStorage.setItem('sonbit:quizrun',JSON.stringify(o.quizrun));})()`);
await c.goto(BASE + '?m2=' + Date.now(), 2500);
check('M1 JS 오류 없이 열림', c.errs.length === 0, c.errs.join(' | '));
const wrong = JSON.parse(await ev(`localStorage.getItem('sonbit:wrong')`));
check('M2 틀린 문제 정리: 쓸 수 있는 4개만 남음(중복 합침)', wrong.length === 4, JSON.stringify(wrong));
check('M3 정리된 모양이 새 형식', wrong.every(x => ['sv', 'pv', 'br', 'bu'].includes(x.t) && [1, 2, 3].includes(x.l)) && wrong.some(x => x.t === 'br' && x.k === 'p' && x.a === 'ㄱ'), JSON.stringify(wrong[0]));
check('M4 옛 풀이(v:1)는 이어 풀 수 없으므로 삭제', (await ev(`localStorage.getItem('sonbit:quizrun')`)) === null || (await ev(`!document.querySelector('#homeNext [data-act="resume"]')`)) === true);
check('M5 홈에 「이어서 하기」 카드 없음', (await ev(`!document.querySelector('#homeNext [data-act="resume"]')`)) === true);
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(500);
check('M6 퀴즈 첫 화면: 복습 칩 4개·이어서 풀기 없음', (await ev(`document.querySelector('[data-quiz="review"] .rn').textContent`)) === '4' && (await ev(`!document.querySelector('#qResume')`)) === true);
await ev(`document.querySelector('[data-quiz="review"]').click()`); await sleep(600);
check('M7 틀린 문제 복습 4문제 시작', /틀린 문제 복습 · 1 \/ 4/.test(await ev(`document.querySelector('#quizQ').textContent`)), await ev(`document.querySelector('#quizQ').textContent`));
// 4문제를 모두 풀어(아무거나 눌러서) 오류 없이 끝나는지
for (let i = 0; i < 4; i++) {
  const build = await ev(`!!document.querySelector('#buildCells')`);
  if (build) { await ev(`document.querySelector('#buildCells .dot').click()`); await ev(`document.querySelector('#buildCheck').click()`); }
  else await ev(`document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`);
  await sleep(150); await ev(`document.querySelector('#quizNext').click()`); await sleep(200);
}
check('M8 복습 끝까지 풀고 결과 화면', (await ev(`!!document.querySelector('.qresult .score')`)) === true, await ev(`document.querySelector('.qresult .score')?.textContent`));
check('M9 풀이 중 JS 오류 없음', c.errs.length === 0 && c.cons.length === 0, c.errs.concat(c.cons).join(' | '));
await c.close(); process.exit(0);
