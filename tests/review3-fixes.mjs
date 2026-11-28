// 다른 AI 검토 3차 보완(2026-11-20): ① 「본문으로 바로가기」가 화면을 바꾸지 않고 그 화면 제목으로 초점만 옮김
// ② 교육 영상 주소(#player/영상번호) — 새로 고침해도 같은 영상·대본, 뒤로는 사이트 안에서만 ③ 수어 목록 150개 뒤 「더 보기」
// 사용: node review3-fixes.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 1280, h: 900, mobile: false });
const { ev, sleep } = c;
const active = () => ev(`document.querySelector('.view.active')?.id`);
const hash = () => ev('location.hash');
const focusId = () => ev('document.activeElement?.id || ""');

// ---------- ① 본문으로 바로가기 ----------
await c.fresh(BASE + '?r3=' + Date.now(), 2500);
await ev(`go('braille'); showBraillePanel('pad', true)`); await sleep(500);
const h0 = await hash();
await ev(`(() => { const s = document.querySelector('.skiplink'); s.focus(); s.click(); })()`); await sleep(300);
check('R1 점자 연습 패드에서 「본문으로 바로가기」 → 화면·주소는 그대로, 초점만 점자 화면 제목으로', (await active()) === 'view-braille' && !(await ev(`document.querySelector('#bp-pad').hidden`)) && (await hash()) === h0 && (await focusId()) === 'brailleH', `${await active()} ${await hash()} ${await focusId()}`);
await ev(`go('sign')`); await sleep(400);
await ev(`(() => { const s = document.querySelector('.skiplink'); s.focus(); s.click(); })()`); await sleep(300);
check('R2 수어 사전에서도 그 화면 제목(수어 사전)으로', (await active()) === 'view-sign' && (await focusId()) === 'signH');
await c.goto(BASE + '?r3b=' + Date.now() + '#board', 2500);
await ev(`(() => { const s = document.querySelector('.skiplink'); s.focus(); s.click(); })()`); await sleep(300);
check('R3 의견 게시판에서도 게시판 제목으로(게시판 화면 유지)', (await active()) === 'view-board' && (await focusId()) === 'boardH' && (await hash()) === '#board');

// ---------- ② 영상 주소 ----------
await c.fresh(BASE + '?r3c=' + Date.now(), 2500);
await ev(`document.querySelector('#homeVideoList [data-open-video="v8-ksl-intro"]').click()`); await sleep(1500);
check('R4 기초 영상 「수어의 시작」을 열면 주소가 #player/v8-ksl-intro', (await hash()) === '#player/v8-ksl-intro' && (await active()) === 'view-player', await hash());
await c.goto(BASE + '?r3d=' + Date.now() + '#player/v8-ksl-intro', 3000);
const p = await ev(`({ t: document.querySelector('#playerTitle').textContent, src: document.querySelector('#playerVideo').getAttribute('src'), lines: document.querySelectorAll('#playerTranscript .tline').length })`);
check('R5 새로 고침(주소로 바로 열기)해도 같은 영상: 제목·영상·대본이 나옴', (await active()) === 'view-player' && /수어의 시작/.test(p.t) && /v8-ksl-intro\.mp4$/.test(p.src || '') && p.lines >= 3, JSON.stringify(p));
const script = await ev(`document.querySelector('#playerTranscript').textContent`);
check('R5b 「수어의 시작」 대본: 법 설명은 「대한민국 농인의 공용어」, 옛 숫자 「224개」·「한국어와 함께 공용어」는 없음', /대한민국 농인의 공용어로 정하고 있어요/.test(script) && !/224/.test(script) && !/한국어와 함께 공용어/.test(script) && /궁금한 단어를 찾아 실제 수어 영상으로/.test(script));
check('R5c 자막은 처음에 꺼져 있음(재생기 자막 단추로 켤 수 있게 자막 파일은 있음)', (await ev(`(() => { const v = document.querySelector('#playerVideo'); const t = v.textTracks[0]; return !!v.querySelector('track') && (!t || t.mode !== 'showing') })()`)));
// 재생 바로 원하는 시간 옮기기: 서버가 영상을 부분(Range)으로 보내야 된다(실제 주소에서는 functions/videos 가 맡음)
const seek = await ev(`(async () => { const v = document.querySelector('#playerVideo'); v.muted = true;
  await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, { once: true }));
  v.currentTime = 40; await new Promise(r => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 6000); });
  try { await v.play(); } catch (e) {} await new Promise(r => setTimeout(r, 1500)); v.pause();
  const s = v.seekable; return { t: v.currentTime, end: s.length ? s.end(s.length - 1) : 0, dur: v.duration } })()`);
