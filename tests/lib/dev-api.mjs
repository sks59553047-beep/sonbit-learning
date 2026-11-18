// 시험용: functions/ 안의 진짜 함수 코드를 내 컴퓨터에서 그대로 돌린다(Cloudflare 없이).
// 데이터베이스는 Node 에 들어 있는 SQLite(메모리)로 대신하고, D1 처럼 쓰이게 모양만 맞춘다. 시험이 끝나면 사라진다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export function makeD1(schemaSql) {
  const db = new DatabaseSync(':memory:');
  db.exec(schemaSql);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    all: async () => ({ results: db.prepare(sql).all(...args).map(r => ({ ...r })) }),
    first: async () => { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
    run: async () => { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
  });
  return { prepare: sql => stmt(sql), exec: async sql => db.exec(sql), _db: db };
}

export async function createApi(repo) {
  const schema = fs.readFileSync(path.join(repo, 'board', 'schema.sql'), 'utf8');
  const env = { DB: makeD1(schema), BOARD_SALT: 'test-salt', ADMIN_PASSWORD: 'test-admin-pw', LOCAL_DEV: '1' };   // 시험용 비밀값(진짜 값 아님)
  const reset = () => { env.DB._db.exec('DELETE FROM posts; DELETE FROM reports; DELETE FROM limits; DELETE FROM sqlite_sequence; UPDATE settings SET v = \'0\' WHERE k = \'premod\';'); };
  const mods = new Map();
  // 요청 주소 → 함수 파일(Cloudflare Pages 와 같은 규칙: 파일 경로가 주소, index.js 는 폴더 주소)
  async function find(pathname) {
    const rel = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
    for (const f of [`${rel}.js`, `${rel}/index.js`]) {
      const p = path.join(repo, 'functions', 'api', f);
      if (fs.existsSync(p)) { if (!mods.has(p)) mods.set(p, await import(pathToFileURL(p).href)); return mods.get(p); }
    }
    return null;
  }
  async function handle(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    // /__test/reset 는 전부 지움, /__test/reset?only=limits 는 도배 제한 횟수만 지움(같은 브라우저로 글을 여러 번 써 보는 시험용)
    if (url.pathname === '/__test/reset') { if (url.searchParams.get('only') === 'limits') env.DB._db.exec('DELETE FROM limits;'); else reset(); res.writeHead(200); return res.end('ok'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const request = new Request('http://127.0.0.1:' + req.socket.localPort + req.url, { method: req.method, headers: { ...req.headers, 'cf-connecting-ip': req.headers['x-test-ip'] || '203.0.113.7' }, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
    const m = await find(url.pathname);
    const fn = m && (m['onRequest' + req.method[0] + req.method.slice(1).toLowerCase()] || m.onRequest);
    if (!fn) { res.writeHead(404); return res.end('404'); }
    const pending = [];
    const r = await fn({ request, env, waitUntil: p => pending.push(p) });
    await Promise.allSettled(pending);
    const text = await r.text();
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(text);
  }
  return { handle, env, reset };
}
