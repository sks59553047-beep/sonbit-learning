// 연습 패드 두 칸: 칸 추가·읽기·한 칸으로·퀴즈에서 열기
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const size = process.argv[3] || 'mobile';
const c = await open(size === 'mobile' ? { w: 390, h: 844, dpr: 2 } : { w: 1280, h: 900, mobile: false });
const { ev, sleep } = c;
const txt = async s => ((await ev(`document.querySelector(${JSON.stringify(s)})?.textContent`)) || '').replace(/\s+/g, ' ');
await c.fresh(BASE + '?p2=' + Date.now(), 2500);
await ev(`document.querySelector('[data-nav="braille"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-bpanel="pad"]').click()`); await sleep(300);
const press = async (cell, dots) => { for (const d of dots) await ev(`document.querySelector('#padCell${cell === 2 ? '2' : ''} [data-dot="${d}"]').click()`); await sleep(80); };
const clear = () => ev(`document.querySelector('#padReset').click()`);
await press(1, [1, 4]);
check('S1 처음엔 한 칸(둘째 칸 숨김), 1·4번 점 읽기 그대로', (await ev(`document.querySelector('#padCol2').hidden`)) === true && /ㄴ/.test(await txt('#padReadings')) && /약자/.test(await txt('#padReadings')), (await txt('#padReadings')).slice(0, 60));
await ev(`document.querySelector('#padTwo').click()`); await sleep(200);
check('S2 「칸 추가」 → 둘째 칸이 나오고 버튼이 「한 칸으로」', (await ev(`!document.querySelector('#padCol2').hidden`)) === true && (await txt('#padTwo')) === '한 칸으로' && (await ev(`document.querySelector('#padTwo').getAttribute('aria-pressed')`)) === 'true' && (await ev(`document.querySelectorAll('#padCell2 [data-dot]').length`)) === 6);
check('S3 첫째 칸만 눌렀을 때는 「둘째 칸도 누르면」 안내', /둘째 칸도 누르면/.test(await txt('#padReadings')));
const cases = [
  ['그래서(약어)', [1], [2, 3, 4], /그래서 — 약어/],
  ['ㄲ(된소리 첫소리)', [6], [4], /ㄲ — 된소리 첫소리/],
  ['숫자 1(수표+숫자)', [3, 4, 5, 6], [1], /숫자 1 — 숫자\(수표\+숫자\)/],
  ['거(글자)', [4], [2, 3, 4], /거 — 글자/],
  ['것(약자 사용)', [4, 5, 6], [2, 3, 4], /것 — 글자\(약자 사용\)/],
  ['ㅒ와 얘', [3, 4, 5], [1, 2, 3, 5], /ㅒ — 모음\(두 칸\).*얘 — 글자/]
];
for (const [name, a, b, re] of cases) {
  await clear(); await press(1, a); await press(2, b); await sleep(150);
  const r = await txt('#padReadings');
  // 엔진으로 직접 바꾼 결과와도 맞춰 본다(같은 두 칸이 나오는지)
  check(`T 두 칸 ${a.join('·')} | ${b.join('·')} → ${name}`, re.test(r) && /칸마다 따로 읽으면/.test(r), r.slice(0, 90));
}
await clear(); await press(1, [1, 2, 3, 4, 5, 6]); await press(2, [1, 2, 3, 4, 5, 6]);
check('T 아무 글자도 아닌 두 칸 → 「한 덩어리로 읽히는 것은 없어요」 + 칸마다 읽기', /한 덩어리로 읽히는 글자·부호는 없어요/.test(await txt('#padReadings')), (await txt('#padReadings')).slice(0, 80));
await clear(); await press(2, [1]);
check('T 둘째 칸만 누르면 「첫째 칸부터」', /첫째 칸부터/.test(await txt('#padResultChar')));
// 엔진 대조: 「그래서」「것」「1」을 엔진으로 바꾼 두 칸이 패드에서 누른 점과 같은지
const eng = JSON.parse(await ev(`JSON.stringify(['그래서','것'].map(s=>KB.convert(s,{contract:true}).cells.map(c=>c.dots.join('-')).join('|')).concat([KB.convert('1',{contract:false}).cells.map(c=>c.dots.join('-')).join('|')]))`));
check('E 엔진 결과와 시험 값이 같음(그래서·것·1)', JSON.stringify(eng) === JSON.stringify(['1|2-3-4', '4-5-6|2-3-4', '3-4-5-6|1']), JSON.stringify(eng));
if (size === 'mobile') { await clear(); await press(1, [4, 5, 6]); await press(2, [2, 3, 4]); await ev(`document.querySelector('#padCells').scrollIntoView({block:'start'})`); await sleep(300); await c.shot('pad2_mobile.png', false); }
await ev(`document.querySelector('#padTwo').click()`); await sleep(200);
check('S4 「한 칸으로」 → 둘째 칸 숨기고 비움, 한 칸 읽기로', (await ev(`document.querySelector('#padCol2').hidden`)) === true && (await ev(`document.querySelectorAll('#padCell2 .dot.on').length`)) === 0 && (await txt('#padTwo')) === '칸 추가(두 칸으로)');
// 퀴즈 해설 「연습 패드에서 눌러 보기」: 정답이 두 칸(ㄲ)이면 두 칸 패드로
await ev(`localStorage.setItem('sonbit:quizrun', JSON.stringify({v:2,kind:'build',mode:'practice',lv:2,scope:'all',i:0,score:0,lives:3,done:0,qs:[{t:'bu',k:'p',a:'ㄲ',l:2}],wrong:[]}))`);
await c.goto(BASE + '?p2b=' + Date.now(), 2000);
await ev(`document.querySelector('#homeNext [data-act="resume"]').click()`); await sleep(500);
await ev(`document.querySelector('#buildCheck').click()`); await sleep(300);
await ev(`document.querySelector('#quizPad').click()`); await sleep(500);
check('Q 퀴즈 해설에서 두 칸 정답(ㄲ) → 두 칸 패드에 정답 점이 눌린 채로 열림', (await ev(`!document.querySelector('#padCol2').hidden`)) === true && /ㄲ — 된소리 첫소리/.test(await txt('#padReadings')), (await txt('#padReadings')).slice(0, 60));
check('JS 오류·콘솔 오류 없음', c.errs.length === 0 && c.cons.length === 0, c.errs.concat(c.cons).join(' | '));
await c.close(); process.exit(0);
