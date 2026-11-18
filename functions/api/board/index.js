// GET  /api/board?page=1&q=검색어&field=all|title|nick   공개된 글 목록(최신순, 20개씩, 쪽 번호)
// POST /api/board   글쓰기 { title, text, nick, pw, hp(비워 둬야 함), ms(글쓰기 화면을 연 뒤 지난 밀리초) }
import { LIM, PAGE, allow, checkNick, checkPw, checkText, fail, json, now, originOk, premodOn, pwHash, readJson, who } from '../../_lib/board.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, '게시판을 아직 쓸 수 없어요.');
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const field = ['title', 'nick'].includes(u.searchParams.get('field')) ? u.searchParams.get('field') : 'all';
  let page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10) || 1);
  const where = ["status = 'visible'"], args = [];
  if (q) {
    const like = '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%';
    if (field === 'title') { where.push("title LIKE ? ESCAPE '\\'"); args.push(like); }
    else if (field === 'nick') { where.push("nick LIKE ? ESCAPE '\\'"); args.push(like); }
    else { where.push("(title LIKE ? ESCAPE '\\' OR text LIKE ? ESCAPE '\\')"); args.push(like, like); }
  }
  const W = where.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${W}`).bind(...args).first()).n;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  page = Math.min(page, pages);
  const { results } = await env.DB.prepare(`SELECT id, title, nick, created, views, ccount FROM posts WHERE ${W} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(...args, PAGE, (page - 1) * PAGE).all();
  return json({ ok: true, posts: results, total, page, pages, premod: await premodOn(env) });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.BOARD_SALT) return fail(503, '게시판을 아직 쓸 수 없어요.');
  if (!originOk(request, env)) return fail(403, '손빛 배움터 화면에서만 글을 올릴 수 있어요.');
  const d = await readJson(request, 200000);                        // 1만 글자(한글 3바이트·줄바꿈 등)가 넉넉히 들어가는 크기. 길이 검사는 checkText 가 한다
  if (!d) return fail(400, '글을 읽지 못했어요. 다시 시도해 주세요.');
  if (d.hp) return json({ ok: true, id: 0 });                       // 사람이 못 보는 칸을 채운 자동 글은 성공처럼 보이게 하고 버린다
  if (!(Number(d.ms) >= 2000)) return fail(429, '너무 빨라요. 잠시 뒤에 다시 올려 주세요.');
  const ti = checkText(d.title, { min: LIM.titleMin, max: LIM.titleMax, what: '제목', oneLine: true });
  if (ti.error) return fail(400, ti.error);
  const tx = checkText(d.text);
  if (tx.error) return fail(400, tx.error);
  const nk = checkNick(d.nick);
  if (nk.error) return fail(400, nk.error);
  const pw = checkPw(d.pw);
  if (pw.error) return fail(400, pw.error);

  const me = await who(request, env, 'post');
  const t = now(), day = Math.floor(t / 86400);
  if (!(await allow(env, `g:${day}`, 300, 90000))) return fail(429, '오늘은 새 글을 더 받을 수 없어요. 내일 다시 올려 주세요.');
  if (!(await allow(env, `p10:${me}:${Math.floor(t / 600)}`, 2, 700))) return fail(429, '글은 10분에 두 개까지만 올릴 수 있어요. 잠시 뒤에 다시 올려 주세요.');
  if (!(await allow(env, `pd:${me}:${day}`, 5, 90000))) return fail(429, '글은 하루에 다섯 개까지만 올릴 수 있어요. 내일 다시 올려 주세요.');
  if (await env.DB.prepare('SELECT 1 AS x FROM posts WHERE text = ? AND created > ? LIMIT 1').bind(tx.text, t - 86400).first()) return fail(409, '같은 글이 이미 올라와 있어요.');

  const pending = await premodOn(env);
  const r = await env.DB.prepare('INSERT INTO posts (title, nick, pw, text, created, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(ti.text, nk.nick, await pwHash(env, pw.pw), tx.text, t, pending ? 'pending' : 'visible').run();
  return json({ ok: true, id: r.meta.last_row_id, pending });
}
