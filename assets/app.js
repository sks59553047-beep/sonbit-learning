// 손빛 배움터 v3 — 메인 로직(순수 자바스크립트, 서버 없음).
// 데이터: ksl-data.js·ksl2-data.js(수어 단어) · ksl3/ksl5(손모양·공식 수형 설명) · braille.js(점자 표) · braille-core.js(점자 변환 엔진) · video-data.js(교육 영상)
(() => {
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
const BRAILLE_TEST_COUNT = 227; // braille-tests/run-all.mjs 가 통과하는 규정 예시 수(고치면 같이 고칠 것)

// ---------------- 아이콘(인라인 SVG, 외부 폰트 없이) ----------------
const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5"/><path d="M11 12.5V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 13v-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.2-3.6a1.4 1.4 0 0 1 2.3-1.6L8 16"/>',
  braille: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2" opacity=".3"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="18" r="2" opacity=".3"/><circle cx="17" cy="18" r="2"/>',
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
const VIEWS = ['home', 'sign', 'braille', 'quiz', 'player'];
const TITLES = { home: '손빛 배움터', sign: '수어 사전', braille: '점자', quiz: '퀴즈', player: '영상 보기' };
function go(view, opts) {
  opts = opts || {};
  VIEWS.forEach(v => $('#view-' + v).classList.toggle('active', v === view));
  $$('.navbtn').forEach(b => { const on = b.dataset.nav === view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#pageTitle').textContent = TITLES[view] || '손빛 배움터';
  if (view !== 'player') { window.scrollTo(0, 0); setPlayerSrc(''); }
  if (opts.push !== false) history.pushState({ view, arg: opts.arg }, '', '#' + view);
  if (view === 'player' && opts.arg) openPlayer(opts.arg.id);
  if (view === 'home') renderHome();
  if (view === 'braille' && !$('#bp-learn').hidden) renderLearnPanel();   // 영상을 보고 돌아오면 「봤어요」 표시를 새로 그린다
  if (view === 'quiz' && !quizState.active) renderQuizHub();
  if (opts.push !== false) { const h = $('#view-' + view + ' h1'); if (h) h.focus({ preventScroll: true }); }
}
$$('[data-nav]').forEach(el => el.addEventListener('click', () => {
  const v = el.dataset.nav;
  if (v === 'sign' || v === 'braille') store.set('track', v);
  go(v);
}));
window.addEventListener('popstate', e => { const v = (e.state && e.state.view) || 'home'; go(v, { push: false, arg: e.state && e.state.arg }); });
$('#playerBack').addEventListener('click', () => { history.back(); });

// ================= 수어 데이터 =================
const ALL_WORDS = KSL_WORDS.concat(KSL_EXTRA.map(x => ({ id: 'N' + x.i, w: x.w, t: x.t, x: true, g: x.g, e: x.e, k: '/signFile/video/' + x.m })));
const WORD_BY_ID = new Map(ALL_WORDS.map(w => [String(w.id), w]));
const TOPIC_ORDER = ['몸·건강·긴급', '인사·예절', '대답·질문', '사람·가족', '감정', '마음·생각', '성격·태도', '음식', '돈·쇼핑', '장소·이동', '시간·날짜', '날씨·색·크기', '하루 생활', '물건·소지품', '열기·시작·찾기', '말·소통', '학교·일·직업', '사회·제도', '법·사건', '자연·동식물', '나라·지명', '숫자·돈 단위', '일반 단어'];
const TOPIC_ICON = { '몸·건강·긴급': '🚑', '인사·예절': '👋', '대답·질문': '💬', '사람·가족': '👨‍👩‍👧', '감정': '😊', '마음·생각': '💭', '성격·태도': '🙂', '음식': '🍚', '돈·쇼핑': '🛍️', '장소·이동': '🏫', '시간·날짜': '⏰', '날씨·색·크기': '🌤️', '하루 생활': '🏠', '물건·소지품': '🎒', '열기·시작·찾기': '🔑', '말·소통': '🗣️', '학교·일·직업': '🎓', '사회·제도': '🏛️', '법·사건': '⚖️', '자연·동식물': '🌳', '나라·지명': '🗺️', '숫자·돈 단위': '🔢', '일반 단어': '📖' };
const TOPICS = TOPIC_ORDER.filter(t => ALL_WORDS.some(w => w.t === t)).concat([...new Set(ALL_WORDS.map(w => w.t))].filter(t => !TOPIC_ORDER.includes(t)));
const NUM_TOPIC = '기본 숫자';
const FAV_TOPIC = '내 단어장';
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
function matchWord(w, q) {
  const qn = normQ(q); if (!qn) return true;
  const name = w.w.toLowerCase().replace(/\s+/g, '');
  if (name.includes(qn)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(qn)) { if (choOf(name).includes(qn)) return true; return !!(w.al && choOf(w.al.replace(/\s+/g, '')).includes(qn)); }
  if (w.x) return (w.g || '').toLowerCase().includes(q);
  if ((w.al || '').toLowerCase().includes(q)) return true;
  return (w.d || '').toLowerCase().includes(q);
}
// 검색 결과 순서: 이름이 똑같은 것 → 이름이 검색어로 시작 → 이름에 포함 → 초성 일치 → 뜻풀이에서만 찾은 것
function rankWord(w, q) {
  const qn = normQ(q), name = w.w.toLowerCase().replace(/\s+/g, '');
  if (name === qn) return 0; if (name.startsWith(qn)) return 1; if (name.includes(qn)) return 2;
  if (/^[ㄱ-ㅎ]+$/.test(qn)) return 3; return 4;
}
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
function officialOf(w) { return (typeof KSL_OFFICIAL !== 'undefined' && KSL_OFFICIAL[w.id]) || null; }
function descOf(w) { const o = officialOf(w); return o ? fingerNames(o[0]) : cleanDesc(w.d); }
function officialNoteHtml(w) {
  const o = officialOf(w); if (!o) return '';
  return o[2] === 'name'
    ? '<p class="onote">국립국어원 한국수어사전의 같은 뜻 표제어 설명이에요. 영상과 동작이 조금 다를 수 있어요.</p>'
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
// 옛 방식으로 저장된 틀린 문제(글 단서 문제 등)는 지금 퀴즈로 다시 만들 수 없다. 시작할 때 한 번 정리하고, 같은 문제가 겹쳐 있으면 하나만 남긴다.
(function migrateWrong() {
  const l = getWrong(); if (!l.length) return;
  const seen = new Set(), keep = [];
  l.forEach(c => { const n = cleanWrongEntry(c); if (n && !seen.has(wrongKey(n))) { seen.add(wrongKey(n)); keep.push(n); } });
  if (JSON.stringify(keep) !== JSON.stringify(l)) store.set('wrong', keep);
})();
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

// ---------------- 교육 영상: 두 자리에만 ----------------
// ① 학습(홈)의 「기초 영상」 3편  ② 점자 탭의 「교육 영상」 칸(나머지 전부).
// 그 밖의 화면(수어 사전·연습 패드·점자 표 같은 곳)에는 영상 목록이나 링크를 따로 두지 않는다.
// 기초 영상을 바꾸려면 아래 id 세 개만 고치면 된다(나머지는 자동으로 점자 탭의 교육 칸으로 간다).
const HOME_VIDEO_IDS = ['v8-ksl-intro', 'v1-braille-basics', 'v11-ksl-dictionary-guide', 'v5-etiquette'];
const VIDEO_SHORT = { 'v8-ksl-intro': '수어의 시작', 'v1-braille-basics': '점자의 시작', 'v11-ksl-dictionary-guide': '사전 사용법', 'v5-etiquette': '소통 예절' };   // 로드맵 설명에 쓰는 짧은 이름
const shortName = v => VIDEO_SHORT[v.id] || v.title.split(' — ')[0];
const vById = id => VIDEO_LIST.find(v => v.id === id) || null;
const homeVideos = () => HOME_VIDEO_IDS.map(vById).filter(Boolean);
const learnVideos = () => VIDEO_LIST.filter(v => !HOME_VIDEO_IDS.includes(v.id)).sort((a, b) => (a.track === b.track ? a.order - b.order : a.track === '점자' ? -1 : 1));
const isSeen = id => !!store.get('watched:' + id, false);
const seenCount = vs => vs.filter(v => isSeen(v.id)).length;
const totalDur = vs => vs.reduce((n, v) => n + v.dur, 0);
const fmtSpan = s => { const m = Math.floor(s / 60), r = s % 60; return m + '분' + (r ? ' ' + r + '초' : ''); };
// 영상 한 편 카드(왼쪽 그림, 오른쪽 제목·설명). 아직 안 본 첫 영상에는 「다음에 볼 영상」 표시
function vrowHtml(v, nextId) {
  const seen = isSeen(v.id), isNext = v.id === nextId;
  const aria = `${v.title}. ${v.track} ${v.level}, ${fmtTime(v.dur)}.${seen ? ' 시청 완료.' : ''}${isNext ? ' 다음에 볼 영상.' : ''} 누르면 영상을 볼 수 있어요`;
  return `<button type="button" class="vrow${seen ? ' seen' : ''}" data-open-video="${esc(v.id)}" aria-label="${esc(aria)}">
    <span class="vthumb" aria-hidden="true"><img src="videos/${esc(v.id)}.jpg" alt="" loading="lazy"><span class="vplay">${icon('play', 40)}</span><span class="vdur">${fmtTime(v.dur)}</span></span>
    <span class="vbody">
      <span class="vkick"><span class="tag">${esc(v.track)}</span><span class="tag gray">${esc(v.level)}</span>${isNext ? '<span class="tag amber">다음에 볼 영상</span>' : ''}</span>
      <span class="vtitle">${esc(v.title)}</span>
      <span class="vdesc">${esc(v.desc)}</span>
      ${seen ? `<span class="vseen">${icon('check', 13)} 봤어요</span>` : ''}
    </span>
  </button>`;
}
// 학습(홈)의 「기초 영상」
function renderHomeVideos() {
  const vs = homeVideos(), sec = $('#homeVideos');
  sec.hidden = !vs.length; if (!vs.length) return;
  const next = (vs.find(v => !isSeen(v.id)) || {}).id;
  $('#basicProg').textContent = seenCount(vs) + ' / ' + vs.length + '편 봤어요';
  $('#basicSub').textContent = `처음이라면 위에서부터 차례로 보세요. ${vs.length}편을 모두 보면 ${fmtSpan(totalDur(vs))}이에요.`;
  $('#homeVideoList').innerHTML = vs.map(v => vrowHtml(v, next)).join('');
  $('#homeVideoList').classList.toggle('n4', vs.length >= 4);   // 4편이면 컴퓨터 화면에서 한 줄에 4개(조금 좁은 화면은 2개씩)
}
// 점자 탭의 「교육 영상」 칸
function renderLearnPanel() {
  const vs = learnVideos();
  const next = (vs.find(v => !isSeen(v.id)) || {}).id;
  $('#learnProg').textContent = seenCount(vs) + ' / ' + vs.length + '편 봤어요';
  const intro = homeVideos().filter(v => v.track === '점자');   // 학습 페이지 「기초 영상」에 있는 점자 영상(점자의 시작)을 먼저 보라고 알려 준다
  $('#learnSub').textContent = `한글 점자를 차례로 익히는 영상이에요. 위에서부터 보면 돼요. ${vs.length}편을 모두 보면 ${fmtSpan(totalDur(vs))}이에요.${intro.length ? ` 처음이라면 학습 페이지 「기초 영상」의 「${shortName(intro[0])}」부터 보세요.` : ''}`;
  $('#learnList').innerHTML = vs.map(v => vrowHtml(v, next)).join('');
}
function bindVideoLinks(root) {
  root.addEventListener('click', e => { const b = e.target.closest('[data-open-video]'); if (b) go('player', { arg: { id: b.dataset.openVideo } }); });
}
bindVideoLinks($('#homeVideoList')); bindVideoLinks($('#learnList'));

// ================= 학습(홈) =================
let roadTrack = store.get('track', 'sign') === 'braille' ? 'braille' : 'sign';
const TRACK_NAME = { sign: '수어', braille: '점자' };
// 학습 로드맵: 영상 목록은 위쪽 「기초 영상」·점자 탭 「교육 영상」에 있으므로, 여기서는 영상 한 편 한 편을 다시 늘어놓지 않고
// 「영상 보기」를 한 단계로 묶어 진행 상황(몇 편 봤는지)만 알려 준다.
function roadmapFor(track) {
  const hv = homeVideos(), lv = learnVideos().filter(v => v.track === '점자');
  const prog = vs => seenCount(vs) + ' / ' + vs.length + '편 봤어요';
  const wrongOf = kinds => getWrong().filter(c => kinds.includes(c.t)).length;   // 퀴즈를 마쳤어도 틀려서 복습할 문제가 남았는지(완료와 숙달을 구분)
  // 첫 단계 「기초 영상 보기」는 두 트랙이 같다(수어·점자의 시작, 사전 사용법, 소통 예절은 모두에게 기초)
  const basic = { title: '기초 영상 보기', sub: `${hv.map(shortName).join('·')} ${hv.length}편 · ${prog(hv)}`, vids: hv, act: 'scrollvid' };
  let steps;
  if (track === 'sign') {
    steps = [
      basic,
      { title: '수어 단어 찾아보기', sub: '수어 ' + ALL_WORDS.length.toLocaleString('ko-KR') + '개 검색, 국립국어원 실제 영상으로 바로 확인', nav: 'sign', did: 'sign' },
      { title: '수어 퀴즈로 복습', sub: '틀린 문제는 영상과 설명으로 다시 확인', nav: 'quiz', did: 'quiz-sign', review: wrongOf(['sv', 'pv']) }
    ];
  } else {
    steps = [
      basic,
      { title: '점자 교육 영상 보기', sub: `한글 점자 ①부터 ⑥ 약자·약어까지 ${lv.length}편 · ${prog(lv)} (점자 탭의 「교육 영상」)`, vids: lv, act: 'braillelearn' },
      { title: '점자 연습 패드·변환기 써 보기', sub: '내 이름을 점자로 바꿔 보기', nav: 'braille', did: 'braille' },
      { title: '점자 퀴즈로 복습', sub: '읽기와 직접 쓰기로 확인하기', nav: 'quiz', did: 'quiz-braille', review: wrongOf(['br', 'bu']) }
    ];
  }
  return steps.filter(s => !s.vids || s.vids.length).map((s, i) => Object.assign({ label: (i + 1) + '단계' }, s));
}
function stepDone(s) { return s.vids ? s.vids.every(v => isSeen(v.id)) : (s.did ? didFlag(s.did) : false); }
function stepAttrs(s) { return s.act ? `data-act="${s.act}"` : `data-act="nav" data-arg="${esc(s.nav)}"`; }
function renderRoadmap(track) {
  const steps = roadmapFor(track);
  let nowSet = false, doneN = 0;
  $('#roadList').innerHTML = steps.map(s => {
    const done = stepDone(s); if (done) doneN++;
    const now = !done && !nowSet ? (nowSet = true) : false;
    const aria = `${s.label} ${s.title}. ${s.sub}.${done ? ' 완료.' : ''}${now ? ' 지금 할 단계.' : ''}${s.review ? ` 복습할 문제 ${s.review}개 있음.` : ''}`;
    return `<div class="rstep ${done ? 'done' : now ? 'now' : ''}">
      <div class="dot" aria-hidden="true">${done ? icon('check', 14) : ''}</div>
      <button type="button" class="rbox" ${stepAttrs(s)} aria-label="${esc(aria)}">
        <span><span class="tt">${esc(s.label)} · ${esc(s.title)}${now ? '<span class="tag amber nowtag">지금 할 단계</span>' : ''}${s.review ? `<span class="tag amber nowtag">복습할 문제 ${s.review}개</span>` : ''}</span><span class="sub">${esc(s.sub)}</span></span>
        <span class="rarrow" aria-hidden="true">›</span>
      </button>
    </div>`;
  }).join('');
  $('#roadProg').textContent = `${doneN} / ${steps.length} 단계 완료`;
  [['sign', '#roadTabSign'], ['braille', '#roadTabBraille']].forEach(([t, sel]) => { const b = $(sel); b.classList.toggle('active', t === track); b.setAttribute('aria-pressed', String(t === track)); });
}
$('#roadTabSign').addEventListener('click', () => { roadTrack = 'sign'; store.set('track', 'sign'); renderRoadmap('sign'); });
$('#roadTabBraille').addEventListener('click', () => { roadTrack = 'braille'; store.set('track', 'braille'); renderRoadmap('braille'); });

function nextcardHtml(kicker, title, sub, attrs, label) {
  return `<div class="nextcard"><div class="nbody"><div class="nk">${esc(kicker)}</div><div class="nt">${esc(title)}</div><div class="ns">${esc(sub)}</div></div><button class="btn primary" type="button" ${attrs}>${esc(label)}</button></div>`;
}
// 위쪽 카드는 로드맵과 겹치지 않는 안내가 있을 때만 보인다: ① 풀던 퀴즈 ② 보고 있는 트랙을 모두 마쳤을 때 다른 트랙 권하기.
// 「지금 할 다음 단계」는 아래 로드맵에 표시된 하나로만 알려 준다(같은 영상으로 가는 버튼을 두 번 보여 주지 않는다).
function renderHomeNext() {
  const host = $('#homeNext');
  let html = '';
  const run = loadRun();
  if (run) html = nextcardHtml('이어서 하기', '풀던 퀴즈가 있어요', `${QKINDS[run.kind]} · ${Math.min(run.i + 1, run.qs.length)}번째 문제부터 (${run.mode === 'challenge' ? '도전' : '연습'} · ${lvText(run)})`, 'data-act="resume"', '이어서 풀기');
  else if (hasActivity() && roadmapFor(roadTrack).every(stepDone)) {
    const other = roadTrack === 'sign' ? 'braille' : 'sign', st = roadmapFor(other).find(s => !stepDone(s));
    html = st
      ? nextcardHtml(TRACK_NAME[roadTrack] + ' 트랙을 모두 마쳤어요', TRACK_NAME[other] + ' 트랙도 해 볼까요?', '다음 단계: ' + st.label + ' · ' + st.title, 'data-act="track" data-arg="' + other + '"', TRACK_NAME[other] + ' 트랙 보기')
      : nextcardHtml('모든 단계를 마쳤어요', '배운 것을 퀴즈로 복습해 볼까요?', '틀린 문제와 내 단어장으로 한 번 더 익혀요', 'data-act="nav" data-arg="quiz"', '퀴즈 하러 가기');
  }
  host.innerHTML = html; host.hidden = !html;
}
function renderHomeReview() {
  const w = getWrong().length, f = favWords().length, host = $('#homeReview');
  host.hidden = !(w || f);
  host.innerHTML = (w ? `<button class="revchip" type="button" data-act="quizkind" data-arg="review"><span class="rn">${w}</span><span class="rl">틀린 문제 다시 풀기<span class="rs">퀴즈에서 틀린 문제 모음</span></span></button>` : '')
    + (f ? `<button class="revchip" type="button" data-act="quizkind" data-arg="fav"><span class="rn">${f}</span><span class="rl">내 단어장 퀴즈<span class="rs">담아 둔 수어로 연습</span></span></button>` : '');
}
function renderHome() {
  $('#statWords').textContent = ALL_WORDS.length.toLocaleString('ko-KR');
  $('#statVideos').textContent = VIDEO_LIST.length;
  $('#statBraille').textContent = BRAILLE_TEST_COUNT;
  renderHomeNext(); renderHomeReview(); renderHomeVideos(); renderRoadmap(roadTrack);
  $('#roadHint').hidden = hasActivity();
  renderRecords();
}
// 홈·수어 화면의 버튼 동작(data-act)
function dispatchAct(act, arg) {
  if (act === 'scrollvid') { $('#homeVideos').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#basicVidH').focus({ preventScroll: true }); }
  else if (act === 'braillelearn') { store.set('track', 'braille'); go('braille'); showBraillePanel('learn', true); }
  else if (act === 'track') { roadTrack = arg === 'braille' ? 'braille' : 'sign'; store.set('track', roadTrack); renderHome(); window.scrollTo(0, 0); }
  else if (act === 'nav') { if (arg === 'sign' || arg === 'braille') store.set('track', arg); go(arg); }
  else if (act === 'resume') resumeQuiz();
  else if (act === 'quizkind') startQuizFromAnywhere(arg);
  else if (act === 'signtopics') { signQuery = ''; signTopic = ''; $('#signSearch').value = ''; renderSign(); $('#signSearch').focus(); }
}
$('#view-home').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) dispatchAct(b.dataset.act, b.dataset.arg); });

// ---------------- 내 학습 기록: 보기·내보내기·가져오기·지우기 ----------------
function renderRecords() {
  const watched = VIDEO_LIST.filter(v => store.get('watched:' + v.id, false)).length;
  $('#recCounts').innerHTML = `<div class="reccount"><b>${watched}/${VIDEO_LIST.length}</b><span>본 영상</span></div><div class="reccount"><b>${favWords().length}</b><span>단어장</span></div><div class="reccount"><b>${getWrong().length}</b><span>틀린 문제</span></div>`;
}
function setRecStatus(msg) { $('#recStatus').textContent = msg; }
function collectRecord() {
  const watched = {}, did = {};
  watchedIds().forEach(id => { watched[id] = true; });
  store.keys('did:').forEach(k => { if (store.get(k, false)) did[k.slice(4)] = true; });
  const out = { fav: favList(), wrong: getWrong(), watched, did, track: roadTrack };
  const run = loadRun(); if (run) out.quizrun = runData(run);   // 풀던 퀴즈도 함께 옮긴다
  return out;
}
$('#recExport').addEventListener('click', () => {
  const day = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify({ app: 'sonbit', version: 1, exportedAt: new Date().toISOString(), data: collectRecord() }, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'sonbit-record-' + day + '.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setRecStatus('기록 파일(sonbit-record-' + day + '.json)을 내려받았어요. 다른 기기에서 「기록 가져오기」로 불러오세요.');
});
// 가져온 틀린 문제 한 건을 깨끗한 모양으로 다듬는다. 지금 퀴즈로 다시 만들 수 없는 것(옛 방식·없는 단어)은 버린다.
function cleanWrongEntry(c) {
  if (!c || typeof c !== 'object') return null;
  const t = c.t, l = [1, 2, 3].includes(c.l) ? c.l : 2;
  let n = null;
  if (t === 'sv' || t === 'pv') n = { t, i: String(c.i), l };
  else if ((t === 'br' || t === 'bu') && typeof c.a === 'string' && c.a.length <= 30) n = { t, k: typeof c.k === 'string' && c.k ? c.k.slice(0, 1) : 'p', a: c.a, l };
  return n && QZ.valid(n) ? n : null;
}
// 가져오기: 이 기기의 기록은 그대로 두고, 파일에 있는 것을 더한다(합치기). 알 수 없는 값은 버린다.
function importRecord(text) {
  let obj; try { obj = JSON.parse(text); } catch (e) { return { ok: false, msg: '파일을 읽을 수 없어요. 손빛에서 내보낸 .json 파일이 맞는지 확인해 주세요.' }; }
  if (!obj || obj.app !== 'sonbit' || !obj.data || typeof obj.data !== 'object') return { ok: false, msg: '손빛 배움터에서 내보낸 기록 파일이 아니에요.' };
  const d = obj.data; let nFav = 0, nFavSkip = 0, nWrong = 0, nWrongOver = 0, nWatched = 0, nDid = 0, runMsg = '', failed = 0;
  const put = (k, v) => { if (!store.set(k, v, true)) failed++; };   // 저장 실패를 세어 두었다가 성공이라고 하지 않는다
  if (Array.isArray(d.fav)) {
    // 사전 단어 수(1,190개)보다 넉넉하게 받는다. 사전에 없는 단어(예전에 지운 단어 등)는 건너뛰고 몇 개인지 알려 준다
    const cur = favList(), set = new Set(cur);
    d.fav.slice(0, 5000).forEach(id => { id = String(id); if (!WORD_BY_ID.has(id)) { nFavSkip++; return; } if (!set.has(id)) { set.add(id); cur.push(id); nFav++; } });
    if (nFav) put('fav', cur);
  }
  if (Array.isArray(d.wrong)) {
    // 틀린 문제는 퀴즈에서도 최근 WRONG_MAX개까지만 보관한다. 자리가 없어 못 넣은 것은 세어서 알려 준다
    const cur = getWrong(), keys = new Set(cur.map(wrongKey));
    d.wrong.slice(0, 300).forEach(c => { const n = cleanWrongEntry(c); if (!n || keys.has(wrongKey(n))) return; if (cur.length >= WRONG_MAX) { nWrongOver++; return; } keys.add(wrongKey(n)); cur.push(n); nWrong++; });
    if (nWrong) put('wrong', cur);
  }
  if (d.watched && typeof d.watched === 'object') {
    VIDEO_LIST.forEach(v => { if (d.watched[v.id] === true && !store.get('watched:' + v.id, false)) { put('watched:' + v.id, true); nWatched++; } });
  }
  if (d.did && typeof d.did === 'object') {
    ['sign', 'braille', 'quiz-sign', 'quiz-braille'].forEach(k => { if (d.did[k] === true && !didFlag(k)) { put('did:' + k, true); nDid++; } });
  }
  if (d.track === 'sign' || d.track === 'braille') { if (!hasTrackChoice()) { roadTrack = d.track; put('track', d.track); } }
  // 풀던 퀴즈: 이 기기에 풀던 퀴즈가 없을 때만 가져온다(있으면 이 기기 것을 지킨다). 내용은 검사해서 깨끗한 모양으로 다시 저장
  if (d.quizrun && typeof d.quizrun === 'object') {
    const run = runFrom(d.quizrun);
    if (!run) runMsg = ' 파일의 풀던 퀴즈는 읽을 수 없어서 가져오지 않았어요.';
    else if (loadRun()) runMsg = ' 이 기기에 풀던 퀴즈가 있어서 파일의 풀던 퀴즈는 가져오지 않았어요.';
    else { put('quizrun', runData(run)); runMsg = ' 풀던 퀴즈도 가져왔어요.'; }
  }
  if (failed) return { ok: false, msg: `기록을 이 기기에 저장하지 못했어요. ${STORE_FAIL_WHY} 가져온 내용 중 일부 또는 전부가 들어오지 않았어요.` };
  const notes = (nFavSkip ? ` 사전에 없는 단어 ${nFavSkip}개는 건너뛰었어요.` : '') + (nWrongOver ? ` 틀린 문제는 ${WRONG_MAX}개까지만 보관해서 ${nWrongOver}개는 넣지 못했어요.` : '');
  return { ok: true, msg: `기록을 가져왔어요. 단어장 +${nFav}, 틀린 문제 +${nWrong}, 본 영상 +${nWatched}${nDid ? `, 학습 단계 +${nDid}` : ''}.${runMsg}${notes} 이 기기의 기존 기록은 그대로 두었어요.` };
}
function hasTrackChoice() { return store.get('track', null) !== null; }
$('#recImport').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (!f) return;
  if (f.size > 600 * 1024) { setRecStatus('파일이 너무 커요. 손빛에서 내보낸 기록 파일만 가져올 수 있어요.'); return; }
  let text = ''; try { text = await f.text(); } catch (err) { setRecStatus('파일을 읽지 못했어요.'); return; }
  const r = importRecord(text); setRecStatus(r.msg); toast(r.ok ? '기록을 가져왔어요' : '가져오지 못했어요');
  renderHome();   // 저장에 일부만 성공했어도 화면은 실제 저장된 대로 다시 그린다
});
$('#recClear').addEventListener('click', () => { $('#recConfirm').hidden = false; $('#recClearNo').focus(); });
$('#recClearNo').addEventListener('click', () => { $('#recConfirm').hidden = true; $('#recClear').focus(); });
$('#recClearYes').addEventListener('click', () => {
  store.del('fav'); store.del('wrong'); store.del('quizrun'); store.del('track');
  store.keys('watched:').concat(store.keys('did:')).forEach(k => store.del(k));
  roadTrack = 'sign'; $('#recConfirm').hidden = true;
  setRecStatus('기록을 모두 지웠어요.'); toast('기록을 지웠어요'); renderHome(); renderSign();
});

// ================= 수어 사전 =================
let signTopic = '', signQuery = '', signCho = '', signPinId = '';
const TOPIC_COUNT = {}; ALL_WORDS.forEach(w => { TOPIC_COUNT[w.t] = (TOPIC_COUNT[w.t] || 0) + 1; });
function topicCardHtml(t) {
  const urgent = t === '몸·건강·긴급' ? ' urgent' : '';
  return `<button class="topiccard${urgent}" data-topic="${esc(t)}" type="button"><span class="ti" aria-hidden="true">${TOPIC_ICON[t] || '✋'}</span><span class="tn">${esc(t)}</span><span class="tc">${TOPIC_COUNT[t] || 0}개</span></button>`;
}
function shortcutsHtml() {
  const n = favWords().length;
  return `<button class="shortcut fav" data-topic="${FAV_TOPIC}" type="button"><span class="sci" aria-hidden="true">★</span><span><span class="scn">내 단어장</span><span class="scc">${n ? n + '개 담음' : '담아 둔 수어 모음'}</span></span></button>
    <button class="shortcut" data-topic="${NUM_TOPIC}" type="button"><span class="sci" aria-hidden="true">🔢</span><span><span class="scn">기본 숫자</span><span class="scc">영·일~구·십·백·천·만</span></span></button>`;
}
function favBtnHtml(w) {
  const on = isFav(w.id);
  return `<button type="button" class="favbtn" data-fav="${esc(w.id)}" aria-pressed="${on}"><span class="fs" aria-hidden="true">★</span><span class="fl">${on ? '단어장에 담김' : '단어장에 담기'}</span></button>`;
}
function wordRowHtml(w, showTopic) {
  const play = hasRealVideo(w) ? '<span class="vbadge" title="실제 수어 영상 있음">▶</span>' : '<span class="vbadge none">▶</span>';
  const topic = showTopic ? `<span class="wtopic">${esc(w.t)}</span>` : '';
  const sub = w.x ? `<span class="wsub">${esc((w.g || '').split(' / ')[0].slice(0, 24))}</span>` : (w.al ? `<span class="wsub">${esc(w.al.replace(/, /g, ' · '))}</span>` : '');
  const fav = `<span class="favmark" role="img" aria-label="단어장에 담긴 단어"${isFav(w.id) ? '' : ' hidden'}>★</span>`;
  return `<details class="wordrow" data-wid="${esc(w.id)}"><summary><span class="wname">${esc(w.w)}</span>${fav}${sub}${topic}${play}</summary><div class="wbody"></div></details>`;
}
// 누리사전 공식 정보(한 손/두 손, 손모양, 손 위치) — 국립국어원 자료 그대로
function signInfoHtml(w) {
  const inf = typeof KSL_INFO !== 'undefined' ? KSL_INFO[String(w.id).slice(1)] : null;
  if (!inf) return '';
  const names = inf[1].map(b => KSL_HAND_NAME[b]).filter(Boolean);
  const pos = KSL_POS_NAME[inf[2]] || '';
  const hands = inf[1].map(b => `<span class="hs"><img src="assets/hand/${b}.jpg" alt="" loading="lazy"><b>${esc(KSL_HAND_NAME[b] || '')}</b></span>`).join('');
  const posHtml = pos ? `<span class="hs"><img src="assets/pos/${inf[2]}.jpg" alt="" loading="lazy"><b>${esc(pos)}</b></span>` : '';
  const sentence = `${inf[0] === 1 ? '한 손' : '두 손'}으로 하는 수어예요.` + (names.length ? ` 손모양은 ${names.join(', ')}` : '') + (pos ? `, 손 위치는 ${pos} 쪽이에요.` : '.');
  return `<div class="signinfo"><p class="lbl">손모양과 위치</p><p class="motion">${esc(sentence)}</p><div class="hsrow">${hands}${posHtml}</div></div>`;
}
function senseListHtml(w) {
  const senses = (w.g || '').split(' / ').filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('');
  const exs = (w.e || '').replace(/([.?!]),\s*/g, '$1\n').split('\n').filter(Boolean).slice(0, 3).map(s => `<li>${esc(s)}</li>`).join('');
  return (senses ? `<p class="lbl">뜻</p><ul class="exlist">${senses}</ul>` : '') + (exs ? `<p class="lbl">예문</p><ul class="exlist">${exs}</ul>` : '');
}
// 펼친 단어: ① 단어장 담기 ② 영상·그림 ③ 동작 설명 ④ 뜻·예문 ⑤ 손모양과 위치
function wordBodyHtml(w) {
  const actions = `<div class="wactions">${favBtnHtml(w)}</div>`;
  if (w.x) return actions + kslVideoBoxHtml(w.k, w.w, w.id) + officialBlockHtml(w) + senseListHtml(w) + signInfoHtml(w);
  return actions + (w.k ? kslVideoBoxHtml(w.k, w.w, w.id) : '') + descHtml(w) + aliasHtml(w);
}
function fillWordBody(det) {
  const body = det.querySelector('.wbody');
  if (body.dataset.ready) return;
  const w = WORD_BY_ID.get(det.dataset.wid); if (!w) return;
  body.innerHTML = wordBodyHtml(w);
  body.dataset.ready = '1';
}
function choChipsHtml(list) {
  const present = new Set(list.map(firstCho));
  const chips = ['전체'].concat(CHO_MAIN.filter(c => present.has(c)));
  if ([...present].some(c => !CHO_MAIN.includes(c))) chips.push('기타');
  return chips.map(c => `<button class="chip${(signCho || '전체') === c ? ' active' : ''}" data-cho="${c}" type="button" aria-pressed="${(signCho || '전체') === c}">${c}</button>`).join('');
}
// 검색 실패 안내: 왜 없는지, 어떻게 찾을지, 비슷한 단어
function suggestWords(raw) {
  const q = normQ(String(raw).toLowerCase()); if (!q) return [];
  const cho = choOf(q), scored = new Map();
  for (const w of ALL_WORDS) {
    if (scored.has(w.w)) continue;
    const name = w.w.replace(/\s+/g, ''); let sc = 0;
    for (const ch of new Set(q)) if (name.includes(ch)) sc += 2;
    if (name.charAt(0) === q.charAt(0)) sc += 2;
    if (name.length >= 2 && q.includes(name)) sc += 4; // 단어가 검색어 안에 통째로 들어 있으면 가장 비슷한 후보
    if (choOf(name).slice(0, 2) === cho.slice(0, 2)) sc += 1;
    if (sc >= 3) scored.set(w.w, sc);
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, 6).map(e => e[0]);
}
function noResultHtml(raw) {
  const sug = suggestWords(raw);
  const chips = sug.length ? `<div><p class="lbl" style="font-size:.75rem;font-weight:800;color:var(--teal);margin-bottom:6px">이런 단어는 어때요?</p><div class="suggest">${sug.map(w => `<button type="button" class="chip" data-suggest="${esc(w)}">${esc(w)}</button>`).join('')}</div></div>` : '';
  return `<div class="card nores"><h3>「${esc(raw)}」에 맞는 수어를 찾지 못했어요</h3>
    <ul><li>띄어쓰기 없이 더 짧게 써 보세요. (예: 「학교 가다」 → 「학교」)</li><li>자음만 써도 찾을 수 있어요. (예: ㅎㄱ)</li><li>비슷한 뜻의 다른 말로도 찾아보세요.</li><li>이 사전에는 국립국어원 사전에서 영상을 확인한 ${ALL_WORDS.length.toLocaleString('ko-KR')}개 표현만 있어요. 없는 단어는 국립국어원 한국수어사전에서 직접 찾아볼 수 있어요.</li></ul>
    ${chips}<button type="button" class="btn line" data-act="signtopics">주제로 찾아보기</button></div>`;
}
function renderSign() {
  const q = signQuery.toLowerCase();
  const searching = !!normQ(q);
  const inTopic = !searching && !!signTopic;
  $('#signHome').hidden = searching || inTopic;
  $('#signTopicHead').hidden = !inTopic;
  $('#signActions').hidden = true; $('#signCho').hidden = true;
  if (!searching && !inTopic) {
    $('#signShortcuts').innerHTML = shortcutsHtml();
    $('#signTopics').innerHTML = TOPICS.map(topicCardHtml).join('');
    $('#signCount').hidden = false; $('#signCount').textContent = `주제를 눌러 단어를 찾아보세요 · 전체 ${ALL_WORDS.length.toLocaleString('ko-KR')}개`;
    $('#signList').innerHTML = '';
    return;
  }
  let list;
  if (searching) {
    list = ALL_WORDS.filter(w => matchWord(w, q)).map((w, i) => ({ w, r: rankWord(w, q), i })).sort((a, b) => a.r - b.r || a.i - b.i).map(o => o.w);
    if (signPinId) { const k = list.findIndex(x => String(x.id) === String(signPinId)); if (k > 0) list.unshift(list.splice(k, 1)[0]); }
  } else if (signTopic === FAV_TOPIC) list = favWords();
  else if (signTopic === NUM_TOPIC) list = basicNumberWords();
  else list = ALL_WORDS.filter(w => w.t === signTopic).sort(byName);
  if (inTopic) {
    $('#signTopicName').textContent = (signTopic === FAV_TOPIC ? '★' : signTopic === NUM_TOPIC ? '🔢' : (TOPIC_ICON[signTopic] || '')) + ' ' + signTopic;
    if (signTopic === FAV_TOPIC && list.length) { $('#signActions').hidden = false; $('#signActions').innerHTML = `<button class="btn primary small" type="button" data-act="quizkind" data-arg="fav">단어장 퀴즈 풀기 (${list.length}개)</button>`; }
    if (list.length > 40 && signTopic !== FAV_TOPIC && signTopic !== NUM_TOPIC) {
      $('#signCho').hidden = false; $('#signCho').innerHTML = choChipsHtml(list);
      if (signCho === '기타') list = list.filter(w => !CHO_MAIN.includes(firstCho(w)));
      else if (signCho) list = list.filter(w => firstCho(w) === signCho);
    }
  }
  $('#signCount').hidden = searching && !list.length;
  $('#signCount').textContent = searching ? `검색 결과 ${list.length}개` : `${list.length}개 단어 · 눌러서 뜻과 영상 보기`;
  if (!list.length) {
    if (searching) $('#signList').innerHTML = noResultHtml(signQuery);
    else if (signTopic === FAV_TOPIC) $('#signList').innerHTML = '<div class="empty">아직 담은 단어가 없어요.<br>단어를 펼쳐서 「단어장에 담기」를 눌러 보세요.</div>';
    else $('#signList').innerHTML = '<div class="empty">이 주제에는 단어가 없어요.</div>';
    return;
  }
  $('#signList').innerHTML = list.slice(0, 150).map(w => wordRowHtml(w, searching)).join('') + (list.length > 150 ? `<p class="note" style="text-align:center">검색어를 더 자세히 적으면 좁혀져요 (${list.length}개 중 150개 표시)</p>` : '');
}
$('#signHome').addEventListener('click', e => {
  const b = e.target.closest('[data-topic]'); if (!b) return;
  signTopic = b.dataset.topic; signCho = ''; renderSign(); window.scrollTo(0, 0);
});
$('#signTopicBack').addEventListener('click', () => { signTopic = ''; signCho = ''; renderSign(); window.scrollTo(0, 0); });
$('#signSearch').addEventListener('input', e => { signQuery = e.target.value.trim(); signPinId = ''; renderSign(); });
$('#signCho').addEventListener('click', e => { const b = e.target.closest('[data-cho]'); if (!b) return; signCho = b.dataset.cho === '전체' ? '' : b.dataset.cho; renderSign(); });
$('#signActions').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) dispatchAct(b.dataset.act, b.dataset.arg); });
// 퀴즈 해설 등에서 사전의 특정 단어를 바로 열어 준다
function openWordInDictionary(w) {
  signTopic = ''; signCho = ''; signQuery = w.w; signPinId = w.id;
  $('#signSearch').value = w.w;
  store.set('track', 'sign');
  go('sign'); renderSign();
  const row = $('#signList .wordrow[data-wid="' + w.id + '"]');
  if (row) { row.open = true; setTimeout(() => row.scrollIntoView({ block: 'center' }), 80); }
}
$('#signList').addEventListener('toggle', e => { if (e.target.open) { fillWordBody(e.target); markDid('sign'); } }, true);
$('#signList').addEventListener('click', e => {
  const fb = e.target.closest('[data-fav]');
  if (fb) {
    const id = fb.dataset.fav, on = toggleFav(id);
    if (on === null) { toast('단어장에 저장하지 못했어요. ' + STORE_FAIL_WHY); return; }
    fb.setAttribute('aria-pressed', String(on)); fb.querySelector('.fl').textContent = on ? '단어장에 담김' : '단어장에 담기';
    const row = fb.closest('.wordrow'); if (row) { const m = row.querySelector('.favmark'); if (m) m.hidden = !on; }
    const w = WORD_BY_ID.get(String(id)); toast(on ? `「${w ? w.w : ''}」을(를) 단어장에 담았어요` : `「${w ? w.w : ''}」을(를) 단어장에서 뺐어요`);
    return;
  }
  const sg = e.target.closest('[data-suggest]');
  if (sg) { signQuery = sg.dataset.suggest; signPinId = ''; $('#signSearch').value = signQuery; renderSign(); return; }
  const ac = e.target.closest('[data-act]'); if (ac) dispatchAct(ac.dataset.act, ac.dataset.arg);
});
// 그림을 못 불러오면 빈 틀을 치운다. 영상을 못 불러온 경우는 아래 「영상을 불러오지 못했을 때」에서 모든 화면을 함께 처리한다(그림·설명은 그대로 둔다).
$('#signList').addEventListener('error', e => {
  const el = e.target;
  if (el.tagName === 'IMG' && el.closest('.shapeimg')) el.closest('.shapeimg').remove();
}, true);

