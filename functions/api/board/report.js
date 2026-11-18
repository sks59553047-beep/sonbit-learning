// POST /api/board/report  신고 { kind: 'post'|'comment', id, reason }
// 같은 사람은 한 글(댓글)을 한 번만 신고할 수 있고, 서로 다른 신고가 HIDE_AT 건 쌓이면 자동으로 숨겨진다(운영자는 관리 화면에서 다시 공개·삭제).
import { HIDE_AT, REASONS, allow, fail, intId, json, notifyHidden, now, originOk, readJson, recount, who } from '../../_lib/board.js';

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB || !env.BOARD_SALT) return fail(503, '게시판을 아직 쓸 수 없어요.');
  if (!originOk(request, env)) return fail(403, '손빛 배움터 화면에서만 신고할 수 있어요.');
  const d = await readJson(request, 500);
  const id = d ? intId(d.id) : 0, comment = !!d && d.kind === 'comment';
  if (!id || !REASONS.includes(d.reason)) return fail(400, '신고 이유를 골라 주세요.');
  const me = await who(request, env, 'report');
  if (!(await allow(env, `r:${me}:${Math.floor(now() / 86400)}`, 10, 90000))) return fail(429, '오늘은 신고를 더 보낼 수 없어요.');
  const T = comment ? { tbl: 'comments', rep: 'creports', col: 'comment_id' } : { tbl: 'posts', rep: 'reports', col: 'post_id' };
  const row = await env.DB.prepare(`SELECT id${comment ? ', post_id' : ''} FROM ${T.tbl} WHERE id = ? AND status = 'visible'`).bind(id).first();
  if (!row) return fail(404, comment ? '이미 지워졌거나 숨겨진 댓글이에요.' : '이미 지워졌거나 숨겨진 글이에요.');
  const ins = await env.DB.prepare(`INSERT OR IGNORE INTO ${T.rep} (${T.col}, who, reason, created) VALUES (?, ?, ?, ?)`).bind(id, me, d.reason, now()).run();
  if (!ins.meta.changes) return json({ ok: true, already: true });        // 같은 사람의 두 번째 신고는 세지 않는다
  const upd = await env.DB.prepare(`UPDATE ${T.tbl} SET reports = reports + 1 WHERE id = ? RETURNING reports`).bind(id).first();
  let hidden = false;
  if (upd && upd.reports >= HIDE_AT) {
    const h = await env.DB.prepare(`UPDATE ${T.tbl} SET status = 'hidden' WHERE id = ? AND status = 'visible'`).bind(id).run();
    hidden = h.meta.changes > 0;
    if (hidden) {
      if (comment) await recount(env, row.post_id);
      waitUntil(notifyHidden(env, id, upd.reports, comment ? 'comment' : 'post'));
    }
  }
  return json({ ok: true, hidden });
}
