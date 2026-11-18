// 게시판 화면 시험(브라우저): 위쪽 「의견」 버튼 → 게시판 → 글쓰기·거절 안내·신고·자동 숨김 → 관리 화면에서 삭제·숨김·공개·검토 후 공개
// 사용: node board-ui.mjs <주소(시험용 서버)> [mobile|desktop]
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '').replace(/\/?$/, '/');
const API = BASE.replace(/\/$/, '');   // 슬래시 없는 주소(뒤에 /api/… 를 붙일 때)
const size = process.argv[3] || 'mobile';
const c = await open(size === 'mobile' ? { w: 390, h: 844, dpr: 2 } : { w: 1280, h: 800, mobile: false });
const { ev, sleep } = c;
const txt = async s => ((await ev(`document.querySelector(${JSON.stringify(s)})?.textContent`)) || '').replace(/\s+/g, ' ').trim();
const cnt = s => ev(`document.querySelectorAll(${JSON.stringify(s)}).length`);
const vis = s => ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)});return !!e && !e.hidden && e.getBoundingClientRect().width>0})()`);
await fetch(API + '/__test/reset');
await c.fresh(BASE + '?bu=' + Date.now(), 2500);

// 위쪽 버튼
const pos = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.querySelector('#btnBoard').getBoundingClientRect(),t=document.querySelector('.topbar .tt').getBoundingClientRect(),i=document.querySelector('#btnBigText').getBoundingClientRect();return {bl:Math.round(b.left),br:Math.round(b.right),tr:Math.round(t.right),il:Math.round(i.left),w:Math.round(b.width),text:getComputedStyle(document.querySelector('#btnBoard .bt')).display}})())`));
check('U1 위쪽 「의견」 버튼이 제목과 글자 크기 버튼 사이에 있음', pos.bl >= pos.tr && pos.br <= pos.il, JSON.stringify(pos));
await ev(`document.querySelector('#btnBoard').click()`); await sleep(800);
check('U2 누르면 게시판이 열리고 제목 「의견 게시판」, 맨 위 제목에 포커스', (await vis('#view-board')) === true && (await txt('#pageTitle')) === '의견 게시판' && (await ev(`document.activeElement.id`)) === 'boardH');
check('U3 처음엔 글이 없다고 안내', /아직 올라온 글이 없어요/.test(await txt('#boardList')));
check('U4 이용 안내(개인정보·링크 금지·신고 3건·직접 못 지움·접속 주소)', /개인정보/.test(await txt('.boardrules')) && /3건/.test(await txt('.boardrules')) && /직접 지울 수 없어요/.test(await txt('.boardrules')) && /접속 주소/.test(await txt('.boardrules')));

const write = async t => { await ev(`(()=>{const e=document.querySelector('#boardText');e.value=${JSON.stringify(t)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`); };
const submit = async () => { await ev(`document.querySelector('#boardSubmit').click()`); await sleep(900); };
await write('가나'); await submit();
check('U5 너무 짧으면 보내지 않고 안내(5글자 이상)', /5글자 이상/.test(await txt('#boardMsg')) && (await cnt('.bpost')) === 0);
await sleep(2200);
await write('연락은 010-1234-5678 로 주세요 감사합니다'); await submit();
check('U6 서버가 거절한 글은 이유를 화면에 알림(전화번호)', /전화번호/.test(await txt('#boardMsg')) && (await cnt('.bpost')) === 0, await txt('#boardMsg'));
await write('수어 사전에 이런 단어가 더 있으면 좋겠어요.\n점자 연습도 재미있어요.'); await submit();
check('U7 글이 올라가고 목록 맨 위에 줄바꿈 그대로 보임, 입력칸은 비워짐', (await cnt('.bpost')) === 1 && /점자 연습도 재미있어요/.test(await txt('.bpost .btext')) && (await ev(`document.querySelector('#boardText').value`)) === '' && /올렸어요/.test(await txt('#boardMsg')));
const html = await ev(`document.querySelector('.bpost .btext').innerHTML`);
await write('<script>alert(1)</script> <b>굵게</b> 시험 글입니다'); await sleep(2200); await submit();
check('U8 글 속의 HTML 글자는 그대로 글자로만 보임(코드가 실행되지 않음)', (await cnt('.bpost')) === 2 && (await ev(`!document.querySelector('.bpost .btext b') && document.querySelector('.bpost .btext').textContent.includes('<script>')`)) === true);
check('U9 JS 오류 없음(여기까지)', c.errs.length === 0, c.errs.join(' | '));

// 새로고침해도 서버에 저장되어 있음
await c.goto(BASE + '?bu2=' + Date.now(), 2000);
await ev(`document.querySelector('#btnBoard').click()`); await sleep(1000);
check('U10 새로고침 후에도 글 2개가 서버에서 다시 보임(최신순)', (await cnt('.bpost')) === 2 && /HTML|script/.test(await txt('.bpost .btext')));

