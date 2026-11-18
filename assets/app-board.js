// 손빛 배움터 — 의견 게시판(익명, 일반 게시판 형태). 글·댓글은 Cloudflare 서버(functions/api/board)에 저장되고 누구나 읽을 수 있다.
// 화면: 목록(번호·제목·글쓴이·날짜·조회, 쪽 번호, 검색) / 글 보기(+댓글) / 글쓰기 / 이용 안내. 글 고치기는 2026-11-19 없앰(지우기만).
// 주소: #board(목록) #board/12(글) #board/write #board/rules — 뒤로 가기·새로 고침·주소 공유가 된다.
// 화면 동작 코드는 assets/app-*.js 로 나뉘어 있고 index.html 에서 app-core → … → app-player → app-board → app-start 순서로 읽힌다.
'use strict';
const BOARD_REASONS = ['욕설·혐오', '광고·도배', '개인정보', '기타'];
const BLIM = { titleMin: 2, textMin: 5, commentMin: 2, max: 10000, pwMin: 4 };   // 서버(functions/_lib/board.js LIM)와 같은 값
const board = { arg: { p: 'list', page: 1 }, lastList: { p: 'list', page: 1 }, opened: 0, sending: false, post: null, premod: false };
const bReported = () => { const a = store.get('breported', []); return Array.isArray(a) ? a : []; };   // 이 기기에서 이미 신고한 글(p12)·댓글(c5)
function bMarkReported(key) { const a = bReported(); if (!a.includes(key)) store.set('breported', a.concat(key).slice(-300), true); }
const p2 = n => String(n).padStart(2, '0');
function bDateFull(sec) { const d = new Date(sec * 1000); return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; }
// 목록 날짜: 오늘 글은 시:분, 올해 글은 월.일, 그 전은 연.월.일(일반 게시판처럼)
function bDateShort(sec) {
  const d = new Date(sec * 1000), n = new Date();
  if (d.toDateString() === n.toDateString()) return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (d.getFullYear() === n.getFullYear()) return `${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
  return `${String(d.getFullYear()).slice(2)}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
}
const bLen = s => [...s].length;
// 서버 부르기: 성공이든 실패든 { ok, status, data } 로 돌려준다(인터넷이 끊겼으면 status 0)
async function boardFetch(url, body) {
  try {
    const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok && data.ok !== false, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: { message: '인터넷에 연결되지 않았어요. 연결을 확인하고 다시 해 주세요.' } }; }
}

