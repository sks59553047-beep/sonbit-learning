// 손빛 배움터 — 메인 로직(순수 자바스크립트, 서버 없음). 데이터: ksl-data.js(수어 단어 사전) · braille.js(점자 변환) · video-data.js(교육 영상 5편)
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
const TITLES = { home: '손빛 배움터', sign: '수어 사전', braille: '점자 패드', quiz: '도전 퀴즈', player: '영상 보기' };
let playerReturnTo = 'home';
function go(view, opts) {
  opts = opts || {};
  VIEWS.forEach(v => $('#view-' + v).classList.toggle('active', v === view));
  $$('.navbtn').forEach(b => { const on = b.dataset.nav === view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#pageTitle').textContent = TITLES[view] || '손빛 배움터';
  if (view !== 'player') { $('#main').scrollTop = 0; window.scrollTo(0, 0); setPlayerSrc(''); }
  if (opts.push !== false) history.pushState({ view, arg: opts.arg }, '', '#' + view);
  if (view === 'player' && opts.arg) openPlayer(opts.arg.id);
  if (view === 'quiz' && !quizState.active) renderQuizIntro();
}
$$('[data-nav]').forEach(el => el.addEventListener('click', () => { hap(10); if (el.dataset.nav !== 'player') playerReturnTo = el.dataset.nav; go(el.dataset.nav); }));
window.addEventListener('popstate', e => { const v = (e.state && e.state.view) || 'home'; go(v, { push: false, arg: e.state && e.state.arg }); });
$('#playerBack').addEventListener('click', () => { history.back(); });

// ---------------- 단어 하나의 "실제 영상" 블록(수어 사전·학습 페이지 공용) ----------------
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
function aliasHtml(w) {
  return w.al ? `<p class="alias">같은 수어: ${esc(w.al)}</p>` : '';
}
function signVisualHtml(w) {
  return w.k ? kslVideoBoxHtml(w.k, w.w, w.id) : '';
}
function bindSignVisuals() { }

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
  $('#statWords').textContent = ALL_WORDS.length;
  $('#statVideos').textContent = VIDEO_LIST.length;
  $('#statBraille').textContent = Object.keys(BRAILLE_CHO).length + Object.keys(BRAILLE_JONG).length + Object.keys(BRAILLE_JUNG).length;
  const starters = VIDEO_LIST.filter(v => v.order === 1);
  $('#homeVideoGrid').innerHTML = starters.map(v => vcard(v)).join('');
  bindVideoCards($('#homeVideoGrid'));
  renderRoadmap(roadTrack);
}
let roadTrack = 'sign';
function roadmapFor(track) {
  if (track === 'sign') {
    return [
      { label: '1단계', title: '수어 단어 찾아보기', sub: '수어 ' + ALL_WORDS.length + '개 검색, 국립국어원 실제 영상으로 바로 확인', nav: 'sign' },
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

// ---------------- 수어 사전 ----------------
const ALL_WORDS = KSL_WORDS.concat(KSL_EXTRA.map(x => ({ id: 'N' + x.i, w: x.w, t: x.t, x: true, g: x.g, e: x.e, k: '/signFile/video/' + x.m })));
const TOPIC_ORDER = ['몸·건강·긴급', '인사·예절', '대답·질문', '사람·가족', '감정', '마음·생각', '성격·태도', '음식', '돈·쇼핑', '장소·이동', '시간·날짜', '날씨·색·크기', '하루 생활', '물건·소지품', '열기·시작·찾기', '말·소통', '학교·일·직업', '사회·제도', '법·사건', '자연·동식물', '나라·지명', '숫자·돈 단위', '일반 단어'];
const TOPIC_ICON = { '몸·건강·긴급': '🚑', '인사·예절': '👋', '대답·질문': '💬', '사람·가족': '👨‍👩‍👧', '감정': '😊', '마음·생각': '💭', '성격·태도': '🙂', '음식': '🍚', '돈·쇼핑': '🛍️', '장소·이동': '🏫', '시간·날짜': '⏰', '날씨·색·크기': '🌤️', '하루 생활': '🏠', '물건·소지품': '🎒', '열기·시작·찾기': '🔑', '말·소통': '🗣️', '학교·일·직업': '🎓', '사회·제도': '🏛️', '법·사건': '⚖️', '자연·동식물': '🌳', '나라·지명': '🗺️', '숫자·돈 단위': '🔢', '일반 단어': '📖' };
const TOPICS = TOPIC_ORDER.filter(t => ALL_WORDS.some(w => w.t === t)).concat([...new Set(ALL_WORDS.map(w => w.t))].filter(t => !TOPIC_ORDER.includes(t)));
let signTopic = '', signQuery = '', signCho = '';
const CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO_MAIN = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO_FOLD = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
function choOf(str) {
  return [...str].map(ch => { const c = ch.charCodeAt(0); return (c >= 0xAC00 && c <= 0xD7A3) ? CHO_LIST[Math.floor((c - 0xAC00) / 588)] : ch; }).join('');
}
function firstCho(w) { const c = choOf(w.w).charAt(0); return CHO_FOLD[c] || c; }
function byName(a, b) { return a.w.localeCompare(b.w, 'ko'); }
function hasRealVideo(w) { return !!w.k; }
function matchWord(w, q) {
  if (!q) return true;
  if (w.w.toLowerCase().includes(q)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(q)) return choOf(w.w).includes(q);
  if (w.x) return (w.g || '').toLowerCase().includes(q);
  if ((w.al || '').toLowerCase().includes(q)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(q) && w.al) return choOf(w.al).includes(q);
  return (w.d || '').toLowerCase().includes(q);
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
  return `<p class="desc">${esc(t)}</p>${officialNoteHtml(w)}`;
}
function officialBlockHtml(w) {
  const o = officialOf(w); if (!o) return '';
  return `<p class="lbl">동작 설명</p><p class="motion">${esc(fingerNames(o[0]))}</p>${officialNoteHtml(w)}`;
}
function topicCardHtml(t) {
  const n = ALL_WORDS.filter(w => w.t === t).length;
  const urgent = t === '몸·건강·긴급' ? ' urgent' : '';
  return `<button class="topiccard${urgent}" data-topic="${esc(t)}" type="button"><span class="ti">${TOPIC_ICON[t] || '✋'}</span><span class="tn">${esc(t)}</span><span class="tc">${n}개</span></button>`;
}
function wordRowHtml(w, showTopic) {
  const play = hasRealVideo(w) ? '<span class="vbadge" title="실제 수어 영상 있음">▶</span>' : '<span class="vbadge none">▶</span>';
  const topic = showTopic ? `<span class="wtopic">${esc(w.t)}</span>` : '';
  const sub = w.x ? `<span class="wsub">${esc((w.g || '').split(' / ')[0].slice(0, 24))}</span>` : (w.al ? `<span class="wsub">${esc(w.al.replace(/, /g, ' · '))}</span>` : '');
  return `<details class="wordrow" data-wid="${esc(w.id)}"><summary><span class="wname">${esc(w.w)}</span>${sub}${topic}${play}</summary><div class="wbody"></div></details>`;
}
// 누리사전 공식 정보(한 손/두 손, 손모양, 손 위치) — 국립국어원 자료 그대로
function signInfoHtml(w) {
  const inf = typeof KSL_INFO !== 'undefined' ? KSL_INFO[String(w.id).slice(1)] : null;
  if (!inf) return '';
  let html = '<div class="signinfo">';
  {
    const names = inf[1].map(b => KSL_HAND_NAME[b]).filter(Boolean);
    const pos = KSL_POS_NAME[inf[2]] || '';
    const hands = inf[1].map(b => `<span class="hs"><img src="assets/hand/${b}.jpg" alt="" loading="lazy"><b>${esc(KSL_HAND_NAME[b] || '')}</b></span>`).join('');
    const posHtml = pos ? `<span class="hs"><img src="assets/pos/${inf[2]}.jpg" alt="" loading="lazy"><b>${esc(pos)}</b></span>` : '';
    const sentence = `${inf[0] === 1 ? '한 손' : '두 손'}으로 하는 수어예요.` + (names.length ? ` 손모양은 ${names.join(', ')}` : '') + (pos ? `, 손 위치는 ${pos} 쪽이에요.` : '.');
    html += `<p class="lbl">손모양과 위치</p><p class="motion">${esc(sentence)}</p><div class="hsrow">${hands}${posHtml}</div>`;
  }
  return html + '</div>';
}
function extraBodyHtml(w) {
  const senses = (w.g || '').split(' / ').filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('');
  const exs = (w.e || '').split(/(?<=[.?!]),\s*/).filter(Boolean).slice(0, 3).map(s => `<li>${esc(s)}</li>`).join('');
  const exBlock = exs ? `<p class="lbl">예문</p><ul class="exlist">${exs}</ul>` : '';
  return `<p class="lbl">뜻</p><ul class="exlist">${senses}</ul>${exBlock}${kslVideoBoxHtml(w.k, w.w, w.id)}${officialBlockHtml(w)}${signInfoHtml(w)}`;
}
function fillWordBody(det) {
  const body = det.querySelector('.wbody');
  if (body.dataset.ready) return;
  const w = ALL_WORDS.find(x => String(x.id) === det.dataset.wid); if (!w) return;
  body.innerHTML = w.x ? extraBodyHtml(w) : descHtml(w) + aliasHtml(w) + signVisualHtml(w);
  body.dataset.ready = '1';
  bindSignVisuals(body);
}
function choChipsHtml(list) {
  const present = new Set(list.map(firstCho));
  const chips = ['전체'].concat(CHO_MAIN.filter(c => present.has(c)));
  if ([...present].some(c => !CHO_MAIN.includes(c))) chips.push('기타');
  return chips.map(c => `<button class="chip${(signCho || '전체') === c ? ' active' : ''}" data-cho="${c}" type="button">${c}</button>`).join('');
}
function renderSign() {
  const q = signQuery.toLowerCase();
  const searching = !!q;
  const inTopic = !searching && !!signTopic;
  $('#signTopics').hidden = searching || inTopic;
  $('#signTopicHead').hidden = !inTopic;
  $('#signCho').hidden = true;
  let list = searching ? ALL_WORDS.filter(w => matchWord(w, q)) : (inTopic ? ALL_WORDS.filter(w => w.t === signTopic) : []);
  if (!searching && !inTopic) {
    $('#signTopics').innerHTML = TOPICS.map(topicCardHtml).join('');
    $$('[data-topic]', $('#signTopics')).forEach(b => b.addEventListener('click', () => { signTopic = b.dataset.topic; signCho = ''; hap(8); renderSign(); window.scrollTo(0, 0); }));
    $('#signCount').hidden = false; $('#signCount').textContent = `주제를 눌러 단어를 찾아보세요 · 전체 ${ALL_WORDS.length}개`;
    $('#signList').innerHTML = '';
    return;
  }
  if (inTopic) {
    $('#signTopicName').textContent = (TOPIC_ICON[signTopic] || '') + ' ' + signTopic;
    list = list.slice().sort(byName);
    if (list.length > 40) {
      $('#signCho').hidden = false; $('#signCho').innerHTML = choChipsHtml(list);
      $$('[data-cho]', $('#signCho')).forEach(b => b.addEventListener('click', () => { signCho = b.dataset.cho === '전체' ? '' : b.dataset.cho; hap(8); renderSign(); }));
      if (signCho === '기타') list = list.filter(w => !CHO_MAIN.includes(firstCho(w)));
      else if (signCho) list = list.filter(w => firstCho(w) === signCho);
    }
  }
  $('#signCount').hidden = false;
  $('#signCount').textContent = searching ? `검색 결과 ${list.length}개` : `${list.length}개 단어 · 눌러서 뜻과 영상 보기`;
  if (!list.length) { $('#signList').innerHTML = '<div class="empty">찾는 단어가 없어요. 다른 말로 검색해 보세요.</div>'; return; }
  $('#signList').innerHTML = list.slice(0, 150).map(w => wordRowHtml(w, searching)).join('') + (list.length > 150 ? `<p class="note" style="text-align:center">검색어를 더 자세히 적으면 좁혀져요 (${list.length}개 중 150개 표시)</p>` : '');
}
$('#signTopicBack').innerHTML = icon('back', 20);
$('#signTopicBack').addEventListener('click', () => { signTopic = ''; renderSign(); window.scrollTo(0, 0); });
$('#signSearch').addEventListener('input', e => { signQuery = e.target.value.trim(); renderSign(); });
$('#signList').addEventListener('toggle', e => { if (e.target.open) fillWordBody(e.target); }, true);
$('#signList').addEventListener('error', e => {
  const el = e.target;
  if (el.tagName === 'VIDEO') {
    const box = el.closest('.signmedia'); if (box && !box.dataset.failed) { box.dataset.failed = '1'; box.innerHTML = '<p class="note amber" style="flex:1 1 100%">영상을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</p>'; }
  } else if (el.tagName === 'IMG' && el.closest('.shapeimg')) { el.closest('.shapeimg').remove(); }
}, true);

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
$('#jungCompoundGuide').innerHTML = BRAILLE_JUNG_COMPOUND_ORDER.map(ch => {
  const raw = BRAILLE_JUNG[ch];
  if (Array.isArray(raw)) return `<div class="guide-card"><div class="ch">${ch}</div><div style="display:flex;gap:6px;justify-content:center">${raw.map(r => miniDots(r.split('-').map(Number))).join('')}</div><div class="dn">${raw.join(' · ')}번</div></div>`;
  return `<div class="guide-card"><div class="ch">${ch}</div>${miniDots(raw.split('-').map(Number))}<div class="dn">${raw}번</div></div>`;
}).join('');
$('#brailleVideoGrid').innerHTML = VIDEO_LIST.filter(v => v.track === '점자').map(v => vcard(v)).join('');
bindVideoCards($('#brailleVideoGrid'));

// ---------------- 도전 퀴즈(수어·점자 따로) ----------------
// 수어 문제 풀: 설명이 있는 단어 전부
const QUIZ_POOL_SIGN_TEXT = ALL_WORDS.filter(w => { const t = descOf(w); return t && t.length < 130 && !t.includes(w.w); })
  .map(w => ({ answer: w.w, clueType: 'text', clue: descOf(w), group: w.t }));
// 영상 문제 풀: 영상이 있는 단어 전부(영상을 보고 뜻을 맞히기)
const QUIZ_POOL_SIGN_VIDEO = ALL_WORDS.filter(w => w.k && w.w.length <= 8 && !/[~\-]/.test(w.w))
  .map(w => ({ answer: w.w, clueType: 'video', clue: (typeof MEDIA_VIDEO !== 'undefined' && MEDIA_VIDEO.has(w.id)) ? `assets/media/${w.id}.mp4` : w.k, group: w.t }));
const QUIZ_POOL_SIGN = QUIZ_POOL_SIGN_TEXT.concat(QUIZ_POOL_SIGN_VIDEO);
// 점자 문제 풀: 검증된 자모·숫자·문장부호 전부(2칸짜리 된소리·복합모음 포함)
function cellsOf(v) { return (Array.isArray(v) ? v : [v]).map(x => x.split('-').map(Number)); }
const QUIZ_POOL_BRAILLE = [
  ...Object.entries(BRAILLE_CHO).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: cellsOf(d), group: '초성' })),
  ...Object.entries(BRAILLE_JONG).map(([ch, d]) => ({ answer: ch + '(받침)', clueType: 'dots', clue: cellsOf(d), group: '종성' })),
  ...Object.entries(BRAILLE_JUNG).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: cellsOf(d), group: '중성' })),
  ...Object.entries(BRAILLE_NUMBERS).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: cellsOf(d), group: '숫자' })),
  ...Object.entries(BRAILLE_PUNCTUATION).map(([ch, d]) => ({ answer: ch, clueType: 'dots', clue: cellsOf(d), group: '문장부호' }))
];
function clueCellsHtml(cells) { return '<div style="display:flex;gap:10px;justify-content:center">' + cells.map(miniDots).join('') + '</div>'; }
let quizState = { active: false };
function renderQuizIntro() {
  quizState = { active: false };
  $('#quizArea').innerHTML = `
    <div class="card" style="text-align:center">
      <h2 style="font-size:20px">수어 도전 퀴즈</h2>
      <p class="note" style="margin:14px 0">동작 설명을 읽거나 수어 영상을 보고 어떤 뜻인지 맞혀 보세요. 10문제, 목숨 3개예요. (문제 ${QUIZ_POOL_SIGN.length}개 중에서 매번 다르게 나와요)</p>
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
  const shuffle = a => [...a].sort(() => Math.random() - .5);
  const qs = type === 'braille'
    ? shuffle(QUIZ_POOL_BRAILLE).slice(0, 10)
    : shuffle(shuffle(QUIZ_POOL_SIGN_TEXT).slice(0, 4).concat(shuffle(QUIZ_POOL_SIGN_VIDEO).slice(0, 6)));
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
function quizClueHtml(q) {
  if (q.clueType === 'dots') return `<div class="qclue qclue-dots">이 점자는 무슨 글자(${esc(q.group)})일까요?<div class="quizdots">${clueCellsHtml(q.clue)}</div></div>`;
  if (q.clueType === 'video') return `<div class="qclue">이 수어 영상이 뜻하는 단어는 무엇일까요?<video class="kslvideo qvideo" src="${esc(kslUrl(q.clue))}" autoplay loop muted playsinline controls preload="auto"></video></div>`;
  return `<div class="qclue">다음 수어 동작이 의미하는 단어는 무엇일까요?<br><br>${esc(q.clue)}</div>`;
}
function renderQuiz() {
  const s = quizState; if (!s.active) return;
  if (s.i >= s.qs.length || s.lives <= 0) return renderQuizResult();
  const q = s.qs[s.i];
  if (!q._opts) q._opts = pickChoices(q, s.type);
  const clueHtml = quizClueHtml(q);
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
  }
  old.replaceWith(f);
}
async function openPlayer(id) {
  const v = VIDEO_LIST.find(x => x.id === id); if (!v) return;
  $('#playerTitle').textContent = v.title;
  $('#playerDesc').textContent = v.desc;
  $('#playerTags').innerHTML = `<span class="tag">${esc(v.track)}</span><span class="tag amber">${esc(v.level)}</span><span class="tag" style="background:var(--surface2);color:var(--muted)">${fmtTime(v.dur)}</span>`;
  setPlayerSrc(v.id);
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
