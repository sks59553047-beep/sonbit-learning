// 키보드만으로 퀴즈 풀기: Tab·Enter·Space 만 눌러서 시작 → 답 → 해설 → 다음 문제까지 가는지, Tab 을 몇 번 눌러야 하는지 잰다
// 사용: node keyboard5.mjs <주소> [mobile|desktop]
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const size = process.argv[3] || 'desktop';
const c = await open(size === 'mobile' ? { w: 390, h: 844 } : { w: 1280, h: 800, mobile: false });
const { ev, sleep, send } = c;
const KEYS = { Tab: ['Tab', 'Tab', 9, ''], Enter: ['Enter', 'Enter', 13, '\r'], Space: [' ', 'Space', 32, ' '] };
async function press(name) {
  const [key, code, vk, text] = KEYS[name];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text, unmodifiedText: text });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await sleep(60);
}
const active = () => ev(`(()=>{const a=document.activeElement;if(!a||a===document.body)return 'body';return a.tagName.toLowerCase()+(a.id?'#'+a.id:'')+(a.dataset&&a.dataset.opt!==undefined?'[opt]':'')+(a.dataset&&a.dataset.bdot?'[dot'+a.dataset.bdot+']':'')+(a.className&&typeof a.className==='string'?'.'+a.className.split(' ')[0]:'')})()`);
// 원하는 곳에 닿을 때까지 Tab(최대 n번). 몇 번 눌렀는지 돌려준다(못 닿으면 -1)
async function tabTo(test, n = 40) {
  for (let i = 1; i <= n; i++) { await press('Tab'); if (await ev(`(()=>{const a=document.activeElement;return !!a && (${test})(a)})()`)) return i; }
  return -1;
}
const isOpt = `a => !!a.closest('#quizOpts') && a.matches('[data-opt]')`;
const isNext = `a => a.id === 'quizNext'`;
await c.fresh(BASE + '?kb=' + Date.now(), 2500);
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(400);
await ev(`document.querySelector('[data-qlevel="3"]').click()`); await sleep(100);
// 퀴즈 카드에 포커스를 두고 Enter 로 시작
await ev(`window.scrollTo(0, 400); document.querySelector('[data-quiz="sign"]').focus()`);
await press('Enter'); await sleep(600);
const startFocus = await active(), startScroll = await ev('Math.round(scrollY)');
check('K1 Enter 로 퀴즈 시작 → 포커스가 문제 제목으로, 화면은 맨 위', startFocus === 'span#quizQ' && startScroll === 0, `포커스 ${startFocus}, 스크롤 ${startScroll}`);
const log = [];
let pickDone = false, videoDone = false;
for (let i = 0; i < 10 && !(pickDone && videoDone); i++) {
  const kind = await ev(`document.querySelector('.vgrid')?'영상 고르기':'영상 보고 뜻'`);
  if ((kind === '영상 고르기' && pickDone) || (kind === '영상 보고 뜻' && videoDone)) {
    await ev(`document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`); await sleep(150); await ev(`document.querySelector('#quizNext').click()`); await sleep(300); continue;
  }
  await ev(`document.querySelector('#quizQ').focus()`);
  const toOpt = await tabTo(isOpt);
  const optName = await active();
  await press('Enter'); await sleep(400);
  let pickNote = '';
  if (kind === '영상 고르기') {   // 2026-11-21: Enter 는 고르기(크게 보기) → Tab 으로 「이 영상으로 답하기」 → Enter 로 답
    const sel = await ev(`document.activeElement.getAttribute('aria-pressed') === 'true' && !document.querySelector('#vPick').hidden && !document.querySelector('#quizFeedback .qfeedback')`);
    const toGo = await tabTo(`a => a.id === 'pickGo'`);
    pickNote = ` · Enter 로 고름=${sel}, 「이 영상으로 답하기」까지 Tab ${toGo}번`;
    if (!sel || toGo < 0) { check('K2 영상 고르기: Enter 로 고르고 「이 영상으로 답하기」로 답', false, pickNote); }
    await press('Enter'); await sleep(400);
  }
  const fb = await active(), fbShown = await ev(`!!document.querySelector('#quizFeedback .qfeedback')`);
  const toNext = await tabTo(isNext);
  await press('Enter'); await sleep(500);
  const after = await active(), num = await ev(`document.querySelector('#quizQ')?.textContent`);
  log.push(`${kind}: 문제 제목→첫 보기 Tab ${toOpt}번(${optName})${pickNote} · Enter 후 포커스 ${fb} · 해설→「다음 문제로」 Tab ${toNext}번 · 다음 문제 포커스 ${after} (${num})`);
  const ok = toOpt > 0 && fbShown && fb === 'div#quizFeedback' && toNext > 0 && after === 'span#quizQ';
  check(`K2 ${kind}: Tab 으로 보기 → Enter 로 답 → 해설 → Enter 로 다음 문제`, ok, log[log.length - 1]);
  if (kind === '영상 고르기') pickDone = true; else videoDone = true;
}
// 점자 쓰기: Tab 으로 점 단추 → Space 로 켜기 → Tab 으로 「확인하기」 → Enter
await ev(`document.querySelector('#quizEnd').click()`); await sleep(100); await ev(`document.querySelector('#quizEndYes').click()`); await sleep(300);
await ev(`document.querySelector('#quizToHub').click()`); await sleep(300);
await ev(`document.querySelector('[data-quiz="build"]').focus()`); await press('Enter'); await sleep(600);
const toDot = await tabTo(`a => a.matches('[data-bdot]')`);
await press('Space'); await sleep(150);
const pressed = await ev(`document.activeElement.getAttribute('aria-pressed')`);
const toCheck = await tabTo(`a => a.id === 'buildCheck'`, 60);
await press('Enter'); await sleep(400);
check('K3 점자 쓰기: Tab 으로 점 → Space 로 켜짐(aria-pressed) → 「확인하기」 Enter → 해설로 포커스', toDot > 0 && pressed === 'true' && toCheck > 0 && (await active()) === 'div#quizFeedback', `제목→첫 점 Tab ${toDot}번, Space 후 눌림=${pressed}, 마지막 점까지 지나 「확인하기」 Tab ${toCheck}번, 포커스 ${await active()}`);
// 점자 읽기
await ev(`document.querySelector('#quizEnd').click()`); await sleep(100); await ev(`document.querySelector('#quizEndYes').click()`); await sleep(300);
await ev(`document.querySelector('#quizToHub').click()`); await sleep(300);
await ev(`document.querySelector('[data-quiz="braille"]').focus()`); await press('Enter'); await sleep(600);
const bOpt = await tabTo(isOpt); await press('Enter'); await sleep(300);
check('K4 점자 읽기: Tab 으로 보기 → Enter 로 답 → 해설로 포커스', bOpt > 0 && (await active()) === 'div#quizFeedback', `제목→첫 보기 Tab ${bOpt}번`);
// 결과 화면: 결과 점수에 포커스
for (let i = 0; i < 12; i++) { const nx = await ev(`!!document.querySelector('#quizNext')`); if (!nx) { const o = await ev(`!!document.querySelector('#quizOpts [data-opt]:not([disabled])')`); if (!o) break; await ev(`document.querySelector('#quizOpts [data-opt]:not([disabled])').click();document.querySelector('#pickGo')?.click()`); await sleep(120); } await ev(`document.querySelector('#quizNext')?.click()`); await sleep(200); }
check('K5 결과 화면이 뜨면 포커스가 점수로', (await active()).startsWith('div') && (await ev(`document.activeElement.classList.contains('score')`)) === true, await active());
console.log(log.join('\n'));
check('K6 JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
