// 손빛 배움터 — 학습(홈): 교육 영상 두 자리(기초 영상·점자 교육 칸), 학습 로드맵, 이어서 하기, 내 학습 기록(내보내기·가져오기·지우기)
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
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
  $('#basicSub').textContent = `${vs.length}편 · 모두 ${fmtSpan(totalDur(vs))}`;
  $('#homeVideoList').innerHTML = vs.map(v => vrowHtml(v, next)).join('');
  $('#homeVideoList').classList.toggle('n4', vs.length >= 4);   // 4편이면 컴퓨터 화면에서 한 줄에 4개(조금 좁은 화면은 2개씩)
}
// 점자 탭의 「교육 영상」 칸
function renderLearnPanel() {
  const vs = learnVideos();
  const next = (vs.find(v => !isSeen(v.id)) || {}).id;
  $('#learnProg').textContent = seenCount(vs) + ' / ' + vs.length + '편 봤어요';
  const intro = homeVideos().filter(v => v.track === '점자');   // 학습 페이지 「기초 영상」에 있는 점자 영상(점자의 시작)을 먼저 보라고 알려 준다
  // 작업자님이 정한 문구(2026-11-20): 「돼요.」에서 줄을 바꿔 두 줄로
  const span = fmtSpan(totalDur(vs)), last = span.charCodeAt(span.length - 1) - 0xAC00;
  const ieyo = last >= 0 && last % 28 ? '이에요' : '예요';   // 「13분 9초예요」「13분이에요」
  $('#learnSub').textContent = `한글 점자를 차례로 익히는 영상이에요. 위에서부터 보면 돼요.\n${vs.length}편을 모두 보면 ${span}${ieyo}.${intro.length ? ` 처음이라면 학습 페이지 「기초 영상」의 「${shortName(intro[0])}」부터 보세요.` : ''}`;
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
      { title: '수어 단어 찾아보기', sub: '수어 ' + ALL_WORDS.length.toLocaleString('ko-KR') + '개를 영상으로', nav: 'sign', did: 'sign' },
      { title: '수어 퀴즈로 복습', sub: '틀린 문제는 다시 풀 수 있어요', nav: 'quiz', did: 'quiz-sign', review: wrongOf(['sv', 'pv']) }
    ];
  } else {
    steps = [
      basic,
      { title: '점자 교육 영상 보기', sub: `한글 점자 ①~⑥ ${lv.length}편 · ${prog(lv)}`, vids: lv, act: 'braillelearn' },
      { title: '점자 연습 패드·변환기 써 보기', sub: '내 이름을 점자로 바꿔 보기', nav: 'braille', did: 'braille' },
      { title: '점자 퀴즈로 복습', sub: '읽기와 쓰기 문제', nav: 'quiz', did: 'quiz-braille', review: wrongOf(['br', 'bu']) }
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
const recordText = () => JSON.stringify({ app: 'sonbit', version: 1, exportedAt: new Date().toISOString(), data: collectRecord() }, null, 1);
// 내보내기(2026-11-20 작업자님 제보: 「알 수 없는 오류」로 안 받아짐 — 보안 프로그램·앱 안 브라우저 등은 파일 내려받기를 막는다. 사이트는 그걸 알 수 없다)
// ① 휴대폰은 공유 창(파일 저장·카카오톡 보내기) ② 그 밖에는 파일 내려받기 ③ 어느 쪽이든 「글로 복사하기」를 함께 보여 준다
$('#recExport').addEventListener('click', async () => {
  const text = recordText(), name = 'sonbit-record-' + new Date().toISOString().slice(0, 10) + '.json';
  $('#recCopyRow').hidden = false;
  if (navigator.canShare && window.matchMedia && matchMedia('(pointer: coarse)').matches) {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '손빛 배움터 기록' }); setRecStatus('기록 파일을 보냈어요. 다른 기기에서 「기록 가져오기」로 불러오세요.'); return; }
      catch (e) { if (e && e.name === 'AbortError') { setRecStatus('보내기를 취소했어요. 아래 「기록을 글로 복사하기」로도 옮길 수 있어요.'); return; } }
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  setRecStatus(`기록 파일(${name}) 내려받기를 시작했어요. 브라우저의 다운로드 목록에 없거나 오류가 나면 아래 「기록을 글로 복사하기」를 써 주세요.`);
});
// 글로 복사하기: 복사가 막히면 글 칸을 보여 주고 모두 골라 둔다
$('#recCopy').addEventListener('click', async () => {
  const text = recordText(), box = $('#recCopyText');
  try {
    if (!navigator.clipboard) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    box.hidden = true;
    setRecStatus('기록을 글로 복사했어요. 메모장이나 카카오톡 「나와의 채팅」에 붙여 두었다가, 옮길 기기에서 「파일 대신 글로 붙여 넣어 가져오기」에 넣으세요.');
  } catch (e) {
    box.value = text; box.hidden = false; box.focus(); box.select();
    setRecStatus('자동 복사가 막혀 있어요. 위 칸의 글을 모두 골라(길게 누르기 또는 Ctrl+A) 복사해 주세요.');
  }
});
// 글로 붙여 넣어 가져오기
$('#recPasteOpen').addEventListener('click', () => {
  const row = $('#recPasteRow'), open = row.hidden;
  row.hidden = !open; $('#recPasteOpen').setAttribute('aria-expanded', String(open));
  if (open) $('#recPaste').focus();
});
$('#recPasteGo').addEventListener('click', () => {
  const text = $('#recPaste').value.trim();
  if (!text) { setRecStatus('붙여 넣은 글이 없어요. 「기록을 글로 복사하기」로 복사한 글을 위 칸에 붙여 넣어 주세요.'); $('#recPaste').focus(); return; }
  if (text.length > 600 * 1024) { setRecStatus('글이 너무 길어요. 손빛에서 복사한 기록만 가져올 수 있어요.'); return; }
  const r = importRecord(text); setRecStatus(r.msg); toast(r.ok ? '기록을 가져왔어요' : '가져오지 못했어요');
  if (r.ok) { $('#recPaste').value = ''; $('#recPasteRow').hidden = true; $('#recPasteOpen').setAttribute('aria-expanded', 'false'); }
  renderHome();
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
