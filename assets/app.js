// 손빛 배움터 — 메인 로직(순수 자바스크립트, 서버 없음). 데이터: ksl-data.js(검증 수어 224개) · braille.js(점자 변환) · video-data.js(교육 영상 5편)
(() => {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem('sonbit:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('sonbit:' + k, JSON.stringify(v)); } catch (e) { } } };
const hap = () => { };
const fmtTime = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---------------- 아이콘(인라인 SVG, 외부 폰트 없이) ----------------
const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5"/><path d="M11 12.5V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 13v-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.2-3.6a1.4 1.4 0 0 1 2.3-1.6L8 16"/>',
  braille: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2" opacity=".3"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="18" r="2" opacity=".3"/><circle cx="17" cy="18" r="2"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1-1.3 2.2"/><circle cx="12" cy="16.6" r=".4" fill="currentColor"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-2.7v8.4l-5-2.7"/>',
  play: '<circle cx="12" cy="12" r="10" fill="rgba(0,0,0,.35)"/><path d="M10 8.6v6.8l5.8-3.4Z" fill="#fff" stroke="none"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  moon: '<path d="M20 14.7A8 8 0 1 1 9.3 4a6.5 6.5 0 0 0 10.7 10.7Z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  text: '<path d="M5 6h9M9.5 6v13M16 11h5M18.5 11v8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="M12 3.5 14.5 9l6 .7-4.5 4 1.3 6-5.3-3-5.3 3 1.3-6-4.5-4 6-.7Z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'
};
function icon(name, size) {
  const d = ICONS[name] || ''; const s = size || 22;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
$('#logoIcon').innerHTML = icon('hand', 22).replace('currentColor', '#7ff0dd');
$$('.navbtn').forEach(b => { const n = b.querySelector('.i'); if (n) n.innerHTML = icon(n.dataset.icon, 22); });
$('#signSearchIcon').innerHTML = icon('search', 18);
$('#playerBack').innerHTML = icon('back', 20);
$('#btnBigText').innerHTML = icon('text', 18);

// ---------------- 상단 접근성 토글 ----------------
function initToggle(btn, key, def, onChange) {
  let v = store.get(key, def);
  const apply = () => { btn.setAttribute('aria-pressed', String(v)); onChange(v); };
  apply();
  btn.addEventListener('click', () => { v = !v; store.set(key, v); apply(); hap(12); });
}
initToggle($('#btnBigText'), 'bigtext', false, v => document.documentElement.classList.toggle('big-text', v));
initToggle($('#btnTheme'), 'theme', (matchMedia('(prefers-color-scheme: dark)').matches), v => {
  document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light');
  $('#btnTheme').innerHTML = icon(v ? 'sun' : 'moon', 18);
});

// ---------------- 라우팅 ----------------
const VIEWS = ['home', 'sign', 'braille', 'quiz', 'player'];
const TITLES = { home: '손빛 배움터', sign: '수어 스튜디오', braille: '점자 패드', quiz: '도전 퀴즈', player: '영상 보기' };
let playerReturnTo = 'home';
function go(view, opts) {
  opts = opts || {};
  VIEWS.forEach(v => $('#view-' + v).classList.toggle('active', v === view));
  $$('.navbtn').forEach(b => { const on = b.dataset.nav === view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#pageTitle').textContent = TITLES[view] || '손빛 배움터';
  if (view !== 'player') { $('#main').scrollTop = 0; window.scrollTo(0, 0); $('#playerVideo').src = 'about:blank'; }
  if (opts.push !== false) history.pushState({ view, arg: opts.arg }, '', '#' + view);
  if (view === 'player' && opts.arg) openPlayer(opts.arg.id);
  if (view === 'quiz' && !quizState.active) renderQuizIntro();
}
$$('[data-nav]').forEach(el => el.addEventListener('click', () => { hap(10); if (el.dataset.nav !== 'player') playerReturnTo = el.dataset.nav; go(el.dataset.nav); }));
window.addEventListener('popstate', e => { const v = (e.state && e.state.view) || 'home'; go(v, { push: false, arg: e.state && e.state.arg }); });
$('#playerBack').addEventListener('click', () => { $('#playerVideo').src = 'about:blank'; history.back(); });

// ---------------- 단어 하나의 "실제 영상/그림 카드" 블록(수어 사전·학습 페이지 공용) ----------------
function realVideoBtnHtml(sl, uid, words) {
  if (sl) return `<button class="linkbtn primary" data-realvideo="${uid}" aria-expanded="false">${icon('video', 14)} 실제 수어 영상 보기</button>`;
  return `<button class="linkbtn" data-sldict="${esc(words[0])}">${icon('video', 14)} 국립국어원 영상 찾기</button>`;
}
function shapeBtnHtml(sl, uid) {
  if (!sl) return '';
  return `<button class="linkbtn" data-shape="${uid}" aria-expanded="false">${icon('braille', 14)} 수형 사진·설명 보기</button>`;
}
function signVisualHtml(label, synonyms) {
  const words = (synonyms && synonyms.length ? synonyms : [label]);
  const slWord = words.find(w => typeof SLDICT_LINK === 'object' && SLDICT_LINK && SLDICT_LINK[w]);
  const sl = slWord && SLDICT_LINK[slWord];
  const uid = 'v' + Math.random().toString(36).slice(2, 9);
  const src = sl ? `https://sldict.korean.go.kr/front/sign/signContentsView.do?origin_no=${sl.id}&top_category=${sl.cat}` : '';
  const actions = `<div class="actions">
      ${realVideoBtnHtml(sl, uid, words)}
      ${shapeBtnHtml(sl, uid)}
    </div>`;
  const visuals = sl ? `<div class="realvideo" id="rv-${uid}" hidden>
      <div class="sldict-crop sldict-crop-video"><iframe loading="lazy" src="about:blank" data-src="${esc(src)}" title="${esc(label)} 국립국어원 한국수어사전 실제 영상" allowfullscreen></iframe></div>
      <p class="note">국립국어원 한국수어사전 제공 영상 (저작자표시-비영리-변경금지)</p>
    </div>
    <div class="cardimg" id="ci-${uid}" hidden>
      <div class="sldict-crop sldict-crop-shape"><iframe loading="lazy" src="about:blank" data-src="${esc(src)}" title="${esc(label)} 수형 사진·설명" allowfullscreen></iframe></div>
      <p class="note">국립국어원 한국수어사전 제공 수형 사진·설명 (저작자표시-비영리-변경금지)</p>
    </div>` : '';
  return actions + visuals;
}
function bindSignVisuals(root) {
  $$('[data-sldict]', root).forEach(b => b.addEventListener('click', () => window.open('https://sldict.korean.go.kr/front/search/searchAllList.do?searchKeyword=' + encodeURIComponent(b.dataset.sldict), '_blank', 'noopener')));
  $$('[data-realvideo]', root).forEach(b => b.addEventListener('click', () => {
    const box = $('#rv-' + b.dataset.realvideo);
    const open = box.hidden; box.hidden = !open;
    const frame = box.querySelector('iframe');
    if (open && frame.src === 'about:blank') frame.src = frame.dataset.src;
    b.setAttribute('aria-expanded', String(open));
    b.innerHTML = (open ? icon('video', 14) + ' 실제 영상 닫기' : icon('video', 14) + ' 실제 수어 영상 보기');
    hap(8);
  }));
  $$('[data-shape]', root).forEach(b => b.addEventListener('click', () => {
    const box = $('#ci-' + b.dataset.shape);
    const open = box.hidden; box.hidden = !open;
    const frame = box.querySelector('iframe');
    if (open && frame.src === 'about:blank') frame.src = frame.dataset.src;
    b.setAttribute('aria-expanded', String(open));
    b.innerHTML = (open ? icon('braille', 14) + ' 수형 사진 닫기' : icon('braille', 14) + ' 수형 사진·설명 보기');
    hap(8);
  }));
}

// ---------------- 영상 카드 공통 ----------------
function watchedBadgeHtml(watched) {
  if (!watched) return '';
  return `<div class="watched">${icon('check', 13)} 시청 완료</div>`;
}
function vcard(v, opts) {
  opts = opts || {};
  const watched = store.get('watched:' + v.id, false);
  return `<button class="vcard" data-open-video="${v.id}" aria-label="${esc(v.title)} 영상 보기 (${v.track}·${v.level}, ${fmtTime(v.dur)})">
    <div class="thumb"><img src="videos/${v.id}.jpg" alt="" loading="lazy"><div class="play">${icon('play', 46)}</div><span class="dur">${fmtTime(v.dur)}</span></div>
    <div class="body">
      <div class="tags"><span class="tag">${esc(v.track)}</span><span class="tag amber">${esc(v.level)}</span></div>
      <h3>${esc(v.title)}</h3>
      ${watchedBadgeHtml(watched)}
    </div>
  </button>`;
}
function bindVideoCards(root) {
  $$('[data-open-video]', root).forEach(b => b.addEventListener('click', () => { hap(10); go('player', { arg: { id: b.dataset.openVideo } }); }));
}

// ---------------- 학습(홈) ----------------
function renderHome() {
  $('#statWords').textContent = KSL_WORDS.length;
  $('#statVideos').textContent = VIDEO_LIST.length;
  const starters = VIDEO_LIST.filter(v => v.order === 1);
  $('#homeVideoGrid').innerHTML = starters.map(v => vcard(v)).join('');
  bindVideoCards($('#homeVideoGrid'));
  renderRoadmap(roadTrack);
}
let roadTrack = 'sign';
function roadmapFor(track) {
  if (track === 'sign') {
    return [
      { label: '1단계', title: '수어 단어 찾아보기', sub: '검증된 수어 224개 검색, 실제 영상으로 바로 확인', nav: 'sign' },
      { label: '2단계', title: '도전 퀴즈로 복습', sub: '10문제로 실력 확인', nav: 'quiz' }
    ];
  }
  return [
    { label: '1단계', title: '점자의 시작', sub: '6개의 점으로 읽는 세상', video: 'v1-braille-basics' },
    { label: '2단계', title: '한글 점자 ①', sub: '초성 자음 14개', video: 'v2-braille-initials' },
    { label: '3단계', title: '한글 점자 ②', sub: '모음·받침·낱말 쓰기', video: 'v3-braille-words' },
    { label: '4단계', title: '점자 패드 실습', sub: '내 이름을 점자로 바꿔 보기', nav: 'braille' }
  ];
}
function renderRoadmap(track) {
  const steps = roadmapFor(track);
  let nowSet = false;
  $('#roadList').innerHTML = steps.map(s => {
    const done = s.video ? store.get('watched:' + s.video, false) : false;
    const now = !done && !nowSet ? (nowSet = true, true) : false;
    return `<div class="rstep ${done ? 'done' : now ? 'now' : ''}">
      <div class="dot">${done ? icon('check', 14) : ''}</div>
      <div class="rbox" data-road="${s.video ? 'v:' + s.video : 'n:' + s.nav}">
        <div class="tt">${esc(s.label)} · ${esc(s.title)}<div class="sub">${esc(s.sub)}</div></div>
        <span style="color:var(--muted)">${icon('back', 16).replace('m15 5 8 12-7 7', '')}›</span>
      </div>
    </div>`;
  }).join('');
  $$('[data-road]', $('#roadList')).forEach(el => el.addEventListener('click', () => {
    const [kind, val] = el.dataset.road.split(':');
    hap(10);
    if (kind === 'v') go('player', { arg: { id: val } }); else go(val);
  }));
}
$('#roadTabSign').addEventListener('click', () => { roadTrack = 'sign'; $('#roadTabSign').classList.add('active'); $('#roadTabSign').setAttribute('aria-selected', 'true'); $('#roadTabBraille').classList.remove('active'); $('#roadTabBraille').setAttribute('aria-selected', 'false'); renderRoadmap('sign'); });
$('#roadTabBraille').addEventListener('click', () => { roadTrack = 'braille'; $('#roadTabBraille').classList.add('active'); $('#roadTabBraille').setAttribute('aria-selected', 'true'); $('#roadTabSign').classList.remove('active'); $('#roadTabSign').setAttribute('aria-selected', 'false'); renderRoadmap('braille'); });

// ---------------- 수어 스튜디오 ----------------
const TOPICS = [...new Set(KSL_WORDS.map(w => w.t))];
let signTopic = '전체', signQuery = '';
$('#signTopics').innerHTML = ['전체', ...TOPICS].map(t => `<button class="chip ${t === '전체' ? 'active' : ''}" data-topic="${esc(t)}" type="button">${esc(t)}</button>`).join('');
$$('[data-topic]', $('#signTopics')).forEach(b => b.addEventListener('click', () => { signTopic = b.dataset.topic; $$('[data-topic]', $('#signTopics')).forEach(x => x.classList.toggle('active', x === b)); renderSign(); hap(8); }));
$('#signSearch').addEventListener('input', e => { signQuery = e.target.value.trim(); renderSign(); });
function descHtml(d) {
  if (!d) return '<p class="desc">(설명 준비 중)</p>';
  return `<p class="desc">${esc(d)}</p>`;
}
function renderSign() {
  const q = signQuery.toLowerCase();
  const list = KSL_WORDS.filter(w => (signTopic === '전체' || w.t === signTopic) && (!q || w.w.toLowerCase().includes(q) || (w.d || '').toLowerCase().includes(q)));
  $('#signCount').textContent = `${list.length}개 단어 (전체 ${KSL_WORDS.length}개 중 신뢰도 80 이상만 보여 드려요)`;
  if (!list.length) { $('#signList').innerHTML = '<div class="empty">찾는 단어가 없어요. 다른 말로 검색해 보세요.</div>'; return; }
  $('#signList').innerHTML = list.slice(0, 60).map(w => {
    return `<div class="wordcard">
      <div class="top"><h3>${esc(w.w)}</h3><span class="acc">정확도 ${w.a}%</span></div>
      ${descHtml(w.d)}
      <p class="topic">${esc(w.t)}</p>
      ${signVisualHtml(w.w, [w.w])}
    </div>`;
  }).join('') + (list.length > 60 ? `<p class="note" style="text-align:center">검색어를 더 자세히 적으면 좁혀져요 (${list.length}개 중 60개 표시)</p>` : '');
  bindSignVisuals($('#signList'));
}

// ---------------- 점자 패드 ----------------
let padDots = new Set();
function renderPadCell() {
  $('#padCell').innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<button class="dot ${padDots.has(n) ? 'on' : ''}" data-dot="${n}" aria-pressed="${padDots.has(n)}" aria-label="${n}번 점">${n}</button>`).join('');
  $$('[data-dot]', $('#padCell')).forEach(b => b.addEventListener('click', () => {
    const n = Number(b.dataset.dot);
    padDots.has(n) ? padDots.delete(n) : padDots.add(n);
    hap(14); renderPadCell(); renderPadResult();
  }));
}
function renderPadResult() {
  if (!padDots.size) { $('#padResultChar').textContent = '점을 눌러 보세요'; $('#padResultKind').textContent = ''; return; }
  const r = dotsKeyToChar(Array.from(padDots));
  if (r) { $('#padResultChar').textContent = r.char; $('#padResultKind').textContent = r.kind + ' · ' + Array.from(padDots).sort((a, b) => a - b).join(', ') + '번 점'; }
  else { $('#padResultChar').textContent = '아직 없는 조합이에요'; $('#padResultKind').textContent = Array.from(padDots).sort((a, b) => a - b).join(', ') + '번 점'; }
}
$('#padReset').addEventListener('click', () => { padDots.clear(); hap(10); renderPadCell(); renderPadResult(); });
renderPadCell(); renderPadResult();

function dotIconHtml(on) { return `<i class="${on ? 'on' : ''}"></i>`; }
function miniDots(dots) { return `<div class="mini">${[1, 2, 3, 4, 5, 6].map(n => dotIconHtml(dots.includes(n))).join('')}</div>`; }
$('#bpInput').addEventListener('input', e => {
  const text = e.target.value.slice(0, 60);
  const cells = textToBrailleCells(text);
  $('#bpSummary').textContent = text ? `${cells.length}칸으로 바뀌었어요` : '글자를 입력하면 여기에 몇 칸인지 나와요';
  $('#bpCells').innerHTML = cells.map(c => `<div class="ccell ${c.verified === false ? 'unverified' : ''}">${miniDots(c.dots)}<label>${esc(c.char)}</label></div>`).join('');
});
const CHO_DOUBLES = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];
$('#choGuide').innerHTML = BRAILLE_CHO_ORDER.filter(ch => !CHO_DOUBLES.includes(ch)).map(ch => { const d = BRAILLE_CHO[ch]; return `<div class="guide-card"><div class="ch">${ch}</div>${miniDots(d.split('-').map(Number))}<div class="dn">${d}번</div></div>`; }).join('');
$('#choDoubleGuide').innerHTML = CHO_DOUBLES.map(ch => { const [a, b] = BRAILLE_CHO[ch]; return `<div class="guide-card"><div class="ch">${ch}</div><div style="display:flex;gap:6px;justify-content:center">${miniDots(a.split('-').map(Number))}${miniDots(b.split('-').map(Number))}</div><div class="dn">${a} · ${b}번</div></div>`; }).join('');
$('#jungGuide').innerHTML = BRAILLE_JUNG_ORDER.map(ch => { const d = BRAILLE_JUNG[ch]; return `<div class="guide-card"><div class="ch">${ch}</div>${miniDots(d.split('-').map(Number))}<div class="dn">${d}번</div></div>`; }).join('');
$('#brailleVideoGrid').innerHTML = VIDEO_LIST.filter(v => v.track === '점자').map(v => vcard(v)).join('');
bindVideoCards($('#brailleVideoGrid'));

// ---------------- 도전 퀴즈(수어·점자 따로) ----------------
// 수어 문제 풀: 설명이 있는 단어 전부
const QUIZ_POOL_SIGN = KSL_WORDS.filter(w => w.d && w.d.length < 130)
  .map(w => ({ answer: w.w, clueType: 'text', clue: w.d, group: w.t }));
// 점자 문제 풀: 검증된 자모·숫자·문장부호 전부(초성 14 · 종성 14 · 중성 10 · 숫자 10 · 문장부호 9)
function dotsArr(s) { return s.split('-').map(Number); }
const QUIZ_POOL_BRAILLE = [
  ...Object.entries(BRAILLE_CHO).filter(([, d]) => typeof d === 'string').map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: dotsArr(d), group: '초성' })),
  ...Object.entries(BRAILLE_JONG).map(([ch, d]) => ({ answer: ch + '(받침)', clueType: 'dots', clue: dotsArr(d), group: '종성' })),
  ...Object.entries(BRAILLE_JUNG).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: dotsArr(d), group: '중성' })),
  ...Object.entries(BRAILLE_NUMBERS).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: dotsArr(d), group: '숫자' })),
  ...Object.entries(BRAILLE_PUNCTUATION).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: dotsArr(d), group: '문장부호' }))
];
let quizState = { active: false };
function renderQuizIntro() {
  quizState = { active: false };
  $('#quizArea').innerHTML = `
    <div class="card" style="text-align:center">
      <h2 style="font-size:20px">수어 도전 퀴즈</h2>
      <p class="note" style="margin:14px 0">동작 설명을 읽고 어떤 수어인지 맞혀 보세요. 10문제, 목숨 3개예요. (문제 ${QUIZ_POOL_SIGN.length}개 중에서 매번 다르게 나와요)</p>
      <button class="btn primary block" data-quiz="sign">${icon('star', 16)} 수어 퀴즈 시작하기</button>
    </div>
    <div class="card" style="text-align:center;margin-top:14px">
      <h2 style="font-size:20px">점자 도전 퀴즈</h2>
      <p class="note" style="margin:14px 0">점 모양을 보고 어떤 글자인지 맞혀 보세요. 10문제, 목숨 3개예요. (문제 ${QUIZ_POOL_BRAILLE.length}개 중에서 매번 다르게 나와요)</p>
      <button class="btn primary block" data-quiz="braille">${icon('star', 16)} 점자 퀴즈 시작하기</button>
    </div>`;
  $$('[data-quiz]', $('#quizArea')).forEach(b => b.addEventListener('click', () => startQuiz(b.dataset.quiz)));
}
function startQuiz(type) {
  const pool = (type === 'braille' ? QUIZ_POOL_BRAILLE : QUIZ_POOL_SIGN);
  const qs = [...pool].sort(() => Math.random() - .5).slice(0, 10);
  quizState = { active: true, type, i: 0, score: 0, lives: 3, qs, answered: false };
  renderQuiz();
}
function pickChoices(correct, type) {
  const pool = type === 'braille' ? QUIZ_POOL_BRAILLE : QUIZ_POOL_SIGN;
  const sameGroup = pool.filter(w => w.group === correct.group && w.answer !== correct.answer);
  const others = pool.filter(w => w.answer !== correct.answer);
  const src = sameGroup.length >= 3 ? sameGroup : others;
  const picks = []; const used = new Set([correct.answer]);
  while (picks.length < 3 && used.size < src.length + 1) { const c = src[Math.floor(Math.random() * src.length)]; if (!used.has(c.answer)) { used.add(c.answer); picks.push(c.answer); } }
  return [correct.answer, ...picks].sort(() => Math.random() - .5);
}
function livesStarsHtml(lives) {
  return Array.from({ length: 3 }, (_, i) => `<span style="color:${i < lives ? 'var(--danger)' : 'var(--line)'}">${icon('star', 16)}</span>`).join('');
}
function quizOptHtml(o, i) {
  return `<button class="qopt" data-opt="${esc(o)}"><span class="num">${i + 1}</span>${esc(o)}</button>`;
}
function renderQuiz() {
  const s = quizState; if (!s.active) return;
  if (s.i >= s.qs.length || s.lives <= 0) return renderQuizResult();
  const q = s.qs[s.i];
  if (!q._opts) q._opts = pickChoices(q, s.type);
  const clueHtml = q.clueType === 'dots'
    ? `<div class="qclue qclue-dots">이 점자는 무슨 글자(${esc(q.group)})일까요?<div class="quizdots">${miniDots(q.clue)}</div></div>`
    : `<div class="qclue">다음 수어 동작이 의미하는 단어는 무엇일까요?<br><br>${esc(q.clue)}</div>`;
  $('#quizArea').innerHTML = `
    <div class="quizhead">
      <span style="font-weight:800">문제 ${s.i + 1} / ${s.qs.length}</span>
      <span class="lives" aria-label="남은 목숨 ${s.lives}개">${livesStarsHtml(s.lives)}</span>
    </div>
    <div class="progress" style="margin:10px 0 16px"><b style="width:${s.i / s.qs.length * 100}%"></b></div>
    ${clueHtml}
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px" id="quizOpts">
      ${q._opts.map((o, i) => quizOptHtml(o, i)).join('')}
    </div>
    <div id="quizFeedback" style="margin-top:14px" aria-live="polite"></div>
  `;
  $$('[data-opt]', $('#quizOpts')).forEach(b => b.addEventListener('click', () => answerQuiz(b, q)));
}
function feedbackMsgHtml(correct, answer) {
  if (correct) return '정답입니다! 잘하셨어요 🎉';
  return `아쉬워요. 정답은 「${esc(answer)}」예요.`;
}
function answerQuiz(btn, q) {
  if (quizState.answered) return; quizState.answered = true;
  const correct = btn.dataset.opt === q.answer;
  $$('[data-opt]', $('#quizOpts')).forEach(b => { b.disabled = true; if (b.dataset.opt === q.answer) b.classList.add('correct'); else if (b === btn) b.classList.add('wrong'); });
  if (correct) { quizState.score++; hap(16); } else { quizState.lives--; hap([30, 40, 30]); }
  $('#quizFeedback').innerHTML = `<div class="qfeedback ${correct ? 'ok' : 'bad'}">${feedbackMsgHtml(correct, q.answer)}</div>
    <button class="btn primary block" id="quizNext" style="margin-top:12px">${quizState.i + 1 >= quizState.qs.length || quizState.lives <= 0 ? '결과 보기' : '다음 문제로'} →</button>`;
  $('#quizNext').addEventListener('click', () => { quizState.i++; quizState.answered = false; renderQuiz(); });
}
function renderQuizResult() {
  const s = quizState; quizState.active = false;
  const pct = Math.round(s.score / s.qs.length * 100);
  $('#quizArea').innerHTML = `<div class="card qresult">
    <div class="score">${s.score} / ${s.qs.length}</div>
    <p class="note" style="margin:14px 0">${pct >= 80 ? '정말 잘했어요! 다음에도 도전해 보세요.' : pct >= 50 ? '좋아요! 조금만 더 연습하면 돼요.' : (s.type === 'braille' ? '점자 패드에서 다시 한 번 익혀 보면 어떨까요?' : '사전에서 다시 한 번 익혀 보면 어떨까요?')}</p>
    <div style="display:flex;gap:10px">
      <button class="btn ghost block" id="quizToVideo">${s.type === 'braille' ? '점자 패드 보기' : '수어 사전 보기'}</button>
      <button class="btn primary block" id="quizRetry">다시 도전</button>
    </div>
  </div>`;
  $('#quizRetry').addEventListener('click', () => startQuiz(s.type));
  $('#quizToVideo').addEventListener('click', () => go(s.type === 'braille' ? 'braille' : 'sign'));
}

// ---------------- 영상 플레이어 ----------------
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
function sizePlayerWrap() {
  const wrap = $('#view-player .player-wrap'); if (!wrap) return;
  wrap.style.height = Math.round(wrap.offsetWidth * 9 / 16 + 48) + 'px';
}
window.addEventListener('resize', sizePlayerWrap);
async function openPlayer(id) {
  const v = VIDEO_LIST.find(x => x.id === id); if (!v) return;
  $('#playerTitle').textContent = v.title;
  $('#playerDesc').textContent = v.desc;
  $('#playerTags').innerHTML = `<span class="tag">${esc(v.track)}</span><span class="tag amber">${esc(v.level)}</span><span class="tag" style="background:var(--surface2);color:var(--muted)">${fmtTime(v.dur)}</span>`;
  sizePlayerWrap();
  $('#playerVideo').src = `https://drive.google.com/file/d/${v.driveId}/preview`;
  store.set('watched:' + v.id, true);
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

// ---------------- 초기화 ----------------
renderHome(); renderSign();
const start = (location.hash || '#home').slice(1);
go(VIEWS.includes(start) ? start : 'home', { push: false });
})();
