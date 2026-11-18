// 의견 게시판 공통 도구(functions/api/board/*, functions/api/admin/board.js 가 함께 쓴다).
// 이 파일은 주소(route)가 아니라 공용 부품이라 이름이 _lib 로 시작한다.
// 2026-11-18 일반 게시판 형태로 바꿈: 제목·닉네임·비밀번호(본인 수정·삭제), 조회수, 댓글, 쪽 번호, 검색.
export const PAGE = 20, HIDE_AT = 3;
// 글자 수: 작업자님 요청으로 500자 제한을 없앰. 책 한 권을 붙여 넣는 장난만 막으려고 내용·댓글은 1만 자에서만 멈춘다.
export const LIM = { textMin: 5, textMax: 10000, commentMin: 2, commentMax: 10000, titleMin: 2, titleMax: 100, nickMax: 12, pwMin: 4, pwMax: 30 };
export const REASONS = ['욕설·혐오', '광고·도배', '개인정보', '기타'];
const ORIGIN = 'https://sonbit.pages.dev';

export const now = () => Math.floor(Date.now() / 1000);
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export const fail = (status, message) => json({ ok: false, message }, status);

// 사이트 안에서 보낸 요청만 받는다(env.LOCAL_DEV 가 1 이면 시험용 내 컴퓨터 주소도 받는다)
export function originOk(request, env) {
  const o = request.headers.get('Origin') || '';
  return o === ORIGIN || (env && env.LOCAL_DEV === '1' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(o));
}
export async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// 접속 주소를 비밀 값(BOARD_SALT)과 섞어 되돌릴 수 없게 바꾼 것. 글에는 저장하지 않고 신고 중복·도배 제한·조회수 중복에만 쓴다.
export async function who(request, env, extra = '') {
  return (await sha256(`${env.BOARD_SALT}|${request.headers.get('CF-Connecting-IP') || 'unknown'}|${extra}`)).slice(0, 32);
}
export async function readJson(request, maxBytes = 3000) {
  const raw = await request.text();
  if (raw.length > maxBytes) return null;
  try { const d = JSON.parse(raw); return d && typeof d === 'object' ? d : null; } catch { return null; }
}
// 정해진 시간 안에 limit 번까지만 허용. 허용이면 true
export async function allow(env, key, limit, ttlSec) {
  const t = now();
  await env.DB.prepare('DELETE FROM limits WHERE exp < ?').bind(t).run();
  const r = await env.DB.prepare('INSERT INTO limits (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n').bind(key, t + ttlSec).first();
  return r.n <= limit;
}
export async function premodOn(env) {
  const r = await env.DB.prepare("SELECT v FROM settings WHERE k = 'premod'").first();
  return !!r && r.v === '1';
}
export const intId = v => (Number.isInteger(v) && v > 0 ? v : 0);

const RE = {
  url: /(https?:\/\/|www\.|[a-z0-9][a-z0-9-]*\.(com|net|org|kr|io|me|co|dev|app|xyz|info|ly|gg|tv|cc|biz|shop|site|online)\b)/i,
  email: /[^\s@]+@[^\s@]+\.[^\s@]+/,
  phone: /(?:\+?82[-. ]?)?0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}/,
  rrn: /\d{6}[-\s]?[1-4]\d{6}/,
  repeat: /(.)\1{9,}/u
};
// 보이지 않는 글자·제어 문자를 지운다
const clean = s => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‍⁠﻿]/g, '');
function personal(text) {
  if (RE.email.test(text)) return '이메일 주소는 올릴 수 없어요. 개인정보는 적지 말아 주세요.';   // 이메일이 인터넷 주소 검사에 먼저 걸리지 않게 먼저 본다
  if (RE.url.test(text)) return '인터넷 주소(링크)는 올릴 수 없어요.';
  if (RE.phone.test(text) || RE.rrn.test(text)) return '전화번호나 주민등록번호 같은 개인정보는 올릴 수 없어요.';
  return '';
}
// 글·제목·댓글을 다듬고 검사한다. 통과하면 { text }, 아니면 { error: 사용자에게 보여 줄 말 }
// what 은 「내용」「제목」「댓글」(모두 받침이 있어 「을/이」로 끝맺음)
export function checkText(raw, { min = LIM.textMin, max = LIM.textMax, what = '내용', oneLine = false } = {}) {
  let text = clean(raw);
  text = oneLine ? text.replace(/\s+/g, ' ').trim() : text.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const len = [...text].length;
  if (len < min) return { error: `${what}을 ${min}글자 이상 적어 주세요.` };
  if (len > max) return { error: `${what}이 너무 길어요. ${max.toLocaleString('ko-KR')}글자까지 쓸 수 있어요(지금 ${len.toLocaleString('ko-KR')}글자).` };
  if (!/[가-힣a-zA-Z][^]*[가-힣a-zA-Z]/.test(text)) return { error: `${what}에 글자가 들어 있는 문장을 적어 주세요.` };
  const p = personal(text); if (p) return { error: p };
  if (RE.repeat.test(text)) return { error: '같은 글자를 너무 많이 반복했어요.' };
  return { text };
}
// 닉네임: 비우면 「익명」. 운영자로 오해할 수 있는 이름은 막는다.
export function checkNick(raw) {
  const nick = clean(raw).replace(/\s+/g, ' ').trim();
  if (!nick) return { nick: '익명' };
  if ([...nick].length > LIM.nickMax) return { error: `닉네임은 ${LIM.nickMax}글자까지예요.` };
  if (/운영|관리자|관리인|admin|손빛|sonbit/i.test(nick.replace(/\s/g, ''))) return { error: '운영자로 오해할 수 있는 닉네임은 쓸 수 없어요.' };
  const p = personal(nick); if (p) return { error: p };
  return { nick };
}
export function checkPw(raw) {
  const pw = typeof raw === 'string' ? raw : '';
  if ([...pw].length < LIM.pwMin) return { error: `비밀번호를 ${LIM.pwMin}글자 이상 정해 주세요. 나중에 고치거나 지울 때 필요해요.` };
  if ([...pw].length > LIM.pwMax) return { error: `비밀번호는 ${LIM.pwMax}글자까지예요.` };
  return { pw };
}

