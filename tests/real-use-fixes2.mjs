// 실사용 평가 반영 2(2026-11-21, 지피티가 휴대폰 폭 360·375·412px로 써 보고 낸 불편)
// ① 영상 고르기: 누르면 채점하지 않고 고름+크게 보기 → 「이 영상으로 답하기」 ② 약자 설명(것·성·정·청은 두 칸)
// ③ 점자 칸 수 옆 「점자 복사」 ④ 단어장에서 빼면 개수 바로 ⑤ 퀴즈 해설에서 나간 화면에 「퀴즈로 돌아가기」
// ⑥ 좁은 휴대폰 + 큰 글씨 제목 잘림 ⑦ 수어 사전 뒤로 가기 = 펼친 단어 닫기(목록·스크롤 그대로)
// 사용: node real-use-fixes2.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const W = 375, H = 812;
const c = await open({ w: W, h: H });
const { ev, sleep, send } = c;
await c.fresh(BASE + '?ruf2=' + Date.now(), 3000);
async function seedRun(kind, lv, qs) {
  await ev(`localStorage.setItem('sonbit:quizrun', JSON.stringify({v:2,kind:${JSON.stringify(kind)},mode:'practice',lv:${lv},scope:'all',i:0,score:0,lives:3,done:0,qs:${JSON.stringify(qs)},wrong:[]}))`);
  await c.goto(BASE + '?ruf2b=' + Date.now(), 1800);
  await ev(`document.querySelector('#homeNext [data-act="resume"]').click(); 1`); await sleep(1500);
}
const tilesNow = () => ev(`[...document.querySelectorAll('#quizOpts .vopt')].map(b => b.dataset.opt)`);

// ---------- ① 영상 고르기 ----------
await seedRun('sign', 3, [{ t: 'pv', i: 'N809', l: 3 }, { t: 'pv', i: 'N489', l: 3 }]);
let ans = await ev(`String(quizState.qs[quizState.i].id)`), tiles = await tilesNow();
const wi = tiles.findIndex(o => o !== ans), ri = tiles.indexOf(ans);
const how = await ev(`document.querySelector('.vpickhow')?.textContent || ''`);
check('P0 영상 고르기 문제 위에 「누르면 크게 · 고른 뒤 답하기」 안내', /크게 보여요/.test(how) && /이 영상으로 답하기/.test(how), how);
await ev(`document.querySelectorAll('#quizOpts .vopt')[${wi}].click(); 1`); await sleep(900);
const pickState = () => ev(`({ answered: quizState.answered, fb: !!document.querySelector('#quizFeedback .qfeedback'), sel: [...document.querySelectorAll('#quizOpts .vopt')].map(b => b.getAttribute('aria-pressed')), box: !document.querySelector('#vPick').hidden, big: document.querySelector('#vPickVid').dataset.clip, t: document.querySelector('#vPickT').textContent, bigW: Math.round(document.querySelector('#vPickVid').getBoundingClientRect().width), tileW: Math.round(document.querySelector('#quizOpts .vopt').getBoundingClientRect().width), goVis: (() => { const r = document.querySelector('#pickGo').getBoundingClientRect(); return r.height > 0 })() })`);
let s = await pickState();
check('P1 영상을 누르면 채점하지 않고 「고름」 표시 + 아래에 크게(작은 칸의 1.8배 이상)', !s.answered && !s.fb && s.sel[wi] === 'true' && s.sel.filter(x => x === 'true').length === 1 && s.box && s.big === tiles[wi] && new RegExp(`${wi + 1}번 영상을 골랐어요`).test(s.t) && s.bigW > s.tileW * 1.8 && s.goVis, JSON.stringify(s));
await ev(`document.querySelectorAll('#quizOpts .vopt')[${ri}].click(); 1`); await sleep(1200);
s = await pickState();
check('P2 다른 영상을 누르면 바꿔 고름(큰 영상도 그 영상으로)', !s.answered && s.sel[ri] === 'true' && s.sel.filter(x => x === 'true').length === 1 && s.big === tiles[ri] && new RegExp(`${ri + 1}번 영상을 골랐어요`).test(s.t), JSON.stringify(s));
const playing = await ev(`(() => { const v = document.querySelector('#vPickVid'); return { paused: v.paused, rs: v.readyState } })()`);
check('P3 크게 보기 영상이 재생 중', !playing.paused && playing.rs >= 2, JSON.stringify(playing));
await ev(`document.querySelector('#pickGo').click(); 1`); await sleep(600);
s = await ev(`({ ok: !!document.querySelector('#quizFeedback .qfeedback.ok'), boxHidden: document.querySelector('#vPick').hidden, howHidden: document.querySelector('.vpickhow').hidden, tags: [...document.querySelectorAll('#quizOpts .vtag')].map(x => x.textContent).join(','), sel: document.querySelectorAll('#quizOpts .vopt.sel').length, src: document.querySelector('#vPickVid').getAttribute('src'), t: document.querySelector('#vPickT').textContent })`);
check('P4 「이 영상으로 답하기」 → 고른 영상으로 채점(정답), 크게 보기·안내는 닫힘', s.ok && s.boxHidden && s.howHidden && s.tags === '정답' && s.sel === 0 && !s.src && !s.t, JSON.stringify(s));
await ev(`document.querySelector('#quizNext').click(); 1`); await sleep(1500);
ans = await ev(`String(quizState.qs[quizState.i].id)`); tiles = await tilesNow();
const wrongs = tiles.filter(o => o !== ans), pickW = wrongs[1], pi = tiles.indexOf(pickW);
await ev(`document.querySelectorAll('#quizOpts .vopt')[${pi}].click(); 1`); await sleep(500);
// 「보기 하나 지우기」가 마침 고른 영상을 지우게 한다(지울 보기는 무작위라 Math.random 을 잠시 고정)
await ev(`(() => { const r = Math.random; Math.random = () => (1 + 0.5) / 3; document.querySelector('#hintCut').click(); Math.random = r; return 1 })()`); await sleep(300);
s = await ev(`({ gone: document.querySelectorAll('#quizOpts .vopt')[${pi}].classList.contains('gone'), sel: document.querySelectorAll('#quizOpts .vopt.sel').length, boxHidden: document.querySelector('#vPick').hidden, answered: quizState.answered })`);
check('P5 골라 둔 영상이 「보기 하나 지우기」로 지워지면 고른 것도 풀림', s.gone && s.sel === 0 && s.boxHidden && !s.answered, JSON.stringify(s));
await ev(`document.querySelector('#quizEnd').click(); 1`); await sleep(200); await ev(`document.querySelector('#quizEndYes')?.click(); 1`); await sleep(400);

