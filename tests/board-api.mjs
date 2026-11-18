// 게시판 서버 쪽 시험: 진짜 함수 코드를 시험용 서버(내 컴퓨터 SQLite)에서 돌려 확인한다.
// 글쓰기(제목·닉네임·비밀번호)·글 검사·도배 제한·조회수·본인 수정/삭제·댓글·신고 자동 숨김·관리자·검토 후 공개·쪽 번호·검색
// 사용: node board-api.mjs <주소(시험용 서버)>   예) http://127.0.0.1:8765/
import { check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\/$/, '');
const ADMIN = 'test-admin-pw';
const call = async (method, path, { body, ip, admin, origin = BASE } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (origin) headers.Origin = origin;
  if (ip) headers['X-Test-IP'] = ip;
  if (admin !== undefined) headers['X-Admin-Key'] = admin;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let d = {}; try { d = await r.json(); } catch { /* */ }
  return { s: r.status, d };
};
const reset = () => fetch(BASE + '/__test/reset');
let n = 0; const ip = () => '198.51.100.' + (++n % 250 + 1) + (n > 249 ? '' : '');   // 새 사람(다른 접속 주소)
let m = 0; const ip2 = () => '203.0.113.' + (++m % 250 + 1);
const W = (o = {}) => ({ title: '수어 사전 고마워요', text: '수어 사전이 정말 도움이 돼요. 고맙습니다.', nick: '', pw: '1234', hp: '', ms: 5000, ...o });
const write = (o = {}, who = ip(), origin) => call('POST', '/api/board', { body: W(o), ip: who, origin });
const list = async (qs = '') => (await call('GET', '/api/board' + qs)).d;
const read = async (id, who = '192.0.2.200') => call('GET', '/api/board/post?id=' + id, { ip: who });
const own = (body, who = '192.0.2.201') => call('POST', '/api/board/post', { body, ip: who });
const cmt = (body, who = ip2()) => call('POST', '/api/board/comment', { body: { action: 'add', hp: '', ms: 5000, pw: '5678', nick: '', ...body }, ip: who });
const rep = (kind, id, reason, who) => call('POST', '/api/board/report', { body: { kind, id, reason }, ip: who });
const adm = (m2, p, body, pw = ADMIN) => call(m2, p, { body, admin: pw });