// 신고: 이유 고르기 → 보내기 → 「신고함」 표시. 서로 다른 3명이 신고하면 자동 숨김
await ev(`document.querySelector('.bpost [data-report]').click()`); await sleep(300);
check('U11 「신고」를 누르면 이유 4가지 중 고르는 칸이 열리고 포커스가 이동', (await cnt('.breport input[type=radio]')) === 4 && (await ev(`document.activeElement.type`)) === 'radio');
await ev(`document.querySelector('.breport [data-cancel]').click()`); await sleep(200);
check('U12 취소하면 닫힘', (await vis('.breport')) === false);
await ev(`document.querySelector('.bpost [data-report]').click()`); await sleep(200);
await ev(`document.querySelectorAll('.breport input[type=radio]')[2].click()`);
await ev(`document.querySelector('.breport [data-send]').click()`); await sleep(900);
check('U13 신고하면 알림 + 버튼이 「신고함」으로 바뀌어 다시 못 누름', /신고했어요/.test(await txt('#toast')) && (await txt('.bpost [data-report]')) === '신고함' && (await ev(`document.querySelector('.bpost [data-report]').disabled`)) === true);
const firstId = Number(await ev(`document.querySelector('.bpost').dataset.id`));
for (const ip of ['192.0.2.11', '192.0.2.12']) await fetch(API + '/api/board/report', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE.replace(/\/$/, ''), 'X-Test-IP': ip }, body: JSON.stringify({ id: firstId, reason: '기타' }) });
await ev(`document.querySelector('#btnBoard').click()`); await c.goto(BASE + '?bu3=' + Date.now(), 1800);
await ev(`document.querySelector('#btnBoard').click()`); await sleep(1000);
check('U14 다른 두 사람이 더 신고해 3건이 되면 그 글은 목록에서 사라짐(자동 숨김)', (await cnt('.bpost')) === 1 && (await ev(`document.querySelector('.bpost').dataset.id`)) !== String(firstId));

// 관리 화면(같은 탭에서 전에 로그인한 기록이 남아 있으면 지우고 시작)
await ev(`sessionStorage.removeItem('sonbit-admin')`);
await c.goto(BASE + 'admin?x=' + Date.now(), 1500);
check('U15 관리 화면은 로그인 칸만 보이고 글은 안 보임, 검색 제외(noindex) 표시', (await vis('#login')) === true && (await vis('#panel')) === false && (await ev(`document.querySelector('meta[name=robots]').content`)) === 'noindex, nofollow');
await ev(`(()=>{const e=document.querySelector('#pw');e.value='틀린비밀번호';document.querySelector('#login').requestSubmit()})()`); await sleep(700);
check('U16 틀린 비밀번호(한글이 섞여도)는 거절 안내',/맞지 않아요/.test(await txt('#msg')) && (await vis('#panel')) === false);
await ev(`(()=>{const e=document.querySelector('#pw');e.value='test-admin-pw';document.querySelector('#login').requestSubmit()})()`); await sleep(900);
check('U17 맞는 비밀번호면 글 목록과 「검토 후 공개」 스위치가 보임, 숨겨진 글은 붉은 칸으로', (await vis('#panel')) === true && (await cnt('.post')) === 2 && (await cnt('.post.hidden')) === 1);
await ev(`document.querySelector('.chip[data-f="hidden"]').click()`); await sleep(500);
check('U18 「숨겨짐」 거르기: 신고 3건·이유가 보임', (await cnt('.post')) === 1 && /신고 3건/.test(await txt('.post')) && /신고 이유/.test(await txt('.post')), (await txt('.post')).slice(0, 90));
await ev(`document.querySelector('.post [data-a="show"]').click()`); await sleep(700);
await ev(`document.querySelector('.chip[data-f="all"]').click()`); await sleep(500);
check('U19 「공개」를 누르면 다시 공개 중(숨겨진 글 0개)', (await cnt('.post.hidden')) === 0 && (await cnt('.post')) === 2);
await ev(`window.confirm = () => true; document.querySelector('.post [data-a="delete"]').click()`); await sleep(800);
check('U20 「삭제」하면 목록에서 사라짐', (await cnt('.post')) === 1);
await ev(`document.querySelector('#premod').click()`); await sleep(600);
check('U21 「검토 후 공개」를 켬', /승인해야 보여요/.test(await txt('#msg')));
await c.goto(BASE + '?bu4=' + Date.now(), 1500);
await ev(`document.querySelector('#btnBoard').click()`); await sleep(900);
check('U22 켜져 있는 동안 게시판에 안내가 보이고', (await vis('#boardPremod')) === true);
await fetch(API + '/__test/reset?only=limits');   // 이 브라우저로 이미 글 2개를 써서 10분 제한에 걸리므로 횟수만 지움
await sleep(2200); await write('검토 후 공개 시험용 글입니다 안녕'); await submit();
check('U23 새 글은 「운영자가 확인한 뒤에」 안내만 나오고 목록에는 안 올라감', /확인한 뒤에/.test(await txt('#boardMsg')) && (await cnt('.bpost')) === 1);
await fetch(API + '/__test/reset');
check('U24 JS 오류·콘솔 오류 없음', c.errs.length === 0 && c.cons.length === 0, c.errs.concat(c.cons).join(' | '));
await c.close(); process.exit(0);
