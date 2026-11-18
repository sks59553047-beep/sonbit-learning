// GET  /api/board/post?id=12   글 하나 + 댓글(조회수는 같은 사람이 하루 한 번만 센다)
// POST /api/board/post         본인 글 지우기 { action: 'delete', id, pw } — 글을 쓸 때 정한 비밀번호가 맞으면 댓글과 함께 지운다
// 2026-11-19 작업자님 요청으로 글 고치기(check·edit)는 없앴다. 올린 글은 지우고 다시 쓰는 방식.
import { allow, deletePost, fail, intId, json, now, originOk, ownerCheck, readJson, who } from '../../_lib/board.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, '게시판을 아직 쓸 수 없어요.');
  const id = parseInt(new URL(request.url).searchParams.get('id') || '0', 10) || 0;
  const p = id && await env.DB.prepare("SELECT id, title, nick, text, created, views, ccount FROM posts WHERE id = ? AND status = 'visible'").bind(id).first();
  if (!p) return fail(404, '지워졌거나 숨겨진 글이에요.');
  if (env.BOARD_SALT) {
    const me = await who(request, env, 'view');
    if (await allow(env, `v:${me}:${id}:${Math.floor(now() / 86400)}`, 1, 90000)) {
      await env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(id).run();
      p.views += 1;
    }
  }
  const { results } = await env.DB.prepare("SELECT id, nick, text, created FROM comments WHERE post_id = ? AND status = 'visible' ORDER BY id").bind(id).all();
  return json({ ok: true, post: p, comments: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.BOARD_SALT) return fail(503, '게시판을 아직 쓸 수 없어요.');
  if (!originOk(request, env)) return fail(403, '손빛 배움터 화면에서만 할 수 있어요.');
  const d = await readJson(request, 1000);
  if (!d) return fail(400, '요청을 읽지 못했어요. 다시 시도해 주세요.');
  if (d.action !== 'delete') return fail(400, '알 수 없는 동작이에요.');
  const id = intId(d.id);
  const p = id && await env.DB.prepare("SELECT id, pw FROM posts WHERE id = ? AND status != 'hidden'").bind(id).first();
  if (!p) return fail(404, '지워졌거나 숨겨진 글이에요.');
  const bad = await ownerCheck(request, env, p.pw, d.pw, '글');
  if (bad) return bad;
  await deletePost(env, id);
  return json({ ok: true });
}