await reset();
// ---------- 글쓰기 ----------
let r = await write({ nick: '수어배움이' });
check('A1 글 올리기(제목·닉네임·비밀번호)', r.s === 200 && r.d.ok && r.d.id > 0 && !r.d.pending, JSON.stringify(r.d));
let l = await list();
check('A2 목록에는 번호·제목·글쓴이·날짜·조회·댓글 수만(내용·비밀번호는 안 나감)', l.ok && l.total === 1 && l.pages === 1 && Object.keys(l.posts[0]).sort().join() === 'ccount,created,id,nick,title,views' && l.posts[0].nick === '수어배움이', JSON.stringify(l.posts[0]));
check('A3 닉네임을 비우면 「익명」', (await write({ text: '닉네임 없이 쓴 글입니다 안녕하세요' })).s === 200 && (await list()).posts[0].nick === '익명');
const bad = [
  ['비밀번호 없음', { pw: '' }, /비밀번호를 4글자/], ['비밀번호 짧음', { pw: '12' }, /비밀번호를 4글자/], ['제목 짧음', { title: '가' }, /제목을 2글자/],
  ['제목에 링크', { title: 'www.example.com 보세요' }, /링크/], ['닉네임 운영자', { nick: '운영자' }, /운영자로 오해/], ['닉네임 관리자', { nick: '관 리 자' }, /운영자로 오해/],
  ['닉네임 너무 김', { nick: '가나다라마바사아자차카타파' }, /12글자/], ['닉네임에 전화', { nick: '01012345678' }, /전화번호/],
  ['짧은 내용', { text: '안녕' }, /내용을 5글자/], ['링크', { text: '여기 보세요 https://example.com 좋아요' }, /링크/], ['점 주소', { text: '사이트는 sonbit.co 입니다 참고하세요' }, /링크/],
  ['이메일', { text: '연락은 abc@test.kr 로 주세요 감사합니다' }, /이메일/], ['전화번호', { text: '전화는 010-1234-5678 로 주세요 감사합니다' }, /전화번호/], ['주민번호', { text: '900101-1234567 이라고 적었어요 정말로' }, /주민등록번호|전화번호/],
  ['반복', { text: '아아아아아아아아아아아아아아 좋아요' }, /반복/], ['글자 없음', { text: '12345 67890 !!!!!' }, /글자가 들어/], ['1만 자 넘음', { text: '수어와 점자 '.repeat(1700).slice(0, 10001) }, /10,000글자/]
];
const failBad = [];
for (const [name, o, re] of bad) { const x = await write(o); if (!(x.s === 400 && re.test(x.d.message))) failBad.push(name + ':' + x.s + ' ' + x.d.message); }
check(`A4 이상한 글 ${bad.length}가지는 받지 않고 이유를 알려 줌(비밀번호·제목·닉네임·개인정보·링크·반복·1만 자 넘음)`, failBad.length === 0, failBad.join(' | '));
const longText = '수어와 점자 '.repeat(1700).slice(0, 9999) + '요';
const big = await write({ text: longText, title: '가나다라마바사아자차'.repeat(10) });
check('A5 500자 제한 없음: 딱 1만 글자·제목 100글자까지 받음', big.s === 200 && [...(await read(big.d.id)).d.post.text].length === 10000, JSON.stringify(big.d).slice(0, 80));
check('A6 사람이 못 보는 칸을 채운 자동 글은 성공처럼 보이지만 저장 안 됨', (await write({ hp: 'x', title: '봇이 쓴 글' })).d.id === 0 && !(await list()).posts.some(p => p.title === '봇이 쓴 글'));
check('A7 화면을 연 지 2초도 안 돼 보내면 거절, 다른 사이트에서 온 요청도 거절', (await write({ ms: 500 })).s === 429 && (await write({}, ip(), 'https://evil.example')).s === 403);
await reset(); const me = '198.51.100.250';
const a1 = await write({ text: '첫째 글입니다 안녕하세요' }, me), b1 = await write({ text: '둘째 글입니다 반갑습니다' }, me), c1 = await write({ text: '셋째 글입니다 또 올려요' }, me);
check('A8 같은 사람은 10분에 글 2개까지, 같은 글은 다른 사람도 하루에 한 번', a1.s === 200 && b1.s === 200 && c1.s === 429 && /10분에 두 개/.test(c1.d.message) && (await write({ text: '첫째 글입니다 안녕하세요' })).s === 409);

// ---------- 글 보기·조회수 ----------
await reset();
const id1 = (await write({ title: '조회수 시험', nick: '가람' })).d.id;
let g1 = await read(id1, '192.0.2.50'); const g2 = await read(id1, '192.0.2.50'); const g3 = await read(id1, '192.0.2.51');
check('A9 글 보기: 내용·글쓴이 나옴, 비밀번호는 안 나감', g1.s === 200 && g1.d.post.text.includes('도움이') && g1.d.post.nick === '가람' && !('pw' in g1.d.post) && Array.isArray(g1.d.comments));
check('A10 조회수는 같은 사람이 여러 번 열어도 하루 한 번만 셈(1→1→2)', g1.d.post.views === 1 && g2.d.post.views === 1 && g3.d.post.views === 2 && (await list()).posts[0].views === 2);
check('A11 없는 글은 404', (await read(9999)).s === 404);

