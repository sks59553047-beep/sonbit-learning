// 게시판 서버 쪽 시험: 진짜 함수 코드를 시험용 서버에서 돌려, 글쓰기·검사·도배 제한·신고·자동 숨김·관리자 동작·검토 후 공개를 확인한다.
// 사용: node board-api.mjs <주소(시험용 서버)>   예) http://127.0.0.1:8765/
import { check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\/$/, '');
const ORIGIN = BASE;                                  // 시험용 서버에서는 자기 주소가 Origin
const ADMIN = 'test-admin-pw';
const call = async (method, path, { body, ip, admin, origin = ORIGIN, key } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (origin) headers.Origin = origin;
  if (ip) headers['X-Test-IP'] = ip;
  if (admin !== undefined) headers['X-Admin-Key'] = admin;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let d = {}; try { d = await r.json(); } catch { /* */ }
  return { s: r.status, d };
};
const reset = () => fetch(BASE + '/__test/reset');
const post = (text, o = {}) => call('POST', '/api/board', { body: { text, hp: '', ms: 5000, ...(o.body || {}) }, ip: o.ip, origin: o.origin });
const list = async () => (await call('GET', '/api/board')).d;
const adm = (m, p, body, pw = ADMIN) => call(m, p, { body, admin: pw });
let n = 0; const ip = () => '198.51.100.' + (++n);   // 새 사람(다른 접속 주소)

await reset();
let r = await post('안녕하세요. 수어 사전이 정말 도움이 돼요.', { ip: ip() });
check('B1 글 올리기', r.s === 200 && r.d.ok && r.d.id > 0 && !r.d.pending, JSON.stringify(r.d));
let l = await list();
check('B2 목록에 보임(글·시각만, 이름·주소 같은 것은 없음)', l.ok && l.posts.length === 1 && Object.keys(l.posts[0]).sort().join() === 'created,id,text', JSON.stringify(l.posts[0]));

// 글 검사
const bad = [
  ['짧은 글', '안녕', /5글자/], ['링크', '여기 보세요 https://example.com 좋아요', /링크/], ['점 주소', '사이트는 sonbit.co 입니다 참고하세요', /링크/],
  ['이메일', '연락은 abc@test.kr 로 주세요 감사합니다', /이메일/], ['전화번호', '전화는 010-1234-5678 로 주세요 감사합니다', /전화번호/], ['주민번호', '900101-1234567 이라고 적었어요 정말로', /주민등록번호|전화번호/],
  ['반복', '아아아아아아아아아아아아아아 좋아요', /반복/], ['글자 없음', '12345 67890 !!!!!', /글자가 들어/], ['긴 글', '수어와 점자 '.repeat(100).slice(0, 500) + '요요', /500글자/]
];
let okBad = true; const failBad = [];
for (const [name, text, re] of bad) { const x = await post(text, { ip: ip() }); if (!(x.s === 400 && re.test(x.d.message))) { okBad = false; failBad.push(name + ':' + x.s + ' ' + x.d.message); } }
check('B3 이상한 글 9가지는 받지 않고 이유를 알려 줌(짧은 글·링크·이메일·전화·주민번호·반복·글자 없음·너무 긴 글)', okBad, failBad.join(' | '));
const exact = await post('수어와 점자 '.repeat(100).slice(0, 499) + '요', { ip: ip() });   // 딱 500글자(같은 글자를 반복하지 않는 글)
check('B4 딱 500글자는 받음', exact.s === 200, JSON.stringify(exact.d).slice(0, 80));

// 자동 글·출처
check('B5 사람이 못 보는 칸을 채운 자동 글은 성공처럼 보이지만 저장 안 됨', (await post('봇이 쓴 글입니다 광고예요', { ip: ip(), body: { hp: 'x' } })).d.id === 0 && !(await list()).posts.some(p => p.text.includes('봇이 쓴')));
check('B6 화면을 연 지 2초도 안 돼 보내면 거절', (await post('너무 빨리 보낸 글입니다 정말요', { ip: ip(), body: { ms: 500 } })).s === 429);
check('B7 다른 사이트에서 온 요청은 거절', (await post('다른 사이트에서 보낸 글입니다', { ip: ip(), origin: 'https://evil.example' })).s === 403);

// 도배 제한
await reset(); const me = '198.51.100.200';
const a = await post('첫째 글입니다 안녕하세요', { ip: me }), b = await post('둘째 글입니다 반갑습니다', { ip: me }), c = await post('셋째 글입니다 또 올려요', { ip: me });
check('B8 같은 사람은 10분에 2개까지(셋째는 거절)', a.s === 200 && b.s === 200 && c.s === 429 && /10분에 두 개/.test(c.d.message), `${a.s} ${b.s} ${c.s}`);
check('B9 같은 글을 다른 사람이 또 올리면 거절', (await post('첫째 글입니다 안녕하세요', { ip: ip() })).s === 409);

