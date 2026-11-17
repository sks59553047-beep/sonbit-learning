// 손빛 배움터 — 수어 사전: 주제·검색·초성, 단어 목록과 펼친 단어(영상·그림·뜻·손모양)
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
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