// ---------- 본인 수정·삭제 ----------
let x = await own({ action: 'check', id: id1, pw: '0000' });
check('A12 비밀번호가 틀리면 고치기 거절', x.s === 403 && /맞지 않아요/.test(x.d.message));
x = await own({ action: 'check', id: id1, pw: '1234' });
check('A13 비밀번호가 맞으면 고칠 제목·내용을 받음', x.s === 200 && x.d.title === '조회수 시험' && x.d.text.includes('도움이'));
x = await own({ action: 'edit', id: id1, pw: '1234', title: '고친 제목입니다', text: '고친 내용입니다. 잘 보이나요?' });
g1 = await read(id1);
check('A14 고치면 제목·내용이 바뀌고 「수정됨」 시각이 남음', x.s === 200 && g1.d.post.title === '고친 제목입니다' && g1.d.post.text.startsWith('고친 내용') && g1.d.post.updated > 0 && (await list()).posts[0].title === '고친 제목입니다');
check('A15 고칠 때도 글 검사(링크 등)', (await own({ action: 'edit', id: id1, pw: '1234', title: '고친 제목', text: 'http://spam.example 광고입니다' })).s === 400);
await cmt({ post_id: id1, text: '이 글에 단 댓글' });
check('A16 틀린 비밀번호로는 못 지움', (await own({ action: 'delete', id: id1, pw: '9999' })).s === 403 && (await read(id1)).s === 200);
x = await own({ action: 'delete', id: id1, pw: '1234' });
check('A17 맞는 비밀번호로 지우면 글과 댓글이 모두 사라짐', x.s === 200 && (await read(id1)).s === 404 && (await adm('GET', '/api/admin/board?kind=comment')).d.items.length === 0);
const id2 = (await write({ title: '비밀번호 맞히기 시험' })).d.id;
let last = 0; for (let i = 0; i < 11; i++) last = (await own({ action: 'check', id: id2, pw: 'guess' + i }, '192.0.2.99')).s;
check('A18 비밀번호를 10번 넘게 틀리면 그 사람은 10분 동안 막힘(다른 사람은 됨)', last === 429 && (await own({ action: 'check', id: id2, pw: '1234' }, '192.0.2.99')).s === 429 && (await own({ action: 'check', id: id2, pw: '1234' }, '192.0.2.98')).s === 200);

// ---------- 댓글 ----------
await reset();
const pid = (await write({ title: '댓글 시험 글' })).d.id;
let c = await cmt({ post_id: pid, text: '좋은 의견이에요', nick: '하늘' });
g1 = await read(pid);
check('A19 댓글 달기: 글 보기에 나오고(비밀번호는 안 나감) 목록의 댓글 수가 1', c.s === 200 && g1.d.comments.length === 1 && g1.d.comments[0].nick === '하늘' && !('pw' in g1.d.comments[0]) && (await list()).posts[0].ccount === 1);
check('A20 댓글 검사: 1글자·링크·비밀번호 없음·없는 글은 거절', (await cmt({ post_id: pid, text: '가' })).s === 400 && (await cmt({ post_id: pid, text: 'www.spam.com 오세요' })).s === 400 && (await cmt({ post_id: pid, text: '비밀번호 없는 댓글', pw: '' })).s === 400 && (await cmt({ post_id: 9999, text: '없는 글에 댓글' })).s === 404);
const cme = '203.0.113.250'; const cs = [];
for (let i = 1; i <= 6; i++) cs.push((await cmt({ post_id: pid, text: `연속 댓글 ${i}번째예요` }, cme)).s);
check('A21 같은 사람은 10분에 댓글 5개까지, 같은 댓글은 한 시간 안에 다시 못 씀', cs.slice(0, 5).every(s => s === 200) && cs[5] === 429 && (await cmt({ post_id: pid, text: '좋은 의견이에요' })).s === 409, cs.join(','));
const cid = c.d.id;
check('A22 댓글도 비밀번호가 틀리면 못 지움', (await cmt({ action: 'delete', id: cid, pw: '0000' })).s === 403);
c = await cmt({ action: 'delete', id: cid, pw: '5678' });
check('A23 맞는 비밀번호로 댓글을 지우면 사라지고 댓글 수도 줄어듦(6→5)', c.s === 200 && !(await read(pid)).d.comments.some(x2 => x2.id === cid) && (await list()).posts[0].ccount === 5);

