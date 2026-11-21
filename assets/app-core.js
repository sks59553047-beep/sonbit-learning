// 손빛 배움터 — 공통: 도우미($·esc·store·아이콘), 글자 크기·어두운 화면, 알림, 화면 전환(go), 수어 자료, 학습 기록(단어장·틀린 문제), 단어 영상 블록
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('sonbit:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  // 저장에 실패하면(저장 공간이 꽉 참, 저장을 막아 둔 브라우저 설정 등) false 를 돌려준다. quiet 가 아니면 알림도 띄운다.
  // 「저장했어요」 같은 성공 안내를 하는 곳은 quiet 로 부르고 결과를 직접 확인해 맞는 안내를 한다.
  set(k, v, quiet) { try { localStorage.setItem('sonbit:' + k, JSON.stringify(v)); return true; } catch (e) { if (!quiet) storeFailed(); return false; } },
  del(k) { try { localStorage.removeItem('sonbit:' + k); } catch (e) { } },
  keys(prefix) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('sonbit:' + prefix)) out.push(k.slice(7)); } } catch (e) { } return out; }
};
const fmtTime = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; };
const BRAILLE_TEST_COUNT = 248; // braille-tests/run-all.mjs 가 통과하는 규정 예시 수(고치면 같이 고칠 것)

