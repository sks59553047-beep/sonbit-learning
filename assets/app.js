// 손빛 배움터 v3 — 메인 로직(순수 자바스크립트, 서버 없음).
// 데이터: ksl-data.js·ksl2-data.js(수어 단어) · ksl3/ksl5(손모양·공식 수형 설명) · braille.js(점자 표) · braille-core.js(점자 변환 엔진) · video-data.js(교육 영상)
(() => {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('sonbit:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sonbit:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
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
  store.set('fav', l); return i < 0;
}
function getWrong() { const w = store.get('wrong', []); return Array.isArray(w) ? w : []; }
function wrongKey(c) { return c.t + ':' + (c.i != null ? c.i : c.a); }
function addWrong(q) { const c = compactQ(q, true); const l = getWrong().filter(x => wrongKey(x) !== wrongKey(c)); l.unshift(c); store.set('wrong', l.slice(0, 100)); }
function dropWrong(q) { const k = wrongKey(compactQ(q, true)); const l = getWrong(); const n = l.filter(x => wrongKey(x) !== k); if (n.length !== l.length) store.set('wrong', n); }
function watchedIds() { return store.keys('watched:').filter(k => store.get(k, false)).map(k => k.slice(8)); }
function hasActivity() { return watchedIds().length > 0 || store.keys('did:').length > 0 || favList().length > 0 || getWrong().length > 0 || !!store.get('quizrun', null); }

// ---------------- 단어 하나의 "실제 영상" 블록 ----------------
function kslUrl(k) { return (/^https?:/.test(k) || k.startsWith('assets/')) ? k : 'https://ksldict.korean.go.kr' + k; }
function kslVideoBoxHtml(k, label, id) {
  const local = typeof MEDIA_VIDEO !== 'undefined' && MEDIA_VIDEO.has(id);
  const hasImg = typeof MEDIA_IMG !== 'undefined' && MEDIA_IMG.has(id);
  const isNuri = !/^https?:/.test(k);
  const src = local ? `assets/media/${id}.mp4` : kslUrl(k);
  const poster = local ? `assets/posters/${id}.jpg` : (isNuri ? kslUrl(k.replace(/\.mp4$/, '.jpg')) : `assets/posters/${id}.jpg`);
  const credit = (id.charAt(0) === 'N' || (k && !/^https?:/.test(k))) ? '국립국어원 한국수어누리사전' : '국립국어원 한국수어사전';
  const img = hasImg
    ? `<figure class="shapeimg"><img src="assets/media/${id}.jpg" alt="${esc(label)} ${id.charAt(0) === 'N' ? '수어 표기 그림(손모양·움직임)' : '수어 동작 그림'}" loading="lazy"></figure>`
    : `<figure class="shapeimg still"><img src="${esc(poster)}" alt="${esc(label)} 수어 장면" loading="lazy"></figure>`;
  return `<div class="signmedia">
      <div class="realvideo">
        <video class="kslvideo" controls loop muted playsinline preload="metadata" poster="${esc(poster)}" src="${esc(src)}" aria-label="${esc(label)} 수어 영상"></video>
      </div>${img}
    </div>
    <p class="note">${credit} 제공 영상·그림 (저작자표시-비영리-변경금지)</p>`;
}
function aliasHtml(w) { return w.al ? `<p class="alias">같은 수어: ${esc(w.al)}</p>` : ''; }

// ---------------- 영상 카드 공통 ----------------
function vcard(v) {
  const watched = store.get('watched:' + v.id, false);
  return `<button class="vcard" data-open-video="${esc(v.id)}" type="button" aria-label="${esc(v.title)} 영상 보기 (${esc(v.track)}·${esc(v.level)}, ${fmtTime(v.dur)})${watched ? ' 시청 완료' : ''}">
    <div class="thumb"><img src="videos/${esc(v.id)}.jpg" alt="" loading="lazy"><div class="play">${icon('play', 46)}</div><span class="dur">${fmtTime(v.dur)}</span></div>
    <div class="body">
      <div class="tags"><span class="tag">${esc(v.track)}</span><span class="tag amber">${esc(v.level)}</span></div>
      <h3>${esc(v.title)}</h3>
      ${watched ? `<div class="watched">${icon('check', 13)} 시청 완료</div>` : ''}
    </div>
  </button>`;
}
function bindVideoCards(root) {
  root.addEventListener('click', e => { const b = e.target.closest('[data-open-video]'); if (b) go('player', { arg: { id: b.dataset.openVideo } }); });
}
const sortedVideos = () => VIDEO_LIST.slice().sort((a, b) => (a.track === b.track ? 0 : a.track === '수어' ? -1 : 1) || a.order - b.order);

// ================= 학습(홈) =================
let roadTrack = store.get('track', 'sign') === 'braille' ? 'braille' : 'sign';
const TRACK_NAME = { sign: '수어', braille: '점자' };
function roadmapFor(track) {
  const has = id => VIDEO_LIST.some(v => v.id === id);
  let steps;
  if (track === 'sign') {
    steps = [
      { title: '수어의 시작', sub: '수어가 무엇인지 알아보는 입문 영상', video: 'v8-ksl-intro' },
      { title: '수어 단어 찾아보기', sub: '수어 ' + ALL_WORDS.length.toLocaleString('ko-KR') + '개 검색, 국립국어원 실제 영상으로 바로 확인', nav: 'sign', did: 'sign' },
      { title: '수어 퀴즈로 복습', sub: '틀린 문제는 영상과 설명으로 다시 확인', nav: 'quiz', did: 'quiz-sign' }
    ];
  } else {
    steps = [
      { title: '점자의 시작', sub: '6개의 점으로 읽는 세상', video: 'v1-braille-basics' },
      { title: '한글 점자 ①', sub: '초성 자음 14개', video: 'v2-braille-initials' },
      { title: '한글 점자 ②', sub: '모음·받침·낱말 쓰기', video: 'v3-braille-words' },
      { title: '한글 점자 ③', sub: '받침 마저 배우기', video: 'v6-braille-batchim2' },
      { title: '한글 점자 ④', sub: '숫자·문장부호 쓰기', video: 'v7-braille-numbers' },
      { title: '점자 연습 패드·변환기 써 보기', sub: '내 이름을 점자로 바꿔 보기', nav: 'braille', did: 'braille' },
      { title: '점자 퀴즈로 복습', sub: '읽기와 직접 쓰기로 확인하기', nav: 'quiz', did: 'quiz-braille' }
    ];
  }
  return steps.filter(s => !s.video || has(s.video)).map((s, i) => Object.assign({ label: (i + 1) + '단계' }, s));
}
function stepDone(s) { return s.video ? !!store.get('watched:' + s.video, false) : (s.did ? didFlag(s.did) : false); }
function stepAttrs(s) { return s.video ? `data-act="video" data-arg="${esc(s.video)}"` : `data-act="nav" data-arg="${esc(s.nav)}"`; }
function renderRoadmap(track) {
  const steps = roadmapFor(track);
  let nowSet = false, doneN = 0;
  $('#roadList').innerHTML = steps.map(s => {
    const done = stepDone(s); if (done) doneN++;
    const now = !done && !nowSet ? (nowSet = true) : false;
    const aria = `${s.label} ${s.title}. ${s.sub}.${done ? ' 완료.' : ''}${now ? ' 지금 할 단계.' : ''}`;
    return `<div class="rstep ${done ? 'done' : now ? 'now' : ''}">
      <div class="dot" aria-hidden="true">${done ? icon('check', 14) : ''}</div>
      <button type="button" class="rbox" ${stepAttrs(s)} aria-label="${esc(aria)}">
        <span><span class="tt">${esc(s.label)} · ${esc(s.title)}</span><span class="sub">${esc(s.sub)}</span></span>
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
function startersHtml() {
  const has = id => VIDEO_LIST.some(v => v.id === id);
  const a = has('v8-ksl-intro') ? 'data-act="video" data-arg="v8-ksl-intro"' : 'data-act="nav" data-arg="sign"';
  const b = has('v1-braille-basics') ? 'data-act="video" data-arg="v1-braille-basics"' : 'data-act="nav" data-arg="braille"';
  return `<div class="starters">
    <button class="starter sign" type="button" ${a}><span class="si">${icon('hand', 24)}</span><span class="stt">수어 처음 배우기</span><span class="ssub">수어가 무엇인지 알아보는 입문 영상부터 시작해요</span><span class="sgo" aria-hidden="true">›</span></button>
    <button class="starter braille" type="button" ${b}><span class="si">${icon('braille', 24)}</span><span class="stt">점자 처음 배우기</span><span class="ssub">6개의 점으로 읽는 세상, 점자 입문 영상부터 시작해요</span><span class="sgo" aria-hidden="true">›</span></button>
  </div>`;
}
function renderHomeNext() {
  const host = $('#homeNext');
  const run = loadRun();
  if (run) { host.innerHTML = nextcardHtml('이어서 하기', '풀던 퀴즈가 있어요', `${QKINDS[run.kind]} · ${Math.min(run.i + 1, run.qs.length)}번째 문제부터 (${run.mode === 'challenge' ? '도전' : '연습'})`, 'data-act="resume"', '이어서 풀기'); return; }
  if (!hasActivity()) { host.innerHTML = startersHtml(); return; }
  let tr = roadTrack, st = roadmapFor(tr).find(s => !stepDone(s));
  if (!st) { tr = tr === 'sign' ? 'braille' : 'sign'; st = roadmapFor(tr).find(s => !stepDone(s)); }
  if (st) host.innerHTML = nextcardHtml('이어서 배우기 · ' + TRACK_NAME[tr] + ' 트랙', st.label + ' · ' + st.title, st.sub, stepAttrs(st), '시작하기');
  else host.innerHTML = nextcardHtml('모든 단계를 마쳤어요', '배운 것을 퀴즈로 복습해 볼까요?', '틀린 문제와 내 단어장으로 한 번 더 익혀요', 'data-act="nav" data-arg="quiz"', '퀴즈 하러 가기');
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
  renderHomeNext(); renderHomeReview(); renderRoadmap(roadTrack);
  $('#homeVideoGrid').innerHTML = sortedVideos().map(vcard).join('');
  renderRecords();
}
bindVideoCards($('#homeVideoGrid'));
// 홈·수어 화면의 버튼 동작(data-act)
function dispatchAct(act, arg) {
  if (act === 'video') go('player', { arg: { id: arg } });
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
  return { fav: favList(), wrong: getWrong(), watched, did, track: roadTrack };
}
$('#recExport').addEventListener('click', () => {
  const day = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify({ app: 'sonbit', version: 1, exportedAt: new Date().toISOString(), data: collectRecord() }, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'sonbit-record-' + day + '.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setRecStatus('기록 파일(sonbit-record-' + day + '.json)을 내려받았어요. 다른 기기에서 「기록 가져오기」로 불러오세요.');
});
function validWrongEntry(c) {
  if (!c || typeof c !== 'object') return false;
  if (c.t === 'br' || c.t === 'bu') return typeof c.a === 'string' && !!(c.t === 'bu' ? QUIZ_POOL_BUILD : QUIZ_POOL_BRAILLE).find(x => x.answer === c.a);
  if (c.t === 'sv' || c.t === 'st') return WORD_BY_ID.has(String(c.i));
  return false;
}
// 가져오기: 이 기기의 기록은 그대로 두고, 파일에 있는 것을 더한다(합치기). 알 수 없는 값은 버린다.
function importRecord(text) {
  let obj; try { obj = JSON.parse(text); } catch (e) { return { ok: false, msg: '파일을 읽을 수 없어요. 손빛에서 내보낸 .json 파일이 맞는지 확인해 주세요.' }; }
  if (!obj || obj.app !== 'sonbit' || !obj.data || typeof obj.data !== 'object') return { ok: false, msg: '손빛 배움터에서 내보낸 기록 파일이 아니에요.' };
  const d = obj.data; let nFav = 0, nWrong = 0, nWatched = 0, nDid = 0;
  if (Array.isArray(d.fav)) {
    const cur = favList(), set = new Set(cur);
    d.fav.slice(0, 1000).forEach(id => { id = String(id); if (WORD_BY_ID.has(id) && !set.has(id)) { set.add(id); cur.push(id); nFav++; } });
    store.set('fav', cur);
  }
  if (Array.isArray(d.wrong)) {
    const cur = getWrong(), keys = new Set(cur.map(wrongKey));
    d.wrong.slice(0, 300).forEach(c => { if (validWrongEntry(c)) { const n = c.t === 'br' || c.t === 'bu' ? { t: c.t, a: c.a } : { t: c.t, i: String(c.i) }; if (!keys.has(wrongKey(n))) { keys.add(wrongKey(n)); cur.push(n); nWrong++; } } });
    store.set('wrong', cur.slice(0, 100));
  }
  if (d.watched && typeof d.watched === 'object') {
    VIDEO_LIST.forEach(v => { if (d.watched[v.id] === true && !store.get('watched:' + v.id, false)) { store.set('watched:' + v.id, true); nWatched++; } });
  }
  if (d.did && typeof d.did === 'object') {
    ['sign', 'braille', 'quiz-sign', 'quiz-braille'].forEach(k => { if (d.did[k] === true && !didFlag(k)) { store.set('did:' + k, true); nDid++; } });
  }
  if (d.track === 'sign' || d.track === 'braille') { if (!hasTrackChoice()) { roadTrack = d.track; store.set('track', d.track); } }
  return { ok: true, msg: `기록을 가져왔어요. 단어장 +${nFav}, 틀린 문제 +${nWrong}, 본 영상 +${nWatched}${nDid ? `, 학습 단계 +${nDid}` : ''}. 이 기기의 기존 기록은 그대로 두었어요.` };
}
function hasTrackChoice() { return store.get('track', null) !== null; }
$('#recImport').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (!f) return;
  if (f.size > 600 * 1024) { setRecStatus('파일이 너무 커요. 손빛에서 내보낸 기록 파일만 가져올 수 있어요.'); return; }
  let text = ''; try { text = await f.text(); } catch (err) { setRecStatus('파일을 읽지 못했어요.'); return; }
  const r = importRecord(text); setRecStatus(r.msg); toast(r.ok ? '기록을 가져왔어요' : '가져오지 못했어요');
  if (r.ok) renderHome();
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
    fb.setAttribute('aria-pressed', String(on)); fb.querySelector('.fl').textContent = on ? '단어장에 담김' : '단어장에 담기';
    const row = fb.closest('.wordrow'); if (row) { const m = row.querySelector('.favmark'); if (m) m.hidden = !on; }
    const w = WORD_BY_ID.get(String(id)); toast(on ? `「${w ? w.w : ''}」을(를) 단어장에 담았어요` : `「${w ? w.w : ''}」을(를) 단어장에서 뺐어요`);
    return;
  }
  const sg = e.target.closest('[data-suggest]');
  if (sg) { signQuery = sg.dataset.suggest; signPinId = ''; $('#signSearch').value = signQuery; renderSign(); return; }
  const ac = e.target.closest('[data-act]'); if (ac) dispatchAct(ac.dataset.act, ac.dataset.arg);
});
$('#signList').addEventListener('error', e => {
  const el = e.target;
  if (el.tagName === 'VIDEO') {
    const box = el.closest('.signmedia'); if (box && !box.dataset.failed) { box.dataset.failed = '1'; box.innerHTML = '<p class="note amber" style="flex:1 1 100%">영상을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</p>'; }
  } else if (el.tagName === 'IMG' && el.closest('.shapeimg')) { el.closest('.shapeimg').remove(); }
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
function showBraillePanel(name, byUser) {
  if (!['convert', 'pad', 'table'].includes(name)) name = 'convert';
  ['convert', 'pad', 'table'].forEach(n => { $('#bp-' + n).hidden = n !== name; });
  $$('[data-bpanel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bpanel === name)));
  store.set('bpanel', name);
  if (name === 'table') { renderTable(tableGroup); if (byUser) markDid('braille'); }
}
$('#bpSeg').addEventListener('click', e => { const b = e.target.closest('[data-bpanel]'); if (b) showBraillePanel(b.dataset.bpanel, true); });
// ---- 연습 패드 ----
let padDots = new Set();
function renderPadCell() {
  $('#padCell').innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="dot ${padDots.has(n) ? 'on' : ''}" data-dot="${n}" aria-pressed="${padDots.has(n)}" aria-label="${n}번 점">${n}</button>`).join('');
}
function syncPadCell() { $$('[data-dot]', $('#padCell')).forEach(b => { const on = padDots.has(Number(b.dataset.dot)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }
function renderPadResult() {
  const dots = Array.from(padDots).sort((a, b) => a - b);
  if (!dots.length) { $('#padResultChar').textContent = '점을 눌러 보세요'; $('#padResultKind').textContent = ''; $('#padReadings').innerHTML = ''; return; }
  $('#padResultChar').textContent = dots.join('·') + '번 점';
  $('#padResultKind').textContent = '점자 문자 ' + dotsToUnicode(dots);
  const rs = (READINGS[dots.join('-')] || []).slice().sort((a, b) => READ_ORDER.indexOf(a.kind) - READ_ORDER.indexOf(b.kind));
  $('#padReadings').innerHTML = rs.length
    ? `<p>${rs.length > 1 ? '같은 모양이 글자 안의 자리에 따라 이렇게 읽혀요.' : '이렇게 읽혀요.'}</p><ul>${rs.map(r => `<li><b>${esc(r.label)}</b> — ${esc(r.kind)}</li>`).join('')}</ul>`
    : '<p>한 칸으로 읽는 글자가 아직 없는 모양이에요.</p>';
}
$('#padCell').addEventListener('click', e => {
  const b = e.target.closest('[data-dot]'); if (!b) return;
  const n = Number(b.dataset.dot); padDots.has(n) ? padDots.delete(n) : padDots.add(n);
  syncPadCell(); renderPadResult(); markDid('braille');
});
$('#padReset').addEventListener('click', () => { padDots.clear(); syncPadCell(); renderPadResult(); });
// ---- 글자 → 점자 변환기 ----
function renderBraillePanel() {
  const text = $('#bpInput').value.slice(0, 200);
  const contract = $('#bpContract').checked;
  const r = KB.convert(text, { contract });
  const cells = r.cells.filter(c => c.kind !== '줄바꿈');
  $('#bpSummary').textContent = text ? `${cells.length}칸으로 바뀌었어요${r.unsupported.length ? ` · 바꾸지 못한 글자 ${r.unsupported.length}개` : ''}` : '글자를 입력하면 여기에 몇 칸인지 나와요';
  const warn = r.warnings.slice(); if (r.unsupported.length) warn.unshift(`바꿔 주지 않는 글자가 있어요: ${[...new Set(r.unsupported)].join(' ')} (로마자·그리스 문자·수식 기호·옛 글자 등은 규정이 따로 있어 지원하지 않아요. 점선 칸으로 표시했어요.)`);
  $('#bpWarn').hidden = !warn.length; $('#bpWarn').textContent = warn.join(' ');
  $('#bpCells').innerHTML = cells.map(c => {
    const label = c.kind === '띄어쓰기' ? '␣' : (c.text || '');
    const tip = c.kind + (c.rule ? ' · ' + c.rule : '');
    return `<div class="ccell ${c.unsupported ? 'unverified' : ''}" title="${esc(tip)}">${miniDots(c.dots)}<label>${esc(label)}</label><small>${esc(c.kind === '띄어쓰기' || c.unsupported ? c.kind : c.kind.replace(/\(.*\)/, ''))}</small></div>`;
  }).join('');
  const uni = cells.map(c => (c.kind === '띄어쓰기' ? ' ' : (c.unsupported ? '?' : dotsToUnicode(c.dots)))).join('');
  $('#bpOutWrap').hidden = !text; $('#bpOut').textContent = uni;
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
$('#brailleVideoGrid').innerHTML = VIDEO_LIST.filter(v => v.track === '점자').sort((a, b) => a.order - b.order).map(vcard).join('');
bindVideoCards($('#brailleVideoGrid'));

// ================= 퀴즈 =================
// ---- 문제 만들기: 수어 ----
function quizVideoSrc(w) { return (typeof MEDIA_VIDEO !== 'undefined' && MEDIA_VIDEO.has(w.id)) ? `assets/media/${w.id}.mp4` : w.k; }
function signTextQ(w, loose) { const t = descOf(w); if (!t || t.includes(w.w) || (!loose && t.length >= 130)) return null; return { id: w.id, answer: w.w, clueType: 'text', clue: t, group: w.t }; }
function signVideoQ(w, loose) { if (!w.k || (!loose && (w.w.length > 8 || /[~\-]/.test(w.w)))) return null; return { id: w.id, answer: w.w, clueType: 'video', clue: quizVideoSrc(w), group: w.t }; }
const QUIZ_POOL_SIGN_TEXT = ALL_WORDS.map(w => signTextQ(w)).filter(Boolean);
const QUIZ_POOL_SIGN_VIDEO = ALL_WORDS.map(w => signVideoQ(w)).filter(Boolean);
const QUIZ_POOL_SIGN = QUIZ_POOL_SIGN_TEXT.concat(QUIZ_POOL_SIGN_VIDEO);
// ---- 문제 만들기: 점자(규정 2024로 확인한 자모·숫자·약자·약어·문장부호). 점 모양이 같은 것(예: ㄴ 첫소리와 나 약자)은 정답이 둘이 되므로 먼저 나온 하나만 쓴다 ----
function cellsOf(v) { return (Array.isArray(v) ? v : [v]).map(x => x.split('-').map(Number)); }
// 쓰기 퀴즈는 정답이 하나로 정해진 글자를 묻기 때문에, 점 모양이 같아도(예: 마침표와 ㅍ 받침) 항목을 모두 넣는다.
const QUIZ_POOL_BUILD = [];
const QUIZ_POOL_BRAILLE = (() => {
  const seen = new Set(), out = [];
  const add = (answer, cells, group) => { const item = { answer, clueType: 'dots', clue: cells, group }; QUIZ_POOL_BUILD.push(item); const k = cells.map(c => c.join('')).join('|'); if (seen.has(k)) return; seen.add(k); out.push(item); };
  for (const [ch, d] of Object.entries(BRAILLE_CHO)) add(ch, cellsOf(d), '초성');
  for (const [ch, d] of Object.entries(BRAILLE_JONG)) add(ch + '(받침)', cellsOf(d), '종성');
  for (const [ch, d] of Object.entries(BRAILLE_JUNG)) add(ch, cellsOf(d), '중성');
  for (const [ch, d] of Object.entries(BRAILLE_NUMBERS)) add(ch, [BRAILLE_NUMBER_SIGN.split('-').map(Number), ...cellsOf(d)], '숫자');
  for (const [k, brf] of Object.entries(T.ABBR1)) add(SYL1[k] + '(약자)', KB.brfCells(brf), '약자');
  for (const [k, brf] of Object.entries(T.ABBR2)) add(SYL2[k] + '(약자)', KB.brfCells(brf), '약자');
  add('것(약자)', KB.brfCells('_s'), '약자');
  for (const [w, brf] of Object.entries(T.ABBR_WORDS)) add(w + '(약어)', KB.brfCells(brf), '약어');
  for (const ch of ['.', '?', '!', ',', '·', ':', '/', '…', '“', '”', '‘', '’', '(', ')', '[', ']', '「', '」', '―']) add(ch + (ch === ',' ? ' 쉼표' : ''), KB.brfCells(T.PUNCT[ch]), '문장부호');
  return out;
})();
function clueCellsHtml(cells) { return '<div class="cellsrow">' + cells.map(c => miniDots(c, true)).join('') + '</div>'; }
// ---- 점자 문제의 글 설명(화면낭독기용·오답 해설용). 정답 글자는 포함하지 않는다 ----
const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];
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
let quizState = { active: false };
const modeNow = () => (store.get('qmode', 'practice') === 'challenge' ? 'challenge' : 'practice');
function compactQ(q, noOpts) {
  const c = q.clueType === 'dots' ? { t: 'br', a: q.answer } : q.clueType === 'build' ? { t: 'bu', a: q.answer } : { t: q.clueType === 'video' ? 'sv' : 'st', i: String(q.id) };
  if (!noOpts && q._opts) c.o = q._opts;
  return c;
}
function restoreQ(c) {
  if (!c || typeof c !== 'object') return null;
  if (c.t === 'br' || c.t === 'bu') {
    const it = (c.t === 'bu' ? QUIZ_POOL_BUILD : QUIZ_POOL_BRAILLE).find(x => x.answer === c.a); if (!it) return null;
    return Object.assign({}, it, c.t === 'bu' ? { clueType: 'build' } : {}, { _opts: Array.isArray(c.o) ? c.o : undefined });
  }
  const w = WORD_BY_ID.get(String(c.i)); if (!w) return null;
  const q = c.t === 'sv' ? signVideoQ(w, true) : c.t === 'st' ? signTextQ(w, true) : null; if (!q) return null;
  if (Array.isArray(c.o)) q._opts = c.o;
  return q;
}
function saveRun() {
  const s = quizState; if (!s.active) return;
  store.set('quizrun', { v: 1, kind: s.kind, mode: s.mode, i: s.answered ? s.i + 1 : s.i, score: s.score, lives: s.lives, done: s.done, qs: s.qs.map(q => compactQ(q)), wrong: s.wrong.map(q => compactQ(q, true)) });
}
function loadRun() {
  const r = store.get('quizrun', null);
  if (!r || r.v !== 1 || !QKINDS[r.kind] || !Array.isArray(r.qs) || !r.qs.length) return null;
  const qs = r.qs.map(restoreQ); if (qs.some(q => !q)) return null;
  const i = Math.max(0, Math.min(Number(r.i) || 0, qs.length));
  return { active: true, kind: r.kind, mode: r.mode === 'challenge' ? 'challenge' : 'practice', i, score: Number(r.score) || 0, lives: Number.isFinite(Number(r.lives)) ? Number(r.lives) : 3, done: Number(r.done) || 0, qs, answered: false, wrong: (r.wrong || []).map(restoreQ).filter(Boolean) };
}
function resumeQuiz() {
  const run = loadRun();
  if (!run) { store.del('quizrun'); toast('풀던 퀴즈를 찾지 못했어요'); renderHome(); return; }
  quizState = run; ensureQuizView(); renderQuiz();
}
// 이미 퀴즈 화면이면 기록(뒤로 가기 목록)을 또 쌓지 않는다
function ensureQuizView() { if (!$('#view-quiz').classList.contains('active')) go('quiz'); }
function questionsFor(kind) {
  if (kind === 'sign') return shuffle(shuffle(QUIZ_POOL_SIGN_TEXT).slice(0, 4).concat(shuffle(QUIZ_POOL_SIGN_VIDEO).slice(0, 6)));
  if (kind === 'braille') return shuffle(QUIZ_POOL_BRAILLE).slice(0, 10);
  if (kind === 'build') return shuffle(QUIZ_POOL_BUILD).slice(0, 10).map(q => Object.assign({}, q, { clueType: 'build' }));
  if (kind === 'fav') return shuffle(favWords().map(w => signVideoQ(w, true) || signTextQ(w, true)).filter(Boolean)).slice(0, 10);
  if (kind === 'review') return shuffle(getWrong().map(restoreQ).filter(Boolean)).slice(0, 10);
  return [];
}
function startQuizWith(kind, qs, mode) {
  // 문제를 복사해서 시작한다(선택지 _opts 가 풀에 남아 다음 퀴즈에서 같은 보기로 나오는 것을 막는다)
  quizState = { active: true, kind, mode: mode || modeNow(), i: 0, score: 0, lives: 3, done: 0, qs: qs.map(q => Object.assign({}, q, { _opts: undefined })), answered: false, wrong: [] };
  saveRun(); renderQuiz();
}
function startQuiz(kind) {
  const qs = questionsFor(kind);
  if (!qs.length) { toast(kind === 'fav' ? '단어장에 퀴즈로 낼 수 있는 단어가 아직 없어요' : '풀 문제가 아직 없어요'); return false; }
  startQuizWith(kind, qs); return true;
}
function startQuizFromAnywhere(kind) {
  const qs = questionsFor(kind);
  if (!qs.length) { toast(kind === 'fav' ? '내 단어장에 단어를 먼저 담아 주세요' : '틀린 문제가 아직 없어요'); return; }
  quizState = { active: false }; ensureQuizView(); startQuizWith(kind, qs);
}
// ---- 퀴즈 홈 ----
function modeNoteText(m) {
  return m === 'challenge' ? '도전: 힌트 없이 10문제, 목숨 3개예요. 목숨이 모두 없어지면 끝나요.' : '연습: 목숨이 없고 힌트를 쓸 수 있어요. 틀려도 설명을 보며 천천히 익혀요.';
}
function renderQuizHub() {
  quizState = { active: false };
  const run = loadRun(), mode = modeNow();
  const wrongN = getWrong().filter(c => validWrongEntry(c)).length, favN = favWords().length;
  const resume = run ? `<div class="resumebar"><div class="rt">풀던 퀴즈가 있어요<small>${esc(QKINDS[run.kind])} · ${Math.min(run.i + 1, run.qs.length)} / ${run.qs.length}번째 · ${run.mode === 'challenge' ? '도전' : '연습'}</small></div><button class="btn primary small" type="button" id="qResume">이어서 풀기</button><button class="btn line small" type="button" id="qDiscard">그만두기</button></div>` : '';
  $('#quizArea').innerHTML = `<div class="quizhub">${resume}
    <div class="card"><div class="section-h"><h2>방식 고르기</h2></div>
      <div class="seg" role="group" aria-label="퀴즈 방식" style="margin:10px 0">
        <button type="button" data-qmode="practice" aria-pressed="${mode === 'practice'}">연습</button>
        <button type="button" data-qmode="challenge" aria-pressed="${mode === 'challenge'}">도전</button>
      </div>
      <p class="note" id="qmodeNote">${modeNoteText(mode)}</p></div>
    <div class="qcards">
      <button class="qcard" type="button" data-quiz="sign"><span class="qci">${icon('hand', 24)}</span><span class="qct">수어 퀴즈</span><span class="qcs">동작 설명을 읽거나 영상을 보고 뜻을 맞혀요 (문제 ${QUIZ_POOL_SIGN.length.toLocaleString('ko-KR')}개 중 10문제)</span><span class="qcg" aria-hidden="true">›</span></button>
      <button class="qcard braille" type="button" data-quiz="braille"><span class="qci">${icon('braille', 24)}</span><span class="qct">점자 읽기</span><span class="qcs">점 모양을 보고 어떤 글자인지 맞혀요 (문제 ${QUIZ_POOL_BRAILLE.length}개 중 10문제)</span><span class="qcg" aria-hidden="true">›</span></button>
      <button class="qcard braille" type="button" data-quiz="build"><span class="qci">${icon('pencil', 24)}</span><span class="qct">점자 쓰기</span><span class="qcs">글자를 보고 점을 직접 눌러 써 봐요</span><span class="qcg" aria-hidden="true">›</span></button>
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
  if (t.closest('#qResume')) { resumeQuiz(); return; }
  if (t.closest('#qDiscard')) { store.del('quizrun'); renderQuizHub(); return; }
});
// ---- 문제 화면 ----
function pickChoices(correct) {
  const pool = correct.clueType === 'dots' ? QUIZ_POOL_BRAILLE : QUIZ_POOL_SIGN;
  const sameGroup = pool.filter(w => w.group === correct.group && w.answer !== correct.answer);
  const others = pool.filter(w => w.answer !== correct.answer);
  const src = sameGroup.length >= 3 ? sameGroup : others;
  const picks = []; const used = new Set([correct.answer]);
  while (picks.length < 3 && used.size < src.length + 1) { const c = src[Math.floor(Math.random() * src.length)]; if (!used.has(c.answer)) { used.add(c.answer); picks.push(c.answer); } }
  return shuffle([correct.answer, ...picks]);
}
function livesHtml(lives) { return Array.from({ length: 3 }, (_, i) => `<span class="life${i < lives ? ' on' : ''}">${icon('star', 16)}</span>`).join(''); }
function quizOptHtml(o, i) { return `<button class="qopt" type="button" data-opt="${esc(o)}"><span class="num" aria-hidden="true">${i + 1}</span><span>${esc(o)}</span></button>`; }
function quizClueHtml(q) {
  if (q.clueType === 'dots') return `<div class="qclue qclue-dots">이 점자는 무슨 글자(${esc(q.group)})일까요?<div class="quizdots" role="img" aria-label="${esc(cellsDescription(q.clue))}">${clueCellsHtml(q.clue)}</div></div>`;
  if (q.clueType === 'build') return `<div class="qclue">다음 글자를 점자로 써 보세요.<div style="font-size:1.75rem;font-weight:900;margin:10px 0 2px">「${esc(q.answer)}」</div><div style="font-size:.8125rem;opacity:.85">${esc(q.group)} · ${q.clue.length}칸</div></div>`;
  if (q.clueType === 'video') return `<div class="qclue">이 수어 영상이 뜻하는 단어는 무엇일까요?<video class="kslvideo qvideo" id="quizClueVideo" src="${esc(kslUrl(q.clue))}" autoplay loop muted playsinline controls preload="auto" aria-label="수어 영상 문제"></video></div>`;
  return `<div class="qclue">다음 수어 동작이 의미하는 단어는 무엇일까요?<br><br>${esc(q.clue)}</div>`;
}
function buildCellsHtml(q) {
  return `<div class="buildcells" id="buildCells">${q.clue.map((c, ci) => `<div class="bcell" data-cell="${ci}"><div class="bgrid" role="group" aria-label="${q.clue.length > 1 ? ORD[ci] + ' 칸' : '점자 한 칸'}">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="dot" data-bdot="${n}" aria-pressed="false" aria-label="${q.clue.length > 1 ? ORD[ci] + ' 칸 ' : ''}${n}번 점">${n}</button>`).join('')}</div>${q.clue.length > 1 ? `<span class="bl">${ORD[ci]} 칸</span>` : ''}</div>`).join('')}</div>`;
}
function renderQuiz() {
  const s = quizState; if (!s.active) return;
  const total = s.qs.length, chal = s.mode === 'challenge';
  if (s.i >= total || (chal && s.lives <= 0)) return renderQuizResult();
  const q = s.qs[s.i], build = q.clueType === 'build';
  s.answered = false;
  if (!build && !q._opts) q._opts = pickChoices(q);
  saveRun();
  const hints = chal ? '' : `${build ? '' : '<button class="btn ghost small" type="button" id="hintCut">보기 하나 지우기</button>'}<button class="btn ghost small" type="button" id="hintText">힌트 보기</button>`;
  $('#quizArea').innerHTML = `
    <div class="quizhead">
      <div><span class="qbadge${chal ? ' chal' : ''}">${chal ? '도전' : '연습'}</span> <span id="quizQ" tabindex="-1" style="font-weight:800;margin-left:6px">${esc(QKINDS[s.kind])} · ${s.i + 1} / ${total}</span></div>
      ${chal ? `<span class="lives" role="img" aria-label="남은 목숨 ${s.lives}개">${livesHtml(s.lives)}</span>` : ''}
    </div>
    <div class="progress" style="margin:10px 0 12px"><b style="width:${s.done / total * 100}%"></b></div>
    <div class="qtools">${hints}<span class="sp"></span><button class="btn line small" type="button" id="quizPause">잠시 나가기</button><button class="btn line small" type="button" id="quizEnd">끝내기</button></div>
    <div class="qconfirm" id="quizEndConfirm" hidden style="margin-top:10px"><span>지금까지 푼 ${s.done}문제의 결과를 보고 끝낼까요?</span><button class="btn danger small" type="button" id="quizEndYes">끝내기</button><button class="btn ghost small" type="button" id="quizEndNo">계속 풀기</button></div>
    <div id="quizHint" class="note" hidden aria-live="polite" style="margin-top:10px"></div>
    <div style="margin-top:14px">${quizClueHtml(q)}</div>
    ${build ? `<div style="margin-top:16px">${buildCellsHtml(q)}</div><button class="btn primary block" type="button" id="buildCheck" style="margin-top:16px">확인하기</button>`
      : `<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px" id="quizOpts">${q._opts.map(quizOptHtml).join('')}</div>`}
    <div id="quizFeedback" tabindex="-1" style="margin-top:14px" aria-live="polite"></div>`;
  const qq = $('#quizQ'); if (qq && s.i > 0) qq.focus({ preventScroll: true });
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
  if (t.closest('#quizPause')) { saveRun(); renderQuizHub(); toast('저장했어요. 퀴즈 화면에서 이어서 풀 수 있어요'); return; }
  if (t.closest('#quizEnd')) { $('#quizEndConfirm').hidden = false; $('#quizEndNo').focus(); return; }
  if (t.closest('#quizEndNo')) { $('#quizEndConfirm').hidden = true; return; }
  if (t.closest('#quizEndYes')) { s.ended = true; renderQuizResult(); return; }
  if (t.closest('#quizNext')) { s.i++; renderQuiz(); window.scrollTo(0, 0); return; }
  if (t.closest('#quizPad')) { padDots = new Set(q.clue[0]); syncPadCell(); renderPadResult(); store.set('track', 'braille'); go('braille'); showBraillePanel('pad'); return; }
  if (t.closest('#quizRelearn')) { const w = WORD_BY_ID.get(String(q.id)); if (w) openWordInDictionary(w); return; }
  if (t.closest('#quizReplay')) { const v = $('#quizClueVideo'); if (v) { v.currentTime = 0; v.play(); } return; }
});
// ---- 힌트(연습 방식에서만) ----
function cutOption(q) {
  const left = $$('[data-opt]', $('#quizOpts')).filter(b => !b.disabled);
  if (left.length <= 2) { $('#hintCut').disabled = true; return; }
  const wrong = left.filter(b => b.dataset.opt !== q.answer);
  const b = wrong[Math.floor(Math.random() * wrong.length)];
  b.disabled = true; b.classList.add('gone'); b.setAttribute('aria-label', b.dataset.opt + ' (지운 보기)');
  if (left.length - 1 <= 2) $('#hintCut').disabled = true;
}
function hintTextFor(q) {
  if (q.clueType === 'dots') { const n = q.clue[0].length; return `점이 ${n}개 있는 칸으로 시작해요.${q.clue.length > 1 ? ` 모두 ${q.clue.length}칸이에요.` : ''}`; }
  if (q.clueType === 'build') return '점 개수: ' + q.clue.map((c, i) => `${q.clue.length > 1 ? ORD[i] + ' 칸 ' : ''}${c.length}개`).join(', ') + '예요.';
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
  return q.clueType === 'build' ? `아쉬워요. 「${esc(q.answer)}」의 점 모양은 아래 설명을 확인해 보세요.` : `아쉬워요. 정답은 「${esc(q.answer)}」예요.`;
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
function answerChoice(btn, q) {
  if (quizState.answered) return;
  const chosen = btn.dataset.opt, correct = chosen === q.answer;
  $$('[data-opt]', $('#quizOpts')).forEach(b => { b.disabled = true; if (b.dataset.opt === q.answer) b.classList.add('correct'); else if (b === btn) b.classList.add('wrong'); });
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
function brailleExplainHtml(q, chosen, correct) {
  let html = `<p class="qx">정답 「${esc(q.answer)}」: ${esc(cellsDescription(q.clue))}.</p>`;
  let cmp = `<div><span class="qcl">정답 ${esc(q.answer)}</span>${clueCellsHtml(q.clue)}</div>`;
  if (!correct) {
    const item = QUIZ_POOL_BRAILLE.find(x => x.answer === chosen);
    if (item) {
      html += `<p class="qx">고른 「${esc(chosen)}」: ${esc(cellsDescription(item.clue))}.</p>`;
      const d = dotsDiffText(q.clue, item.clue);
      if (d) html += `<p class="qx">차이: ${esc(d)}.</p>`;
      cmp += `<div><span class="qcl">내가 고른 ${esc(chosen)}</span>${clueCellsHtml(item.clue)}</div>`;
    }
  }
  return `<div class="qexplain">${html}<div class="qcompare" aria-hidden="true">${cmp}</div><div class="qexbtns"><button class="btn ghost" id="quizPad" type="button">연습 패드에서 눌러 보기</button></div></div>`;
}
function buildExplainHtml(q, entered, correct) {
  let html = `<p class="qx">정답 「${esc(q.answer)}」: ${esc(cellsDescription(q.clue))}.</p>`;
  let cmp = `<div><span class="qcl">정답</span>${clueCellsHtml(q.clue)}</div>`;
  if (!correct) {
    html += `<p class="qx">내가 쓴 것: ${esc(cellsDescription(entered))}.</p>`;
    const d = dotsDiffText(q.clue, entered, '내가 쓴 것'); if (d) html += `<p class="qx">차이: ${esc(d)}.</p>`;
    cmp += `<div><span class="qcl">내가 쓴 것</span>${clueCellsHtml(entered)}</div>`;
  }
  return `<div class="qexplain">${html}<div class="qcompare" aria-hidden="true">${cmp}</div><div class="qexbtns"><button class="btn ghost" id="quizPad" type="button">연습 패드에서 눌러 보기</button></div></div>`;
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
  if (q.clueType === 'text') {
    // 설명을 보고 맞히는 문제는 정답의 영상을 보여 준다(영상이 있는 단어만)
    const src = quizVideoSrc(w);
    if (src) html += `<video class="kslvideo qvideo" src="${esc(kslUrl(src))}" autoplay loop muted playsinline controls preload="auto" aria-label="${esc(w.w)} 수어 영상"></video>`;
  } else if (motion) {
    html += `<p class="qx">동작 설명: ${esc(motion)}</p>${officialNoteHtml(w)}`;
  }
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
  $('#quizArea').innerHTML = `<div class="card qresult">
    <div class="qbadge${s.mode === 'challenge' ? ' chal' : ''}">${esc(QKINDS[s.kind])} · ${s.mode === 'challenge' ? '도전' : '연습'}</div>
    <div class="score" role="status" tabindex="-1">${s.score} / ${s.done}</div>
    <p class="note" style="margin:14px 0">${esc(why ? why + '. ' : '')}${esc(msg)}</p>${wrongList}
    <div style="display:flex;flex-direction:column;gap:10px">
      ${wrongN ? `<button class="btn primary block" id="quizRetryWrong" type="button">틀린 문제 ${wrongN}개 다시 풀기</button>` : ''}
      <button class="btn ${wrongN ? 'ghost' : 'primary'} block" id="quizRetry" type="button">같은 퀴즈 새로 풀기</button>
      <button class="btn ghost block" id="quizToStudy" type="button">${study[1]}</button>
      <button class="btn line block" id="quizToHub" type="button">퀴즈 첫 화면으로</button>
    </div></div>`;
  $('#quizRetry').addEventListener('click', () => { if (s.kind === 'review' || s.kind === 'fav') startQuizFromAnywhere(s.kind); else startQuiz(s.kind); });
  $('#quizToStudy').addEventListener('click', () => { if (study[0] === 'braille') { go('braille'); showBraillePanel('table'); } else go('sign'); });
  $('#quizToHub').addEventListener('click', renderQuizHub);
  const rw = $('#quizRetryWrong'); if (rw) rw.addEventListener('click', () => startQuizWith(s.kind === 'build' ? 'build' : s.kind, s.wrong, s.mode));
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
function setPlayerSrc(id) {
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
  setPlayerSrc(v.id);
  $('#playerTranscript').innerHTML = '<p class="note">자막을 불러오는 중…</p>';
  try {
    const vttText = await (await fetch(`videos/${v.id}.vtt`)).text();
    transcriptCues = parseVtt(vttText);
    renderTranscript();
  } catch (e) { $('#playerTranscript').innerHTML = '<p class="note">자막을 불러오지 못했어요.</p>'; transcriptCues = []; }
}
function renderTranscript() {
  $('#playerTranscript').innerHTML = transcriptCues.map(c => `<p class="tline">${esc(c.text)}</p>`).join('') || '<p class="note">자막이 없어요.</p>';
}

// ================= 처음 화면 =================
renderPadCell(); renderPadResult();
showBraillePanel(store.get('bpanel', 'convert'));
renderBraillePanel();
renderSign();
const start = (location.hash || '#home').slice(1);
go(VIEWS.includes(start) ? start : 'home', { push: false });
})();
