// GET  /api/board/post?id=12   글 하나 + 댓글(조회수는 같은 사람이 하루 한 번만 센다)
// POST /api/board/post         본인 확인이 필요한 일 { action: check|edit|delete, id, pw, title, text }
//   check  : 비밀번호가 맞는지 보고, 맞으면 고칠 수 있게 제목·내용을 돌려준다
//   edit   : 제목·내용 고치기(「검토 후 공개」가 켜져 있으면 다시 승인 대기)
//   delete : 글 지우기(댓글도 함께)
import { LIM, allow, checkText, deletePost, fail, intId, json, now, originOk, ownerCheck, premodOn, readJson, who } from '../../_lib/board.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, '게시판을 아직 쓸 수 없어요.');
  const id = parseInt(new URL(request.url).searchParams.get('id') || '0', 10) || 0;
  const p = id && await env.DB.prepare("SELECT id, title, nick, text, created, updated, views, ccount FROM posts WHERE id = ? AND status = 'visible'").bind(id).first();
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
  const d = await readJson(request, 200000);
  if (!d) return fail(400, '요청을 읽지 못했어요. 다시 시도해 주세요.');
  const id = intId(d.id);
  const p = id && await env.DB.prepare("SELECT id, title, text, pw, status FROM posts WHERE id = ? AND status != 'hidden'").bind(id).first();
  if (!p) return fail(404, '지워졌거나 숨겨진 글이에요.');
  const bad = await ownerCheck(request, env, p.pw, d.pw, '글');
  if (bad) return bad;
  if (d.action === 'check') return json({ ok: true, title: p.title, text: p.text });
  if (d.action === 'delete') { await deletePost(env, id); return json({ ok: true }); }
  if (d.action === 'edit') {
    const ti = checkText(d.title, { min: LIM.titleMin, max: LIM.titleMax, what: '제목', oneLine: true });
    if (ti.error) return fail(400, ti.error);
    const tx = checkText(d.text);
    if (tx.error) return fail(400, tx.error);
    const pending = await premodOn(env);
    await env.DB.prepare('UPDATE posts SET title = ?, text = ?, updated = ?, status = ? WHERE id = ?').bind(ti.text, tx.text, now(), pending ? 'pending' : p.status, id).run();
    return json({ ok: true, pending });
  }
  return fail(400, '알 수 없는 동작이에요.');
}