// ---------- 신고 ----------
await reset();
const rp = (await write({ title: '신고 시험 글' })).d.id;
let r1 = await rep('post', rp, '욕설·혐오', '192.0.2.1'), r1b = await rep('post', rp, '기타', '192.0.2.1');
check('A24 신고 1건, 같은 사람이 또 신고해도 한 번만 셈, 정해진 이유가 아니면 거절', r1.d.ok && !r1.d.hidden && r1b.d.already === true && (await rep('post', rp, '내맘대로', '192.0.2.9')).s === 400);
await rep('post', rp, '광고·도배', '192.0.2.2'); const r3 = await rep('post', rp, '개인정보', '192.0.2.3');
check('A25 서로 다른 3명이 신고하면 글 자동 숨김(목록·글 보기에서 사라지고 더 신고 못 함)', r3.d.hidden === true && (await list()).total === 0 && (await read(rp)).s === 404 && (await rep('post', rp, '기타', '192.0.2.4')).s === 404);
const rp2 = (await write({ title: '댓글 신고 시험 글', text: '댓글 신고를 시험하는 글이에요' })).d.id;
const rc = (await cmt({ post_id: rp2, text: '신고당할 댓글이에요' })).d.id; await cmt({ post_id: rp2, text: '멀쩡한 댓글이에요' });
for (const w of ['192.0.2.11', '192.0.2.12']) await rep('comment', rc, '욕설·혐오', w);
const rc3 = await rep('comment', rc, '기타', '192.0.2.13');
check('A26 댓글도 3명이 신고하면 숨김, 댓글 수 2→1', rc3.d.hidden === true && (await read(rp2)).d.comments.length === 1 && (await list()).posts[0].ccount === 1);

// ---------- 관리자 ----------
check('A27 비밀번호 없이/틀리면 관리 거절, 다른 사이트에서 온 관리 요청도 거절', (await adm('GET', '/api/admin/board', undefined, '')).s === 401 && (await adm('GET', '/api/admin/board', undefined, 'wrong')).s === 401 && (await call('POST', '/api/admin/board', { body: { action: 'mode', premod: true }, admin: ADMIN, origin: 'https://evil.example' })).s === 403);
let g = await adm('GET', '/api/admin/board?kind=post&filter=hidden');
check('A28 관리자는 숨겨진 글·신고 이유 3가지를 봄, 글/댓글별 개수도', g.s === 200 && g.d.items.length === 1 && g.d.items[0].reports === 3 && g.d.items[0].reasons.length === 3 && g.d.counts.post.hidden === 1 && g.d.counts.comment.hidden === 1, JSON.stringify(g.d.counts));
await adm('POST', '/api/admin/board', { kind: 'post', action: 'show', id: rp });
check('A29 글 다시 공개: 목록에 돌아오고 신고 수 0', (await list()).posts.some(p => p.id === rp) && (await adm('GET', '/api/admin/board')).d.items.find(p => p.id === rp).reports === 0);
g = await adm('GET', '/api/admin/board?kind=comment&filter=hidden');
check('A30 관리자는 숨겨진 댓글과 어느 글에 단 댓글인지 봄', g.d.items.length === 1 && g.d.items[0].id === rc && g.d.items[0].post_title === '댓글 신고 시험 글');
await adm('POST', '/api/admin/board', { kind: 'comment', action: 'show', id: rc });
check('A31 댓글 다시 공개하면 댓글 수 1→2', (await read(rp2)).d.comments.length === 2 && (await list()).posts.find(p => p.id === rp2).ccount === 2);
await adm('POST', '/api/admin/board', { kind: 'comment', action: 'delete', id: rc });
await adm('POST', '/api/admin/board', { kind: 'post', action: 'hide', id: rp });
check('A32 관리자 댓글 삭제(2→1)·글 숨김', (await list()).posts.find(p => p.id === rp2).ccount === 1 && !(await list()).posts.some(p => p.id === rp));
await adm('POST', '/api/admin/board', { kind: 'post', action: 'delete', id: rp2 });
check('A33 관리자가 글을 지우면 그 글의 댓글도 함께 지워짐', (await adm('GET', '/api/admin/board?kind=comment')).d.items.length === 0);

