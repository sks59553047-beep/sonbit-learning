// 영어 낱말 점자(통일영어점자 2급 약자) 화면 시험 (2026-11-21)
// ① 문장 입력 → 점자 ② 안내(약자 안내·못 바꾸는 영어 안내) ③ 칸 아래 이름 ④ 예시 단추 ⑤ 복사
// 사용: node english-braille.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 375, h: 812 });
const { ev, sleep } = c;
await c.fresh(BASE + '?en=' + Date.now(), 3000);
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(400);
const typeBp = async t => { await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = ${JSON.stringify(t)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(350); };
const st = () => ev(`({ out: document.querySelector('#bpOut').textContent, sum: document.querySelector('#bpSummary').textContent, warn: document.querySelector('#bpWarn').hidden ? '' : document.querySelector('#bpWarn').textContent, copyOff: document.querySelector('#bpCopyTop').hidden || document.querySelector('#bpCopyTop').disabled, kinds: [...document.querySelectorAll('#bpCells small')].map(e => e.textContent), legend: document.querySelector('#bpLegend').textContent })`);
// ① 규정 예시 · 약자
await typeBp('Open'); let s = await st();
check('E1 「Open」 → ⠴⠠⠕⠏⠢⠲ (대문자표 + o + p + en 약자)', s.out === '⠴⠠⠕⠏⠢⠲', s.out);
check('E2 영어 약자 안내가 보임(통일영어점자 2급·합성어는 다를 수 있음)', /통일영어점자 약자\(2급\)/.test(s.warn) && /합성어/.test(s.warn), s.warn);
check('E3 칸 아래 이름에 「영어 약자」, 이름 뜻 풀이에도 나옴', s.kinds.includes('영어 약자') && /영어 약자/.test(s.legend), JSON.stringify(s.kinds));
await typeBp('apples, bananas, grapes'); s = await st();
check('E4 규정 제32항 예시 「apples, bananas, grapes」', s.out === '⠴⠁⠏⠏⠇⠑⠎⠂ ⠃⠁⠝⠁⠝⠁⠎⠂ ⠛⠗⠁⠏⠑⠎⠲', s.out);
await typeBp('the cat in the hat'); s = await st();
check('E5 「the cat in the hat」: the → ⠮, in 은 풀어 ⠊⠝ (규정 제32항 붙임)', s.out === '⠴⠮ ⠉⠁⠞ ⠊⠝ ⠮ ⠓⠁⠞⠲', s.out);
await typeBp('enough'); s = await st();
check('E6 규정 제37항: 「enough」는 낱말 약자(⠢) 없이 ⠢⠳⠣(en·ou·gh 묶음 약자)', s.out === '⠴⠢⠳⠣⠲', s.out);
await typeBp('Thank you'); s = await st();
check('E7 둘째 낱말 「you」는 낱말 약자 ⠽(첫 낱말만 풀어 씀)', s.out === '⠴⠠⠹⠁⠝⠅ ⠽⠲', s.out);
// ② 못 바꾸는 영어
for (const [t, why] of [['iPhone', 'iPhone처럼 대소문자가 섞인 낱말'], ['e-mail', 'e-mail처럼 부호가 든 낱말'], ['b', '한 글자 낱말'], ['OPEN', 'OPEN·STOP처럼']]) {
  await typeBp(t); s = await st();
  check(`E8 「${t}」는 바꾸지 않고 이유 안내(${why})`, /^\?+$|^\?.*\?$/.test(s.out) && new RegExp(why.replace(/[·]/g, '·')).test(s.warn) && (t === 'e-mail' || s.copyOff), s.out + ' | ' + s.warn.slice(0, 80));
}
// ③ 한글 속 영어
await typeBp('오늘 Coffee shop에 갔다'); s = await st();
check('E9 한글 속 영어: 로마자표·종료표로 감싸고 한글은 그대로(⠴⠠⠉⠷⠋⠑⠑ ⠩⠕⠏⠲)', s.out.includes('⠴⠠⠉⠷⠋⠑⠑ ⠩⠕⠏⠲'), s.out);
// ④ 예시 단추
const chips = await ev(`[...document.querySelectorAll('#bpExamples [data-ex]')].map(b => b.dataset.ex)`);
check('E10 예시 단추에 영어 낱말 예시(apples, bananas, grapes)', chips.includes('apples, bananas, grapes'), JSON.stringify(chips));
await ev(`document.querySelector('#bpExamples [data-ex="apples, bananas, grapes"]').click(); 1`); await sleep(300);
s = await st(); check('E11 예시 단추를 누르면 바로 바뀜', /⠁⠏⠏⠇⠑⠎/.test(s.out) && !s.copyOff, s.out);
check('E12 안내 문구: 「영어 낱말(apples)을 바꿔요」', /영어 낱말\(apples\)을 바꿔요/.test(await ev(`document.querySelector('#bp-convert').textContent`)));
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
