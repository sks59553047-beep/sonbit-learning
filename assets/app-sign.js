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
  // 2026-11-20: 이모지를 한때 뺐다가(「AI 티」 평가) 너무 밋밋하다고 해서 작은 아이콘으로 되살림(카드는 두 줄 촘촘한 배치 그대로)
  return `<button class="topiccard${urgent}" data-topic="${esc(t)}" type="button"><span class="ti" aria-hidden="true">${TOPIC_ICON[t] || '✋'}</span><span class="tn">${esc(t)}</span><span class="tc">${TOPIC_COUNT[t] || 0}개</span></button>`;
}
function shortcutsHtml() {
  const n = favWords().length;
  return `<button class="shortcut fav" data-topic="${FAV_TOPIC}" type="button"><span class="sci" aria-hidden="true">★</span><span><span class="scn">내 단어장</span><span class="scc">${n ? n + '개 담음' : '담아 둔 수어 모음'}</span></span></button>
    <button class="shortcut" data-topic="${NUM_TOPIC}" type="button"><span class="sci num" aria-hidden="true">123</span><span><span class="scn">기본 숫자</span><span class="scc">영·일~구·십·백·천·만</span></span></button>`;
}
function favBtnHtml(w) {
  const on = isFav(w.id);
  return `<button type="button" class="favbtn" data-fav="${esc(w.id)}" aria-pressed="${on}"><span class="fs" aria-hidden="true">★</span><span class="fl">${on ? '단어장에 담김' : '단어장에 담기'}</span></button>`;
}
function wordRowHtml(w, showTopic) {
  const play = hasRealVideo(w) ? '<span class="vbadge" title="실제 수어 영상 있음">▶</span>' : '<span class="vbadge none">▶</span>';
  const topic = showTopic ? `<span class="wtopic">${esc(w.t)}</span>` : '';
  const sub = w.x ? `<span class="wsub">${esc(senseShown(w, showTopic))}</span>` : (w.al ? `<span class="wsub">${esc(w.al.replace(/, /g, ' · '))}</span>` : '');
  const fav = `<span class="favmark" role="img" aria-label="단어장에 담긴 단어"${isFav(w.id) ? '' : ' hidden'}>★</span>`;
  const same = SAME_NAME.get(String(w.id));
  const mark = same ? `<span class="wmark" title="이름이 같은 수어 ${same[1]}개 중 ${same[0]}번째">${sameMark(w)}</span>` : '';
  return `<details class="wordrow" data-wid="${esc(w.id)}"><summary><span class="wname">${esc(w.w)}</span>${mark}${fav}${sub}${topic}${play}</summary><div class="wbody"></div></details>`;
}
// 목록 줄의 뜻풀이: 보통은 첫 뜻, 검색해서 뜻풀이로 찾은 단어는 검색어가 든 뜻을 보여 준다(「밥」 → 「싫다」가 왜 나왔는지 보이게, 2026-11-20)
function senseShown(w, searching) {
  const senses = (w.g || '').split(' / ').filter(Boolean); let s = senses[0] || '';
  const raw = searching ? signQuery.trim().toLowerCase() : '', q = normQ(raw);
  let key = raw;
  if (q && !normQ(w.w.toLowerCase()).includes(q)) {
    let hit = senses.find(x => normQ(x.toLowerCase()).includes(q));
    if (!hit) {   // 말끝을 바꾼 꼴로 찾은 단어(괜찮아요 → 「같다」의 「괜찮다」)는 그 꼴이 든 뜻을
      const fs = [...baseForms(q).all].filter(f => f.length >= 2 && f !== q);
      for (const f of fs) { hit = senses.find(x => normQ(x.toLowerCase()).includes(f)); if (hit) { key = f; break; } }
    }
    if (hit) s = hit;
  }
  if (s.length <= 24) return s;
  const i = key ? s.toLowerCase().indexOf(key) : -1;
  return i > 14 ? '…' + s.slice(i - 6, i + 17) : s.slice(0, 24);
}
// 이름이 같은 수어가 여럿이면 펼친 단어 맨 위에 알려 준다
function sameNameNoteHtml(w) {
  const s = SAME_NAME.get(String(w.id)); if (!s) return '';
  return `<p class="samenote">「${esc(w.w)}」 수어는 사전에 ${s[1]}가지가 있어요(지금 보는 것은 ${sameMark(w)}). ${w.x ? '아래 뜻과 예문으로' : '설명과 영상으로'} 어떤 때 쓰는지 비교해 보세요. <button type="button" class="linkbtn" data-suggest="${esc(w.w)}">${s[1]}가지 모두 보기</button></p>`;
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
  const share = `<button type="button" class="sharebtn" data-share="${esc(w.id)}"><span aria-hidden="true">🔗</span> 링크 공유</button>`;
  const actions = `<div class="wactions">${favBtnHtml(w)}${share}</div>` + sameNameNoteHtml(w);
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
  const chips = sug.length ? `<div><p class="lbl" style="font-size:.8125rem;font-weight:800;color:var(--teal);margin-bottom:6px">이런 단어는 어때요?</p><div class="suggest">${sug.map(w => `<button type="button" class="chip" data-suggest="${esc(w)}">${esc(w)}</button>`).join('')}</div></div>` : '';
  return `<div class="card nores"><h3>「${esc(raw)}」에 맞는 수어를 찾지 못했어요</h3>
    <ul><li>띄어쓰기 없이 더 짧게 써 보세요. (예: 「학교 가다」 → 「학교」)</li><li>자음만 써도 찾을 수 있어요. (예: ㅎㄱ)</li><li>비슷한 뜻의 다른 말로도 찾아보세요.</li><li>이 사전에는 국립국어원 사전에서 영상을 확인한 ${ALL_WORDS.length.toLocaleString('ko-KR')}개 표현만 있어요. 없는 단어는 국립국어원 한국수어사전에서 직접 찾아볼 수 있어요.</li></ul>
    ${chips}<button type="button" class="btn line" data-act="signtopics">주제로 찾아보기</button></div>`;
}
// 띄어 쓴 말을 나눠 찾을 때 낱말 하나: 이름이 맞는 것(순위 2 이내)을 먼저, 없으면 조사를 떼고(「이름이」 → 「이름」), 그래도 없으면 뜻풀이까지.
// 한 글자 낱말은 이름·기본형이 똑같은 것만. 낱말마다 많아야 3개(「잘 가」가 「잘하다」로 가득 차지 않게)
const JOSA_END = /(이랑|에서|으로|한테|에게|께서|은|는|이|가|을|를|에|로|도|만|의|과|와|랑)$/;
function partWords(p) {
  const near = x => { if (x.length > 1) return searchWords(x).filter(w => rankWord(w, x) <= 2); const ex = ALL_WORDS.filter(w => w.w === x); return ex.length ? ex : ALL_WORDS.filter(w => w.w === x + '다'); };   // 한 글자: 「가」·「가다」만
  let r = near(p);
  if (!r.length && p.length > 1 && JOSA_END.test(p)) { const s = p.replace(JOSA_END, ''); if (s) r = near(s); }
  if (!r.length && p.length > 1) r = searchWords(p);
  return r.slice(0, 3);
}
function searchWords(q) {
  return ALL_WORDS.filter(w => matchWord(w, q)).map((w, i) => ({ w, r: rankWord(w, q), i })).sort((a, b) => a.r - b.r || a.i - b.i).map(o => o.w);
}
function renderSign() {
  markWordEntryStale();   // 목록을 새로 그리면 펼친 단어가 닫히므로, 그 기록은 「이미 닫힘」으로
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
  let list, splitNote = '';
  if (searching) {
    list = searchWords(q);
    // 띄어 쓴 말(「병원 가요」·「화장실 어디」)로 하나도 못 찾으면 낱말마다 나눠 찾는다. 한 글자 낱말은 이름·기본형이 똑같은 것만
    if (!list.length && /\S\s+\S/.test(q.trim())) {
      const parts = q.trim().split(/\s+/), seen = new Set();
      list = [];
      parts.forEach(p => partWords(p).forEach(w => { if (!seen.has(w.id)) { seen.add(w.id); list.push(w); } }));
      if (list.length) splitNote = ` · 「${parts.join('」·「')}」로 나눠 찾았어요`;
    }
    if (signPinId) { const k = list.findIndex(x => String(x.id) === String(signPinId)); if (k > 0) list.unshift(list.splice(k, 1)[0]); }
  } else if (signTopic === FAV_TOPIC) list = favWords();
  else if (signTopic === NUM_TOPIC) list = basicNumberWords();
  else list = ALL_WORDS.filter(w => w.t === signTopic).sort(byName);
  if (inTopic) {
    $('#signTopicName').textContent = (signTopic === FAV_TOPIC ? '★ ' : TOPIC_ICON[signTopic] ? TOPIC_ICON[signTopic] + ' ' : '') + signTopic;
    if (signTopic === FAV_TOPIC && list.length) { $('#signActions').hidden = false; $('#signActions').innerHTML = favQuizBtnHtml(list.length); }
    if (list.length > 40 && signTopic !== FAV_TOPIC && signTopic !== NUM_TOPIC) {
      $('#signCho').hidden = false; $('#signCho').innerHTML = choChipsHtml(list);
      if (signCho === '기타') list = list.filter(w => !CHO_MAIN.includes(firstCho(w)));
      else if (signCho) list = list.filter(w => firstCho(w) === signCho);
    }
  }
  $('#signCount').hidden = searching && !list.length;
  $('#signCount').textContent = searching ? `검색 결과 ${list.length}개${splitNote}` : `${list.length}개 단어 · 눌러서 뜻과 영상 보기`;
  if (!list.length) {
    if (searching) $('#signList').innerHTML = noResultHtml(signQuery);
    else if (signTopic === FAV_TOPIC) $('#signList').innerHTML = '<div class="empty">아직 담은 단어가 없어요.<br>단어를 펼쳐서 「단어장에 담기」를 눌러 보세요.</div>';
    else $('#signList').innerHTML = '<div class="empty">이 주제에는 단어가 없어요.</div>';
    return;
  }
  signShown = { list, searching, n: Math.min(SIGN_PAGE, list.length) };
  $('#signList').innerHTML = list.slice(0, signShown.n).map(w => wordRowHtml(w, searching)).join('') + moreBtnHtml();
}
function favQuizBtnHtml(n) { return `<button class="btn primary small" type="button" data-act="quizkind" data-arg="fav">단어장 퀴즈 풀기 (${n}개)</button>`; }
// 「내 단어장」 목록에서 단어를 빼면(2026-11-21 실사용 평가: 뺀 뒤에도 단어·「퀴즈 풀기(3개)」가 그대로) 퀴즈 개수·단어 수는 바로 바꾸고,
// 줄은 바로 지우지 않고 흐리게 「단어장에서 뺌」으로 남긴다 — 실수로 눌렀으면 그 자리에서 다시 담을 수 있게. 목록을 다시 열면 빠져 있다
function markUnfav(row, off) {
  row.classList.toggle('unfav', off);
  const tag = row.querySelector('summary .unfavtag');
  if (off && !tag) row.querySelector('summary .wname').insertAdjacentHTML('afterend', '<span class="unfavtag">단어장에서 뺌</span>');
  if (!off && tag) tag.remove();
  const n = favWords().length;
  $('#signActions').hidden = !n; $('#signActions').innerHTML = n ? favQuizBtnHtml(n) : '';
  $('#signCount').textContent = `${n}개 단어 · 눌러서 뜻과 영상 보기`;
}
// 목록은 150개씩 보여 주고, 끝에 「더 보기」(2026-11-20 외부 평가: 「일반 단어」 342개 중 150개만 보이던 것)
const SIGN_PAGE = 150;
let signShown = { list: [], searching: false, n: 0 };
function moreBtnHtml() {
  const { list, n } = signShown, left = list.length - n;
  return left > 0 ? `<button type="button" class="btn line block signmore" data-signmore>더 보기 (${n.toLocaleString('ko-KR')} / ${list.length.toLocaleString('ko-KR')}개)</button>` : '';
}
// 이미 펼친 단어는 그대로 두고, 다음 150개를 뒤에 붙인 뒤 새로 붙은 첫 단어로 초점을 옮긴다
function showMoreWords() {
  const { list, searching, n } = signShown, next = list.slice(n, n + SIGN_PAGE);
  if (!next.length) return;
  const btn = $('#signList [data-signmore]');
  btn.insertAdjacentHTML('beforebegin', next.map(w => wordRowHtml(w, searching)).join(''));
  signShown.n = n + next.length;
  const first = $(`#signList .wordrow[data-wid="${CSS.escape(String(next[0].id))}"] summary`);
  btn.outerHTML = moreBtnHtml();
  if (first) first.focus();
}
$('#signHome').addEventListener('click', e => {
  const b = e.target.closest('[data-topic]'); if (!b) return;
  signTopic = b.dataset.topic; signCho = ''; renderSign(); window.scrollTo(0, 0);
});
$('#signTopicBack').addEventListener('click', () => { signTopic = ''; signCho = ''; renderSign(); window.scrollTo(0, 0); });
$('#signSearch').addEventListener('input', e => {
  signQuery = e.target.value.trim(); signPinId = ''; renderSign();
  if (/^#sign\//.test(location.hash)) history.replaceState(signEntry ? { view: 'sign', wordStale: true } : { view: 'sign' }, '', '#sign');   // 다른 단어를 찾기 시작하면 주소에서 단어 번호를 뗀다
});
$('#signCho').addEventListener('click', e => { const b = e.target.closest('[data-cho]'); if (!b) return; signCho = b.dataset.cho === '전체' ? '' : b.dataset.cho; renderSign(); });
$('#signActions').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) dispatchAct(b.dataset.act, b.dataset.arg); });
// ---------- 단어 바로가기 주소(2026-11-19): #sign/단어번호(예: #sign/N421, #sign/KSL-0001) ----------
// 퀴즈 해설 「사전에서 다시 보기」와 공유받은 링크가 모두 이 길로 그 단어를 펼쳐 보여 준다.
function openWordInDictionary(w) {
  store.set('track', 'sign');
  go('sign', { arg: { wid: w.id } });
}
// go('sign', { arg: { wid } }) 에서 부른다: 그 단어를 검색해 맨 위에 놓고 펼친다
function showSignWord(wid) {
  const w = WORD_BY_ID.get(String(wid)); if (!w) return;
  signTopic = ''; signCho = ''; signQuery = w.w; signPinId = w.id;
  $('#signSearch').value = w.w;
  renderSign();
  const row = [...$$('#signList .wordrow')].find(r => r.dataset.wid === String(w.id));
  if (row) { row.open = true; setTimeout(() => row.scrollIntoView({ block: 'center' }), 80); }
}
// 주소(#sign/번호)에서 단어를 찾는다. 없는 번호면 안내하고 수어 첫 화면으로
function signRoute(hash) {
  const id = decodeURIComponent(String(hash || '').replace(/^#/, '').split('/')[1] || '');
  if (!id) return undefined;
  if (WORD_BY_ID.has(id)) return { wid: id };
  setTimeout(() => toast('링크의 수어를 찾지 못했어요. 주제나 검색으로 찾아 주세요.'), 300);
  return undefined;
}
function wordLink(w) { return location.origin + location.pathname + '#sign/' + encodeURIComponent(w.id); }
// 휴대폰은 공유 창(카카오톡·문자 등), 컴퓨터는 링크 복사. 복사가 막히면 링크 칸을 보여 주고 골라 둔다
async function shareWord(w, btn) {
  const url = wordLink(w), title = `「${w.w}」 수어 — 손빛 배움터`;
  if (navigator.share && window.matchMedia && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title, text: title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try {
    if (!navigator.clipboard) throw new Error('no clipboard');
    await navigator.clipboard.writeText(url);
    toast(`「${w.w}」 링크를 복사했어요. 붙여 넣어 보내 주세요.`);
  } catch (e) {
    const box = btn.closest('.wactions');
    let inp = box.querySelector('.sharelink');
    if (!inp) { inp = document.createElement('input'); inp.className = 'sharelink'; inp.readOnly = true; inp.setAttribute('aria-label', '이 수어의 링크'); box.appendChild(inp); }
    inp.value = url; inp.focus(); inp.select();
    toast('링크를 복사하지 못했어요. 아래 칸의 주소를 길게 눌러 복사해 주세요.');
  }
}
// ---------- 뒤로 가기 = 펼친 단어 닫기(2026-11-21 실사용 평가) ----------
// 단어를 직접 펼치면(줄 누르기·이전/다음 단추) 기록을 한 칸 남긴다. 여러 단어를 펼쳐도 한 칸만(뒤로 가기를 여러 번 누르지 않게).
// 뒤로 가기·앞으로 가기 처리는 app-core.js 의 popstate 에 있다.
function noteWordOpen(wid) {
  const st = { view: 'sign', wordOpen: String(wid) };
  if (signEntry) history.replaceState(st, '', location.hash);
  else history.pushState(st, '', location.hash);
  signEntry = 'open';
}
function markWordEntryStale() {
  if (signEntry !== 'open') return;
  history.replaceState({ view: 'sign', wordStale: true }, '', location.hash);
  signEntry = 'stale';
}
function closeOpenWords() {
  const rows = $$('#signList .wordrow[open]'); if (!rows.length) return false;
  rows.forEach(r => { $$('video', r).forEach(v => v.pause()); r.open = false; });
  const s = rows[rows.length - 1].querySelector('summary'); if (s) s.focus({ preventScroll: true });
  return true;
}
function reopenWord(wid) {
  const row = $(`#signList .wordrow[data-wid="${CSS.escape(String(wid))}"]`);
  if (row) row.open = true;
}
$('#signList').addEventListener('toggle', e => { if (e.target.open) { fillWordBody(e.target); updateWordNav(e.target); markDid('sign'); } }, true);
// ---------- 이전/다음 단어(2026-11-20): 펼친 단어 맨 아래에서 목록의 앞뒤 단어로 바로 넘어간다 ----------
// 앞뒤는 지금 보이는 목록(주제·검색 결과) 순서. 마지막 단어 뒤에 「더 보기」가 남아 있으면 다음 150개를 붙이고 넘어간다.
function rowNeighbor(det, dir) {
  let el = dir < 0 ? det.previousElementSibling : det.nextElementSibling;
  while (el && !el.classList.contains('wordrow') && !el.matches('[data-signmore]')) el = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
  if (el && el.matches('[data-signmore]')) { const n = signShown.n; return n < signShown.list.length ? { more: true, w: signShown.list[n] } : null; }
  return el ? { row: el, w: WORD_BY_ID.get(el.dataset.wid) } : null;
}
function updateWordNav(det) {
  const body = det.querySelector('.wbody'); if (!body) return;
  let nav = body.querySelector('.wnav'); if (nav) nav.remove();
  const p = rowNeighbor(det, -1), n = rowNeighbor(det, 1);
  if (!p && !n) return;
  const b = (dir, x, label) => x && x.w ? `<button type="button" class="wnavbtn ${dir}" data-wnav="${dir}"><span class="wl">${label}</span><b>${esc(wordLabel(x.w))}</b></button>` : '';
  body.insertAdjacentHTML('beforeend', `<nav class="wnav" aria-label="앞뒤 단어">${b('prev', p, '‹ 이전 단어')}${b('next', n, '다음 단어 ›')}</nav>`);
}
function goWordNeighbor(det, dir) {
  let nb = rowNeighbor(det, dir); if (!nb) return;
  if (nb.more) { showMoreWords(); nb = rowNeighbor(det, dir); if (!nb || !nb.row) return; }
  $$('video', det).forEach(v => v.pause());
  det.open = false;
  nb.row.open = true;
  noteWordOpen(nb.row.dataset.wid);
  nb.row.scrollIntoView({ block: 'start' });
  const s = nb.row.querySelector('summary'); if (s) s.focus({ preventScroll: true });
}
$('#signList').addEventListener('click', e => {
  const sm = e.target.closest('summary');
  if (sm && sm.parentElement.classList.contains('wordrow')) {
    const row = sm.parentElement;
    if (!row.open) noteWordOpen(row.dataset.wid);
    else if (signEntry === 'open' && $$('#signList .wordrow[open]').length === 1) markWordEntryStale();   // 마지막 펼친 단어를 직접 닫음
    return;
  }
  if (e.target.closest('[data-signmore]')) { showMoreWords(); return; }
  const wn = e.target.closest('[data-wnav]');
  if (wn) { goWordNeighbor(wn.closest('.wordrow'), wn.dataset.wnav === 'prev' ? -1 : 1); return; }
  const sb = e.target.closest('[data-share]');
  if (sb) { const w = WORD_BY_ID.get(sb.dataset.share); if (w) shareWord(w, sb); return; }
  const fb = e.target.closest('[data-fav]');
  if (fb) {
    const id = fb.dataset.fav, on = toggleFav(id);
    if (on === null) { toast('단어장에 저장하지 못했어요. ' + STORE_FAIL_WHY); return; }
    fb.setAttribute('aria-pressed', String(on)); fb.querySelector('.fl').textContent = on ? '단어장에 담김' : '단어장에 담기';
    const row = fb.closest('.wordrow'); if (row) { const m = row.querySelector('.favmark'); if (m) m.hidden = !on; }
    if (row && signTopic === FAV_TOPIC && !normQ(signQuery.toLowerCase())) markUnfav(row, !on);
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
