// 의견 게시판 공통 도구(functions/api/board/*, functions/api/admin/board.js 가 함께 쓴다).
// 이 파일은 주소(route)가 아니라 공용 부품이라 이름이 _lib 로 시작한다.
export const MIN_LEN = 5, MAX_LEN = 500, HIDE_AT = 3, PAGE = 20;
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
// 접속 주소를 비밀 값(BOARD_SALT)과 섞어 되돌릴 수 없게 바꾼 것. 글에는 저장하지 않고 신고 중복·도배 제한에만 쓴다.
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

const RE = {
  url: /(https?:\/\/|www\.|[a-z0-9][a-z0-9-]*\.(com|net|org|kr|io|me|co|dev|app|xyz|info|ly|gg|tv|cc|biz|shop|site|online)\b)/i,
  email: /[^\s@]+@[^\s@]+\.[^\s@]+/,
  phone: /(?:\+?82[-. ]?)?0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}/,
  rrn: /\d{6}[-\s]?[1-4]\d{6}/,
  repeat: /(.)\1{9,}/u
};
// 글을 다듬고 검사한다. 통과하면 { text }, 아니면 { error: 사용자에게 보여 줄 말 }
export function checkText(raw) {
  const text = String(raw == null ? '' : raw).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‍﻿]/g, '').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const len = [...text].length;
  if (len < MIN_LEN) return { error: `${MIN_LEN}글자 이상 적어 주세요.` };
  if (len > MAX_LEN) return { error: `${MAX_LEN}글자까지 쓸 수 있어요.` };
  if (!/[가-힣a-zA-Z]{2,}/.test(text)) return { error: '글자가 들어 있는 문장을 적어 주세요.' };
  if (RE.email.test(text)) return { error: '이메일 주소는 올릴 수 없어요. 개인정보는 적지 말아 주세요.' };   // 이메일이 인터넷 주소 검사에 먼저 걸리지 않게 먼저 본다
  if (RE.url.test(text)) return { error: '인터넷 주소(링크)는 올릴 수 없어요.' };
  if (RE.phone.test(text) || RE.rrn.test(text)) return { error: '전화번호나 주민등록번호 같은 개인정보는 올릴 수 없어요.' };
  if (RE.repeat.test(text)) return { error: '같은 글자를 너무 많이 반복했어요.' };
  return { text };
}

// 신고가 쌓여 자동으로 숨겼을 때 운영자에게 GitHub 알림(이슈)을 보낸다. 저장소가 공개라서 글 내용은 적지 않고 번호만 적는다.
export async function notifyHidden(env, id, count) {
  if (!env.GITHUB_TOKEN) return;
  const body = `의견 게시판 글 **#${id}** 가 신고 ${count}건으로 자동 숨김됐어요.\n\n관리 화면( https://sonbit.pages.dev/admin )에서 확인해 지우거나 다시 공개해 주세요. (글 내용은 공개 저장소라 여기에 적지 않아요.)`;
  try {
    await fetch('https://api.github.com/repos/sks59553047-beep/sonbit-learning/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'sonbit-board', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `[게시판 신고] 글 #${id} 자동 숨김`, body, labels: ['board-report'] })
    });
  } catch { /* 알림이 실패해도 숨김은 이미 됐다 */ }
}