// 신고
await reset();
const p1 = (await post('신고 시험용 글입니다 안녕하세요', { ip: ip() })).d.id;
const rep = (id, reason, who) => call('POST', '/api/board/report', { body: { id, reason }, ip: who });
let x1 = await rep(p1, '욕설·혐오', '192.0.2.1'), x1b = await rep(p1, '기타', '192.0.2.1');
check('B10 신고 1건, 같은 사람이 또 신고해도 한 번만 셈', x1.d.ok && !x1.d.hidden && x1b.d.already === true && (await adm('GET', '/api/admin/board')).d.posts[0].reports === 1);
check('B11 신고 이유가 정해진 것이 아니면 거절', (await rep(p1, '내맘대로', '192.0.2.9')).s === 400);
await rep(p1, '광고·도배', '192.0.2.2'); const x3 = await rep(p1, '개인정보', '192.0.2.3');
check('B12 서로 다른 3명이 신고하면 자동 숨김', x3.d.hidden === true && !(await list()).posts.some(p => p.id === p1), JSON.stringify(x3.d));
check('B13 숨겨진 글은 더 신고할 수 없음', (await rep(p1, '기타', '192.0.2.4')).s === 404);

// 관리자
check('B14 비밀번호 없이/틀리면 관리 화면 거절', (await adm('GET', '/api/admin/board', undefined, '')).s === 401 && (await adm('GET', '/api/admin/board', undefined, 'wrong')).s === 401);
let g = await adm('GET', '/api/admin/board?filter=hidden');
check('B15 관리자는 숨겨진 글과 신고 이유·건수를 봄', g.s === 200 && g.d.posts.length === 1 && g.d.posts[0].reports === 3 && g.d.posts[0].reasons.length === 3, JSON.stringify(g.d.posts[0]).slice(0, 140));
await adm('POST', '/api/admin/board', { action: 'show', id: p1 });
check('B16 다시 공개하면 목록에 돌아오고 신고 수는 0', (await list()).posts.some(p => p.id === p1) && (await adm('GET', '/api/admin/board')).d.posts.find(p => p.id === p1).reports === 0);
await adm('POST', '/api/admin/board', { action: 'hide', id: p1 });
check('B17 숨김', !(await list()).posts.some(p => p.id === p1));
await adm('POST', '/api/admin/board', { action: 'delete', id: p1 });
check('B18 삭제하면 관리자 목록에서도 완전히 사라짐', !(await adm('GET', '/api/admin/board')).d.posts.some(p => p.id === p1));
check('B19 관리 동작도 다른 사이트에서는 거절', (await call('POST', '/api/admin/board', { body: { action: 'mode', premod: true }, admin: ADMIN, origin: 'https://evil.example' })).s === 403);

// 검토 후 공개 스위치
await adm('POST', '/api/admin/board', { action: 'mode', premod: true });
const pm = await post('검토 후 공개 시험용 글입니다', { ip: ip() });
check('B20 「검토 후 공개」를 켜면 새 글은 대기(pending)로 들어가 목록에 안 보임', pm.d.pending === true && !(await list()).posts.some(p => p.id === pm.d.id) && (await list()).premod === true);
const pend = await adm('GET', '/api/admin/board?filter=pending');
check('B21 관리자는 대기 글을 보고 「공개」로 승인', pend.d.posts.length === 1, JSON.stringify(pend.d.counts));
await adm('POST', '/api/admin/board', { action: 'show', id: pm.d.id });
check('B22 승인하면 보임, 스위치를 끄면 다시 바로 공개', (await list()).posts.some(p => p.id === pm.d.id) && (await adm('POST', '/api/admin/board', { action: 'mode', premod: false })).d.premod === false && (await post('스위치를 끈 뒤의 글입니다', { ip: ip() })).d.pending === false);

// 목록 쪽수 넘기기
await reset();
for (let i = 1; i <= 23; i++) await post(`쪽수 시험용 글 ${i}번 입니다 안녕하세요`, { ip: ip() });
const p1l = await list(); const p2l = (await call('GET', '/api/board?before=' + p1l.posts[19].id)).d;
check('B23 글이 23개면 첫 쪽 20개(더 있음), 다음 쪽 3개(끝), 최신순', p1l.posts.length === 20 && p1l.more === true && p2l.posts.length === 3 && p2l.more === false && p1l.posts[0].id > p1l.posts[19].id && p1l.posts[19].id > p2l.posts[0].id);

// 관리자 비밀번호 맞히기 막기
await reset(); let last = 0;
for (let i = 0; i < 11; i++) last = (await call('GET', '/api/admin/board', { admin: 'guess' + i, ip: '203.0.113.99' })).s;
check('B24 비밀번호를 10번 넘게 틀리면, 맞는 비밀번호도 잠깐 막힘(429)', last === 429 && (await call('GET', '/api/admin/board', { admin: ADMIN, ip: '203.0.113.99' })).s === 429 && (await call('GET', '/api/admin/board', { admin: ADMIN, ip: '203.0.113.50' })).s === 200);
await reset();
process.exit(0);
