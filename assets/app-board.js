// 손빛 배움터 — 의견 게시판(익명). 글은 Cloudflare 서버(functions/api/board)에 저장되고 누구나 읽을 수 있다.
// 화면 동작 코드는 assets/app-*.js 7개 + 이 파일로 나뉘어 있고 index.html 에서 app-core → … → app-player → app-board → app-start 순서로 읽힌다.
'use strict';
const BOARD_REASONS = ['욕설·혐오', '광고·도배', '개인정보', '기타'];
const board = { posts: [], more: false, loading: false, opened: 0, premod: false, sending: false };
const reportedIds = () => { const a = store.get('reported', []); return Array.isArray(a) ? a : []; };   // 이 기기에서 이미 신고한 글(다시 누르지 않게 표시만, 서버도 중복을 막음)
function boardDate(sec) { const d = new Date(sec * 1000), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function boardPostHtml(p) {
  const done = reportedIds().includes(p.id);
  return `<article class="bpost" data-id="${p.id}"><p class="btext">${esc(p.text)}</p>
    <div class="bmeta"><time datetime="${new Date(p.created * 1000).toISOString()}">${boardDate(p.created)}</time>
    <button type="button" class="blink" data-report="${p.id}"${done ? ' disabled' : ''} aria-label="${done ? '이미 신고한 글' : '이 글 신고하기'}">${done ? '신고함' : '신고'}</button></div>
    <div class="breport" hidden></div></article>`;
}
// 서버 부르기: 성공이든 실패든 { ok, status, data } 로 돌려준다(인터넷이 끊겼으면 status 0)
async function boardFetch(url, opts) {
  try {
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok && data.ok !== false, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: { message: '인터넷에 연결되지 않았어요. 연결을 확인하고 다시 해 주세요.' } }; }
}
function drawBoard() {
  const list = $('#boardList');
  list.innerHTML = board.posts.length ? board.posts.map(boardPostHtml).join('') : '<p class="note">아직 올라온 글이 없어요. 첫 글을 남겨 보세요.</p>';
  $('#boardMore').hidden = !board.more;
  const pm = $('#boardPremod'); pm.hidden = !board.premod;
}
async function loadBoard(more) {
  if (board.loading) return;
  board.loading = true;
  const btn = $('#boardMore'); if (more) { btn.disabled = true; btn.textContent = '불러오는 중…'; } else $('#boardList').innerHTML = '<p class="note">글을 불러오는 중…</p>';
  const before = more && board.posts.length ? board.posts[board.posts.length - 1].id : 0;
  const r = await boardFetch('/api/board' + (before ? '?before=' + before : ''));
  board.loading = false; btn.disabled = false; btn.textContent = '더 보기';
  if (!r.ok) {
    if (more) { toast(r.data.message || '글을 불러오지 못했어요.'); return; }
    $('#boardList').innerHTML = `<div class="note amber vfail" role="alert"><span>${esc(r.data.message || '글을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.')}</span><button type="button" class="btn line small" id="boardRetry">다시 불러오기</button></div>`;
    $('#boardMore').hidden = true; return;
  }
  board.posts = more ? board.posts.concat(r.data.posts) : r.data.posts;
  board.more = !!r.data.more; board.premod = !!r.data.premod;
  drawBoard();
}
function renderBoard() { board.opened = Date.now(); $('#boardMsg').hidden = true; loadBoard(false); }
function boardCount() { $('#boardCount').textContent = [...$('#boardText').value].length + ' / 500'; }
function boardMsg(text, bad) { const m = $('#boardMsg'); m.textContent = text; m.hidden = !text; m.classList.toggle('amber', !!bad); m.setAttribute('role', bad ? 'alert' : 'status'); }

$('#boardBack').innerHTML = icon('back', 20);
$('#boardBack').addEventListener('click', () => { history.back(); });
$('#btnBoard').querySelector('.bi').innerHTML = icon('chat', 18);
$('#btnBoard').addEventListener('click', () => { if (!$('#view-board').classList.contains('active')) go('board'); });
$('#boardText').addEventListener('input', boardCount);
$('#boardForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (board.sending) return;
  const text = $('#boardText').value.trim();
  if ([...text].length < 5) { boardMsg('5글자 이상 적어 주세요.', true); $('#boardText').focus(); return; }
  board.sending = true; $('#boardSubmit').disabled = true; boardMsg('올리는 중…');
  const r = await boardFetch('/api/board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, hp: $('#boardHp').value, ms: Date.now() - board.opened }) });
  board.sending = false; $('#boardSubmit').disabled = false;
  if (!r.ok) { boardMsg(r.data.message || '올리지 못했어요. 잠시 뒤에 다시 해 주세요.', true); return; }
  $('#boardText').value = ''; boardCount();
  if (r.data.pending) boardMsg('올렸어요. 운영자가 확인한 뒤에 다른 분들께 보여요.');
  else { boardMsg('올렸어요. 고맙습니다.'); board.posts.unshift({ id: r.data.id, text: r.data.text, created: r.data.created }); drawBoard(); }
});
$('#view-board').addEventListener('click', async e => {
  if (e.target.closest('#boardMore')) { loadBoard(true); return; }
  if (e.target.closest('#boardRetry')) { loadBoard(false); return; }
  const open = e.target.closest('[data-report]');
  if (open) {                                         // 「신고」: 글 아래에 이유 고르는 칸을 연다
    const art = open.closest('.bpost'), panel = $('.breport', art), id = Number(open.dataset.report);
    if (!panel.hidden) { panel.hidden = true; return; }
    panel.innerHTML = `<fieldset><legend>어떤 이유로 신고할까요?</legend>${BOARD_REASONS.map((r, i) => `<label class="rsn"><input type="radio" name="rsn${id}" value="${esc(r)}"${i === 0 ? ' checked' : ''}> ${esc(r)}</label>`).join('')}</fieldset>
      <div class="rbtns"><button type="button" class="btn danger small" data-send="${id}">신고 보내기</button><button type="button" class="btn ghost small" data-cancel="1">취소</button></div>`;
    panel.hidden = false; $('input', panel).focus(); return;
  }
  if (e.target.closest('[data-cancel]')) { const panel = e.target.closest('.breport'); panel.hidden = true; $('[data-report]', panel.closest('.bpost')).focus(); return; }
  const send = e.target.closest('[data-send]');
  if (send) {
    const id = Number(send.dataset.send), art = send.closest('.bpost'), panel = $('.breport', art), reason = ($('input:checked', panel) || {}).value;
    send.disabled = true;
    const r = await boardFetch('/api/board/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, reason }) });
    if (!r.ok && r.status !== 404) { send.disabled = false; toast(r.data.message || '신고하지 못했어요. 잠시 뒤에 다시 해 주세요.'); return; }
    const rep = reportedIds(); if (!rep.includes(id)) store.set('reported', rep.concat(id).slice(-200), true);
    if (r.data.hidden || r.status === 404) { board.posts = board.posts.filter(p => p.id !== id); drawBoard(); toast('신고했어요. 이 글은 확인이 끝날 때까지 숨겨졌어요.'); return; }
    panel.hidden = true; const b = $('[data-report]', art); b.disabled = true; b.textContent = '신고함'; b.setAttribute('aria-label', '이미 신고한 글');
    toast('신고했어요. 운영자가 확인할게요.');
  }
});