// ---------- ② 약자 설명 · ③ 위쪽 복사 단추 ----------
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(400);
const typeBp = async t => { await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = ${JSON.stringify(t)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(400); };
await typeBp('것');
const lg = await ev(`({ legend: document.querySelector('#bpLegend').textContent, cells: document.querySelectorAll('#bpCells .ccell').length })`);
check('B1 「것」 → 두 칸, 약자 풀이는 「대부분 한 칸, 것·성·정·청은 두 칸」(「한 칸으로 줄여 쓴 것」이 아님)', lg.cells === 2 && /것·성·정·청은 두 칸/.test(lg.legend) && !/한 칸으로 줄여/.test(lg.legend), JSON.stringify(lg));
const long = '오늘은 날씨가 맑아서 친구와 함께 공원에 가서 산책을 하고 맛있는 점심을 먹은 뒤 도서관에 들러 책을 빌렸어요.';
await typeBp(long);
await ev(`window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } }); 1`);
const pos = await ev(`(() => { const top = document.querySelector('#bpCopyTop'), bot = document.querySelector('#bpCopy'), inp = document.querySelector('#bpInput'); const y = e => Math.round(e.getBoundingClientRect().top + scrollY); return { topVis: !top.hidden, topY: y(top) - y(inp), botY: y(bot) - y(inp), cells: document.querySelectorAll('#bpCells .ccell').length } })()`);
check(`B2 긴 글(${long.length}자): 칸 수 안내 옆 「점자 복사」가 입력 칸 가까이(아래 복사 단추보다 훨씬 위)`, pos.topVis && pos.topY < 700 && pos.botY > pos.topY + 1000, JSON.stringify(pos));
await ev(`document.querySelector('#bpCopyTop').click(); 1`); await sleep(300);
const cp = await ev(`({ copied: window.__copied, out: document.querySelector('#bpOut').textContent, label: document.querySelector('#bpCopyTop').textContent })`);
check('B3 위 「점자 복사」 → 아래 점자 문자와 똑같은 글을 복사', cp.copied && cp.copied === cp.out && cp.label === '복사했어요', JSON.stringify({ n: (cp.copied || '').length, label: cp.label }));
await typeBp('');
check('B4 글을 지우면 위 「점자 복사」도 숨김', await ev(`document.querySelector('#bpCopyTop').hidden`));

// ---------- ④ 단어장 ----------
await ev(`localStorage.setItem('sonbit:fav', JSON.stringify(['KSL-0001', 'N421', 'N117'])); 1`);
await c.goto(BASE + '?ruf2c=' + Date.now() + '#sign', 2500);
await ev(`document.querySelector('#signShortcuts .shortcut.fav').click(); 1`); await sleep(500);
const favState = () => ev(`({ btn: document.querySelector('#signActions').hidden ? '' : document.querySelector('#signActions').textContent, count: document.querySelector('#signCount').textContent, rows: document.querySelectorAll('#signList .wordrow').length, unfav: [...document.querySelectorAll('#signList .wordrow')].map(r => r.classList.contains('unfav') ? (r.querySelector('.unfavtag')?.textContent || '?') : '') })`);
let f = await favState();
check('F0 단어장 3개: 「단어장 퀴즈 풀기 (3개)」', /\(3개\)/.test(f.btn) && f.rows === 3, JSON.stringify(f));
await ev(`document.querySelectorAll('#signList .wordrow summary')[1].click(); 1`); await sleep(900);
await ev(`document.querySelector('#signList .wordrow[open] [data-fav]').click(); 1`); await sleep(300);
f = await favState();
check('F1 하나를 빼면 바로 「(2개)」·「2개 단어」, 그 줄은 흐리게 「단어장에서 뺌」', /\(2개\)/.test(f.btn) && /^2개 단어/.test(f.count) && f.unfav[1] === '단어장에서 뺌' && !f.unfav[0] && !f.unfav[2], JSON.stringify(f));
await ev(`document.querySelector('#signList .wordrow[open] [data-fav]').click(); 1`); await sleep(300);
f = await favState();
check('F2 같은 자리에서 다시 담으면 「(3개)」로 돌아오고 표시도 사라짐', /\(3개\)/.test(f.btn) && /^3개 단어/.test(f.count) && f.unfav.every(x => !x), JSON.stringify(f));
await ev(`document.querySelector('#signList .wordrow[open] [data-fav]').click(); 1`); await sleep(300);
await ev(`document.querySelector('#signTopicBack').click(); 1`); await sleep(300);
await ev(`document.querySelector('#signShortcuts .shortcut.fav').click(); 1`); await sleep(400);
f = await favState();
check('F3 목록을 다시 열면 뺀 단어는 빠져 있음(2개)', f.rows === 2 && /\(2개\)/.test(f.btn), JSON.stringify(f));

// ---------- ⑤ 퀴즈로 돌아가기 ----------
const one = await ev(`QZ.brailleItems().find(x => x.cells.length === 1).answer`);
await seedRun('build', 2, [{ t: 'bu', k: 'p', a: one, l: 2 }, { t: 'bu', k: 'p', a: one, l: 2 }]);
await ev(`document.querySelector('#buildCheck').click(); 1`); await sleep(400);
await ev(`document.querySelector('#quizPad').click(); 1`); await sleep(500);
const qbState = () => ev(`(() => { const b = document.querySelector('#quizBack'), r = b.getBoundingClientRect(), nav = document.querySelector('.navinner').getBoundingClientRect(); return { view: document.querySelector('.view.active').id, vis: !b.hidden && r.height > 0, inView: r.top > 0 && r.bottom <= nav.top + 1, txt: b.textContent } })()`);
let qb = await qbState();
check('Q1 점자 쓰기 해설 → 「연습 패드에서 눌러 보기」 → 점자 화면에 「퀴즈로 돌아가기」(아래 탭 위에 보임)', qb.view === 'view-braille' && qb.vis && qb.inView && /퀴즈로 돌아가기/.test(qb.txt), JSON.stringify(qb));
await ev(`document.querySelector('#quizBack').click(); 1`); await sleep(700);
const back = await ev(`(() => { const f = document.querySelector('#quizFeedback').getBoundingClientRect(); return { view: document.querySelector('.view.active').id, fbInView: f.top < innerHeight && f.bottom > 0, next: !!document.querySelector('#quizNext'), btnHidden: document.querySelector('#quizBack').hidden } })()`);
check('Q2 누르면 보던 퀴즈 해설로(「다음 문제로」가 보임), 단추는 사라짐', back.view === 'view-quiz' && back.fbInView && back.next && back.btnHidden, JSON.stringify(back));
await ev(`document.querySelector('#quizPad').click(); 1`); await sleep(400);
await ev(`document.querySelector('[data-nav="home"]').click(); 1`); await sleep(300);
const h1 = await ev(`document.querySelector('#quizBack').hidden`);
await ev(`document.querySelector('[data-nav="braille"]').click(); 1`); await sleep(300);
const h2 = await ev(`document.querySelector('#quizBack').hidden`);
check('Q3 다른 화면(학습)으로 가면 단추가 사라지고, 다시 점자에 와도 안 나옴', h1 && h2, `${h1} ${h2}`);
await ev(`document.querySelector('[data-nav="quiz"]').click(); 1`); await sleep(300);
await ev(`document.querySelector('#quizEnd').click(); 1`); await sleep(200); await ev(`document.querySelector('#quizEndYes')?.click(); 1`); await sleep(300);
await seedRun('sign', 2, [{ t: 'sv', i: 'N205', l: 2 }, { t: 'sv', i: 'N205', l: 2 }]);
const nm = await ev(`QZ.wordById('N205').w`);
await ev(`[...document.querySelectorAll('#quizOpts [data-opt]')].find(b => b.dataset.opt !== ${JSON.stringify(nm)}).click(); 1`); await sleep(400);
await ev(`document.querySelector('#quizRelearn').click(); 1`); await sleep(900);
qb = await qbState();
check('Q4 수어 퀴즈 해설 「사전에서 다시 보기」 → 수어 사전에도 「퀴즈로 돌아가기」', qb.view === 'view-sign' && qb.vis && qb.inView, JSON.stringify(qb));
await ev(`document.querySelector('#quizBack').click(); 1`); await sleep(600);
check('Q5 수어 사전에서 눌러도 퀴즈 해설로', (await ev(`document.querySelector('.view.active').id`)) === 'view-quiz' && (await ev(`!!document.querySelector('#quizNext')`)));
await ev(`document.querySelector('#quizEnd').click(); 1`); await sleep(200); await ev(`document.querySelector('#quizEndYes')?.click(); 1`); await sleep(300);

// ---------- ⑥ 좁은 휴대폰 + 큰 글씨 ----------
const titleCut = [];
for (const w of [320, 360, 375]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: H, deviceScaleFactor: 2, mobile: true }); await sleep(300);
  await ev(`document.documentElement.classList.add('big-text'); 1`);
  for (const v of ['home', 'board']) { await ev(`go('${v}'); 1`); await sleep(300); if (await ev(`(() => { const t = document.querySelector('#pageTitle'); return t.scrollWidth > t.clientWidth })()`)) titleCut.push(`${w}px ${v}`); }
  await ev(`document.documentElement.classList.remove('big-text'); 1`);
}
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true }); await sleep(300);
check('H1 큰 글씨 320·360·375px: 「손빛 배움터」·「의견 게시판」이 잘리지 않음', !titleCut.length, titleCut.join(', '));

