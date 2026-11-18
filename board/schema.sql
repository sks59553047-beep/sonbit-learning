-- 손빛 배움터 의견 게시판 저장 틀(Cloudflare D1 데이터베이스 sonbit-board). 새로 만들 때 쓰는 전체 구조.
-- 새로 적용: npx wrangler d1 execute sonbit-board --remote --file board/schema.sql
-- 이미 2026-11-18 첫 판으로 만든 저장소는 board/migrate-2026-11-18.sql 을 한 번만 적용하면 이 구조와 같아진다.
-- 글에는 접속 주소·계정을 넣지 않는다. 비밀번호는 무작위 값과 섞어 되돌릴 수 없게 바꾼 값(pw)만 둔다.

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,                          -- 내용
  created INTEGER NOT NULL,                    -- 올린 시각(초)
  status TEXT NOT NULL DEFAULT 'visible',      -- visible 공개 / hidden 숨김 / pending 검토 대기
  reports INTEGER NOT NULL DEFAULT 0,          -- 신고 수
  title TEXT NOT NULL DEFAULT '',              -- 제목
  nick TEXT NOT NULL DEFAULT '익명',            -- 닉네임
  pw TEXT NOT NULL DEFAULT '',                 -- 본인 수정·삭제용 비밀번호를 바꾼 값(비어 있으면 운영자만 지움)
  views INTEGER NOT NULL DEFAULT 0,            -- 조회수(같은 사람은 하루 한 번)
  ccount INTEGER NOT NULL DEFAULT 0,           -- 공개된 댓글 수
  updated INTEGER NOT NULL DEFAULT 0           -- 고친 시각(안 고쳤으면 0)
);
CREATE INDEX IF NOT EXISTS posts_status_id ON posts (status, id DESC);

CREATE TABLE IF NOT EXISTS reports (
  post_id INTEGER NOT NULL,
  who TEXT NOT NULL,                           -- 신고한 사람 구분용(접속 주소를 비밀 값으로 섞어 바꾼 것)
  reason TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (post_id, who)
);

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

CREATE TABLE IF NOT EXISTS creports (           -- 댓글 신고
  comment_id INTEGER NOT NULL,
  who TEXT NOT NULL,
  reason TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (comment_id, who)
);

CREATE TABLE IF NOT EXISTS limits (            -- 도배 제한·조회수 중복 막기용 세는 표(시간이 지나면 지워짐)
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  exp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (k, v) VALUES ('premod', '0');   -- 1 이면 새 글·댓글은 운영자가 승인해야 보임
