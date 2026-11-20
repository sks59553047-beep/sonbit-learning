// 손빛 배움터 — 교육 영상 플레이어와 대본, 영상을 못 불러올 때 안내(모든 화면 공통)
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
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
// 영상을 실제로 85% 이상 재생했을 때만 '시청 완료'로 기록한다. 열어 보기만 한 것, 재생 바·대본 줄로 끝부분으로 건너뛴 것은 완료가 아니다.
// (2026-11-20 외부 평가: 마지막 대본 줄을 누르기만 해도 완료가 됐음 → 재생 위치가 아니라 실제로 재생된 구간(video.played)의 합으로 잰다)
const WATCHED_RATIO = 0.85;
function playedRatio(v) {
  if (!v.duration) return 0;
  let s = 0; for (let i = 0; i < v.played.length; i++) s += v.played.end(i) - v.played.start(i);
  return s / v.duration;
}
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
    // 자막은 처음엔 꺼 둔다(작업자님 요청 2026-11-20 — 영상 화면 아래에 같은 문장이 이미 나오고, 대본도 아래에 있다). 재생기의 자막 단추로 켤 수 있다
    t.kind = 'captions'; t.srclang = 'ko'; t.label = '한국어'; t.src = `videos/${id}.vtt`; t.default = false;
    f.appendChild(t);
    f.addEventListener('ended', () => { if (playedRatio(f) >= WATCHED_RATIO) markWatched(id); });
    f.addEventListener('timeupdate', () => { if (playedRatio(f) >= WATCHED_RATIO) markWatched(id); });
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
// 대본 따라가기(2026-11-20): 지금 말하는 줄을 표시하고, 줄을 누르면 그 부분부터 재생한다.
// 시각은 data-time 으로 두고 CSS(::before)로 보여 준다 — 줄의 글(textContent)은 대본 문장 그대로 두기 위해
function renderTranscript() {
  $('#playerTranscript').innerHTML = transcriptCues.map((c, i) => `<button type="button" class="tline" data-cue="${i}" data-time="${fmtTime(Math.floor(c.start))}">${esc(c.text)}</button>`).join('') || '<p class="note">자막이 없어요.</p>';
  transcriptNow = -1; syncTranscript();
}
let transcriptNow = -1;
function cueAt(t) {   // 지금 시각에 해당하는 줄: 시작 시각이 지난 마지막 줄(줄 사이 쉬는 동안은 앞 줄을 그대로 표시)
  let k = -1;
  for (let i = 0; i < transcriptCues.length; i++) { if (transcriptCues[i].start <= t + 0.05) k = i; else break; }
  return k;
}
function syncTranscript() {
  const v = $('#playerVideo'), box = $('#playerTranscript');
  if (!v || !box || !transcriptCues.length) return;
  const k = v.currentTime > 0 || !v.paused ? cueAt(v.currentTime) : -1;   // 아직 재생 전이면 아무 줄도 표시하지 않는다
  if (k === transcriptNow) return;
  transcriptNow = k;
  $$('.tline', box).forEach((b, i) => { b.classList.toggle('on', i === k); if (i === k) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const line = k >= 0 && box.querySelector(`[data-cue="${k}"]`);
  if (line) {   // 대본 칸 안에서만 굴린다(페이지 전체는 움직이지 않게)
    const top = line.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop, bottom = top + line.offsetHeight;
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) box.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' });
  }
}
document.addEventListener('timeupdate', e => { if (e.target.id === 'playerVideo') syncTranscript(); }, true);
document.addEventListener('seeked', e => { if (e.target.id === 'playerVideo') syncTranscript(); }, true);
document.addEventListener('click', e => {
  const b = e.target.closest('#playerTranscript .tline'); if (!b) return;
  const c = transcriptCues[+b.dataset.cue], v = $('#playerVideo'); if (!c || !v) return;
  v.currentTime = c.start + 0.01;
  v.play().catch(() => {});
  syncTranscript();
  const r = v.getBoundingClientRect();
  if (r.bottom < 60 || r.top > innerHeight - 60) v.scrollIntoView({ behavior: 'smooth', block: 'center' });   // 영상이 화면 밖이면 보이게
});

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