check('R5d 재생 바로 40초로 옮기면 40초부터 재생됨(처음으로 돌아가지 않음)', seek.t >= 39.5 && seek.t < 50 && seek.end >= seek.dur - 1, JSON.stringify(seek));
const head = await ev(`fetch('videos/v8-ksl-intro.mp4', { headers: { Range: 'bytes=100-199' }, cache: 'no-store' }).then(r => r.status + ' ' + (r.headers.get('content-range') || ''))`);
check('R5e 서버가 영상 일부만 달라는 요청에 206(일부)으로 답함', /^206 bytes 100-199\//.test(head), head);
await c.click('#playerBack'); await sleep(800);
check('R6 그 화면에서 왼쪽 위 화살표 → 사이트 안 학습 화면(사이트 밖으로 나가지 않음)', (await active()) === 'view-home' && (await ev('location.origin')) === new URL(BASE).origin && (await ev(`document.querySelector('#playerVideo').getAttribute('src')`)) === null);
await ev(`document.querySelector('#homeVideoList [data-open-video="v1-braille-basics"]').click()`); await sleep(1200);
await c.click('#playerBack'); await sleep(800);
check('R7 사이트 안에서 연 영상의 화살표 → 앞 화면(학습)으로', (await active()) === 'view-home' && !/#player/.test(await hash()), await hash());
const bvid = await ev(`VIDEO_LIST.find(v => v.track === '점자' && !HOME_VIDEO_IDS.includes(v.id)).id`);
await c.goto(BASE + '?r3i=' + Date.now() + '#player/' + bvid, 3000);
await c.click('#playerBack'); await sleep(800);
check(`R7b 점자 교육 영상(${bvid})을 새로 고침한 뒤 화살표 → 점자 탭 「교육 영상」 칸(학습 화면이 아니라)`, (await active()) === 'view-braille' && !(await ev(`document.querySelector('#bp-learn').hidden`)), `${await active()}`);
await c.goto(BASE + '?r3e=' + Date.now() + '#player/nope', 2500);
check('R8 모르는 영상 번호(#player/nope)는 학습 화면으로', (await active()) === 'view-home', await active());
await c.goto(BASE + '?r3f=' + Date.now() + '#player', 2500);
check('R9 영상 번호 없는 옛 주소(#player)도 빈 화면 대신 학습 화면으로', (await active()) === 'view-home', await active());
await ev(`go('player', { arg: { id: 'v5-etiquette' } })`); await sleep(1000);
await ev(`location.hash = '#player/v1-braille-basics'`); await sleep(1500);
check('R10 주소창에 다른 영상 번호를 넣으면 그 영상으로 바뀜', /점자의 시작/.test(await ev(`document.querySelector('#playerTitle').textContent`)), await ev(`document.querySelector('#playerTitle').textContent`));

// ---------- ③ 더 보기 ----------
await c.fresh(BASE + '?r3g=' + Date.now(), 2500);
await ev(`go('sign')`); await sleep(300);
// 2026-11-28 주제 재정비 뒤에는 150개가 넘는 주제가 없어, 결과가 긴 검색(초성 ㅇ)으로 확인한다
await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = 'ㅇ'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await sleep(900);
const total = await ev(`searchWords('ㅇ').length`);
const btnText = () => ev(`document.querySelector('#signList [data-signmore]')?.textContent || ''`);
const rows = () => ev(`document.querySelectorAll('#signList .wordrow').length`);
check(`R11 긴 목록(${total}개): 처음 150개와 「더 보기 (150 / ${total}개)」`, (await rows()) === 150 && (await btnText()) === `더 보기 (150 / ${total}개)` && !/검색어를 더 자세히/.test(await ev(`document.querySelector('#signList').textContent`)), await btnText());
await ev(`document.querySelector('#signList .wordrow').open = true`); await sleep(300);
const id151 = await ev(`String(searchWords('ㅇ')[150].id)`);
await c.click('#signList [data-signmore]'); await sleep(500);
check('R12 「더 보기」 → 다음 150개가 뒤에 붙고, 펼쳐 둔 첫 단어는 그대로, 초점은 새로 붙은 첫 단어', (await rows()) === Math.min(300, total) && (await ev(`document.querySelector('#signList .wordrow').open`)) && (await ev(`document.activeElement?.closest('.wordrow')?.dataset.wid`)) === id151, `${await rows()} ${await ev(`document.activeElement?.closest('.wordrow')?.dataset.wid`)} / ${id151}`);
while (await ev(`!!document.querySelector('#signList [data-signmore]')`)) { await c.click('#signList [data-signmore]'); await sleep(400); }
check(`R13 끝까지 누르면 ${total}개 모두 나오고 버튼은 사라짐`, (await rows()) === total);
await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = '감사'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await sleep(400);
check('R14 결과가 적은 검색에는 「더 보기」가 없음', !(await ev(`!!document.querySelector('#signList [data-signmore]')`)));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