// ================= 점자 =================
const T = KB.tables;
const SYL1 = { 'ㄱ': '가', 'ㄴ': '나', 'ㄷ': '다', 'ㅁ': '마', 'ㅂ': '바', 'ㅅ': '사', 'ㅈ': '자', 'ㅋ': '카', 'ㅌ': '타', 'ㅍ': '파', 'ㅎ': '하' };
const SYL2 = { 'ㅓㄱ': '억', 'ㅓㄴ': '언', 'ㅓㄹ': '얼', 'ㅕㄴ': '연', 'ㅕㄹ': '열', 'ㅕㅇ': '영', 'ㅗㄱ': '옥', 'ㅗㄴ': '온', 'ㅗㅇ': '옹', 'ㅜㄴ': '운', 'ㅜㄹ': '울', 'ㅡㄴ': '은', 'ㅡㄹ': '을', 'ㅣㄴ': '인' };
const PUNCT_NAME = { '.': '마침표', '?': '물음표', '!': '느낌표', ',': '쉼표', '·': '가운뎃점', ':': '쌍점', '/': '빗금', '…': '줄임표', '“': '여는 큰따옴표', '”': '닫는 큰따옴표', '‘': '여는 작은따옴표', '’': '닫는 작은따옴표', '(': '여는 소괄호', ')': '닫는 소괄호', '{': '여는 중괄호', '}': '닫는 중괄호', '[': '여는 대괄호', ']': '닫는 대괄호', '『': '여는 겹낫표', '』': '닫는 겹낫표', '「': '여는 낫표', '」': '닫는 낫표', '《': '여는 겹화살괄호', '》': '닫는 겹화살괄호', '〈': '여는 홑화살괄호', '〉': '닫는 홑화살괄호', '―': '줄표', '-': '붙임표', '~': '물결표' };
const cellKey = c => c.join('-');
function dotsLabel(dots) { return dots && dots.length ? dots.slice().sort((a, b) => a - b).join('·') + '번 점' : '점이 없는 빈칸'; }
function dotsToUnicode(dots) { let v = 0; dots.forEach(n => { v |= 1 << (n - 1); }); return String.fromCharCode(0x2800 + v); }
// 점자 한 칸 그림. 화면낭독기에는 점 번호를 읽어 주고, 옆에 글이 이미 있는 곳(가이드 카드 등)은 decorative=true 로 숨긴다
function miniDots(dots, decorative) {
  const a = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${dotsLabel(dots)}"`;
  return `<div class="mini" ${a}>${[1, 2, 3, 4, 5, 6].map(n => `<i class="${dots.includes(n) ? 'on' : ''}"></i>`).join('')}</div>`;
}
// ---- 한 칸이 글자 안에서 어떻게 읽히는지(읽는 자리별) ----
const READINGS = (() => {
  const map = {};
  const add = (brf, label, kind) => { const cs = KB.brfCells(brf); if (cs.length !== 1) return; (map[cellKey(cs[0])] = map[cellKey(cs[0])] || []).push({ label, kind }); };
  for (const [ch, b] of Object.entries(T.CHO)) if (b) add(b, ch, '첫소리');
  for (const [ch, b] of Object.entries(T.JUNG)) add(b, ch, '모음');
  for (const [ch, b] of Object.entries(T.JONG)) add(b, ch + ' 받침', '받침');
  for (const [k, b] of Object.entries(T.ABBR1)) add(b, SYL1[k], '약자');
  for (const [k, b] of Object.entries(T.ABBR2)) add(b, SYL2[k], '약자');
  for (const [d, dots] of Object.entries(BRAILLE_NUMBERS)) (map[dots] = map[dots] || []).push({ label: d, kind: '숫자(수표 뒤)' });
  (map[BRAILLE_NUMBER_SIGN] = map[BRAILLE_NUMBER_SIGN] || []).push({ label: '수표', kind: '수표' });
  for (const [ch, b] of Object.entries(T.PUNCT)) if (PUNCT_NAME[ch]) add(b, PUNCT_NAME[ch] + ' ' + ch, '문장부호');
  return map;
})();
const READ_ORDER = ['첫소리', '모음', '받침', '약자', '숫자(수표 뒤)', '수표', '문장부호'];
// ---- 화면 전환(변환기·연습 패드·점자 표) ----
const BPANELS = ['convert', 'pad', 'table', 'learn'];
function showBraillePanel(name, byUser) {
  if (!BPANELS.includes(name)) name = 'convert';
  BPANELS.forEach(n => { $('#bp-' + n).hidden = n !== name; });
  $$('[data-bpanel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bpanel === name)));
  store.set('bpanel', name);
  if (name === 'table') { renderTable(tableGroup); if (byUser) markDid('braille'); }
  if (name === 'learn') renderLearnPanel();
}
$('#bpSeg').addEventListener('click', e => { const b = e.target.closest('[data-bpanel]'); if (b) showBraillePanel(b.dataset.bpanel, true); });
// ---- 연습 패드(처음엔 한 칸, 「칸 추가」를 누르면 두 칸) ----
let padDots = new Set(), padDots2 = new Set(), padTwo = false;
const sortedDots = s => Array.from(s).sort((a, b) => a - b);
function dotBtns(set, cellNo) {
  const pre = padTwo ? (cellNo === 2 ? '둘째 칸 ' : '첫째 칸 ') : '';
  return [1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="dot ${set.has(n) ? 'on' : ''}" data-dot="${n}" data-cell="${cellNo}" aria-pressed="${set.has(n)}" aria-label="${pre}${n}번 점">${n}</button>`).join('');
}
function renderPadCell() { $('#padCell').innerHTML = dotBtns(padDots, 1); $('#padCell2').innerHTML = dotBtns(padDots2, 2); }
function syncPadCell() {
  [['#padCell', padDots], ['#padCell2', padDots2]].forEach(([sel, set]) => $$('[data-dot]', $(sel)).forEach(b => { const on = set.has(Number(b.dataset.dot)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }));
}
function setPadTwo(on) {
  padTwo = on; if (!on) padDots2.clear();
  $('#padCol2').hidden = !on; $('.padlbl', $('#padCells')).hidden = !on; $('#padCells').classList.toggle('two', on);
  $('#padTwo').setAttribute('aria-pressed', String(on)); $('#padTwo').textContent = on ? '한 칸으로' : '칸 추가(두 칸으로)';
  renderPadCell(); renderPadResult();
}
const oneReadings = dots => (READINGS[dots.join('-')] || []).slice().sort((a, b) => READ_ORDER.indexOf(a.kind) - READ_ORDER.indexOf(b.kind));
// 두 칸 읽기 표: 손으로 정하지 않고, 규정 표(된소리·두 칸 모음·쌍받침·겹받침·약어·문장부호)와
// 점자 엔진으로 바꾼 결과(수표+숫자, 가~힣 11,172자 중 두 칸이 되는 글자)로 만든다. 처음 쓸 때 한 번만 만든다(0.1초 안쪽).
let TWO_READ = null;
function twoReadings() {
  if (TWO_READ) return TWO_READ;
  const map = {}, key = cs => cs.map(cellKey).join('|');
  const conv = (s, contract) => KB.convert(s, { contract }).cells.filter(c => c.kind !== '띄어쓰기' && c.kind !== '줄바꿈').map(c => c.dots);
  const add = (cs, label, kind) => { if (cs.length !== 2) return; const l = (map[key(cs)] = map[key(cs)] || []); if (!l.some(x => x.label === label)) l.push({ label, kind }); };
  for (const [ch, b] of Object.entries(T.CHO)) if (b) add(KB.brfCells(b), ch, '된소리 첫소리');
  for (const [ch, b] of Object.entries(T.JUNG)) if (b) add(KB.brfCells(b), ch, '모음(두 칸)');
  for (const [ch, b] of Object.entries(T.JONG)) if (b) add(KB.brfCells(b), ch + ' 받침', ch === 'ㄲ' ? '쌍받침' : '겹받침');
  for (const [w, b] of Object.entries(T.ABBR_WORDS)) add(KB.brfCells(b), w, '약어');
  for (const [ch, b] of Object.entries(T.PUNCT)) if (PUNCT_NAME[ch]) add(KB.brfCells(b), PUNCT_NAME[ch] + ' ' + ch, '문장부호');
  for (let d = 0; d <= 9; d++) add(conv(String(d), false), '숫자 ' + d, '숫자(수표+숫자)');
  for (let c = 0xAC00; c <= 0xD7A3; c++) {
    const s = String.fromCharCode(c), a = conv(s, true);
    if (a.length === 2) add(a, s, key(a) === key(conv(s, false)) ? '글자' : '글자(약자 사용)');
  }
  return (TWO_READ = map);
}
const readList = rs => rs.map(r => `<li><b>${esc(r.label)}</b> — ${esc(r.kind)}</li>`).join('');
const readInline = rs => rs.length ? rs.map(r => `${r.label}(${r.kind})`).join(', ') : '한 칸으로 읽는 글자 없음';
function renderPadResult() {
  const d1 = sortedDots(padDots), d2 = sortedDots(padDots2);
  if (padTwo && d2.length) {
    if (!d1.length) { $('#padResultChar').textContent = '첫째 칸부터 눌러 주세요'; $('#padResultKind').textContent = ''; $('#padReadings').innerHTML = ''; return; }
    $('#padResultChar').textContent = `${d1.join('·')} | ${d2.join('·')}번 점`;
    $('#padResultKind').textContent = '점자 문자 ' + dotsToUnicode(d1) + dotsToUnicode(d2);
    const both = twoReadings()[d1.join('-') + '|' + d2.join('-')] || [];
    $('#padReadings').innerHTML = (both.length ? `<p>두 칸을 함께 읽으면 이렇게 읽혀요.</p><ul>${readList(both)}</ul>` : '<p>두 칸이 한 덩어리로 읽히는 글자·부호는 없어요.</p>')
      + `<p style="margin-top:8px">칸마다 따로 읽으면</p><ul><li>첫째 칸: ${esc(readInline(oneReadings(d1)))}</li><li>둘째 칸: ${esc(readInline(oneReadings(d2)))}</li></ul>`;
    return;
  }
  if (!d1.length) { $('#padResultChar').textContent = '점을 눌러 보세요'; $('#padResultKind').textContent = ''; $('#padReadings').innerHTML = ''; return; }
  $('#padResultChar').textContent = d1.join('·') + '번 점';
  $('#padResultKind').textContent = '점자 문자 ' + dotsToUnicode(d1);
  const rs = oneReadings(d1);
  $('#padReadings').innerHTML = (rs.length
    ? `<p>${rs.length > 1 ? '같은 모양이 글자 안의 자리에 따라 이렇게 읽혀요.' : '이렇게 읽혀요.'}</p><ul>${readList(rs)}</ul>`
    : '<p>한 칸으로 읽는 글자가 아직 없는 모양이에요.</p>') + (padTwo ? '<p style="margin-top:8px">둘째 칸도 누르면 두 칸을 함께 읽어 줘요.</p>' : '');
}
$('#padCells').addEventListener('click', e => {
  const b = e.target.closest('[data-dot]'); if (!b) return;
  const set = b.dataset.cell === '2' ? padDots2 : padDots, n = Number(b.dataset.dot);
  set.has(n) ? set.delete(n) : set.add(n);
  syncPadCell(); renderPadResult(); markDid('braille');
});
$('#padTwo').addEventListener('click', () => setPadTwo(!padTwo));
$('#padReset').addEventListener('click', () => { padDots.clear(); padDots2.clear(); syncPadCell(); renderPadResult(); });
// ---- 글자 → 점자 변환기 ----
function renderBraillePanel() {
  const text = $('#bpInput').value.slice(0, 200);
  const contract = $('#bpContract').checked;
  const r = KB.convert(text, { contract });
  const cells = r.cells.filter(c => c.kind !== '줄바꿈');
  // 칸 수에는 바꾸지 못한 글자 자리(점선 칸)를 넣지 않고, 띄어쓰기 칸은 따로 밝힌다
  const real = cells.filter(c => !c.unsupported), spaces = real.filter(c => c.kind === '띄어쓰기').length, bad = r.unsupported.length;
  $('#bpSummary').textContent = text ? `점자 ${real.length}칸${spaces ? `(띄어쓰기 ${spaces}칸 포함)` : ''}으로 바뀌었어요${bad ? ` · 바꾸지 못한 글자 ${bad}개` : ''}` : '글자를 입력하면 여기에 몇 칸인지 나와요';
  const warn = r.warnings.slice(); if (r.unsupported.length) warn.unshift(`바꿔 주지 않는 글자가 있어요: ${[...new Set(r.unsupported)].join(' ')} (로마자·그리스 문자·수식 기호·옛 글자 등은 규정이 따로 있어 지원하지 않아요. 점선 칸으로 표시했어요.)`);
  $('#bpWarn').hidden = !warn.length; $('#bpWarn').textContent = warn.join(' ');
  $('#bpCells').innerHTML = cells.map(c => {
    const label = c.kind === '띄어쓰기' ? '␣' : (c.text || '');
    const tip = c.kind + (c.rule ? ' · ' + c.rule : '');
    return `<div class="ccell ${c.unsupported ? 'unverified' : ''}" title="${esc(tip)}">${miniDots(c.dots)}<label>${esc(label)}</label><small>${esc(c.kind === '띄어쓰기' || c.unsupported ? c.kind : c.kind.replace(/\(.*\)/, ''))}</small></div>`;
  }).join('');
  const uni = cells.map(c => (c.kind === '띄어쓰기' ? ' ' : (c.unsupported ? '?' : dotsToUnicode(c.dots)))).join('');
  $('#bpOutWrap').hidden = !text; $('#bpOut').textContent = uni; $('#bpOutNote').hidden = !bad;
  if (text) markDid('braille');
}
$('#bpInput').addEventListener('input', renderBraillePanel);
$('#bpContract').addEventListener('change', renderBraillePanel);
const BP_EXAMPLES = ['그래서 가나다', '성정청 억울한 것', '2025년 3월 1일', '안녕하세요.'];
$('#bpExamples').innerHTML = BP_EXAMPLES.map(t => `<button class="chip" type="button" data-ex="${esc(t)}">${esc(t)}</button>`).join('');
$('#bpExamples').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (!b) return; $('#bpInput').value = b.dataset.ex; renderBraillePanel(); });
$('#bpCopy').addEventListener('click', () => {
  const t = $('#bpOut').textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { $('#bpCopy').textContent = '복사했어요'; setTimeout(() => { $('#bpCopy').textContent = '복사'; }, 1500); })
    .catch(() => { const r = document.createRange(); r.selectNodeContents($('#bpOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('#bpCopy').textContent = '선택됐어요 — 직접 복사하세요'; });
});
// ---- 점자 표(규정 표를 엔진과 같은 표에서 만든다) ----
const TABLE_GROUPS = ['첫소리', '모음', '받침', '숫자', '약자·약어', '문장부호'];
let tableGroup = store.get('tgroup', '첫소리'); if (!TABLE_GROUPS.includes(tableGroup)) tableGroup = '첫소리';
function guideCardHtml(label, cells, sub) {
  const nums = cells.map(c => (c.length ? c.join('·') : '빈칸')).join(' + ');
  return `<div class="guide-card${cells.length > 1 ? ' wide' : ''}"><div class="ch">${esc(label)}</div><div class="cc">${cells.map(c => miniDots(c, true)).join('')}</div><div class="dn">${esc(nums)}번${sub ? ' · ' + esc(sub) : ''}</div></div>`;
}
function guideGrid(items, multi) { return `<div class="guide-grid${multi ? ' multi' : ''}">${items.join('')}</div>`; }
function subHead(title, tag, note) { return `<div class="sub-h"><h2>${esc(title)}</h2>${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</div>${note ? `<p class="note" style="margin:8px 0">${note}</p>` : ''}`; }
function convCells(text) { return KB.convert(text, { contract: true }).cells.filter(c => c.kind !== '띄어쓰기' && c.kind !== '줄바꿈').map(c => c.dots); }
function tableHtml(g) {
  const brf = b => KB.brfCells(b);
  if (g === '첫소리') {
    const main = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'], dbl = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];
    return subHead('기본 첫소리', '13개', '첫소리 ㅇ은 점자로 쓰지 않고 모음만 써요.') + guideGrid(main.map(ch => guideCardHtml(ch, brf(T.CHO[ch]))))
      + subHead('된소리(쌍자음)', '5개', '6번 점(된소리표)을 먼저 쓰고, 뒤에 예사소리를 이어 써요.') + guideGrid(dbl.map(ch => guideCardHtml(ch, brf(T.CHO[ch]))), true);
  }
  if (g === '모음') {
    const base = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'], one = ['ㅐ', 'ㅔ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅢ'], two = ['ㅒ', 'ㅙ', 'ㅞ', 'ㅟ'];
    return subHead('기본 모음', '10개') + guideGrid(base.map(ch => guideCardHtml(ch, brf(T.JUNG[ch]))))
      + subHead('겹모음', '7개') + guideGrid(one.map(ch => guideCardHtml(ch, brf(T.JUNG[ch]))))
      + subHead('두 칸으로 쓰는 겹모음', '4개', 'ㅒ ㅙ ㅞ ㅟ는 앞 모음 뒤에 ㅐ(1·2·3·5번)를 한 칸 더 붙여 두 칸으로 써요.') + guideGrid(two.map(ch => guideCardHtml(ch, brf(T.JUNG[ch]))), true);
  }
  if (g === '받침') {
    const main = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'], dbl = ['ㄲ', 'ㅆ'], multi = ['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ'];
    return subHead('기본 받침', '14개', '받침은 첫소리와 점 모양이 달라요. 같은 자음이라도 자리(첫소리·받침)에 따라 다른 점을 써요.') + guideGrid(main.map(ch => guideCardHtml(ch, brf(T.JONG[ch]))))
      + subHead('쌍받침', '2개') + guideGrid(dbl.map(ch => guideCardHtml(ch, brf(T.JONG[ch]))))
      + subHead('겹받침', '11개', '두 자음을 차례로 이어 써요.') + guideGrid(multi.map(ch => guideCardHtml(ch, brf(T.JONG[ch]))), true);
  }
  if (g === '숫자') {
    const sign = guideCardHtml('수표', [BRAILLE_NUMBER_SIGN.split('-').map(Number)]);
    const digits = Object.keys(BRAILLE_NUMBERS).sort().map(ch => guideCardHtml(ch, [BRAILLE_NUMBERS[ch].split('-').map(Number)]));
    return subHead('수표와 숫자', '0~9', '숫자 앞에는 수표(3·4·5·6번 점)를 한 번 써요. 그 뒤에 아래 모양의 숫자를 이어 써요. 예: 25 → 수표 + 2 + 5') + guideGrid([sign].concat(digits))
      + `<ul class="exlist" style="margin-top:12px"><li>숫자 사이의 쉼표와 자릿점은 2번 점, 소수점은 2·5·6번 점이에요. 예: 9,375 → 수표 9 (2번 점) 3 7 5</li><li>숫자 뒤에 ㄴ·ㄷ·ㅁ·ㅋ·ㅌ·ㅍ·ㅎ으로 시작하는 글자나 '운'이 오면 숫자와 한 칸을 띄어요. 예: 1년 → 수표 1, 빈칸, 년</li><li>「한국 점자 규정」 제40~44항을 따랐어요. 연산 기호(+ - × ÷)와 분수는 아직 지원하지 않아요.</li></ul>`;
  }
  if (g === '약자·약어') {
    const one = Object.keys(SYL1).map(k => SYL1[k]).concat(Object.values(SYL2));
    return subHead('약자 — 한 글자를 한 칸으로', '25개', '자주 나오는 글자를 줄여 쓴 거예요. 글자 앞뒤에 따라 쓰지 않는 경우(제14항 등)가 있어서, 정확한 적용은 「글자 바꾸기」가 알아서 해 줘요.')
      + guideGrid(one.map(ch => guideCardHtml(ch, convCells(ch))))
      + subHead('약자 — 두 칸으로 쓰는 것', '4개') + guideGrid(['것', '성', '정', '청'].map(ch => guideCardHtml(ch, convCells(ch))), true)
      + subHead('약어 — 낱말 전체를 줄인 것', '7개', '낱말 앞에 한글이 붙어 있지 않을 때만 써요.') + guideGrid(Object.keys(T.ABBR_WORDS).map(w => guideCardHtml(w, convCells(w))), true);
  }
  const keys = Object.keys(PUNCT_NAME).filter(ch => T.PUNCT[ch] !== undefined);
  return subHead('문장 부호', keys.length + '개', '「한국 점자 규정」 제49항의 부호예요. 쉼표(5번)는 첫소리 ㄹ과 점 모양이 같아서 앞뒤 글자를 보고 구분해요.')
    + guideGrid(keys.map(ch => guideCardHtml(ch, brf(T.PUNCT[ch]), PUNCT_NAME[ch])));
}
function renderTable(g) {
  tableGroup = g; store.set('tgroup', g);
  $('#tableChips').innerHTML = TABLE_GROUPS.map(x => `<button class="chip${x === g ? ' active' : ''}" type="button" data-tg="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join('');
  $('#tableBody').innerHTML = tableHtml(g);
}
$('#tableChips').addEventListener('click', e => { const b = e.target.closest('[data-tg]'); if (b) renderTable(b.dataset.tg); });

// ================= 퀴즈 =================
// 문제는 assets/quiz-engine.js(QZ)가 만든다: 수어·점자 문제 구성, 난이도 하·중·상 배분, 보기 고르기, 저장·복원.
// 여기서는 화면과 풀이 상태(점수·목숨·이어 풀기)만 맡는다.
function clueCellsHtml(cells) { return '<div class="cellsrow">' + cells.map(c => miniDots(c, true)).join('') + '</div>'; }
// ---- 점자 문제의 글 설명(화면낭독기용·오답 해설용). 정답 글자는 포함하지 않는다 ----
const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째'];
function cellsDescription(cells) {
  if (cells.length === 1) return cells[0].length ? dotsLabel(cells[0]) + '이 있는 점자 한 칸' : '점이 없는 빈칸';
  return '점자 ' + cells.length + '칸. ' + cells.map((c, i) => (ORD[i] || (i + 1) + '번째') + ' 칸 ' + dotsLabel(c)).join(', ');
}
function dotsDiffText(ans, got, who) {
  who = who || '고른 글자';
  if (ans.length !== got.length) return `정답은 ${ans.length}칸, ${who}는 ${got.length}칸이에요`;
  const parts = [];
  ans.forEach((a, i) => {
    const g = got[i], miss = a.filter(n => !g.includes(n)), extra = g.filter(n => !a.includes(n));
    const bits = [];
    if (miss.length) bits.push(`정답에만 있는 점 ${miss.join('·')}번`);
    if (extra.length) bits.push(`${who}에만 있는 점 ${extra.join('·')}번`);
    if (bits.length) parts.push((ans.length > 1 ? ORD[i] + ' 칸: ' : '') + bits.join(', '));
  });
  return parts.join(' / ');
}
// ---- 풀이 상태 저장(잠시 나가도 이어 풀 수 있게) ----
const QKINDS = { sign: '수어 퀴즈', braille: '점자 읽기 퀴즈', build: '점자 쓰기 퀴즈', fav: '내 단어장 퀴즈', review: '틀린 문제 복습' };
const LEVEL_NAME = QZ.LEVELS;
const lvText = s => (s.kind === 'review' ? '난이도 섞임' : '난이도 ' + LEVEL_NAME[s.lv]);        // 복습은 문제마다 난이도가 달라 「섞임」
const toLevel = n => '「' + LEVEL_NAME[n] + '」' + (n === 1 ? '로' : '으로');                    // 하→로, 중·상→으로
let quizState = { active: false };
const modeNow = () => (store.get('qmode', 'practice') === 'challenge' ? 'challenge' : 'practice');
const levelNow = () => { const v = Number(store.get('qlevel', 2)); return v === 1 || v === 3 ? v : 2; };
const scopeNow = () => { const v = store.get('qscope', 'all'); return QZ.SCOPES.some(s => s.key === v) ? v : 'all'; };
const scopeLabel = k => (QZ.SCOPES.find(s => s.key === k) || QZ.SCOPES[0]).label;
// 풀이 상태 → 저장할 모양(기록 파일로 내보낼 때도 같은 모양)
const runData = s => ({ v: 2, kind: s.kind, mode: s.mode, lv: s.lv, scope: s.scope, i: s.answered ? s.i + 1 : s.i, score: s.score, lives: s.lives, done: s.done, qs: s.qs.map(q => QZ.compact(q)), wrong: s.wrong.map(q => QZ.compact(q, true)) });
// 저장에 성공했는지 돌려준다(「잠시 나가기」에서 성공했을 때만 「저장했어요」라고 하기 위해)
function saveRun(quiet) {
  const s = quizState; if (!s.active) return false;
  return store.set('quizrun', runData(s), quiet);
}
// 저장된 모양 → 풀이 상태. 이 기기의 저장소와 가져온 기록 파일 모두 이것으로 검사한다(알 수 없는 값이면 null)
function runFrom(r) {
  if (!r || typeof r !== 'object' || r.v !== 2 || !QKINDS[r.kind] || !Array.isArray(r.qs) || !r.qs.length || r.qs.length > 50) return null;
  const qs = r.qs.map(QZ.restore); if (qs.some(q => !q)) return null;
  const i = Math.max(0, Math.min(Number(r.i) || 0, qs.length));
  return { active: true, kind: r.kind, mode: r.mode === 'challenge' ? 'challenge' : 'practice', lv: [1, 2, 3].includes(r.lv) ? r.lv : 2, scope: QZ.SCOPES.some(s => s.key === r.scope) ? r.scope : 'all', i, score: Number(r.score) || 0, lives: Number.isFinite(Number(r.lives)) ? Number(r.lives) : 3, done: Number(r.done) || 0, qs, answered: false, wrong: (Array.isArray(r.wrong) ? r.wrong : []).map(QZ.restore).filter(Boolean) };
}
function loadRun() {
  const r = store.get('quizrun', null);
  if (r && r.v !== 2) { store.del('quizrun'); return null; }           // 옛 방식으로 저장된 풀이는 이어 풀 수 없다
  return runFrom(r);
}
function resumeQuiz() {
  const run = loadRun();
  if (!run) { store.del('quizrun'); toast('풀던 퀴즈를 찾지 못했어요'); renderHome(); return; }
  quizState = run; ensureQuizView(); renderQuiz(); window.scrollTo(0, 0);
}
// 이미 퀴즈 화면이면 기록(뒤로 가기 목록)을 또 쌓지 않는다
function ensureQuizView() { if (!$('#view-quiz').classList.contains('active')) go('quiz'); }
function questionsFor(kind) {
  const lv = levelNow();
  if (kind === 'sign') return QZ.makeSignQuiz(lv);
  if (kind === 'braille') return QZ.makeBrailleQuiz('read', scopeNow(), lv);
  if (kind === 'build') return QZ.makeBrailleQuiz('write', scopeNow(), lv);
  if (kind === 'fav') return QZ.makeFavQuiz(favWords().map(w => QZ.wordById(w.id)).filter(Boolean), lv);
  if (kind === 'review') return shuffle(getWrong().map(QZ.restore).filter(Boolean)).slice(0, QZ.SIZE);
  return [];
}
function startQuizWith(kind, qs, mode) {
  quizState = { active: true, kind, mode: mode || modeNow(), lv: levelNow(), scope: scopeNow(), i: 0, score: 0, lives: 3, done: 0, qs, answered: false, wrong: [] };
  saveRun(); renderQuiz(); window.scrollTo(0, 0);
}
// 풀던 퀴즈가 남아 있는데 다른 퀴즈를 새로 시작하려 하면, 풀던 진행이 사라진다는 것을 먼저 알리고 고르게 한다(알렸으면 true)
const eulReul = name => { const c = name.charCodeAt(name.length - 1) - 0xAC00; return c >= 0 && c % 28 !== 0 ? '을' : '를'; };
function askSwitch(kind) {
  const run = loadRun(); if (!run) return false;
  quizState = { active: false }; ensureQuizView(); renderQuizHub();
  const box = $('#qSwitch'); box.dataset.kind = kind;
  $('#qSwitchText').textContent = `풀던 「${QKINDS[run.kind]}」(${Math.min(run.i + 1, run.qs.length)} / ${run.qs.length}번째)가 있어요. 「${QKINDS[kind]}」${eulReul(QKINDS[kind])} 새로 시작하면 풀던 진행은 사라져요.`;
  box.hidden = false; box.scrollIntoView({ block: 'nearest' }); $('#qSwitchNew').focus({ preventScroll: true });
  return true;
}
function startQuiz(kind, force) {
  const qs = questionsFor(kind);
  if (!qs.length) { toast(kind === 'fav' ? '단어장에 퀴즈로 낼 수 있는 단어가 아직 없어요' : '풀 문제가 아직 없어요'); return false; }
  if (!force && askSwitch(kind)) return false;
  startQuizWith(kind, qs); return true;
}
function startQuizFromAnywhere(kind, force) {
  const qs = questionsFor(kind);
  if (!qs.length) { toast(kind === 'fav' ? '내 단어장에 단어를 먼저 담아 주세요(영상이 겹치는 단어는 퀴즈에서 빠져요)' : '틀린 문제가 아직 없어요'); return; }
  if (!force && askSwitch(kind)) return;
  quizState = { active: false }; ensureQuizView(); startQuizWith(kind, qs);
}
// ---- 퀴즈 홈 ----
function modeNoteText(m) {
  return m === 'challenge' ? '도전: 힌트 없이 10문제, 목숨 3개예요. 목숨이 모두 없어지면 끝나요.' : '연습: 목숨이 없고 힌트를 쓸 수 있어요. 틀려도 설명을 보며 천천히 익혀요.';
}
const SCOPE_NOTE = { all: '모든 범위에서 골고루 나와요.', cho: '첫소리 13개를 연습해요. (한글 점자 ①)', vb: '기본 모음·받침과 쉬운 낱말을 연습해요. (②③)', num: '숫자와 문장부호를 연습해요. (④)', two: '된소리·겹모음·겹받침과 낱말을 연습해요. (⑤)', abbr: '약자·약어와 줄여 쓰는 낱말을 연습해요. (⑥)' };
function renderQuizHub() {
  quizState = { active: false };
  const run = loadRun(), mode = modeNow(), lv = levelNow(), scope = scopeNow();
  const wrongN = getWrong().filter(c => QZ.valid(c)).length, favN = favWords().filter(w => QZ.favOk(QZ.wordById(w.id))).length;
  const resume = run ? `<div class="resumebar"><div class="rt">풀던 퀴즈가 있어요<small>${esc(QKINDS[run.kind])} · ${Math.min(run.i + 1, run.qs.length)} / ${run.qs.length}번째 · ${run.mode === 'challenge' ? '도전' : '연습'} · ${lvText(run)}</small></div><button class="btn primary small" type="button" id="qResume">이어서 풀기</button><button class="btn line small" type="button" id="qDiscard">그만두기</button></div>` : '';
  $('#quizArea').innerHTML = `<div class="quizhub">${resume}
    <div class="qconfirm qswitch" id="qSwitch" role="alert" hidden><span id="qSwitchText"></span><span class="qsbtns"><button class="btn primary small" type="button" id="qSwitchNew">새로 시작</button><button class="btn line small" type="button" id="qSwitchResume">풀던 퀴즈 이어서 풀기</button><button class="btn ghost small" type="button" id="qSwitchNo">취소</button></span></div>
    <div class="card"><div class="section-h"><h2>방식과 난이도</h2></div>
      <p class="lbl2">방식</p>
      <div class="seg" role="group" aria-label="퀴즈 방식">
        <button type="button" data-qmode="practice" aria-pressed="${mode === 'practice'}">연습</button>
        <button type="button" data-qmode="challenge" aria-pressed="${mode === 'challenge'}">도전</button>
      </div>
      <p class="note" id="qmodeNote" style="margin-top:8px">${modeNoteText(mode)}</p>
      <p class="lbl2">난이도</p>
      <div class="seg" role="group" aria-label="퀴즈 난이도">
        ${[1, 2, 3].map(n => `<button type="button" data-qlevel="${n}" aria-pressed="${lv === n}">${LEVEL_NAME[n]}</button>`).join('')}
      </div>
      <p class="note" id="qlevelNote" style="margin-top:8px">${esc(QZ.LEVEL_NOTES[lv])}</p></div>
    <div class="qcards c1">
      <button class="qcard" type="button" data-quiz="sign"><span class="qci">${icon('hand', 24)}</span><span class="qct">수어 퀴즈</span><span class="qcs">영상을 보고 뜻을 맞히고, 뜻을 보고 알맞은 영상을 골라요. (수어 ${QZ.eligible.length.toLocaleString('ko-KR')}개에서 10문제)</span><span class="qcg" aria-hidden="true">›</span></button>
    </div>
    <div class="card"><div class="section-h"><h2>점자 범위</h2></div>
      <div class="chiprow wrap" role="group" aria-label="점자 범위" style="margin-top:10px">${QZ.SCOPES.map(s => `<button type="button" class="chip${s.key === scope ? ' active' : ''}" data-qscope="${s.key}" aria-pressed="${s.key === scope}">${esc(s.label)}</button>`).join('')}</div>
      <p class="note" id="qscopeNote" style="margin-top:10px">${esc(SCOPE_NOTE[scope])}</p></div>
    <div class="qcards c2">
      <button class="qcard braille" type="button" data-quiz="braille"><span class="qci">${icon('braille', 24)}</span><span class="qct">점자 읽기</span><span class="qcs">점 모양을 보고 글자·숫자·낱말을 맞혀요.</span><span class="qcg" aria-hidden="true">›</span></button>
      <button class="qcard braille" type="button" data-quiz="build"><span class="qci">${icon('pencil', 24)}</span><span class="qct">점자 쓰기</span><span class="qcs">글자·숫자·낱말을 보고 점을 직접 눌러 써 봐요.</span><span class="qcg" aria-hidden="true">›</span></button>
    </div>
    <div class="reviewrow">
      <button class="revchip" type="button" data-quiz="review"><span class="rn">${wrongN}</span><span class="rl">틀린 문제 복습<span class="rs">${wrongN ? '틀린 문제를 다시 풀어요' : '틀린 문제가 여기에 모여요'}</span></span></button>
      <button class="revchip" type="button" data-quiz="fav"><span class="rn">${favN}</span><span class="rl">내 단어장 퀴즈<span class="rs">${favN ? '담아 둔 수어로 연습해요' : '수어 사전에서 단어를 담아요'}</span></span></button>
    </div></div>`;
}
$('#quizArea').addEventListener('click', e => {
  const t = e.target;
  const q = t.closest('[data-quiz]');
  if (q && !quizState.active) { const k = q.dataset.quiz; if (k === 'review' || k === 'fav') startQuizFromAnywhere(k); else startQuiz(k); return; }
  const m = t.closest('[data-qmode]');
  if (m) { store.set('qmode', m.dataset.qmode); $$('[data-qmode]').forEach(b => b.setAttribute('aria-pressed', String(b === m))); $('#qmodeNote').textContent = modeNoteText(m.dataset.qmode); return; }
  const lb = t.closest('[data-qlevel]');
  if (lb) { const n = Number(lb.dataset.qlevel); store.set('qlevel', n); $$('[data-qlevel]').forEach(b => b.setAttribute('aria-pressed', String(b === lb))); $('#qlevelNote').textContent = QZ.LEVEL_NOTES[n]; return; }
  const sb = t.closest('[data-qscope]');
  if (sb) { store.set('qscope', sb.dataset.qscope); $$('[data-qscope]').forEach(b => { const on = b === sb; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); }); $('#qscopeNote').textContent = SCOPE_NOTE[sb.dataset.qscope]; return; }
  if (t.closest('#qResume')) { resumeQuiz(); return; }
  if (t.closest('#qDiscard')) { store.del('quizrun'); renderQuizHub(); return; }
  if (t.closest('#qSwitchNew')) { const k = $('#qSwitch').dataset.kind; store.del('quizrun'); if (k === 'review' || k === 'fav') startQuizFromAnywhere(k, true); else startQuiz(k, true); return; }
  if (t.closest('#qSwitchResume')) { resumeQuiz(); return; }
  if (t.closest('#qSwitchNo')) { $('#qSwitch').hidden = true; return; }
});
// ---- 문제 화면 ----
function livesHtml(lives) { return Array.from({ length: 3 }, (_, i) => `<span class="life${i < lives ? ' on' : ''}">${icon('star', 16)}</span>`).join(''); }
function quizOptHtml(o, i) { return `<button class="qopt" type="button" data-opt="${esc(o)}"><span class="num" aria-hidden="true">${i + 1}</span><span>${esc(o)}</span></button>`; }
function clipHtml(c, i) { return `<button type="button" class="vopt" data-opt="${esc(c.id)}" aria-label="영상 ${i + 1}번"><video src="${esc(kslUrl(c.src))}" autoplay loop muted playsinline preload="auto" tabindex="-1" aria-hidden="true"></video><span class="vn" aria-hidden="true">${i + 1}</span></button>`; }
function quizClueHtml(q) {
  if (q.clueType === 'dots') return `<div class="qclue qclue-dots">${esc(q.prompt)}<div class="quizdots" role="img" aria-label="${esc(cellsDescription(q.clue))}">${clueCellsHtml(q.clue)}</div></div>`;
  if (q.clueType === 'build') return `<div class="qclue">다음을 점자로 써 보세요.<div style="font-size:1.75rem;font-weight:900;margin:10px 0 2px">「${esc(q.answer)}」</div><div style="font-size:.8125rem;opacity:.85">${esc(q.group)} · ${q.clue.length}칸</div></div>`;
  if (q.clueType === 'pickvideo') return `<div class="qclue">다음 뜻의 수어는 어느 영상일까요?<div style="font-size:1.75rem;font-weight:900;margin:10px 0 2px">「${esc(q.answer)}」</div>${q.gloss ? `<div style="font-size:.8125rem;opacity:.85">${esc(q.gloss)}</div>` : ''}</div>`;
  return `<div class="qclue">이 수어 영상이 뜻하는 단어는 무엇일까요?<video class="kslvideo qvideo" id="quizClueVideo" src="${esc(kslUrl(q.clue))}" autoplay loop muted playsinline controls preload="auto" aria-label="수어 영상 문제"></video></div>`;
}
function buildCellsHtml(q) {
  return `<div class="buildcells" id="buildCells">${q.clue.map((c, ci) => `<div class="bcell" data-cell="${ci}"><div class="bgrid" role="group" aria-label="${q.clue.length > 1 ? ORD[ci] + ' 칸' : '점자 한 칸'}">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="dot" data-bdot="${n}" aria-pressed="false" aria-label="${q.clue.length > 1 ? ORD[ci] + ' 칸 ' : ''}${n}번 점">${n}</button>`).join('')}</div>${q.clue.length > 1 ? `<span class="bl">${ORD[ci]} 칸</span>` : ''}</div>`).join('')}</div>`;
}
function renderQuiz() {
  const s = quizState; if (!s.active) return;
  const total = s.qs.length, chal = s.mode === 'challenge';
  if (s.i >= total || (chal && s.lives <= 0)) return renderQuizResult();
  const q = s.qs[s.i], build = q.clueType === 'build', pick = q.clueType === 'pickvideo';
  s.answered = false;
  saveRun();
  const hints = chal ? '' : `${build ? '' : '<button class="btn ghost small" type="button" id="hintCut">보기 하나 지우기</button>'}<button class="btn ghost small" type="button" id="hintText">힌트 보기</button>`;
  const opts = build ? `<div style="margin-top:16px">${buildCellsHtml(q)}</div><button class="btn primary block" type="button" id="buildCheck" style="margin-top:16px">확인하기</button>`
    : pick ? `<div class="vgrid" id="quizOpts" role="group" aria-label="영상 4개 중에서 고르세요" style="margin-top:16px">${q.clips.map(clipHtml).join('')}</div>`
      : `<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px" id="quizOpts">${q._opts.map(quizOptHtml).join('')}</div>`;
  $('#quizArea').innerHTML = `
    <div class="quizhead">
      <div><span class="qbadge${chal ? ' chal' : ''}">${chal ? '도전' : '연습'}</span> <span class="qbadge lv">${lvText(s)}</span> <span id="quizQ" tabindex="-1" style="font-weight:800;margin-left:6px">${esc(QKINDS[s.kind])} · ${s.i + 1} / ${total}</span></div>
      ${chal ? `<span class="lives" role="img" aria-label="남은 목숨 ${s.lives}개">${livesHtml(s.lives)}</span>` : ''}
    </div>
    <div class="progress" style="margin:10px 0 12px"><b style="width:${s.done / total * 100}%"></b></div>
    <div class="qtools">${hints}<span class="sp"></span><button class="btn line small" type="button" id="quizPause">잠시 나가기</button><button class="btn line small" type="button" id="quizEnd">끝내기</button></div>
    <div class="qconfirm" id="quizEndConfirm" hidden style="margin-top:10px"><span>지금까지 푼 ${s.done}문제의 결과를 보고 끝낼까요?</span><button class="btn danger small" type="button" id="quizEndYes">끝내기</button><button class="btn ghost small" type="button" id="quizEndNo">계속 풀기</button></div>
    <div id="quizHint" class="note" hidden aria-live="polite" style="margin-top:10px"></div>
    <div style="margin-top:14px">${quizClueHtml(q)}</div>
    ${opts}
    <div id="quizFeedback" tabindex="-1" style="margin-top:14px" aria-live="polite"></div>`;
  // 첫 문제도 포함해 늘 문제 제목으로 포커스를 옮긴다(키보드·화면낭독기 사용자가 시작하자마자 위치를 잃지 않게)
  const qq = $('#quizQ'); if (qq) qq.focus({ preventScroll: true });
}
$('#quizArea').addEventListener('click', e => {
  const s = quizState; if (!s.active) return;
  const t = e.target, q = s.qs[s.i];
  const opt = t.closest('[data-opt]'); if (opt && !opt.disabled) { answerChoice(opt, q); return; }
  const bd = t.closest('[data-bdot]');
  if (bd && !s.answered) { const on = !bd.classList.contains('on'); bd.classList.toggle('on', on); bd.setAttribute('aria-pressed', String(on)); return; }
  if (t.closest('#buildCheck')) { if (!s.answered) answerBuild(q); return; }
  if (t.closest('#hintCut')) { cutOption(q); return; }
  if (t.closest('#hintText')) { showHint(q); return; }
  if (t.closest('#quizPause')) { const ok = saveRun(true); renderQuizHub(); toast(ok ? '저장했어요. 퀴즈 화면에서 이어서 풀 수 있어요' : '풀던 퀴즈를 저장하지 못해서 나중에 이어서 풀 수 없어요. ' + STORE_FAIL_WHY); return; }
  if (t.closest('#quizEnd')) { $('#quizEndConfirm').hidden = false; $('#quizEndNo').focus(); return; }
  if (t.closest('#quizEndNo')) { $('#quizEndConfirm').hidden = true; return; }
  if (t.closest('#quizEndYes')) { s.ended = true; renderQuizResult(); return; }
  if (t.closest('#quizNext')) { s.i++; renderQuiz(); window.scrollTo(0, 0); return; }
  if (t.closest('#quizPad')) { const two = q.clue.length === 2; setPadTwo(two); padDots = new Set(q.clue[0]); padDots2 = new Set(two ? q.clue[1] : []); syncPadCell(); renderPadResult(); store.set('track', 'braille'); go('braille'); showBraillePanel('pad'); return; }
  if (t.closest('#quizRelearn')) { const w = WORD_BY_ID.get(String(q.id)); if (w) openWordInDictionary(w); return; }
  if (t.closest('#quizReplay')) { const v = $('#quizClueVideo'); if (v) { v.currentTime = 0; v.play(); } return; }
});
// ---- 힌트(연습 방식에서만) ----
const isRightOpt = (q, v) => (q.clueType === 'pickvideo' ? String(v) === String(q.id) : v === q.answer);
function cutOption(q) {
  const left = $$('[data-opt]', $('#quizOpts')).filter(b => !b.disabled);
  if (left.length <= 2) { $('#hintCut').disabled = true; return; }
  const wrong = left.filter(b => !isRightOpt(q, b.dataset.opt));
  const b = wrong[Math.floor(Math.random() * wrong.length)];
  b.disabled = true; b.classList.add('gone'); b.setAttribute('aria-label', (b.classList.contains('vopt') ? b.getAttribute('aria-label') : b.dataset.opt) + ' (지운 보기)');
  const v = b.querySelector('video'); if (v) v.pause();
  if (left.length - 1 <= 2) $('#hintCut').disabled = true;
}
function hintTextFor(q) {
  if (q.clueType === 'pickvideo') {
    const w = WORD_BY_ID.get(String(q.id)), inf = w && typeof KSL_INFO !== 'undefined' && String(w.id).charAt(0) === 'N' ? KSL_INFO[String(w.id).slice(1)] : null;
    if (inf) { const pos = KSL_POS_NAME[inf[2]] || ''; return `정답 영상은 ${inf[0] === 1 ? '한 손' : '두 손'}으로 하는 수어예요${pos ? ', 손 위치는 ' + pos + ' 쪽이에요' : ''}.`; }
    return `정답은 ${q.answer.replace(/\s+/g, '').length}글자 낱말이에요.`;
  }
  if (q.clueType === 'dots') {
    if (q.bk === 'n') return `첫 칸은 수표(3·4·5·6번 점)예요. 숫자는 모두 ${q.answer.length}개예요.`;
    if (q.bk === 'w' || q.bk === 'c') return `${q.answer.length}글자 낱말이에요. 모두 ${q.clue.length}칸이에요.`;
    const n = q.clue[0].length; return q.clue.length > 1 ? `첫 칸에는 점이 ${n}개 있고, 모두 ${q.clue.length}칸이에요.` : `점이 ${n}개 있는 칸이에요.`;
  }
  if (q.clueType === 'build') {
    if (q.bk === 'n') return `수표(3·4·5·6번 점)로 시작하고, 그다음 숫자 ${q.answer.length}개를 이어 써요.`;
    if (q.bk === 'w' || q.bk === 'c') return `${q.answer.length}글자 낱말이고, 모두 ${q.clue.length}칸이에요.`;
    return '점 개수: ' + q.clue.map((c, i) => `${q.clue.length > 1 ? ORD[i] + ' 칸 ' : ''}${c.length}개`).join(', ') + '예요.';
  }
  const cho = choOf(q.answer).replace(/\s+/g, '').charAt(0);
  return `정답은 ${q.answer.replace(/\s+/g, '').length}글자예요. 첫 글자는 ${/[ㄱ-ㅎ]/.test(cho) ? '자음 「' + cho + '」으로 시작해요.' : '「' + cho + '」이에요.'}`;
}
function showHint(q) { const h = $('#quizHint'); h.hidden = false; h.textContent = '힌트: ' + hintTextFor(q); }
// ---- 답하기 ----
function recordAnswer(q, correct) {
  const s = quizState;
  s.done++; s.answered = true;
  if (correct) { s.score++; dropWrong(q); } else { if (s.mode === 'challenge') s.lives--; s.wrong.push(q); addWrong(q); }
  saveRun();
}
function feedbackMsgHtml(correct, q) {
  if (correct) return '정답이에요! 잘하셨어요.';
  if (q.clueType === 'build') return `아쉬워요. 「${esc(q.answer)}」의 점 모양은 아래 설명을 확인해 보세요.`;
  if (q.clueType === 'pickvideo') return `아쉬워요. 「${esc(q.answer)}」 수어는 「정답」이라고 표시된 영상이에요.`;
  return `아쉬워요. 정답은 「${esc(q.answer)}」예요.`;
}
function showFeedback(q, correct, explainHtml) {
  const s = quizState;
  const last = s.i + 1 >= s.qs.length || (s.mode === 'challenge' && s.lives <= 0);
  const lifeNote = s.mode === 'challenge' && !correct ? `<p class="qx" style="margin-top:8px">남은 목숨 ${Math.max(s.lives, 0)}개</p>` : '';
  const f = $('#quizFeedback');
  f.innerHTML = `<div class="qfeedback ${correct ? 'ok' : 'bad'}">${feedbackMsgHtml(correct, q)}</div>${lifeNote}${explainHtml}<button class="btn primary block" id="quizNext" type="button" style="margin-top:12px">${last ? '결과 보기' : '다음 문제로'} →</button>`;
  const h = $('#hintCut'); if (h) h.disabled = true; const h2 = $('#hintText'); if (h2) h2.disabled = true;
  if (s.mode === 'challenge' && !correct) { const lv = $('.lives'); if (lv) { lv.innerHTML = livesHtml(s.lives); lv.setAttribute('aria-label', '남은 목숨 ' + s.lives + '개'); } }
  f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
// 영상 고르기 문제는 답한 뒤 각 영상이 어느 단어인지 이름표를 붙이고, 정답·내 선택을 글자로도 알려 준다(색만으로 알리지 않는다)
function revealClips(q, chosenBtn) {
  $$('.vopt', $('#quizOpts')).forEach((b, i) => {
    const c = q.clips[i], right = String(c.id) === String(q.id), mine = b === chosenBtn && !right;
    b.insertAdjacentHTML('beforeend', `<span class="vname">${esc(c.name)}</span>${right ? '<span class="vtag">정답</span>' : mine ? '<span class="vtag bad">내 선택</span>' : ''}`);
    b.setAttribute('aria-label', `영상 ${i + 1}번: ${c.name}${right ? ' (정답)' : mine ? ' (내 선택)' : ''}`);
  });
}
function answerChoice(btn, q) {
  if (quizState.answered) return;
  const chosen = btn.dataset.opt, correct = isRightOpt(q, chosen);
  $$('[data-opt]', $('#quizOpts')).forEach(b => { b.disabled = true; if (isRightOpt(q, b.dataset.opt)) b.classList.add('correct'); else if (b === btn) b.classList.add('wrong'); });
  if (q.clueType === 'pickvideo') revealClips(q, btn);
  recordAnswer(q, correct);
  showFeedback(q, correct, q.clueType === 'dots' ? brailleExplainHtml(q, chosen, correct) : signExplainHtml(q));
}
function answerBuild(q) {
  const entered = $$('.bcell', $('#buildCells')).map(c => $$('.dot.on', c).map(b => Number(b.dataset.bdot)).sort((a, b) => a - b));
  const correct = entered.length === q.clue.length && entered.every((c, i) => c.join() === q.clue[i].slice().sort((a, b) => a - b).join());
  $$('.dot', $('#buildCells')).forEach(b => { b.disabled = true; });
  $('#buildCheck').hidden = true;
  recordAnswer(q, correct);
  showFeedback(q, correct, buildExplainHtml(q, entered, correct));
}
// ---- 정답 해설 ----
// 한 칸 글자는 자리에 따라 여러 가지로 읽히므로(예: ㄴ 첫소리 = 나 약자 = 수표 뒤 숫자 3), 그 목록을 해설에 덧붙인다
function readingsNote(q) {
  if (q.bk !== 'p' || q.clue.length !== 1) return '';
  const rs = READINGS[q.clue[0].join('-')] || [];
  return rs.length > 1 ? `<p class="qx">같은 점 모양이 글자 안의 자리에 따라 이렇게도 읽혀요: ${esc(rs.map(r => r.label + '(' + r.kind + ')').join(', '))}.</p>` : '';
}
function brailleExplainHtml(q, chosen, correct) {
  let html = `<p class="qx">정답 「${esc(q.answer)}」: ${esc(cellsDescription(q.clue))}.</p>`;
  let cmp = `<div><span class="qcl">정답 ${esc(q.answer)}</span>${clueCellsHtml(q.clue)}</div>`;
  if (!correct) {
    const got = q.optCells && q.optCells[chosen];
    if (got) {
      html += `<p class="qx">고른 「${esc(chosen)}」: ${esc(cellsDescription(got))}.</p>`;
      const d = dotsDiffText(q.clue, got);
      if (d) html += `<p class="qx">차이: ${esc(d)}.</p>`;
      cmp += `<div><span class="qcl">내가 고른 ${esc(chosen)}</span>${clueCellsHtml(got)}</div>`;
    }
  }
  return `<div class="qexplain">${html}${readingsNote(q)}<div class="qcompare" aria-hidden="true">${cmp}</div><div class="qexbtns"><button class="btn ghost" id="quizPad" type="button">연습 패드에서 눌러 보기</button></div></div>`;
}
function buildExplainHtml(q, entered, correct) {
  let html = `<p class="qx">정답 「${esc(q.answer)}」: ${esc(cellsDescription(q.clue))}.</p>`;
  let cmp = `<div><span class="qcl">정답</span>${clueCellsHtml(q.clue)}</div>`;
  if (!correct) {
    html += `<p class="qx">내가 쓴 것: ${esc(cellsDescription(entered))}.</p>`;
    const d = dotsDiffText(q.clue, entered, '내가 쓴 것'); if (d) html += `<p class="qx">차이: ${esc(d)}.</p>`;
    cmp += `<div><span class="qcl">내가 쓴 것</span>${clueCellsHtml(entered)}</div>`;
  }
  return `<div class="qexplain">${html}${readingsNote(q)}<div class="qcompare" aria-hidden="true">${cmp}</div><div class="qexbtns"><button class="btn ghost" id="quizPad" type="button">연습 패드에서 눌러 보기</button></div></div>`;
}
function signMeaning(w) {
  if (w.x && w.g) { const s = w.g.split(' / ').slice(0, 2).join(' · '); return s.length > 70 ? s.slice(0, 70) + '…' : s; }
  return w.al ? '같은 수어: ' + w.al : '';
}
function signExplainHtml(q) {
  const w = WORD_BY_ID.get(String(q.id)); if (!w) return '';
  let meaning = signMeaning(w); if (meaning === w.w) meaning = '';
  const motion = descOf(w);
  let html = `<p class="qx"><b>${esc(w.w)}</b>${meaning ? ' — ' + esc(meaning) : ''}</p>`;
  if (q.clueType === 'pickvideo') html += `<p class="qx">보기 영상: ${q.clips.map((c, i) => `${i + 1}번 ${esc(c.name)}`).join(' · ')}</p>`;
  if (motion) html += `<p class="qx">동작 설명: ${esc(motion)}</p>${officialNoteHtml(w)}`;
  const btns = (q.clueType === 'video' ? '<button class="btn ghost" id="quizReplay" type="button">영상 다시 재생</button>' : '') + '<button class="btn ghost" id="quizRelearn" type="button">사전에서 다시 보기</button>';
  return `<div class="qexplain">${html}<div class="qexbtns">${btns}</div></div>`;
}
// ---- 결과 ----
function renderQuizResult() {
  const s = quizState; quizState.active = false; store.del('quizrun');
  if (s.done > 0) { if (s.kind === 'sign' || s.kind === 'fav') markDid('quiz-sign'); else if (s.kind === 'braille' || s.kind === 'build') markDid('quiz-braille'); }
  const total = s.qs.length, pct = s.done ? Math.round(s.score / s.done * 100) : 0, wrongN = s.wrong.length;
  const why = s.ended ? `중간에 끝냈어요 (${total}문제 중 ${s.done}문제 풀이)` : (s.mode === 'challenge' && s.lives <= 0 ? `목숨을 모두 썼어요 (${total}문제 중 ${s.done}문제 풀이)` : '');
  const msg = !s.done ? '푼 문제가 없어요. 다시 시작해 볼까요?' : pct >= 80 ? '정말 잘했어요! 다음에도 도전해 보세요.' : pct >= 50 ? '좋아요! 조금만 더 연습하면 돼요.' : '틀린 문제를 다시 풀면서 익혀 보세요.';
  const wrongList = wrongN ? `<p class="note" style="margin:10px 0;text-align:left">틀린 문제: ${s.wrong.map(q => esc(q.answer)).join(' · ')}<br>틀린 문제는 퀴즈 첫 화면의 「틀린 문제 복습」에 저장돼요.</p>` : '';
  const study = s.kind === 'braille' || s.kind === 'build' ? ['braille', '점자 표 보기'] : ['sign', '수어 사전 보기'];
  const scopeTxt = (s.kind === 'braille' || s.kind === 'build') ? ' · ' + scopeLabel(s.scope) : '';
  // 점수에 맞춰 난이도를 바꿔 볼 것을 권한다(끝까지 푼 퀴즈만)
  const full = s.done === total && s.done > 0;
  const canTune = full && s.kind !== 'review';
  const up = canTune && pct >= 90 && s.lv < 3, down = canTune && pct < 50 && s.lv > 1;
  const lvBtn = up ? `<button class="btn line block" id="quizLvUp" type="button">난이도를 ${toLevel(s.lv + 1)} 올려서 풀기</button>` : down ? `<button class="btn line block" id="quizLvDown" type="button">난이도를 ${toLevel(s.lv - 1)} 낮춰서 풀기</button>` : '';
  $('#quizArea').innerHTML = `<div class="card qresult">
    <div class="qbadge${s.mode === 'challenge' ? ' chal' : ''}">${esc(QKINDS[s.kind])} · ${s.mode === 'challenge' ? '도전' : '연습'} · ${lvText(s)}${esc(scopeTxt)}</div>
    <div class="score" role="status" tabindex="-1">${s.score} / ${s.done}</div>
    <p class="note" style="margin:14px 0">${esc(why ? why + '. ' : '')}${esc(msg)}</p>${wrongList}
    <div style="display:flex;flex-direction:column;gap:10px">
      ${wrongN ? `<button class="btn primary block" id="quizRetryWrong" type="button">틀린 문제 ${wrongN}개 다시 풀기</button>` : ''}
      ${lvBtn}
      <button class="btn ${wrongN ? 'ghost' : 'primary'} block" id="quizRetry" type="button">같은 퀴즈 새로 풀기</button>
      <button class="btn ghost block" id="quizToStudy" type="button">${study[1]}</button>
      <button class="btn line block" id="quizToHub" type="button">퀴즈 첫 화면으로</button>
    </div></div>`;
  const again = () => { if (s.kind === 'review' || s.kind === 'fav') startQuizFromAnywhere(s.kind); else startQuiz(s.kind); };
  $('#quizRetry').addEventListener('click', again);
  $('#quizToStudy').addEventListener('click', () => { if (study[0] === 'braille') { go('braille'); showBraillePanel('table'); } else go('sign'); });
  $('#quizToHub').addEventListener('click', renderQuizHub);
  const lu = $('#quizLvUp'), ld = $('#quizLvDown');
  if (lu) lu.addEventListener('click', () => { store.set('qlevel', s.lv + 1); toast('난이도를 ' + toLevel(s.lv + 1) + ' 바꿨어요'); again(); });
  if (ld) ld.addEventListener('click', () => { store.set('qlevel', s.lv - 1); toast('난이도를 ' + toLevel(s.lv - 1) + ' 바꿨어요'); again(); });
  const rw = $('#quizRetryWrong'); if (rw) rw.addEventListener('click', () => startQuizWith(s.kind, s.wrong.map(q => QZ.restore(QZ.compact(q, true))).filter(Boolean), s.mode));
  const sc = $('.score', $('#quizArea')); if (sc) sc.focus({ preventScroll: true });
}

// ================= 영상 플레이어 =================
let transcriptCues = [];
function parseVtt(text) {
  const blocks = text.replace(/\r/g, '').split(/\n\n+/).filter(b => /-->/.test(b));
  return blocks.map(b => {
    const lines = b.split('\n'); const timeLine = lines.find(l => l.includes('-->'));
    const [a, c] = timeLine.split('-->').map(s => s.trim());
    const toSec = t => { const p = t.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    return { start: toSec(a), end: toSec(c), text: lines.slice(lines.indexOf(timeLine) + 1).join(' ') };
  });
}
// 영상을 끝까지(또는 85% 이상) 봤을 때만 '시청 완료'로 기록한다. 열어 보기만 한 것은 완료가 아니다.
function markWatched(id) { if (!store.get('watched:' + id, false)) store.set('watched:' + id, true); }
let playerReq = 0;   // 영상을 바꾸거나 플레이어를 떠날 때마다 1씩 늘린다(늦게 도착한 대본을 알아보는 번호)
function setPlayerSrc(id) {
  playerReq++;
  $$('.vfail', $('#view-player')).forEach(n => n.remove());   // 앞 영상에서 남은 「불러오지 못했어요」 안내는 지운다
  const old = $('#playerVideo');
  const f = document.createElement('video');
  f.id = 'playerVideo'; f.controls = true; f.playsInline = true; f.preload = 'auto';
  if (id) {
    f.poster = `videos/${id}.jpg`;
    f.src = `videos/${id}.mp4`;
    const t = document.createElement('track');
    t.kind = 'captions'; t.srclang = 'ko'; t.label = '한국어'; t.src = `videos/${id}.vtt`; t.default = true;
    f.appendChild(t);
    f.addEventListener('ended', () => markWatched(id));
    f.addEventListener('timeupdate', () => { if (f.duration && f.currentTime / f.duration >= 0.85) markWatched(id); });
  }
  old.replaceWith(f);
}
async function openPlayer(id) {
  const v = VIDEO_LIST.find(x => x.id === id); if (!v) return;
  store.set('track', v.track === '점자' ? 'braille' : 'sign'); roadTrack = v.track === '점자' ? 'braille' : 'sign';
  $('#playerTitle').textContent = v.title;
  $('#playerDesc').textContent = v.desc;
  $('#playerTags').innerHTML = `<span class="tag">${esc(v.track)}</span><span class="tag amber">${esc(v.level)}</span><span class="tag gray">${fmtTime(v.dur)}</span>`;
  setPlayerSrc(v.id); const req = playerReq;
  $('#playerTranscript').innerHTML = '<p class="note">자막을 불러오는 중…</p>';
  try {
    const r = await fetch(`videos/${v.id}.vtt`);
    const vttText = r.ok ? await r.text() : '';
    if (req !== playerReq) return;   // 기다리는 사이 다른 영상을 열었거나 화면을 떠났으면, 늦게 온 대본은 버린다
    // 없는 파일은 사이트가 첫 화면(HTML)을 대신 돌려줄 수 있어서, 자막 파일(WEBVTT)이 맞는지 내용으로 확인한다
    if (!/^﻿?WEBVTT/.test(vttText)) throw new Error('자막 파일이 아님');
    transcriptCues = parseVtt(vttText);
    renderTranscript();
  } catch (e) { if (req !== playerReq) return; $('#playerTranscript').innerHTML = '<p class="note">자막을 불러오지 못했어요.</p>'; transcriptCues = []; }
}
function renderTranscript() {
  $('#playerTranscript').innerHTML = transcriptCues.map(c => `<p class="tline">${esc(c.text)}</p>`).join('') || '<p class="note">자막이 없어요.</p>';
}

// ================= 영상을 불러오지 못했을 때(모든 화면 공통) =================
// 인터넷이 끊기거나 파일을 받지 못하면 검은 화면만 남지 않게, 그 자리에 까닭·다른 방법·「다시 불러오기」를 띄운다.
const VFAIL_EXTRA = [
  ['.player-wrap', ' 아래 대본(자막)으로 내용을 먼저 읽을 수 있어요.'],
  ['.signmedia', ' 그림이나 동작 설명이 있는 단어는 그것으로도 확인할 수 있어요.'],
  ['#quizArea', ' 계속 안 나오면 「끝내기」로 마치고 나중에 다시 풀어 주세요.']
];
document.addEventListener('error', e => {
  const v = e.target;
  if (!v || v.tagName !== 'VIDEO' || !v.getAttribute('src')) return;
  const host = v.closest('.player-wrap') || v.closest('.vgrid') || v, next = host.nextElementSibling;
  if (next && next.classList.contains('vfail')) return;
  const extra = (VFAIL_EXTRA.find(([sel]) => v.closest(sel)) || ['', ''])[1];
  host.insertAdjacentHTML('afterend', `<div class="note amber vfail" role="alert"><span>영상을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.${extra}</span><button type="button" class="btn line small" data-vretry>다시 불러오기</button></div>`);
}, true);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-vretry]'); if (!b) return;
  const note = b.closest('.vfail'), host = note && note.previousElementSibling; if (!host) return;
  note.remove();
  (host.matches('video') ? [host] : [...host.querySelectorAll('video')]).forEach(v => { if (v.error) { v.load(); if (v.autoplay) v.play().catch(() => {}); } });
});

// ================= 처음 화면 =================
renderPadCell(); renderPadResult();
showBraillePanel(store.get('bpanel', 'convert'));
renderBraillePanel();
renderSign();
const start = (location.hash || '#home').slice(1);
go(VIEWS.includes(start) ? start : 'home', { push: false });
})();
