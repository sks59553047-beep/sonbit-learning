// 게시판 저장소 바꾸기 시험: 첫 판 구조(커밋 c3569d6 의 board/schema.sql)에 글을 넣고 board/migrate-2026-11-18.sql 을 적용하면
// ① 새 구조(board/schema.sql)와 표·칸이 똑같아지고 ② 이미 있던 글이 지워지지 않고 제목이 내용 첫 줄로 채워지는지 확인한다.
// 사용: node tests/board-migrate.mjs   (git 과 Node 22 이상 필요)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { check } from './lib/cdp.mjs';
const REPO = fileURLToPath(new URL('../', import.meta.url));
const oldSchema = execFileSync('git', ['show', 'c3569d6:board/schema.sql'], { cwd: REPO, encoding: 'utf8' });
const newSchema = fs.readFileSync(REPO + 'board/schema.sql', 'utf8');
const migrate = fs.readFileSync(REPO + 'board/migrate-2026-11-18.sql', 'utf8');

const shape = db => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'sqlite_sequence' ORDER BY name").all().map(r => r.name);
  return tables.map(t => t + '(' + db.prepare(`PRAGMA table_info(${t})`).all().map(c => `${c.name} ${c.type} ${c.notnull} ${c.dflt_value} ${c.pk}`).join(', ') + ')').join('\n');
};
const fresh = new DatabaseSync(':memory:'); fresh.exec(newSchema);
const old = new DatabaseSync(':memory:'); old.exec(oldSchema);
old.prepare('INSERT INTO posts (text, created) VALUES (?, ?)').run('첫 줄이 제목이 됩니다\n둘째 줄은 내용이에요', 1795000000);
old.prepare('INSERT INTO posts (text, created) VALUES (?, ?)').run('줄바꿈 없는 아주 긴 글입니다 '.repeat(5), 1795000100);
old.exec(migrate);
check('M1 바꾼 뒤 표·칸 구조가 새로 만든 저장소와 똑같음', shape(old) === shape(fresh), shape(old) === shape(fresh) ? '' : '\n' + shape(old) + '\n---\n' + shape(fresh));
const rows = old.prepare('SELECT id, title, nick, pw, views, ccount, updated, text FROM posts ORDER BY id').all();
check('M2 있던 글 2개가 그대로 남음', rows.length === 2 && rows[0].text.startsWith('첫 줄이'));
check('M3 제목은 내용 첫 줄(40글자까지), 닉네임 「익명」, 비밀번호 없음(운영자만 지움)', rows[0].title === '첫 줄이 제목이 됩니다' && [...rows[1].title].length === 40 && rows.every(r => r.nick === '익명' && r.pw === '' && r.views === 0 && r.ccount === 0), JSON.stringify(rows.map(r => r.title)));
old.prepare('INSERT INTO comments (post_id, nick, pw, text, created) VALUES (1, ?, ?, ?, ?)').run('익명', 'a:b', '댓글 시험', 1795000200);
check('M4 바꾼 저장소에 댓글을 넣을 수 있음', old.prepare('SELECT COUNT(*) AS n FROM comments').get().n === 1);
process.exit(0);