// ---------- ⑦ 뒤로 가기 = 펼친 단어 닫기 ----------
await c.goto(BASE + '?ruf2d=' + Date.now() + '#home', 2500);
// 사람이 누른 것처럼(userGesture). 크롬은 사람의 누름 없이 생긴 방문 기록을 뒤로 가기에서 건너뛰기도 해서, 실제 사용과 같게 한다
const tap = e => send('Runtime.evaluate', { expression: e, userGesture: true, awaitPromise: true });
const view = () => ev(`document.querySelector('.view.active').id`);
const openIds = () => ev(`[...document.querySelectorAll('#signList .wordrow[open]')].map(r => r.dataset.wid)`);
const search = async q => { await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(400); };
await tap(`document.querySelector('[data-nav="sign"]').click(); 1`); await sleep(400);
await search('감사합니다');
const rows0 = await ev(`document.querySelectorAll('#signList .wordrow').length`);
const wid0 = await ev(`document.querySelector('#signList .wordrow').dataset.wid`);
await tap(`document.querySelector('#signList .wordrow summary').click(); 1`); await sleep(1000);
check('N0 「감사합니다」 검색 → 첫 단어 펼침', (await openIds()).join() === wid0, JSON.stringify(await openIds()));
await ev(`history.back(); 1`); await sleep(700);
let st = await ev(`({ view: document.querySelector('.view.active').id, open: document.querySelectorAll('#signList .wordrow[open]').length, q: document.querySelector('#signSearch').value, rows: document.querySelectorAll('#signList .wordrow').length, focus: document.activeElement?.closest('.wordrow')?.dataset.wid || '' })`);
check('N1 뒤로 가기 한 번 → 펼친 단어만 닫힘(수어 화면·검색어·결과 그대로, 그 줄에 초점)', st.view === 'view-sign' && st.open === 0 && st.q === '감사합니다' && st.rows === rows0 && st.focus === wid0, JSON.stringify(st));
await ev(`history.back(); 1`); await sleep(700);
check('N2 한 번 더 → 학습 화면(원래 뒤로 가기)', (await view()) === 'view-home', await view());
await ev(`history.forward(); 1`); await sleep(700);
const f1 = { view: await view(), open: (await openIds()).length };
await ev(`history.forward(); 1`); await sleep(900);
check('N3 앞으로 가기 → 수어 목록, 한 번 더 → 그 단어가 다시 펼쳐짐', f1.view === 'view-sign' && f1.open === 0 && (await openIds()).join() === wid0, JSON.stringify({ f1, open: await openIds() }));
// 둘을 펼쳐도 기록은 한 칸
await tap(`document.querySelectorAll('#signList .wordrow summary')[1].click(); 1`); await sleep(800);
await ev(`history.back(); 1`); await sleep(700);
st = { view: await view(), open: (await openIds()).length };
await ev(`history.back(); 1`); await sleep(700);
check('N4 단어 두 개를 펼쳐도 뒤로 한 번에 모두 닫히고, 한 번 더 → 학습', st.view === 'view-sign' && st.open === 0 && (await view()) === 'view-home', JSON.stringify({ st, then: await view() }));
// 직접 닫은 뒤 뒤로 가기는 헛누름 없이 바로 이전 화면
await tap(`document.querySelector('[data-nav="sign"]').click(); 1`); await sleep(400);
await tap(`document.querySelector('#signList .wordrow summary').click(); 1`); await sleep(800);
await tap(`document.querySelector('#signList .wordrow summary').click(); 1`); await sleep(300);
await ev(`history.back(); 1`); await sleep(900);
check('N5 단어를 직접 닫은 뒤 뒤로 가기 → 한 번에 학습(헛누름 없음)', (await view()) === 'view-home', await view());
// 이전/다음 단어로 옮겨 가도 한 칸
await tap(`document.querySelector('[data-nav="sign"]').click(); 1`); await sleep(400);
await tap(`document.querySelector('#signList .wordrow summary').click(); 1`); await sleep(900);
await tap(`document.querySelector('#signList .wordrow[open] [data-wnav="next"]').click(); 1`); await sleep(900);
const movedTo = await openIds();
await ev(`history.back(); 1`); await sleep(700);
st = { view: await view(), open: (await openIds()).length };
await ev(`history.back(); 1`); await sleep(700);
check('N6 「다음 단어」로 옮긴 뒤 뒤로 → 닫힘, 한 번 더 → 학습', movedTo.length === 1 && movedTo[0] !== wid0 && st.view === 'view-sign' && st.open === 0 && (await view()) === 'view-home', JSON.stringify({ movedTo, st, then: await view() }));
// 펼친 뒤 다른 말을 검색하면(펼친 단어가 사라짐) 뒤로 가기는 바로 이전 화면
await tap(`document.querySelector('[data-nav="sign"]').click(); 1`); await sleep(400);
await tap(`document.querySelector('#signList .wordrow summary').click(); 1`); await sleep(800);
await search('학교');
await ev(`history.back(); 1`); await sleep(900);
check('N7 펼친 뒤 다른 말을 검색 → 뒤로 가기 한 번에 학습', (await view()) === 'view-home', await view());
// 긴 목록 중간에서 펼치고 읽다가 뒤로 → 펼치기 전 자리
await tap(`document.querySelector('[data-nav="sign"]').click(); 1`); await sleep(400);
await search('');
const bigTopic = await ev(`(() => { const b = [...document.querySelectorAll('#signTopics [data-topic]')].sort((a, b) => parseInt(b.querySelector('.tc').textContent.replace(/,/g, '')) - parseInt(a.querySelector('.tc').textContent.replace(/,/g, '')))[0]; b.click(); return b.dataset.topic })()`); await sleep(700);
await ev(`document.querySelectorAll('#signList .wordrow')[40].scrollIntoView({ block: 'center' }); 1`); await sleep(400);
const y0 = await ev(`Math.round(scrollY)`);
await tap(`document.querySelectorAll('#signList .wordrow summary')[40].click(); 1`); await sleep(1200);
await ev(`window.scrollBy(0, 350); 1`); await sleep(300);
await ev(`history.back(); 1`); await sleep(900);
const y1 = await ev(`Math.round(scrollY)`);
check(`N8 긴 목록(「${bigTopic}」) 41번째 단어를 펼쳐 읽다가 뒤로 → 닫히고 펼치기 전 자리(차이 40px 안)`, (await view()) === 'view-sign' && (await openIds()).length === 0 && Math.abs(y1 - y0) <= 40 && y0 > 1000, `펼치기 전 ${y0} → 뒤로 ${y1}`);
check('N9 주소는 그대로 #sign(단어를 펼쳐도 주소가 바뀌지 않음)', (await ev('location.hash')) === '#sign', await ev('location.hash'));

check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
