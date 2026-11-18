// GET  /api/board?before=<글 번호>  공개된 글 목록(최신순, 20개씩)
// POST /api/board                    글 올리기 { text, hp(비워 둬야 함), ms(화면을 연 뒤 지난 밀리초) }
import { PAGE, allow, checkText, fail, json, now, originOk, readJson, who } from '../../_lib/board.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, '게시판을 아직 쓸 수 없어요.');
  const before = parseInt(new URL(request.url).searchParams.get('before') || '0', 10) || 0;
  const q = before
    ? env.DB.prepare("SELECT id, text, created FROM posts WHERE status = 'visible' AND id < ? ORDER BY id DESC LIMIT ?").bind(before, PAGE + 1)
    : env.DB.prepare("SELECT id, text, created FROM posts WHERE status = 'visible' ORDER BY id DESC LIMIT ?").bind(PAGE + 1);
  const { results } = await q.all();
  const pre = await env.DB.prepare("SELECT v FROM settings WHERE k = 'premod'").first();
  return json({ ok: true, posts: results.slice(0, PAGE), more: results.length > PAGE, premod: !!pre && pre.v === '1' });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.BOARD_SALT) return fail(503, '게시판을 아직 쓸 수 없어요.');
  if (!originOk(request, env)) return fail(403, '손빛 배움터 화면에서만 글을 올릴 수 있어요.');
  const d = await readJson(request);
  if (!d) return fail(400, '글을 읽지 못했어요. 다시 시도해 주세요.');
  if (d.hp) return json({ ok: true, id: 0 });                       // 사람이 못 보는 칸을 채운 자동 글은 성공처럼 보이게 하고 버린다
  if (!(Number(d.ms) >= 2000)) return fail(429, '너무 빨라요. 잠시 뒤에 다시 올려 주세요.');
  const c = checkText(d.text);
  if (c.error) return fail(400, c.error);

  const me = await who(request, env, 'post');
  const t = now(), day = Math.floor(t / 86400);
  if (!(await allow(env, `g:${day}`, 300, 90000))) return fail(429, '오늘은 새 글을 더 받을 수 없어요. 내일 다시 올려 주세요.');
  if (!(await allow(env, `p10:${me}:${Math.floor(t / 600)}`, 2, 700))) return fail(429, '10분에 두 개까지만 올릴 수 있어요. 잠시 뒤에 다시 올려 주세요.');
  if (!(await allow(env, `pd:${me}:${day}`, 5, 90000))) return fail(429, '하루에 다섯 개까지만 올릴 수 있어요. 내일 다시 올려 주세요.');
  if (await env.DB.prepare('SELECT 1 AS x FROM posts WHERE text = ? AND created > ? LIMIT 1').bind(c.text, t - 86400).first()) return fail(409, '같은 글이 이미 올라와 있어요.');

  const pre = await env.DB.prepare("SELECT v FROM settings WHERE k = 'premod'").first();
  const pending = !!pre && pre.v === '1';
  const r = await env.DB.prepare('INSERT INTO posts (text, created, status) VALUES (?, ?, ?)').bind(c.text, t, pending ? 'pending' : 'visible').run();
  return json({ ok: true, id: r.meta.last_row_id, created: t, text: c.text, pending });
}
