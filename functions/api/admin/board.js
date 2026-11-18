// 관리자 전용(헤더 X-Admin-Key = 관리 비밀번호). 관리 화면(/admin)이 쓴다.
// GET  /api/admin/board?filter=all|visible|hidden|pending|reported&before=<번호>  글 목록(50개씩, 신고 이유 포함)
// POST /api/admin/board  { action: delete|hide|show|mode, id, premod }
import { allow, fail, json, now, originOk, readJson, sha256, who } from '../../_lib/board.js';

async function authed(request, env) {
  if (!env.ADMIN_PASSWORD || !env.BOARD_SALT) return { error: fail(503, '관리 비밀번호가 아직 정해지지 않았어요.') };
  const me = await who(request, env, 'admin');
  // 비밀번호를 틀린 횟수가 10분에 10번을 넘으면 맞는 비밀번호여도 잠깐 막는다(추측해서 맞히는 것을 막으려고)
  const bucket = `a:${me}:${Math.floor(now() / 600)}`;
  const row = await env.DB.prepare('SELECT n FROM limits WHERE k = ?').bind(bucket).first();
  if (row && row.n >= 10) return { error: fail(429, '시도가 너무 많아요. 10분 뒤에 다시 해 주세요.') };
  // 관리 화면은 비밀번호를 encodeURIComponent 로 감싸 보낸다(머리글에는 한글 같은 글자를 그대로 넣을 수 없어서)
  let given = request.headers.get('X-Admin-Key') || '';
  try { given = decodeURIComponent(given); } catch { /* 감싸지 않은 값이면 그대로 */ }
  if ((await sha256(given)) !== (await sha256(env.ADMIN_PASSWORD))) {
    await allow(env, bucket, 10, 700);                                   // 틀렸을 때만 센다
    return { error: fail(401, '비밀번호가 맞지 않아요.') };
  }
  return { ok: true };
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, '게시판을 아직 쓸 수 없어요.');
  const a = await authed(request, env); if (a.error) return a.error;
  const u = new URL(request.url), filter = u.searchParams.get('filter') || 'all', before = parseInt(u.searchParams.get('before') || '0', 10) || 0;
  const where = [], args = [];
  if (['visible', 'hidden', 'pending'].includes(filter)) { where.push('status = ?'); args.push(filter); }
  if (filter === 'reported') where.push('reports > 0');
  if (before) { where.push('id < ?'); args.push(before); }
  const { results } = await env.DB.prepare(`SELECT id, text, created, status, reports FROM posts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 51`).bind(...args).all();
  const posts = results.slice(0, 50);
  if (posts.length) {
    const ids = posts.map(p => p.id);
    const rs = await env.DB.prepare(`SELECT post_id, reason, COUNT(*) AS c FROM reports WHERE post_id IN (${ids.map(() => '?').join(',')}) GROUP BY post_id, reason`).bind(...ids).all();
    for (const p of posts) p.reasons = rs.results.filter(r => r.post_id === p.id).map(r => ({ reason: r.reason, count: r.c }));
  }
  const cnt = await env.DB.prepare("SELECT status, COUNT(*) AS c FROM posts GROUP BY status").all();
  const pre = await env.DB.prepare("SELECT v FROM settings WHERE k = 'premod'").first();
  return json({ ok: true, posts, more: results.length > 50, counts: Object.fromEntries(cnt.results.map(r => [r.status, r.c])), premod: !!pre && pre.v === '1' });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail(503, '게시판을 아직 쓸 수 없어요.');
  if (!originOk(request, env)) return fail(403, '관리 화면에서만 할 수 있어요.');
  const a = await authed(request, env); if (a.error) return a.error;
  const d = await readJson(request, 500);
  if (!d) return fail(400, '요청을 읽지 못했어요.');
  if (d.action === 'mode') {
    await env.DB.prepare("INSERT INTO settings (k, v) VALUES ('premod', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(d.premod ? '1' : '0').run();
    return json({ ok: true, premod: !!d.premod });
  }
  const id = Number.isInteger(d.id) ? d.id : 0;
  if (!id) return fail(400, '글 번호가 없어요.');
  if (d.action === 'delete') {
    await env.DB.prepare('DELETE FROM reports WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  if (d.action === 'hide') { await env.DB.prepare("UPDATE posts SET status = 'hidden' WHERE id = ?").bind(id).run(); return json({ ok: true }); }
  if (d.action === 'show') {                                              // 다시 공개(또는 승인): 신고 수를 0 으로 되돌려 새로 센다
    await env.DB.prepare('DELETE FROM reports WHERE post_id = ?').bind(id).run();
    await env.DB.prepare("UPDATE posts SET status = 'visible', reports = 0 WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return fail(400, '알 수 없는 동작이에요.');
}