// ---------------- 아이콘(인라인 SVG, 외부 폰트 없이) ----------------
const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5"/><path d="M11 12.5V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 13v-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.2-3.6a1.4 1.4 0 0 1 2.3-1.6L8 16"/>',
  braille: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2" opacity=".3"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="18" r="2" opacity=".3"/><circle cx="17" cy="18" r="2"/>',
  chat: '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17H11l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5Z"/><path d="M8 9.5h8M8 12.5h5"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1-1.3 2.2"/><circle cx="12" cy="16.6" r=".4" fill="currentColor"/>',
  play: '<circle cx="12" cy="12" r="10" fill="rgba(0,0,0,.35)"/><path d="M10 8.6v6.8l5.8-3.4Z" fill="#fff" stroke="none"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  moon: '<path d="M20 14.7A8 8 0 1 1 9.3 4a6.5 6.5 0 0 0 10.7 10.7Z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  text: '<path d="M5 6h9M9.5 6v13M16 11h5M18.5 11v8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="M12 3.5 14.5 9l6 .7-4.5 4 1.3 6-5.3-3-5.3 3 1.3-6-4.5-4 6-.7Z"/>',
  pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m14 6 4 4"/>'
};
function icon(name, size) {
  const d = ICONS[name] || ''; const s = size || 22;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
$('#logoIcon').innerHTML = icon('hand', 22).replace('currentColor', '#7ff0dd');
$$('.navbtn').forEach(b => { const n = b.querySelector('.i'); if (n) n.innerHTML = icon(n.dataset.icon, 22); });
$$('.hrow [data-hicon]').forEach(n => { n.innerHTML = icon(n.dataset.hicon, 22); });   // 첫 화면 「할 수 있는 것」 줄 앞 작은 그림(아래 탭과 같은 아이콘)
$('#signSearchIcon').innerHTML = icon('search', 18);
$('#playerBack').innerHTML = icon('back', 20);
$('#signTopicBack').innerHTML = icon('back', 20);
$('#btnBigText').innerHTML = icon('text', 18);

// ---------------- 상단 접근성 토글 ----------------
function initToggle(btn, key, def, onChange) {
  let v = store.get(key, def);
  const apply = () => { btn.setAttribute('aria-pressed', String(!!v)); onChange(!!v); };
  apply();
  btn.addEventListener('click', () => { v = !v; store.set(key, v); apply(); });
}
initToggle($('#btnBigText'), 'bigtext', false, v => document.documentElement.classList.toggle('big-text', v));
initToggle($('#btnTheme'), 'theme', matchMedia('(prefers-color-scheme: dark)').matches, v => {
  document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light');
  $('#btnTheme').innerHTML = icon(v ? 'sun' : 'moon', 18);
  const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', v ? '#0b1020' : '#f5f6fa');
});

// ---------------- 알림(토스트) ----------------
const STORE_FAIL_WHY = '저장 공간이 꽉 찼거나 저장을 막아 둔 설정(일부 시크릿 창 등)일 수 있어요.';
const STORE_FAIL_MSG = '이 브라우저에 저장하지 못했어요. ' + STORE_FAIL_WHY;
let storeFailAt = 0;
function storeFailed() { const now = Date.now(); if (now - storeFailAt < 8000) return; storeFailAt = now; setTimeout(() => toast(STORE_FAIL_MSG), 0); }
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------------- 라우팅 ----------------
const VIEWS = ['home', 'sign', 'braille', 'quiz', 'player', 'board'];
// 수어 사전에서 단어를 직접 펼치면 기록을 한 칸만 남긴다(2026-11-21 실사용 평가: 뒤로 가기 한 번 = 펼친 단어 닫기, 목록·스크롤은 그대로).
// 'open' = 지금 기록이 펼친 단어 기록, 'stale' = 그 단어를 이미 닫았거나 목록이 바뀜(뒤로 가기를 헛누르지 않게 한 칸 더 간다), null = 없음
let signEntry = null;
let quizReturn = false;   // 퀴즈 해설의 「연습 패드에서 보기」·「점자로 바꿔 보기」·「사전에서 다시 보기」로 나왔는지
const TITLES = { home: '손빛 배움터', sign: '수어 사전', braille: '점자', quiz: '퀴즈', player: '영상 보기', board: '의견 게시판' };
function go(view, opts) {
  opts = opts || {};
  VIEWS.forEach(v => $('#view-' + v).classList.toggle('active', v === view));
  // 다른 화면으로 가면 안 보이는 영상(퀴즈 영상·수어 사전 영상)은 멈춘다(배터리·데이터 절약).
  // 퀴즈로 돌아오면 퀴즈의 자동 재생 영상만 다시 튼다(보기 지우기로 지운 영상은 빼고).
  $$('.view:not(.active) video').forEach(v => { if (!v.paused) v.pause(); });
  if (view === 'quiz') $$('#quizArea video[autoplay]').forEach(v => { if (v.paused && !v.closest('.gone') && !v.closest('[hidden]') && v.getAttribute('src') && !(v.closest('.vopt') && $('#quizOpts .vopt.sel'))) v.play().catch(() => {}); });
  $$('.navbtn').forEach(b => { const on = b.dataset.nav === view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#pageTitle').textContent = TITLES[view] || '손빛 배움터';
  // 퀴즈 해설에서 점자 연습·바꾸기·수어 사전으로 왔으면 「퀴즈로 돌아가기」를 띄운다(2026-11-21 실사용 평가). 다른 화면으로 가면 지운다
  if (view !== 'sign' && view !== 'braille') quizReturn = false;
  const qb = quizReturn && typeof quizState !== 'undefined' && quizState.active;
  $('#quizBack').hidden = !qb; document.body.classList.toggle('quizback-on', qb);
  if (view !== 'player') { window.scrollTo(0, 0); setPlayerSrc(''); }
  const wid = view === 'sign' && opts.arg && opts.arg.wid;   // 수어 사전의 특정 단어(#sign/번호)
  const pid = view === 'player' && opts.arg && opts.arg.id;  // 교육 영상(#player/영상번호) — 새로 고침해도 같은 영상이 열리게
  const sub = wid || pid;
  if (opts.push !== false) { history.pushState({ view, arg: opts.arg }, '', '#' + view + (sub ? '/' + encodeURIComponent(sub) : '')); signEntry = null; }
  else if (view !== 'sign') signEntry = null;
  if (wid) showSignWord(wid);
  if (view === 'player' && opts.arg) openPlayer(opts.arg.id);
  if (view === 'home') renderHome();
  if (view === 'board') renderBoard(opts.arg);
  if (view === 'braille' && !$('#bp-learn').hidden) renderLearnPanel();   // 영상을 보고 돌아오면 「봤어요」 표시를 새로 그린다
  if (view === 'quiz' && !quizState.active) renderQuizHub();
  if (opts.push !== false) { const h = $('#view-' + view + ' h1'); if (h) h.focus({ preventScroll: true }); }
}
$$('[data-nav]').forEach(el => el.addEventListener('click', () => {
  const v = el.dataset.nav;
  if (v === 'sign' || v === 'braille') store.set('track', v);
  go(v);
}));
window.addEventListener('popstate', e => {
  const st = e.state, signOn = $('#view-sign').classList.contains('active');
  if (signOn && st && st.view === 'sign') {
    // 단어를 펼쳐 만든 기록에서 뒤로: 펼친 단어만 닫는다. 이미 닫혀 있으면 한 칸 더 뒤로(헛누름 없게)
    if (signEntry && !st.wordOpen && !st.wordStale) { const had = signEntry; signEntry = null; if (had === 'open' && closeOpenWords()) return; history.back(); return; }
    // 앞으로 가기로 그 기록에 다시 오면 그 단어를 다시 펼친다
    if (st.wordOpen || st.wordStale) { signEntry = st.wordOpen ? 'open' : 'stale'; if (st.wordOpen) reopenWord(st.wordOpen); return; }
  }
  if (st && st.view === 'braille' && st.panel) {   // 생활 속 점자 ↔ 글자 바꾸기(뒤로·앞으로 가기)
    go('braille', { push: false }); showBraillePanel(st.panel);
    if (st.fromLife) $('#lifeBack').hidden = false;
    if (st.y != null) setTimeout(() => { window.scrollTo(0, st.y); if (st.panel === 'life') focusLifeWord(st.i != null ? st.i : -1); }, 0);
    return;
  }
  if (st && st.view) { go(st.view, { push: false, arg: st.arg }); if (st.view === 'sign' && (st.wordOpen || st.wordStale)) signEntry = st.wordOpen ? 'open' : 'stale'; return; }
  signEntry = null;
  // 기록에 화면 정보가 없을 때(주소창에 #board/12 처럼 직접 넣었거나 처음 연 화면으로 돌아옴): 주소를 읽어 그 화면으로. 영상 화면은 영상 정보가 없어 학습으로
  const h = location.hash.slice(1).split('/')[0];
  let v = VIEWS.includes(h) ? h : 'home';
  const arg = v === 'board' ? boardRoute(location.hash) : v === 'sign' ? signRoute(location.hash) : v === 'player' ? playerRoute(location.hash) : undefined;
  if (v === 'player' && !arg) v = 'home';   // 영상 번호가 없거나 모르는 영상이면 학습 화면으로
  if (v === 'board') history.replaceState({ view: 'board', arg }, '', bHash(arg));
  if (v === 'sign') history.replaceState({ view: 'sign', arg }, '', '#sign' + (arg ? '/' + encodeURIComponent(arg.wid) : ''));
  if (v === 'player') history.replaceState({ view: 'player', arg }, '', '#player/' + encodeURIComponent(arg.id));
  go(v, { push: false, arg });
});
// 영상 주소(#player/영상번호)에서 영상을 찾는다. 없으면 undefined
function playerRoute(hash) {
  const id = decodeURIComponent(String(hash || '').replace(/^#/, '').split('/')[1] || '');
  return id && VIDEO_LIST.some(v => v.id === id) ? { id } : undefined;
}
// 영상 화면의 뒤로: 사이트 안에서 왔으면 앞 화면으로. 주소로 바로 열었거나 새로 고침했으면 그 영상이 놓인 자리로
// (기초 영상 4편 → 학습 화면, 나머지 점자 영상 → 점자 탭 「교육 영상」 칸). 사이트 밖으로는 나가지 않는다
$('#playerBack').addEventListener('click', () => {
  const s = history.state;
  if (s && s.view && !s.first) { history.back(); return; }
  const id = s && s.arg && s.arg.id;
  if (id && !HOME_VIDEO_IDS.includes(id)) { store.set('track', 'braille'); go('braille'); showBraillePanel('learn', true); }
  else go('home');
});
// 「본문으로 바로가기」(키보드·화면낭독기): 주소를 바꾸지 않고, 지금 보고 있는 화면의 제목으로 초점만 옮긴다
$('.skiplink').addEventListener('click', e => {
  e.preventDefault();
  const h = $('.view.active h1') || $('#main');
  if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
  h.focus();
});

// ================= 수어 데이터 =================
const ALL_WORDS = KSL_WORDS.concat(KSL_EXTRA.map(x => ({ id: 'N' + x.i, w: x.w, t: x.t, x: true, g: x.g, e: x.e, k: '/signFile/video/' + x.m })));
const WORD_BY_ID = new Map(ALL_WORDS.map(w => [String(w.id), w]));
const TOPIC_ORDER = ['몸·건강·긴급', '인사·예절', '대답·질문', '사람·가족', '감정', '마음·생각', '성격·태도', '음식', '돈·쇼핑', '장소·이동', '시간·날짜', '날씨·색·크기', '하루 생활', '물건·소지품', '열기·시작·찾기', '말·소통', '학교·일·직업', '사회·제도', '법·사건', '자연·동식물', '나라·지명', '숫자·돈 단위', '일반 단어'];
const TOPIC_ICON = { '몸·건강·긴급': '🚑', '인사·예절': '👋', '대답·질문': '💬', '사람·가족': '👨‍👩‍👧', '감정': '😊', '마음·생각': '💭', '성격·태도': '🙂', '음식': '🍚', '돈·쇼핑': '🛍️', '장소·이동': '🏫', '시간·날짜': '⏰', '날씨·색·크기': '🌤️', '하루 생활': '🏠', '물건·소지품': '🎒', '열기·시작·찾기': '🔑', '말·소통': '🗣️', '학교·일·직업': '🎓', '사회·제도': '🏛️', '법·사건': '⚖️', '자연·동식물': '🌳', '나라·지명': '🗺️', '숫자·돈 단위': '🔢', '일반 단어': '📖' };
const TOPICS = TOPIC_ORDER.filter(t => ALL_WORDS.some(w => w.t === t)).concat([...new Set(ALL_WORDS.map(w => w.t))].filter(t => !TOPIC_ORDER.includes(t)));
const NUM_TOPIC = '기본 숫자';
const FAV_TOPIC = '내 단어장';
// 「이에요/예요」: 마지막 소리에 받침이 있으면 「이에요」, 없으면 「예요」(수 0~9는 읽는 소리 기준: 영·일·삼·육·칠·팔 = 받침). 괄호 설명은 뗀다
const DIGIT_JONG = { 0: 1, 1: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1, 9: 0 };
function eyo(s) {
  const t = String(s).replace(/\s*[(（].*$/, '').trim(), ch = t.slice(-1);
  if (!ch) return '예요';
  const k = ch.charCodeAt(0) - 0xAC00;
  if (k >= 0 && k <= 11171) return k % 28 ? '이에요' : '예요';
  if (/[0-9]/.test(ch)) return DIGIT_JONG[ch] ? '이에요' : '예요';
  if (/[ㄱ-ㅎ]/.test(ch)) return '이에요';   // 자음 이름(기역·니은…)은 모두 받침으로 끝난다
  return '예요';
}
const CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO_MAIN = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO_FOLD = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
function choOf(str) {
  return [...str].map(ch => { const c = ch.charCodeAt(0); return (c >= 0xAC00 && c <= 0xD7A3) ? CHO_LIST[Math.floor((c - 0xAC00) / 588)] : ch; }).join('');
}
function firstCho(w) { const c = choOf(w.w).charAt(0); return CHO_FOLD[c] || c; }
function byName(a, b) { return a.w.localeCompare(b.w, 'ko'); }
function normQ(q) { return String(q).replace(/\s+/g, ''); }
function hasRealVideo(w) { return !!w.k; }
// ---- 말끝이 바뀐 꼴로도 찾기(2026-11-20 실사용 평가: 「고마워요」·「괜찮아요」·「배고파요」 → 결과 없음) ----
// 흔한 말끝을 기본형(…다)으로 바꿔 본 꼴들: 고마워요·고맙습니다 → 고맙다, 아파요 → 아프다, 사랑해 → 사랑하다, 가세요 → 가다, 어디예요 → 어디.
// 확실한 꼴(strong: -요·-습니다·-세요·-해·-워·받침 뒤 -아/-어)과 추측한 꼴(weak: 받침 없는 줄임 꼴 가→가다, 아파→아프다)을 나눈다.
// 맞는지 볼 때: 확실한 꼴끼리는 서로 맞춰 보고, 추측한 꼴은 상대의 원래 글자와만 맞춘다(「사과」·「사고」가 둘 다 「사고다」로 추측돼 엉뚱하게 맞물리지 않게).
const H_V = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', H_B = 17;   // 받침 ㅂ 번호
function hSplit(ch) { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 ? [Math.floor(c / 588), Math.floor(c % 588 / 28), c % 28] : null; }
function hJoin(a, b, c) { return String.fromCharCode(0xAC00 + a * 588 + b * 28 + c); }
const formCache = new Map();
function baseForms(s) {
  s = String(s).toLowerCase().replace(/\s+/g, '');
  if (formCache.has(s)) return formCache.get(s);
  const strong = new Set(s ? [s] : []), weak = new Set(), add = x => { if (x) strong.add(x); }, guess = x => { if (x) weak.add(x); };
  if (s.length >= 2) {
    let t = s;
    if (/습니[다까]$/.test(t)) add(t.replace(/습니[다까]$/, '다'));                                   // 고맙습니다 → 고맙다
    else if (/니[다까]$/.test(t)) { const p = t.slice(0, -2), h = hSplit(p.slice(-1)); if (h && h[2] === H_B) add(p.slice(0, -1) + hJoin(h[0], h[1], 0) + '다'); }   // 감사합니다 → 감사하다, 갑니다 → 가다
    if (/(이에요|예요|에요|이야)$/.test(t)) add(t.replace(/(이에요|예요|에요|이야)$/, ''));             // 어디예요 → 어디
    if (/으?세요$/.test(t)) add(t.replace(/으?세요$/, '다'));                                          // 가세요 → 가다, 앉으세요 → 앉다
    if (/요$/.test(t)) { t = t.slice(0, -1); add(t); }                                                 // 좋아요 → 좋아
    const last = t.slice(-1), stem = t.slice(0, -1), h = hSplit(last), hp = stem ? hSplit(stem.slice(-1)) : null;
    if (h) {
      if (last === '해') add(stem + '하다');                                                           // 사랑해 → 사랑하다
      else if ((last === '워' || last === '와') && hp && hp[2] === 0) add(stem.slice(0, -1) + hJoin(hp[0], hp[1], H_B) + '다');   // 고마워 → 고맙다
      else if ((last === '아' || last === '어') && hp && hp[2] !== 0) add(stem + '다');                // 괜찮아 → 괜찮다, 먹어 → 먹다(「수어」처럼 받침 없는 글자 뒤는 아님)
      else if ((last === '라' || last === '러') && hp && hp[2] === 8) add(stem.slice(0, -1) + hJoin(hp[0], hp[1], 0) + '르다');   // 목말라 → 목마르다, 몰라 → 모르다, 불러 → 부르다
      else if (h[2] === 0) {                                                                            // 받침 없는 줄임 꼴(추측)
        guess(t + '다');                                                                                // 가 → 가다
        const to = { 'ㅏ': 'ㅡ', 'ㅓ': 'ㅡ', 'ㅘ': 'ㅗ', 'ㅝ': 'ㅜ', 'ㅙ': 'ㅚ', 'ㅕ': 'ㅣ' }[H_V[h[1]]];   // 아파 → 아프다, 봐 → 보다, 줘 → 주다, 돼 → 되다, 마셔 → 마시다
        if (to) guess(stem + hJoin(h[0], H_V.indexOf(to), 0) + '다');
      }
    }
  }
  const r = { raw: s, strong, all: new Set([...strong, ...weak]) };
  formCache.set(s, r); return r;
}
// 두 말(검색어 꼴 a, 단어 쪽 꼴 b)이 같은 말로 볼 수 있는지
function sameForm(a, b) {   // 한쪽이라도 확실한 꼴이면 맞춰 본다(추측끼리만 맞물리는 것은 뺌: 도와줘요 → 도와주세요는 되고, 사과·사고는 안 됨)
  for (const x of a.strong) if (b.all.has(x)) return true;
  for (const x of b.strong) if (a.all.has(x)) return true;
  return false;
}
// 단어 쪽 꼴: 이름 / 다른 말·뜻풀이를 낱말로 나눈 것(괄호 안 설명은 뺌)
function tokensOf(w) { return [w.al || '', w.x ? (w.g || '') : ''].join(',').split(/[,/·]/).map(s => s.replace(/\([^)]*\)|\{[^}]*\}/g, '').trim()).filter(Boolean); }
function wordForms(w) {
  if (!w._forms) { const toks = tokensOf(w).map(baseForms); w._forms = { name: baseForms(w.w), toks, tok: new Set(toks.map(t => t.raw)) }; }
  return w._forms;
}
const nameForm = (w, qf) => sameForm(qf, wordForms(w).name);
const otherForm = (w, qf) => wordForms(w).toks.some(t => sameForm(qf, t));
function matchWord(w, q) {
  const qn = normQ(q); if (!qn) return true;
  const name = w.w.toLowerCase().replace(/\s+/g, '');
  if (name.includes(qn)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(qn)) { if (choOf(name).includes(qn)) return true; return !!(w.al && choOf(w.al.replace(/\s+/g, '')).includes(qn)); }
  const qf = baseForms(qn);
  if (nameForm(w, qf) || otherForm(w, qf)) return true;
  if (w.x) return (w.g || '').toLowerCase().includes(q);
  if ((w.al || '').toLowerCase().includes(q)) return true;
  return (w.d || '').toLowerCase().includes(q);
}
// 검색 결과 순서: 이름이 똑같은 것 → 이름이 검색어로 시작 → 다른 말이 검색어와 똑같은 것(고맙습니다 → 감사합니다)
// → 이름의 기본형이 같은 것(아프다 → 아파요) → 이름에 포함 → 다른 말·뜻풀이 낱말의 기본형이 같은 것 → 초성 일치 → 뜻풀이 글에서만 찾은 것
function rankWord(w, q) {
  const qn = normQ(q), name = w.w.toLowerCase().replace(/\s+/g, '');
  if (name === qn) return 0;
  if (/^[ㄱ-ㅎ]+$/.test(qn)) return name.startsWith(qn) ? 1 : name.includes(qn) ? 2 : 3;
  const qf = baseForms(qn);
  if (name.startsWith(qn)) return 1;
  if (wordForms(w).tok.has(qn)) return 1.2;
  if (nameForm(w, qf)) return 1.5;
  if (name.includes(qn)) return 2;
  if (otherForm(w, qf)) return 2.5;
  // 뜻풀이 글에서만 찾은 것끼리는 검색어가 든 뜻이 짧을수록(그 낱말의 중심 뜻일수록) 앞에: 「수어」 → 수화(수어를 하다)가 수어통역센터보다 앞
  const lens = wordForms(w).toks.map(f => f.raw).filter(x => x.includes(qn)).map(x => x.length);
  return 4 + Math.min(0.9, (lens.length ? Math.min(...lens) : 90) / 100);
}
// 이름이 같은 수어(예: 「십」 2개, 「없다」 10개)는 사전 순서대로 ①②…를 붙여 목록·앞뒤 단추에서 구분한다(2026-11-20 실사용 평가)
const SAME_NAME = new Map();   // id → [몇 번째, 같은 이름 개수]
(() => { const g = new Map(); ALL_WORDS.forEach(w => { if (!g.has(w.w)) g.set(w.w, []); g.get(w.w).push(w); }); g.forEach(l => { if (l.length > 1) l.forEach((w, i) => SAME_NAME.set(String(w.id), [i + 1, l.length])); }); })();
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
function sameMark(w) { const s = SAME_NAME.get(String(w.id)); return s ? (CIRCLED[s[0] - 1] || `(${s[0]})`) : ''; }
function wordLabel(w) { const m = sameMark(w); return m ? `${w.w} ${m}` : w.w; }
function cleanDesc(d) { return String(d || '').replace(/\s*[—-]\s*(국립국어원|한국수어누리사전).*$/, ''); }
// 국립국어원 수형 설명의 손가락 번호(1지=검지 … 5지=엄지)를 이름으로 바꿔 초보자도 읽게 함
const FINGER = { 1: '검지', 2: '중지', 3: '약지', 4: '새끼손가락', 5: '엄지' };
const JOSA = { '을': ['을', '를'], '를': ['을', '를'], '은': ['은', '는'], '는': ['은', '는'], '이': ['이', '가'], '가': ['이', '가'], '과': ['과', '와'], '와': ['과', '와'], '으로': ['으로', '로'], '로': ['으로', '로'] };
function fingerNames(d) {
  return String(d).replace(/&#8231;/g, '‧').replace(/([1-5](?:[·‧][1-5])*)지(으로|[을를은는이가과와로])?/g, (m, g, j) => {
    const ns = g.split(/[·‧]/);
    const last = ns[ns.length - 1];
    const out = ns.map(n => FINGER[n]).join('·');
    if (!j) return out;
    const hasFinal = last === '4'; // 새끼손가락은 받침이 있고, 나머지(검지·중지·약지·엄지)는 받침이 없다
    return out + JOSA[j][hasFinal ? 0 : 1];
  });
}
// 한국수어사전 공식 수형 설명(있으면): [설명, 표제어 번호, 'id'|'name']
// 국립국어원 설명이 없으면 서울복지포털 「수어 표준사전」 설명(ksl6-data.js, 영상과 비교해 같은 동작만)을 쓴다
function officialOf(w) {
  const o = typeof KSL_OFFICIAL !== 'undefined' && KSL_OFFICIAL[w.id];
  if (o) return o;
  const s = typeof KSL_SEOUL !== 'undefined' && KSL_SEOUL[w.id];
  return s ? [s[0], s[1], 'seoul'] : null;
}
function descOf(w) { const o = officialOf(w); return o ? fingerNames(o[0]) : cleanDesc(w.d); }
function officialNoteHtml(w) {
  const o = officialOf(w); if (!o) return '';
  // 2026-11-20 실사용 평가: 「조금 다를 수 있어요」만으로는 무엇을 따라 할지 모름 → 영상이 기준이라고 분명히
  if (o[2] === 'seoul') return '<p class="onote">서울복지포털 「수어 표준사전」(서울특별시)의 설명이에요. 영상과 다르게 보이면 영상을 따라 하세요.</p>';
  return o[2] === 'name'
    ? '<p class="onote">국립국어원 한국수어사전에서 같은 뜻 낱말의 설명을 가져왔어요. 영상과 다르게 보이면 영상을 따라 하세요.</p>'
    : '<p class="onote">국립국어원 한국수어사전의 공식 수형 설명이에요.</p>';
}
function descHtml(w) {
  const t = descOf(w);
  if (!t) return '';
  return `<p class="lbl">동작 설명</p><p class="desc">${esc(t)}</p>${officialNoteHtml(w)}`;
}
function officialBlockHtml(w) {
  const o = officialOf(w); if (!o) return '';
  return `<p class="lbl">동작 설명</p><p class="motion">${esc(fingerNames(o[0]))}</p>${officialNoteHtml(w)}`;
}
// 기본 숫자 바로가기: '숫자·돈 단위' 주제의 영·일~구·십·백·천·만·억·조(같은 말의 여러 수어 포함)를 차례대로
const BASIC_NUM_ORDER = ['일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십', '백', '천', '만', '억', '조'];
function basicNumberWords() {
  const out = [], zero = WORD_BY_ID.get('N901'); // 영·공(0) 은 '일반 단어' 주제에 있어 따로 넣는다
  if (zero) out.push(zero);
  for (const n of BASIC_NUM_ORDER) ALL_WORDS.filter(w => w.w === n && w.t === '숫자·돈 단위' && w.id !== 'N457').forEach(w => out.push(w)); // N457 '일'은 '유일하다'라는 뜻이라 뺀다
  return out;
}

// ---------------- 학습 기록(이 기기 저장소) ----------------
function markDid(k) { if (!store.get('did:' + k, false)) store.set('did:' + k, true); }
function didFlag(k) { return !!store.get('did:' + k, false); }
function favList() { const a = store.get('fav', []); return Array.isArray(a) ? a.map(String) : []; }
function isFav(id) { return favList().includes(String(id)); }
function favWords() { return favList().map(id => WORD_BY_ID.get(id)).filter(Boolean); }
function toggleFav(id) {
  id = String(id); const l = favList(); const i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.unshift(id);
  if (!store.set('fav', l, true)) return null;   // 저장 실패: 화면의 담김 표시를 바꾸지 않는다
  return i < 0;
}
function getWrong() { const w = store.get('wrong', []); return Array.isArray(w) ? w : []; }
function wrongKey(c) { return QZ.wrongKey(c); }
const WRONG_MAX = 100;   // 틀린 문제는 최근 100개까지만 보관(가져오기도 같은 수를 쓴다)
function addWrong(q) { const c = QZ.compact(q, true); const l = getWrong().filter(x => wrongKey(x) !== wrongKey(c)); l.unshift(c); store.set('wrong', l.slice(0, WRONG_MAX)); }
function dropWrong(q) { const k = wrongKey(QZ.compact(q, true)); const l = getWrong(); const n = l.filter(x => wrongKey(x) !== k); if (n.length !== l.length) store.set('wrong', n); }
function watchedIds() { return store.keys('watched:').filter(k => store.get(k, false)).map(k => k.slice(8)); }
function hasActivity() { return watchedIds().length > 0 || store.keys('did:').length > 0 || favList().length > 0 || getWrong().length > 0 || !!store.get('quizrun', null); }

// ---------------- 단어 하나의 "실제 영상" 블록 ----------------
function kslUrl(k) { return (/^https?:/.test(k) || k.startsWith('assets/')) ? k : 'https://ksldict.korean.go.kr' + k; }
function kslVideoBoxHtml(k, label, id) {
  const local = typeof MEDIA_VIDEO !== 'undefined' && MEDIA_VIDEO.has(id);
  // 누리사전(N) 단어의 그림 1,009장은 모두 손모양·움직임을 기호로 적은 「수어 표기」 그림이라 배우는 사람에게는 뜻을 알 수 없다
  // (2026-11-16 작업자님 요청으로 뺌). 누리사전 단어는 영상만 보여 주고, 사람 손 그림·사진인 국립국어원 사전(KSL) 그림만 쓴다.
  const isNotation = id.charAt(0) === 'N';
  const hasImg = !isNotation && typeof MEDIA_IMG !== 'undefined' && MEDIA_IMG.has(id);
  const isNuri = !/^https?:/.test(k);
  const src = local ? `assets/media/${id}.mp4` : kslUrl(k);
  const poster = local ? `assets/posters/${id}.jpg` : (isNuri ? kslUrl(k.replace(/\.mp4$/, '.jpg')) : `assets/posters/${id}.jpg`);
  const credit = (isNotation || (k && !/^https?:/.test(k))) ? '국립국어원 한국수어누리사전' : '국립국어원 한국수어사전';
  const img = isNotation ? ''
    : hasImg ? `<figure class="shapeimg"><img src="assets/media/${id}.jpg" alt="${esc(label)} 수어 동작 그림" loading="lazy"></figure>`
      : `<figure class="shapeimg still"><img src="${esc(poster)}" alt="${esc(label)} 수어 장면" loading="lazy"></figure>`;
  return `<div class="signmedia">
      <div class="realvideo">
        <video class="kslvideo" controls loop muted playsinline preload="metadata" poster="${esc(poster)}" src="${esc(src)}" aria-label="${esc(label)} 수어 영상"></video>
      </div>${img}
    </div>
    <p class="note">${credit} 제공 영상${img && !isNotation && hasImg ? "·그림" : ""} (저작자표시-비영리-변경금지)</p>`;
}
function aliasHtml(w) { return w.al ? `<p class="alias">같은 수어: ${esc(w.al)}</p>` : ''; }
