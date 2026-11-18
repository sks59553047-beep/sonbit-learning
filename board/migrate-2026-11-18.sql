-- 2026-11-18 첫 판 게시판 저장소를 일반 게시판 구조(제목·닉네임·비밀번호·조회수·댓글)로 바꾼다. 한 번만 적용할 것(ALTER 는 두 번 하면 오류).
-- 적용: npx wrangler d1 execute sonbit-board --remote --file board/migrate-2026-11-18.sql
-- 이미 있는 글은 지우지 않는다. 제목은 내용 첫 줄 앞 40글자로 채우고, 비밀번호가 없으니 운영자만 지울 수 있다.
ALTER TABLE posts ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN nick TEXT NOT NULL DEFAULT '익명';
ALTER TABLE posts ADD COLUMN pw TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN ccount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN updated INTEGER NOT NULL DEFAULT 0;
UPDATE posts SET title = substr(CASE WHEN instr(text, char(10)) > 0 THEN substr(text, 1, instr(text, char(10)) - 1) ELSE text END, 1, 40) WHERE title = '';

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  nick TEXT NOT NULL DEFAULT '익명',
  pw TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  created INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  reports INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comments_post ON comments (post_id, id);

CREATE TABLE IF NOT EXISTS creports (
  comment_id INTEGER NOT NULL,
  who TEXT NOT NULL,
  reason TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (comment_id, who)
);