// ---------- 주소와 화면 ----------
function bHash(a) { return a.p === 'read' ? '#board/' + a.id : a.p === 'write' ? '#board/write' : a.p === 'rules' ? '#board/rules' : '#board'; }
function boardRoute(hash) {
  const m = String(hash || '').replace(/^#/, '').split('/');
  if (m[1] === 'write') return { p: 'write' };
  if (m[1] === 'rules') return { p: 'rules' };
  if (m[1] === 'edit' && +m[2] > 0) return { p: 'read', id: +m[2] };   // 고치기를 없애기 전의 주소(#board/edit/12)는 글 보기로
  if (+m[1] > 0) return { p: 'read', id: +m[1] };
  return { p: 'list', page: 1 };
}
// 게시판 안에서 옮겨 가기(how: push 새 기록 / replace 지금 기록 바꾸기)
function boardNav(a, how = 'push') {
  if (how === 'push') history.pushState({ view: 'board', arg: a }, '', bHash(a));
  else history.replaceState({ view: 'board', arg: a }, '', bHash(a));
  renderBoard(a, true);
}
function renderBoard(a, focus) {
  a = a || { p: 'list', page: 1 };
  board.arg = a;
  if (a.p === 'read') bRead(a, focus);
  else if (a.p === 'write') bWrite(a, focus);
  else if (a.p === 'rules') bRules(focus);
  else bList(a, focus);
}
function bShow(html, focus) {
  $('#boardPage').innerHTML = html;
  if (focus) { window.scrollTo(0, 0); const h = $('#bpH'); if (h) h.focus({ preventScroll: true }); }
}
const bErr = (msg, retry) => `<div class="note amber vfail" role="alert"><span>${esc(msg)}</span>${retry ? '<button type="button" class="btn line small" data-bretry>다시 불러오기</button>' : ''}<button type="button" class="btn line small" data-blist>목록</button></div>`;

// ---------- 목록 ----------
function bPager(page, pages) {
  if (pages <= 1) return '';
  const s = Math.floor((page - 1) / 10) * 10 + 1, e = Math.min(pages, s + 9);
  let h = '<nav class="bpager" aria-label="쪽 이동">';
  if (s > 1) h += `<button type="button" data-bpage="${s - 1}" aria-label="이전 10쪽">‹</button>`;
  for (let i = s; i <= e; i++) h += `<button type="button" data-bpage="${i}"${i === page ? ' aria-current="page"' : ''} aria-label="${i}쪽">${i}</button>`;
  if (e < pages) h += `<button type="button" data-bpage="${e + 1}" aria-label="다음 10쪽">›</button>`;
  return h + '</nav>';
}
function bRow(p) {
  const fresh = Date.now() / 1000 - p.created < 86400;
  const label = `${p.title}${p.ccount ? `, 댓글 ${p.ccount}개` : ''}${fresh ? ', 새 글' : ''}, 글쓴이 ${p.nick}, ${bDateFull(p.created)}, 조회 ${p.views}`;
  return `<li><a class="brow" href="#board/${p.id}" data-bid="${p.id}" aria-label="${esc(label)}">
    <span class="bno">${p.id}</span>
    <span class="bsub"><span class="bttl">${esc(p.title)}</span>${p.ccount ? `<span class="bcc">[${p.ccount}]</span>` : ''}${fresh ? '<span class="bnew">N</span>' : ''}</span>
    <span class="bnick">${esc(p.nick)}</span><span class="bdate">${bDateShort(p.created)}</span><span class="bviews"><span class="bvl">조회 </span>${p.views}</span></a></li>`;
}
async function bList(a, focus) {
  if (!$('#boardPage .btable')) bShow('<h2 class="visually-hidden" id="bpH" tabindex="-1">글 목록</h2><p class="note">글을 불러오는 중…</p>', focus);
  const qs = new URLSearchParams({ page: a.page || 1 });
  if (a.q) { qs.set('q', a.q); qs.set('field', a.field || 'all'); }
  const r = await boardFetch('/api/board?' + qs);
  if (board.arg !== a) return;                                   // 그사이 다른 화면으로 옮겨 갔으면 그리지 않는다
  if (!r.ok) { bShow('<h2 class="visually-hidden" id="bpH" tabindex="-1">글 목록</h2>' + bErr(r.data.message || '글을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.', true), focus); return; }
  const d = r.data; board.premod = !!d.premod; board.lastList = { ...a, page: d.page };
  const notice = !a.q && d.page === 1 ? `<li><a class="brow bnotice" href="#board/rules" data-brules aria-label="공지, 게시판 이용 안내"><span class="bno"><span class="bbadge">공지</span></span><span class="bsub"><span class="bbadge bbm">공지</span><span class="bttl">게시판 이용 안내</span></span><span class="bnick">운영자</span><span class="bdate"></span><span class="bviews"></span></a></li>` : '';
  const empty = a.q ? `<li class="bempty">「${esc(a.q)}」에 맞는 글이 없어요.</li>` : '<li class="bempty">아직 올라온 글이 없어요. 첫 글을 남겨 보세요.</li>';
  const F = [['all', '제목+내용'], ['title', '제목'], ['nick', '글쓴이']];
  bShow(`<h2 class="visually-hidden" id="bpH" tabindex="-1">글 목록</h2>
    <p class="bintro">손빛 배움터를 쓰며 느낀 점, 바라는 점을 이름 없이 남기는 곳이에요. 올라온 글은 누구나 볼 수 있어요.</p>
    ${board.premod ? '<p class="note amber">지금은 새 글과 댓글을 운영자가 확인한 뒤에 보여 드리고 있어요.</p>' : ''}
    <div class="bbar"><p class="bcount" role="status">${a.q ? `「${esc(a.q)}」 검색 결과 <b>${d.total}</b>개 <button type="button" class="blink" data-bclear>검색 지우기</button>` : `전체 <b>${d.total}</b>개`}</p>
      <button type="button" class="btn primary small bwrite" data-bwrite>${icon('pencil', 16)}<span>글쓰기</span></button></div>
    <ul class="btable" aria-label="글 목록">
      <li class="bth" aria-hidden="true"><span>번호</span><span>제목</span><span>글쓴이</span><span>날짜</span><span>조회</span></li>
      ${notice}${d.posts.length ? d.posts.map(bRow).join('') : empty}
    </ul>
    ${bPager(d.page, d.pages)}
    <form class="bsearch" id="bsForm" role="search">
      <label class="visually-hidden" for="bsField">검색할 곳</label>
      <select id="bsField">${F.map(([v, t]) => `<option value="${v}"${(a.field || 'all') === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <label class="visually-hidden" for="bsQ">검색어</label>
      <input id="bsQ" type="search" maxlength="40" placeholder="검색어" value="${esc(a.q || '')}" enterkeyhint="search">
      <button class="btn line small" type="submit">검색</button>
    </form>`, focus);
}

// ---------- 글 보기 + 댓글 ----------
function bComment(c) {
  const done = bReported().includes('c' + c.id);
  return `<li class="bcmt" data-cid="${c.id}"><div class="bcm-h"><b class="bwho">${esc(c.nick)}</b><span>${bDateFull(c.created)}</span></div>
    <p class="btext">${esc(c.text)}</p>
    <div class="bcm-a"><button type="button" class="blink" data-cdel="${c.id}">삭제</button><button type="button" class="blink" data-breport="c${c.id}"${done ? ' disabled' : ''}>${done ? '신고함' : '신고'}</button></div>
    <div class="bpanel" hidden></div></li>`;
}
async function bRead(a, focus) {
  // 댓글을 쓰거나 지운 뒤 다시 그릴 때는 「불러오는 중」으로 바꾸지 않는다(화면이 위로 튀지 않게)
  if (focus || !$('#boardPage .bread')) bShow('<h2 class="visually-hidden" id="bpH" tabindex="-1">글 보기</h2><p class="note">글을 불러오는 중…</p>', focus);
  const r = await boardFetch('/api/board/post?id=' + a.id);
  if (board.arg !== a) return;
  if (!r.ok) { bShow('<h2 class="visually-hidden" id="bpH" tabindex="-1">글 보기</h2>' + bErr(r.data.message || '글을 불러오지 못했어요.', r.status !== 404), focus); return; }
  const p = r.data.post, cs = r.data.comments; board.post = p; board.opened = Date.now();
  const done = bReported().includes('p' + p.id), nick = store.get('bnick', '');
  bShow(`<article class="bread card" aria-labelledby="bpH">
      <h2 id="bpH" class="bread-t" tabindex="-1">${esc(p.title)}</h2>
      <p class="bmeta2"><b class="bwho">${esc(p.nick)}</b><span>${bDateFull(p.created)}</span><span>조회 ${p.views}</span></p>
      <div class="btext bbody">${esc(p.text)}</div>
    </article>
    <div class="bacts"><button type="button" class="btn line small" data-blist>목록</button><span class="bsp"></span>
      <button type="button" class="btn ghost small" data-bown="delete">삭제</button>
      <button type="button" class="btn ghost small" data-breport="p${p.id}"${done ? ' disabled' : ''}>${done ? '신고함' : '신고'}</button></div>
    <div class="bpanel card" id="bPostPanel" hidden></div>
    <section class="bcomments card" aria-labelledby="bcH">
      <h3 id="bcH">댓글 <span class="bcc">${cs.length}</span></h3>
      <ul class="bclist">${cs.length ? cs.map(bComment).join('') : '<li class="bempty">첫 댓글을 남겨 보세요.</li>'}</ul>
      <form class="bcform" id="bcForm" novalidate>
        <div class="bwrow"><div><label class="lbl2" for="bcNick">닉네임</label><input class="bin" id="bcNick" maxlength="12" placeholder="익명" value="${esc(nick)}" autocomplete="off"></div>
          <div><label class="lbl2" for="bcPw">비밀번호</label><input class="bin" id="bcPw" type="password" maxlength="30" autocomplete="new-password" placeholder="지울 때 필요해요"></div></div>
        <label class="visually-hidden" for="bcText">댓글 내용</label>
        <textarea class="bptext" id="bcText" rows="3" placeholder="댓글을 남겨 보세요."></textarea>
        <input type="text" id="bcHp" class="visually-hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="note" id="bcMsg" role="status" hidden></p>
        <div class="bwbtns"><button type="submit" class="btn primary small">댓글 등록</button></div>
      </form>
    </section>`, focus);
}
function bPwForm(mode, id, label) {
  return `<form class="bpw" data-mode="${mode}" data-id="${id}" novalidate><label class="lbl2" for="bpw-${mode}-${id}">${label}</label>
    <div class="bpwrow"><input class="bin" type="password" id="bpw-${mode}-${id}" maxlength="30" autocomplete="current-password"><button type="submit" class="btn primary small">지우기</button><button type="button" class="btn ghost small" data-pclose>취소</button></div>
    <p class="note amber bpwmsg" role="alert" hidden></p></form>`;
}
function bReportForm(key) {
  return `<fieldset class="brep"><legend>어떤 이유로 신고할까요?</legend>${BOARD_REASONS.map((r, i) => `<label class="rsn"><input type="radio" name="rsn-${key}" value="${esc(r)}"${i === 0 ? ' checked' : ''}> ${esc(r)}</label>`).join('')}</fieldset>
    <div class="rbtns"><button type="button" class="btn danger small" data-rsend="${key}">신고 보내기</button><button type="button" class="btn ghost small" data-pclose>취소</button></div>`;
}
function bOpenPanel(panel, html) { panel.innerHTML = html; panel.hidden = false; const f = $('input', panel); if (f) f.focus(); }

// ---------- 글쓰기(2026-11-19 작업자님 요청으로 글 고치기는 없앰) ----------
function bWrite(a, focus) {
  bShow(`<form class="card bwform" id="bwForm" novalidate>
      <h2 id="bpH" tabindex="-1">글쓰기</h2>
      <p class="note">이름·전화번호 같은 개인정보와 링크·이메일은 올릴 수 없어요. 올린 글은 고칠 수 없으니 한 번 더 읽어 보고 올려 주세요. <button type="button" class="blink" data-brules>이용 안내</button></p>
      <div class="bwrow"><div><label class="lbl2" for="bwNick">닉네임</label><input class="bin" id="bwNick" maxlength="12" placeholder="익명" value="${esc(store.get('bnick', ''))}" autocomplete="off"></div>
        <div><label class="lbl2" for="bwPw">비밀번호</label><input class="bin" id="bwPw" type="password" maxlength="30" autocomplete="new-password" aria-describedby="bwPwHelp"></div></div>
        <p class="bhelp" id="bwPwHelp">비밀번호는 글을 지울 때 필요해요(4글자 이상). 잊으면 되찾을 수 없어요.</p>
      <label class="lbl2" for="bwTitle">제목</label><input class="bin" id="bwTitle" maxlength="100" autocomplete="off">
      <label class="lbl2" for="bwText">내용</label><textarea class="bptext" id="bwText" rows="10"></textarea>
      <input type="text" id="bwHp" class="visually-hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="note" id="bwMsg" role="status" hidden></p>
      <div class="bwbtns"><button type="button" class="btn line" data-bcancel>취소</button><button type="submit" class="btn primary" id="bwSubmit">등록</button></div>
    </form>`, focus);
  board.opened = Date.now();
}
function bMsg(sel, text, bad) { const m = $(sel); if (!m) return; m.textContent = text; m.hidden = !text; m.classList.toggle('amber', !!bad); m.setAttribute('role', bad ? 'alert' : 'status'); }

// ---------- 이용 안내(공지) ----------
function bRules(focus) {
  bShow(`<article class="card bread"><h2 id="bpH" class="bread-t" tabindex="-1"><span class="bbadge">공지</span> 게시판 이용 안내</h2>
    <ul class="boardrules">
      <li>손빛 배움터를 쓰며 느낀 점, 바라는 점, 하고 싶은 이야기를 <b>이름 없이</b> 남기는 곳이에요. 올라온 글과 댓글은 누구나 볼 수 있어요.</li>
      <li>이름·전화번호·주소 같은 <b>개인정보는 적지 마세요.</b> 링크와 이메일도 올릴 수 없어요.</li>
      <li>닉네임을 비우면 「익명」으로 보여요. 운영자로 오해할 수 있는 닉네임은 쓸 수 없어요.</li>
      <li>글과 댓글은 쓸 때 정한 <b>비밀번호로 직접 지울 수 있어요.</b> 올린 글은 고칠 수 없으니, 고치고 싶으면 지우고 다시 써 주세요. 비밀번호를 잊으면 되찾을 수 없으니, 지워야 할 글이 있으면 「신고」를 눌러 주세요.</li>
      <li><b>욕설이 들어간 글·댓글·닉네임은 올릴 수 없어요.</b> 다른 사람을 헐뜯거나 괴롭히는 글, 광고는 운영자가 지우고, 서로 다른 세 분이 신고하면 자동으로 숨겨져요.</li>
      <li>도배를 막으려고 글은 10분에 2개·하루 5개, 댓글은 10분에 5개·하루 30개까지 올릴 수 있어요.</li>
      <li>접속 주소는 도배를 막고 조회수를 세려고 알아볼 수 없는 형태로 잠깐만 쓰고, 글에는 남기지 않아요.</li>
    </ul></article>
    <div class="bacts"><button type="button" class="btn line small" data-blist>목록</button></div>`, focus);
}

// ---------- 버튼·입력 ----------
$('#boardBack').innerHTML = icon('back', 20);
$('#boardBack').addEventListener('click', () => {
  const s = history.state;
  if (s && s.view && !s.first) history.back();                   // 사이트 안에서 옮겨 왔으면 바로 앞 화면으로
  else if (board.arg.p !== 'list') boardNav({ p: 'list', page: 1 });
  else go('home');
});
$('#btnBoard').querySelector('.bi').innerHTML = icon('chat', 18);
$('#btnBoard').addEventListener('click', () => { if ($('#view-board').classList.contains('active')) boardNav({ p: 'list', page: 1 }); else go('board'); });

$('#view-board').addEventListener('click', async e => {
  const t = e.target;
  const row = t.closest('[data-bid]');
  if (row) { e.preventDefault(); boardNav({ p: 'read', id: +row.dataset.bid }); return; }
  if (t.closest('[data-brules]')) { e.preventDefault(); boardNav({ p: 'rules' }); return; }
  if (t.closest('[data-bwrite]')) { boardNav({ p: 'write' }); return; }
  if (t.closest('[data-blist]')) { boardNav({ ...board.lastList }); return; }
  if (t.closest('[data-bretry]')) { renderBoard(board.arg, true); return; }
  if (t.closest('[data-bclear]')) { boardNav({ p: 'list', page: 1 }); return; }
  if (t.closest('[data-bcancel]')) { if (history.state && history.state.view && !history.state.first) history.back(); else boardNav({ ...board.lastList }, 'replace'); return; }
  const pg = t.closest('[data-bpage]');
  if (pg) { boardNav({ ...board.arg, page: +pg.dataset.bpage }); return; }
  if (t.closest('[data-pclose]')) { const panel = t.closest('.bpanel'); panel.hidden = true; panel.innerHTML = ''; return; }
  const own = t.closest('[data-bown]');
  if (own) {                                                     // 글 삭제: 글을 쓸 때 정한 비밀번호를 묻는다
    bOpenPanel($('#bPostPanel'), bPwForm('delete', board.post.id, '이 글을 지울까요? 글을 쓸 때 정한 비밀번호를 넣어 주세요. 댓글도 함께 지워져요.'));
    return;
  }
  const cdel = t.closest('[data-cdel]');
  if (cdel) { bOpenPanel($('.bpanel', cdel.closest('.bcmt')), bPwForm('cdel', cdel.dataset.cdel, '댓글을 쓸 때 정한 비밀번호를 넣어 주세요.')); return; }
  const rep = t.closest('[data-breport]');
  if (rep) {
    const key = rep.dataset.breport, panel = key[0] === 'c' ? $('.bpanel', rep.closest('.bcmt')) : $('#bPostPanel');
    bOpenPanel(panel, bReportForm(key)); return;
  }
  const send = t.closest('[data-rsend]');
  if (send) {
    const key = send.dataset.rsend, kind = key[0] === 'c' ? 'comment' : 'post', id = +key.slice(1), panel = send.closest('.bpanel');
    const reason = ($('input:checked', panel) || {}).value;
    send.disabled = true;
    const r = await boardFetch('/api/board/report', { kind, id, reason });
    if (!r.ok && r.status !== 404) { send.disabled = false; toast(r.data.message || '신고하지 못했어요. 잠시 뒤에 다시 해 주세요.'); return; }
    bMarkReported(key);
    if (kind === 'post' && (r.data.hidden || r.status === 404)) { toast('신고했어요. 이 글은 확인이 끝날 때까지 숨겨졌어요.'); boardNav({ ...board.lastList }, 'replace'); return; }
    if (kind === 'comment' && (r.data.hidden || r.status === 404)) { toast('신고했어요. 이 댓글은 확인이 끝날 때까지 숨겨졌어요.'); bRead(board.arg, false); return; }
    panel.hidden = true; panel.innerHTML = '';
    const b = $(`[data-breport="${key}"]`); if (b) { b.disabled = true; b.textContent = '신고함'; }
    toast('신고했어요. 운영자가 확인할게요.');
  }
});

$('#view-board').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'bsForm') {                                       // 검색
    const q = $('#bsQ').value.replace(/\s+/g, ' ').trim();
    if (!q) { boardNav({ p: 'list', page: 1 }); return; }
    if (bLen(q) < 2) { toast('검색어를 두 글자 이상 넣어 주세요.'); return; }
    boardNav({ p: 'list', page: 1, q, field: $('#bsField').value }); return;
  }
  if (f.classList.contains('bpw')) {                             // 비밀번호 확인(글 삭제, 댓글 삭제)
    const mode = f.dataset.mode, id = +f.dataset.id, pw = $('input', f).value, btn = $('button[type=submit]', f), msg = $('.bpwmsg', f);
    if (!pw) { msg.textContent = '비밀번호를 넣어 주세요.'; msg.hidden = false; return; }
    btn.disabled = true;
    const r = mode === 'cdel' ? await boardFetch('/api/board/comment', { action: 'delete', id, pw }) : await boardFetch('/api/board/post', { action: 'delete', id, pw });
    btn.disabled = false;
    if (!r.ok) { msg.textContent = r.data.message || '처리하지 못했어요.'; msg.hidden = false; $('input', f).select(); return; }
    if (mode === 'delete') { toast('글을 지웠어요.'); boardNav({ ...board.lastList }, 'replace'); return; }
    toast('댓글을 지웠어요.'); bRead(board.arg, false); return;
  }
  if (f.id === 'bwForm') {                                       // 글쓰기
    if (board.sending) return;
    const title = $('#bwTitle').value.replace(/\s+/g, ' ').trim(), text = $('#bwText').value.trim();
    const nick = $('#bwNick').value.trim(), pw = $('#bwPw').value;
    const stop = (m, el) => { bMsg('#bwMsg', m, true); if (el) $(el).focus(); };
    if (bLen(pw) < BLIM.pwMin) return stop(`비밀번호를 ${BLIM.pwMin}글자 이상 정해 주세요. 나중에 글을 지울 때 필요해요.`, '#bwPw');
    if (bLen(title) < BLIM.titleMin) return stop('제목을 2글자 이상 적어 주세요.', '#bwTitle');
    if (bLen(text) < BLIM.textMin) return stop('내용을 5글자 이상 적어 주세요.', '#bwText');
    if (bLen(text) > BLIM.max) return stop(`내용이 너무 길어요. 10,000글자까지 쓸 수 있어요(지금 ${bLen(text).toLocaleString('ko-KR')}글자).`, '#bwText');
    board.sending = true; $('#bwSubmit').disabled = true; bMsg('#bwMsg', '올리는 중…');
    const r = await boardFetch('/api/board', { title, text, nick, pw, hp: $('#bwHp').value, ms: Date.now() - board.opened });
    board.sending = false; const sb = $('#bwSubmit'); if (sb) sb.disabled = false;
    if (!r.ok) { bMsg('#bwMsg', r.data.message || '올리지 못했어요. 잠시 뒤에 다시 해 주세요.', true); return; }
    store.set('bnick', nick, true);
    if (r.data.pending) { toast('올렸어요. 운영자가 확인한 뒤에 다른 분들께 보여요.'); boardNav({ p: 'list', page: 1 }, 'replace'); return; }
    toast('글을 올렸어요. 고맙습니다.');
    boardNav({ p: 'read', id: r.data.id }, 'replace'); return;
  }
  if (f.id === 'bcForm') {                                       // 댓글 쓰기
    if (board.sending) return;
    const text = $('#bcText').value.trim(), nick = $('#bcNick').value.trim(), pw = $('#bcPw').value;
    const stop = (m, el) => { bMsg('#bcMsg', m, true); $(el).focus(); };
    if (bLen(text) < BLIM.commentMin) return stop('댓글을 2글자 이상 적어 주세요.', '#bcText');
    if (bLen(text) > BLIM.max) return stop(`댓글이 너무 길어요. 10,000글자까지 쓸 수 있어요(지금 ${bLen(text).toLocaleString('ko-KR')}글자).`, '#bcText');
    if (bLen(pw) < BLIM.pwMin) return stop(`비밀번호를 ${BLIM.pwMin}글자 이상 정해 주세요. 댓글을 지울 때 필요해요.`, '#bcPw');
    board.sending = true; bMsg('#bcMsg', '올리는 중…');
    const r = await boardFetch('/api/board/comment', { action: 'add', post_id: board.post.id, text, nick, pw, hp: $('#bcHp').value, ms: Date.now() - board.opened });
    board.sending = false;
    if (!r.ok) { bMsg('#bcMsg', r.data.message || '올리지 못했어요. 잠시 뒤에 다시 해 주세요.', true); return; }
    store.set('bnick', nick, true);
    if (r.data.pending) { $('#bcText').value = ''; $('#bcPw').value = ''; bMsg('#bcMsg', '올렸어요. 운영자가 확인한 뒤에 다른 분들께 보여요.'); return; }
    toast('댓글을 올렸어요.');
    await bRead(board.arg, false);
    const last = $$('.bcmt'); if (last.length) last[last.length - 1].scrollIntoView({ block: 'center' });
  }
});
