// 첫 화면(2026-11-20 개편): 맨 위 찾기 칸(수어 검색·점자 바꾸기), 바로 가기 4개, 줄인 글, 접힌 「자료 출처」
// 사용: node home-find.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const active = () => ev(`document.querySelector('.view.active')?.id`);
const home = async () => { await c.fresh(BASE + '?hf=' + Date.now(), 2600); };
const submit = async (form, inp, val) => { await ev(`(() => { document.querySelector(${JSON.stringify(inp)}).value = ${JSON.stringify(val)}; document.querySelector(${JSON.stringify(form)}).requestSubmit(); })()`); await sleep(700); };

await home();
check('H1 첫 화면 맨 위에 찾기 칸 두 개(수어·점자), 그 아래 바로 가기 4개', (await ev(`(() => { const v = document.querySelector('#view-home'); const first = v.querySelector('.hero'); return !!first.querySelector('#homeSignQ') && !!first.querySelector('#homeBrailleQ') && v.querySelectorAll('.homequick .qbtn').length === 4 && first.compareDocumentPosition(document.querySelector('#homeVideos')) === 4 })()`)));
const chars = await ev(`document.querySelector('#view-home').innerText.replace(/\\s+/g, ' ').trim().length`);
check('H2 첫 화면 글이 짧아짐(700자 이하, 예전 약 1,400자)', chars <= 700, chars + '자');
check('H3 「자료 출처」는 처음엔 접혀 있음', (await ev(`!document.querySelector('#sourceCard').open`)) && (await ev(`!document.querySelector('#sourceCard .sourcelist').checkVisibility()`)));
await ev(`document.querySelector('#sourceCard summary').click()`); await sleep(200);
check('H4 누르면 펼쳐져 출처 4줄(국립국어원·서울복지포털·점자 규정·교육 영상)', (await ev(`document.querySelector('#sourceCard').open`)) && (await ev(`document.querySelectorAll('#sourceCard .sourcelist li').length`)) === 4 && /서울복지포털 「수어 표준사전」/.test(await ev(`document.querySelector('#sourceCard').textContent`)));

// 수어 찾기
await submit('#homeSignForm', '#homeSignQ', '감사');
const firstWord = await ev(`document.querySelector('#signList .wordrow .wname')?.textContent`);
check('H5 수어 칸에 「감사」 → 수어 사전 검색 결과(맨 위 「감사합니다」), 사전 검색 칸에도 「감사」', (await active()) === 'view-sign' && (await ev(`document.querySelector('#signSearch').value`)) === '감사' && firstWord === '감사합니다', `${await active()} ${firstWord}`);
await home();
await submit('#homeSignForm', '#homeSignQ', '   ');
check('H6 빈 칸으로 찾기 → 화면을 옮기지 않고 칸에 커서', (await active()) === 'view-home' && (await ev('document.activeElement.id')) === 'homeSignQ');

// 점자 바꾸기
await submit('#homeBrailleForm', '#homeBrailleQ', '손빛');
check('H7 점자 칸에 「손빛」 → 점자 「글자 바꾸기」에 들어가 점자가 나옴', (await active()) === 'view-braille' && !(await ev(`document.querySelector('#bp-convert').hidden`)) && (await ev(`document.querySelector('#bpInput').value`)) === '손빛' && (await ev(`document.querySelector('#bpOut').textContent.length`)) > 0, await ev(`document.querySelector('#bpOut').textContent`));

// 바로 가기
await home(); await c.click('.homequick [data-act="signnum"]'); await sleep(600);
check('H8 「기본 숫자」 → 수어 기본 숫자 목록', (await active()) === 'view-sign' && /기본 숫자/.test(await ev(`document.querySelector('#signTopicName').textContent`)) && (await ev(`document.querySelectorAll('#signList .wordrow').length`)) >= 15);
await home(); await c.click('.homequick [data-act="brailletable"]'); await sleep(600);
check('H9 「점자 표」 → 점자 탭의 점자 표', (await active()) === 'view-braille' && !(await ev(`document.querySelector('#bp-table').hidden`)));
await home(); await c.click('.homequick [data-arg="sign"]'); await sleep(500);
check('H10 「수어 주제별」 → 수어 사전 주제 목록', (await active()) === 'view-sign' && !(await ev(`document.querySelector('#signHome').hidden`)));
await home(); await c.click('.homequick [data-arg="quiz"]'); await sleep(500);
check('H11 「퀴즈」 → 퀴즈 화면', (await active()) === 'view-quiz');

// 좁은 화면
await c.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true });
await home();
check('H12 320px 좁은 화면에서도 옆으로 넘치지 않음', (await ev(`document.documentElement.scrollWidth <= window.innerWidth`)) && (await ev(`(() => { const r = document.querySelector('#homeBrailleForm .hbtn').getBoundingClientRect(); return r.right <= window.innerWidth })()`)));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