// 글·댓글 비밀번호는 그대로 저장하지 않고, 글마다 다른 무작위 값과 비밀 값(BOARD_SALT)을 섞어 바꾼 값만 저장한다.
export async function pwHash(env, pw) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
  return salt + ':' + (await sha256(`${env.BOARD_SALT}|pw|${salt}|${pw}`));
}
async function pwMatch(env, stored, pw) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  return (await sha256(`${env.BOARD_SALT}|pw|${salt}|${pw}`)) === h;
}
// 본인 확인: 맞으면 null, 아니면 돌려줄 응답. 비밀번호를 10분에 10번 넘게 틀리면 잠깐 막는다(추측해서 남의 글을 지우는 것을 막으려고).
export async function ownerCheck(request, env, stored, pw, what = '글') {
  if (!stored) return fail(403, `비밀번호 없이 올라온 ${what}이라 운영자만 고치거나 지울 수 있어요.`);
  const me = await who(request, env, 'pw'), bucket = `pw:${me}:${Math.floor(now() / 600)}`;
  const row = await env.DB.prepare('SELECT n FROM limits WHERE k = ?').bind(bucket).first();
  if (row && row.n >= 10) return fail(429, '비밀번호를 너무 많이 틀렸어요. 10분 뒤에 다시 해 주세요.');
  if (!(await pwMatch(env, stored, typeof pw === 'string' ? pw : ''))) { await allow(env, bucket, 10, 700); return fail(403, '비밀번호가 맞지 않아요.'); }
  return null;
}

// 글의 댓글 수(공개된 것만)를 다시 센다. 댓글을 쓰거나 지우거나 숨길 때마다 부른다.
export async function recount(env, postId) {
  await env.DB.prepare("UPDATE posts SET ccount = (SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'visible') WHERE id = ?").bind(postId, postId).run();
}
// 글을 지울 때 댓글·신고 기록도 함께 지운다
export async function deletePost(env, id) {
  await env.DB.prepare('DELETE FROM creports WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ?)').bind(id).run();
  await env.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM reports WHERE post_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}

// 신고가 쌓여 자동으로 숨겼을 때 운영자에게 GitHub 알림(이슈)을 보낸다. 저장소가 공개라서 글 내용은 적지 않고 번호만 적는다.
export async function notifyHidden(env, id, count, kind = 'post') {
  if (!env.GITHUB_TOKEN) return;
  const what = kind === 'comment' ? '댓글' : '글';
  const body = `의견 게시판 ${what} **#${id}** 가 신고 ${count}건으로 자동 숨김됐어요.\n\n관리 화면( https://sonbit.pages.dev/admin )에서 확인해 지우거나 다시 공개해 주세요. (내용은 공개 저장소라 여기에 적지 않아요.)`;
  try {
    await fetch('https://api.github.com/repos/sks59553047-beep/sonbit-learning/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'sonbit-board', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `[게시판 신고] ${what} #${id} 자동 숨김`, body, labels: ['board-report'] })
    });
  } catch { /* 알림이 실패해도 숨김은 이미 됐다 */ }
}