// ---------- 검토 후 공개 ----------
await reset();
const vis = (await write({ title: '먼저 올라온 글' })).d.id;
await adm('POST', '/api/admin/board', { action: 'mode', premod: true });
const pw1 = await write({ title: '검토 후 공개 시험 글', text: '검토 후 공개 시험용 글입니다' });
const pc1 = await cmt({ post_id: vis, text: '검토 후 공개 댓글이에요' });
check('A34 켜면 새 글·댓글은 대기로 들어가 안 보임', pw1.d.pending === true && pc1.d.pending === true && (await list()).total === 1 && (await list()).premod === true && (await read(vis)).d.comments.length === 0 && (await list()).posts[0].ccount === 0);
check('A35 관리자는 대기 글·댓글을 봄', (await adm('GET', '/api/admin/board?filter=pending')).d.items.length === 1 && (await adm('GET', '/api/admin/board?kind=comment&filter=pending')).d.items.length === 1);
await adm('POST', '/api/admin/board', { kind: 'post', action: 'show', id: pw1.d.id }); await adm('POST', '/api/admin/board', { kind: 'comment', action: 'show', id: pc1.d.id });
check('A36 승인하면 보임', (await list()).total === 2 && (await read(vis)).d.comments.length === 1);
check('A37 켜져 있을 때 글을 고치면 다시 승인 대기', (await own({ action: 'edit', id: vis, pw: '1234', title: '고친 글', text: '검토 중에 고친 내용이에요' })).d.pending === true && (await list()).total === 1);
await adm('POST', '/api/admin/board', { action: 'mode', premod: false });
check('A38 끄면 다시 바로 공개', (await write({ title: '스위치를 끈 뒤의 글', text: '스위치를 끈 뒤에 올린 글이에요' })).d.pending === false);

// ---------- 쪽 번호·검색 ----------
await reset();
for (let i = 1; i <= 45; i++) await write({ title: i % 5 === 0 ? `점자 질문 ${i}번` : `수어 이야기 ${i}번`, text: `쪽 번호 시험용 ${i}번 글입니다 안녕하세요`, nick: i <= 3 ? '바다' : '' });
const P1 = await list(), P3 = await list('?page=3'), P9 = await list('?page=9');
check('A39 글 45개: 1쪽 20개(최신순)·전체 3쪽·3쪽 5개·없는 쪽은 마지막 쪽으로', P1.posts.length === 20 && P1.total === 45 && P1.pages === 3 && P1.posts[0].id === 45 && P3.posts.length === 5 && P3.posts[4].id === 1 && P9.page === 3, `${P1.posts.length} ${P1.total} ${P1.pages} ${P3.posts.length} ${P9.page}`);
const S1 = await list('?q=' + encodeURIComponent('점자 질문') + '&field=title'), S2 = await list('?q=' + encodeURIComponent('바다') + '&field=nick'), S3 = await list('?q=' + encodeURIComponent('12번 글') + '&field=all'), S4 = await list('?q=%25&field=all');
check('A40 검색: 제목(9개)·글쓴이(3개)·제목+내용(1개), 「%」 같은 특수 글자는 글자 그대로 찾음(0개)', S1.total === 9 && S2.total === 3 && S3.total === 1 && S4.total === 0, `${S1.total} ${S2.total} ${S3.total} ${S4.total}`);

// ---------- 관리 비밀번호 맞히기 막기 ----------
await reset(); last = 0;
for (let i = 0; i < 11; i++) last = (await call('GET', '/api/admin/board', { admin: 'guess' + i, ip: '203.0.113.99' })).s;
check('A41 관리 비밀번호를 10번 넘게 틀리면, 맞는 비밀번호도 잠깐 막힘(429)', last === 429 && (await call('GET', '/api/admin/board', { admin: ADMIN, ip: '203.0.113.99' })).s === 429 && (await call('GET', '/api/admin/board', { admin: ADMIN, ip: '203.0.113.50' })).s === 200);
await reset();
process.exit(0);
