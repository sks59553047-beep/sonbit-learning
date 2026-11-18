-- 손빛 배움터 의견 게시판 저장 틀(Cloudflare D1 데이터베이스 sonbit-board).
-- 적용: npx wrangler d1 execute sonbit-board --remote --file board/schema.sql   (여러 번 해도 안전)
-- 글에는 이름·계정·접속 주소를 넣지 않는다. 신고 중복을 막으려고 reports.who 에만 되돌릴 수 없게 바꾼 값을 둔다.

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created INTEGER NOT NULL,                    -- 올린 시각(초)
  status TEXT NOT NULL DEFAULT 'visible',      -- visible 공개 / hidden 숨김 / pending 검토 대기
  reports INTEGER NOT NULL DEFAULT 0           -- 신고 수
);
CREATE INDEX IF NOT EXISTS posts_status_id ON posts (status, id DESC);

CREATE TABLE IF NOT EXISTS reports (
  post_id INTEGER NOT NULL,
  who TEXT NOT NULL,                           -- 신고한 사람 구분용(접속 주소를 비밀 값으로 섞어 바꾼 것)
  reason TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (post_id, who)
);

CREATE TABLE IF NOT EXISTS limits (            -- 도배 제한용 세는 표(시간이 지나면 지워짐)
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  exp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (k, v) VALUES ('premod', '0');   -- 1 이면 새 글은 운영자가 승인해야 보임
