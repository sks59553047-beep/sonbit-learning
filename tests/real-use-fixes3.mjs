// 사람처럼 써 보기 5차 + 지피티 평가 반영(2026-11-21)
// ① 크게 보기 영상: 재생 조절(controls), 크게 보는 동안 작은 영상 멈춤, 컴퓨터 화면에서 「이 영상으로 답하기」가 화면 안
// ② 생활 속 점자 → 글자 → 뒤로 가기/「돌아가기」 ③ 변환 결과 0칸이면 복사 막기 ④ 정답 말끝(이에요/예요)
// ⑤ 전화번호 안내 ⑥ 「물 주세요」에 「물다」가 섞이지 않음
// 사용: node real-use-fixes3.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 375, h: 812 });
const { ev, sleep, send } = c;
const tap = e => send('Runtime.evaluate', { expression: e, userGesture: true, awaitPromise: true });
await c.fresh(BASE + '?r3=' + Date.now(), 3000);
async function seedRun(kind, lv, qs) {
  await ev(`localStorage.setItem('sonbit:quizrun', JSON.stringify({v:2,kind:${JSON.stringify(kind)},mode:'practice',lv:${lv},scope:'all',i:0,score:0,lives:3,done:0,qs:${JSON.stringify(qs)},wrong:[]}))`);
  await c.goto(BASE + '?r3b=' + Date.now(), 1800);
  await ev(`document.querySelector('#homeNext [data-act="resume"]').click(); 1`); await sleep(1800);
}
// ---------- ① 크게 보기 영상 ----------
await seedRun('sign', 3, [{ t: 'pv', i: 'N809', l: 3 }, { t: 'pv', i: 'N489', l: 3 }]);
const playingBefore = await ev(`[...document.querySelectorAll('#quizArea video')].filter(v => !v.paused).length`);
await ev(`document.querySelectorAll('#quizOpts .vopt')[0].click(); 1`); await sleep(1200);
const big = await ev(`({ ctl: document.querySelector('#vPickVid').controls, bigPlaying: !document.querySelector('#vPickVid').paused, tilesPlaying: [...document.querySelectorAll('#quizOpts .vopt video')].filter(v => !v.paused).length })`);
check('R1 크게 보기 영상에 재생 조절(controls), 크게 보는 동안 작은 영상 4개는 멈춤(동시에 1개만 재생)', playingBefore === 4 && big.ctl && big.bigPlaying && big.tilesPlaying === 0, JSON.stringify({ playingBefore, big }));
await ev(`document.querySelector('#vPickVid').pause(); 1`);
check('R2 크게 보는 영상을 멈출 수 있음(일시정지)', await ev(`document.querySelector('#vPickVid').paused`));
await ev(`document.querySelector('#pickGo').click(); 1`); await sleep(600);
check('R3 답하면 작은 영상은 다시 돌고 크게 보기는 닫힘', (await ev(`[...document.querySelectorAll('#quizOpts .vopt video')].filter(v => !v.paused).length`)) >= 3 && (await ev(`document.querySelector('#vPickVid').hidden || document.querySelector('#vPick').hidden`)));
// 컴퓨터 화면: 답하기 단추가 화면 안
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }); await sleep(300);
await seedRun('sign', 3, [{ t: 'pv', i: 'N809', l: 3 }, { t: 'pv', i: 'N489', l: 3 }]);
await ev(`document.querySelectorAll('#quizOpts .vopt')[0].click(); 1`); await sleep(1500);
const pc = await ev(`(() => { const g = document.querySelector('#pickGo').getBoundingClientRect(), nav = document.querySelector('.navinner').getBoundingClientRect(); return { goBottom: Math.round(g.bottom), navTop: Math.round(nav.top), h: Math.round(document.querySelector('#vPickVid').getBoundingClientRect().height), vis: g.top >= 0 && g.bottom <= nav.top } })()`);
check('R4 컴퓨터 화면(1280×800): 크게 본 뒤에도 「이 영상으로 답하기」가 아래 탭에 가리지 않고 보임, 영상 높이 400px 이하', pc.vis && pc.h <= 400, JSON.stringify(pc));
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true }); await sleep(300);
// ---------- ④ 말끝 ----------
const ey = await ev(`({ a: eyo('물'), b: eyo('사과'), c: eyo('0'), d: eyo('2'), e: eyo('수요일'), f: eyo('ㄱ(받침)'), g: eyo('줄임표(…)'), h: eyo('ㅒ'), i: eyo('8') })`);
check('R5 「이에요/예요」: 물→이에요, 사과→예요, 0(영)→이에요, 2(이)→예요, 수요일→이에요, ㄱ→이에요, 줄임표→예요, ㅒ→예요, 8(팔)→이에요', ey.a === '이에요' && ey.b === '예요' && ey.c === '이에요' && ey.d === '예요' && ey.e === '이에요' && ey.f === '이에요' && ey.g === '예요' && ey.h === '예요' && ey.i === '이에요', JSON.stringify(ey));
await seedRun('sign', 1, [{ t: 'sv', i: 'N205', l: 1 }]);
const nm = await ev(`QZ.wordById('N205').w`);
await ev(`[...document.querySelectorAll('#quizOpts [data-opt]')].find(b => b.dataset.opt !== ${JSON.stringify(nm)}).click(); 1`); await sleep(500);
const fb = await ev(`document.querySelector('#quizFeedback .qfeedback').textContent`);
check('R6 틀렸을 때 안내 말끝이 낱말 받침에 맞음', fb === `아쉬워요. 정답은 「${nm}」${await ev(`eyo(${JSON.stringify(nm)})`)}.` && /「.+」(이에요|예요)\./.test(fb), fb);
await ev(`document.querySelector('#quizEnd').click(); 1`); await sleep(200); await ev(`document.querySelector('#quizEndYes')?.click(); 1`); await sleep(300);
// ---------- ③ 0칸 복사 ----------
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(400);
const typeBp = async t => { await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = ${JSON.stringify(t)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(400); };
await typeBp('IoT');
const z = await ev(`({ dis: document.querySelector('#bpCopyTop').disabled, label: document.querySelector('#bpCopyTop').textContent, wrapHidden: document.querySelector('#bpOutWrap').hidden })`);
check('R7 안 바뀌는 영어 IoT(점자 0칸): 위 복사 단추가 꺼지고 「복사할 점자가 없어요」, 아래 점자 문자 칸은 숨김', z.dis && z.label === '복사할 점자가 없어요' && z.wrapHidden, JSON.stringify(z));
await ev(`window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } }); document.querySelector('#bpCopyTop').click(); 1`); await sleep(300);
check('R8 꺼진 복사 단추를 눌러도 복사되지 않음', (await ev(`window.__copied`)) === null);
await typeBp('KTX');
const z2 = await ev(`({ dis: document.querySelector('#bpCopyTop').disabled, label: document.querySelector('#bpCopyTop').textContent })`);
check('R9 대문자 KTX로 바꾸면 복사 단추가 다시 켜짐', !z2.dis && z2.label === '점자 복사', JSON.stringify(z2));
// ---------- ⑤ 전화번호 ----------
await typeBp('010-1234-5678');
const ph = await ev(`document.querySelector('#bpWarn').hidden ? '' : document.querySelector('#bpWarn').textContent`);
check('R10 전화번호 안내: 「전화번호처럼 쓸 때」로 쉽게(「규정 제45항을 직접 확인」 없음)', /전화번호처럼 쓸 때/.test(ph) && !/제45항/.test(ph), ph);
// ---------- ② 생활 속 점자 뒤로 가기 ----------
await ev(`go('home'); 1`); await sleep(300); await ev(`go('sign'); 1`); await sleep(300);
await tap(`go('braille'); showBraillePanel('life', true); 1`); await sleep(500);
await ev(`[...document.querySelectorAll('.lifeword')].find(b => b.dataset.lifeword === '생수').scrollIntoView({ block: 'center' }); 1`); await sleep(300);
const y0 = await ev(`Math.round(scrollY)`);
await tap(`[...document.querySelectorAll('.lifeword')].find(b => b.dataset.lifeword === '생수').click(); 1`); await sleep(700);
const lb = await ev(`({ conv: !document.querySelector('#bp-convert').hidden, back: !document.querySelector('#lifeBack').hidden, input: document.querySelector('#bpInput').value })`);
check('R11 생활 속 점자에서 「생수」를 누르면 글자 바꾸기 + 「생활 속 점자로 돌아가기」 단추', lb.conv && lb.back && lb.input === '생수', JSON.stringify(lb));
await tap(`history.back(); 1`); await sleep(900);
const bk = await ev(`({ view: document.querySelector('.view.active').id, life: !document.querySelector('#bp-life').hidden, y: Math.round(scrollY), back: document.querySelector('#lifeBack').hidden })`);
check('R12 브라우저 뒤로 가기 → 수어 사전으로 새지 않고 「생활 속 점자」, 보던 카드 자리(40px 안)', bk.view === 'view-braille' && bk.life && Math.abs(bk.y - y0) <= 40 && bk.back, JSON.stringify({ y0, bk }));
await tap(`history.forward(); 1`); await sleep(800);
check('R13 앞으로 가기 → 다시 글자 바꾸기(돌아가기 단추 있음)', await ev(`!document.querySelector('#bp-convert').hidden && !document.querySelector('#lifeBack').hidden`));
await tap(`document.querySelector('#lifeBack').click(); 1`); await sleep(900);
const bk2 = await ev(`({ life: !document.querySelector('#bp-life').hidden, y: Math.round(scrollY) })`);
check('R14 「생활 속 점자로 돌아가기」 단추 → 생활 속 점자, 보던 카드 자리', bk2.life && Math.abs(bk2.y - y0) <= 40, JSON.stringify({ y0, bk2 }));
await tap(`history.back(); 1`); await sleep(800);
check('R15 한 번 더 뒤로 → 그 전 화면(수어 사전), 생활 속 점자 때문에 갇히지 않음', ['view-sign', 'view-home'].includes(await ev(`document.querySelector('.view.active').id`)), await ev(`document.querySelector('.view.active').id`));
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(300);
check('R16 점자 탭 단추로 글자 바꾸기를 열면 「돌아가기」 단추가 없음', await ev(`document.querySelector('#lifeBack').hidden`));
// ---------- ⑥ 물 주세요 ----------
await ev(`go('sign'); 1`); await sleep(300);
await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = '물 주세요'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(500);
const ms = await ev(`[...document.querySelectorAll('#signList .wordrow .wname')].map(e => e.textContent)`);
check('R17 「물 주세요」: 「물」·「주다」가 나오고 「물다」는 섞이지 않음', ms.includes('물') && !ms.includes('물다') && ms.includes('주다'), JSON.stringify(ms));
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
