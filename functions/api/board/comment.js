// POST /api/board/comment
//   { action: 'add', post_id, nick, pw, text, hp(비워 둬야 함), ms(글을 연 뒤 지난 밀리초) }   댓글 쓰기
//   { action: 'delete', id, pw }                                                            본인 댓글 지우기
import { LIM, allow, checkNick, checkPw, checkText, fail, intId, json, now, originOk, ownerCheck, premodOn, pwHash, readJson, recount, who } from '../../_lib/board.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.BOARD_SALT) return fail(503, '게시판을 아직 쓸 수 없어요.');
  if (!originOk(request, env)) return fail(403, '손빛 배움터 화면에서만 할 수 있어요.');
  const d = await readJson(request, 200000);
  if (!d) return fail(400, '요청을 읽지 못했어요. 다시 시도해 주세요.');

  if (d.action === 'delete') {
    const id = intId(d.id);
    const c = id && await env.DB.prepare('SELECT id, post_id, pw FROM comments WHERE id = ?').bind(id).first();
    if (!c) return fail(404, '이미 지워진 댓글이에요.');
    const bad = await ownerCheck(request, env, c.pw, d.pw, '댓글');
    if (bad) return bad;
    await env.DB.prepare('DELETE FROM creports WHERE comment_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    await recount(env, c.post_id);
    return json({ ok: true });
  }
  if (d.action !== 'add') return fail(400, '알 수 없는 동작이에요.');

  if (d.hp) return json({ ok: true, id: 0 });                       // 자동 글은 성공처럼 보이게 하고 버린다
  if (!(Number(d.ms) >= 2000)) return fail(429, '너무 빨라요. 잠시 뒤에 다시 올려 주세요.');
  const postId = intId(d.post_id);
  const post = postId && await env.DB.prepare("SELECT id FROM posts WHERE id = ? AND status = 'visible'").bind(postId).first();
  if (!post) return fail(404, '지워졌거나 숨겨진 글이에요.');
  const tx = checkText(d.text, { min: LIM.commentMin, max: LIM.commentMax, what: '댓글' });
  if (tx.error) return fail(400, tx.error);
  const nk = checkNick(d.nick);
  if (nk.error) return fail(400, nk.error);
  const pw = checkPw(d.pw);
  if (pw.error) return fail(400, pw.error);

  const me = await who(request, env, 'comment');
  const t = now(), day = Math.floor(t / 86400);
  if (!(await allow(env, `cg:${day}`, 1000, 90000))) return fail(429, '오늘은 댓글을 더 받을 수 없어요. 내일 다시 올려 주세요.');
  if (!(await allow(env, `c10:${me}:${Math.floor(t / 600)}`, 5, 700))) return fail(429, '댓글은 10분에 다섯 개까지만 올릴 수 있어요. 잠시 뒤에 다시 올려 주세요.');
  if (!(await allow(env, `cd:${me}:${day}`, 30, 90000))) return fail(429, '댓글은 하루에 서른 개까지만 올릴 수 있어요. 내일 다시 올려 주세요.');
  if (await env.DB.prepare('SELECT 1 AS x FROM comments WHERE post_id = ? AND text = ? AND created > ? LIMIT 1').bind(postId, tx.text, t - 3600).first()) return fail(409, '같은 댓글이 이미 올라와 있어요.');

  const pending = await premodOn(env);
  const r = await env.DB.prepare('INSERT INTO comments (post_id, nick, pw, text, created, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(postId, nk.nick, await pwHash(env, pw.pw), tx.text, t, pending ? 'pending' : 'visible').run();
  await recount(env, postId);
  return json({ ok: true, id: r.meta.last_row_id, pending });
}
