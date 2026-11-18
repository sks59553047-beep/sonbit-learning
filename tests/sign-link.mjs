// 수어 단어 링크(2026-11-19): 주소 #sign/단어번호 로 그 단어가 바로 펼쳐지는지, 「링크 공유」(컴퓨터는 복사·휴대폰은 공유 창)가 되는지,
// 뒤로 가기·주소창 직접 입력·퀴즈 「사전에서 다시 보기」·없는 번호 안내까지 본다.
// 사용: node sign-link.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const hash = () => ev('location.hash');
const openRow = () => ev(`(() => { const r = document.querySelector('#signList .wordrow[open]'); return r ? r.dataset.wid : '' })()`);
const firstRow = () => ev(`document.querySelector('#signList .wordrow')?.dataset.wid || ''`);
const toastText = () => ev(`document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toast').textContent : ''`);

// ---------- 링크로 바로 열기 ----------
await c.fresh(BASE + '?sl=' + Date.now() + '#sign/N421', 2800);
check('K1 #sign/N421 로 열면 수어 사전 화면에 그 단어(그냥)가 맨 위에 펼쳐짐', (await ev(`document.querySelector('#view-sign').classList.contains('active')`)) && (await openRow()) === 'N421' && (await firstRow()) === 'N421' && (await hash()) === '#sign/N421', `${await openRow()} ${await hash()}`);
check('K2 펼친 단어에 영상·「링크 공유」 버튼', (await ev(`!!document.querySelector('#signList .wordrow[open] video')`)) && (await ev(`!!document.querySelector('#signList .wordrow[open] [data-share="N421"]')`)));
await c.goto(BASE + '?sl2=' + Date.now() + '#sign/KSL-0001', 2800);
check('K3 기존 단어 번호(#sign/KSL-0001 안녕하세요)도 열림', (await openRow()) === 'KSL-0001', await openRow());
await c.goto(BASE + '?sl3=' + Date.now() + '#sign/N999999', 2800);
check('K4 없는 번호는 수어 첫 화면(주제)과 안내, 주소는 #sign', (await ev(`!document.querySelector('#signHome').hidden`)) && /찾지 못했어요/.test(await toastText()) && (await hash()) === '#sign', `${await toastText()} ${await hash()}`);

// ---------- 링크 공유 ----------
await c.goto(BASE + '?sl4=' + Date.now() + '#sign/N421', 2800);
// 컴퓨터(손가락이 아닌 마우스): 클립보드로 복사
await ev(`window.__copied = ''; window.matchMedia = q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){} }); navigator.share = undefined;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } });`);
await c.click('#signList .wordrow[open] [data-share]'); await sleep(400);
check('K5 컴퓨터: 「링크 공유」 → 이 단어 주소를 복사하고 안내', (await ev('window.__copied')) === BASE + '#sign/N421' && /링크를 복사했어요/.test(await toastText()), await ev('window.__copied'));
// 휴대폰: 공유 창
await ev(`window.__shared = null; window.matchMedia = q => ({ matches: /coarse/.test(q), media: q, addEventListener(){}, removeEventListener(){} });
  navigator.share = d => { window.__shared = d; return Promise.resolve(); };`);
await c.click('#signList .wordrow[open] [data-share]'); await sleep(400);
const sh = await ev('window.__shared');
check('K6 휴대폰: 공유 창에 제목(「그냥」 수어 — 손빛 배움터)과 주소', sh && sh.url === BASE + '#sign/N421' && /「그냥」 수어/.test(sh.title), JSON.stringify(sh));
// 공유 창을 닫으면(취소) 아무 일 없음
await ev(`window.__copied = ''; navigator.share = () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' }));`);
await c.click('#signList .wordrow[open] [data-share]'); await sleep(400);
check('K7 휴대폰에서 공유 창을 닫으면 복사하지 않음', (await ev('window.__copied')) === '');
// 복사가 막힌 경우: 링크 칸이 나타나 골라져 있음
await ev(`window.matchMedia = q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){} });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });`);
await c.click('#signList .wordrow[open] [data-share]'); await sleep(400);
check('K8 복사가 막히면 링크 칸을 보여 주고 골라 둠', (await ev(`(() => { const i = document.querySelector('#signList .wordrow[open] .sharelink'); return !!i && i.value === ${JSON.stringify(BASE + '#sign/N421')} && document.activeElement === i })()`)) && /길게 눌러 복사/.test(await toastText()));

// ---------- 다른 길로 열기·뒤로 가기 ----------
await c.fresh(BASE + '?sl5=' + Date.now(), 2500);
await ev(`openWordInDictionary(WORD_BY_ID.get('KSL-0003'))`); await sleep(600);
check('K9 퀴즈 「사전에서 다시 보기」 길(openWordInDictionary): 주소 #sign/KSL-0003, 그 단어 펼침', (await hash()) === '#sign/KSL-0003' && (await openRow()) === 'KSL-0003', `${await hash()} ${await openRow()}`);
await ev('history.back()'); await sleep(700);
check('K10 뒤로 가기 → 처음 화면(학습)', (await ev(`document.querySelector('#view-home').classList.contains('active')`)) && !/#sign/.test(await hash()), await hash());
await ev('history.forward()'); await sleep(700);
check('K11 앞으로 가기 → 그 단어가 다시 펼쳐짐', (await openRow()) === 'KSL-0003', await openRow());
await ev(`location.hash = '#sign/N298'`); await sleep(900);
check('K12 주소창에 #sign/번호 를 직접 넣어도 그 단어로(같은 쪽 안 이동)', (await openRow()) === 'N298' && (await hash()) === '#sign/N298', `${await openRow()} ${await hash()}`);
await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = '학교'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await sleep(400);
check('K13 다른 단어를 검색하면 주소에서 단어 번호가 빠짐(#sign)', (await hash()) === '#sign', await hash());
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
