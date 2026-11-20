// 학습 기록 옮기기(2026-11-20): 파일 내려받기가 막힌 곳에서도 옮길 수 있게 — 내보내기·「글로 복사하기」·「글로 붙여 넣어 가져오기」·휴대폰 공유 창
// 사용: node record-transfer.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const status = () => ev(`document.querySelector('#recStatus').textContent`);
const hidden = s => ev(`document.querySelector(${JSON.stringify(s)}).hidden`);
await c.fresh(BASE + '?rt=' + Date.now(), 2500);
await ev(`toggleFav('KSL-0003'); toggleFav('N421'); renderHome(); 1`);

// ---------- 컴퓨터: 파일 내려받기 + 글로 복사하기 줄 ----------
await ev(`window.__blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = b => { window.__blobs.push(b); return o(b) }; 1`);
check('T0 처음엔 「글로 복사하기」 줄은 숨어 있고, 「글로 붙여 넣어 가져오기」 버튼은 보임', (await hidden('#recCopyRow')) && !(await hidden('#recPasteOpen')) && (await hidden('#recPasteRow')));
await c.click('#recExport'); await sleep(500);
const fileText = await ev(`window.__blobs[0] ? window.__blobs[0].text() : ''`);
check('T1 「기록 내보내기」 → 파일 내용이 만들어지고, 「내려받기를 시작했어요…안 되면 글로 복사하기」 안내와 복사 줄이 나타남', /"app": "sonbit"/.test(fileText) && /내려받기를 시작했어요/.test(await status()) && /글로 복사하기/.test(await status()) && !(await hidden('#recCopyRow')), (await status()).slice(0, 60));

// ---------- 글로 복사하기 ----------
await ev(`window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } }); 1`);
await c.click('#recCopy'); await sleep(400);
const copied = await ev('window.__copied');
let cj = null; try { cj = JSON.parse(copied); } catch (e) { }
check('T2 「기록을 글로 복사하기」 → 기록 글(손빛 기록, 단어장 2개)이 복사되고 붙여 넣는 방법 안내', cj && cj.app === 'sonbit' && cj.data.fav.length === 2 && /나와의 채팅/.test(await status()), (await status()).slice(0, 50));
await ev(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); 1`);
await c.click('#recCopy'); await sleep(400);
check('T3 복사가 막히면 글 칸에 기록을 보여 주고 모두 골라 둠', !(await hidden('#recCopyText')) && (await ev(`(() => { const b = document.querySelector('#recCopyText'); return document.activeElement === b && b.selectionEnd - b.selectionStart === b.value.length && b.value.includes('"sonbit"') })()`)) && /막혀 있어요/.test(await status()));

// ---------- 글로 붙여 넣어 가져오기 ----------
await ev(`document.querySelector('#recClear').click()`); await sleep(150); await ev(`document.querySelector('#recClearYes').click()`); await sleep(300);
check('T4 (준비) 기록 지움 → 단어장 0', (await ev(`favList().length`)) === 0);
await c.click('#recPasteOpen'); await sleep(200);
check('T5 「파일 대신 글로 붙여 넣어 가져오기」 → 붙여 넣을 칸이 열리고 커서가 들어감', !(await hidden('#recPasteRow')) && (await ev('document.activeElement.id')) === 'recPaste' && (await ev(`document.querySelector('#recPasteOpen').getAttribute('aria-expanded')`)) === 'true');
await c.click('#recPasteGo'); await sleep(200);
check('T6 빈 칸으로 가져오기 → 안내', /붙여 넣은 글이 없어요/.test(await status()));
await ev(`document.querySelector('#recPaste').value = ${JSON.stringify('엉터리 글')}; 1`);
await c.click('#recPasteGo'); await sleep(200);
check('T7 손빛 기록이 아닌 글 → 「읽을 수 없어요」', /읽을 수 없어요/.test(await status()) && (await ev(`favList().length`)) === 0);
await ev(`document.querySelector('#recPaste').value = ${JSON.stringify(copied)}; 1`);
await c.click('#recPasteGo'); await sleep(400);
check('T8 복사해 둔 기록을 붙여 넣으면 가져와짐(단어장 2개 돌아옴), 칸은 닫힘', (await ev(`favList().length`)) === 2 && /기록을 가져왔어요/.test(await status()) && (await hidden('#recPasteRow')), (await status()).slice(0, 50));

// ---------- 휴대폰: 공유 창 ----------
await ev(`window.matchMedia = q => ({ matches: /coarse/.test(q), media: q, addEventListener(){}, removeEventListener(){} });
  window.__shared = null; navigator.canShare = d => !!(d && d.files); navigator.share = d => { window.__shared = d; return Promise.resolve(); }; window.__blobs = []; 1`);
await c.click('#recExport'); await sleep(500);
const sh = await ev(`window.__shared ? { name: window.__shared.files[0].name, type: window.__shared.files[0].type } : null`);
const shText = await ev(`window.__shared ? window.__shared.files[0].text() : ''`);
check('T9 휴대폰: 공유 창으로 기록 파일(sonbit-record-날짜.json)을 보냄, 파일 내려받기는 안 함', sh && /^sonbit-record-\d{4}-\d\d-\d\d\.json$/.test(sh.name) && /"app": "sonbit"/.test(shText) && (await ev('window.__blobs.length')) === 0 && /보냈어요/.test(await status()), JSON.stringify(sh));
await ev(`navigator.share = () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })); 1`);
await c.click('#recExport'); await sleep(400);
check('T10 공유 창을 닫으면 「취소했어요…글로 복사하기」 안내', /취소했어요/.test(await status()));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
