// 게시판 화면 시험(브라우저): 「의견」 버튼 → 목록·공지 → 글쓰기(검사·긴 글) → 글 보기 → 댓글 쓰기·지우기 → 수정 버튼 없음 → 주소로 바로 열기·뒤로 가기
// → 신고·자동 숨김 → 쪽 번호·검색 → 본인 삭제 → 관리 화면(글·댓글, 숨김·공개·삭제, 검토 후 공개)
// 사용: node board-ui.mjs <주소(시험용 서버)> [mobile|desktop]
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '').replace(/\/?$/, '/');
const API = BASE.replace(/\/$/, '');   // 슬래시 없는 주소(뒤에 /api/… 를 붙일 때)
const size = process.argv[3] || 'mobile', desktop = size === 'desktop';
const c = await open(desktop ? { w: 1280, h: 800, mobile: false } : { w: 390, h: 844, dpr: 2 });
const { ev, sleep } = c;
const J = JSON.stringify;
const txt = async s => ((await ev(`document.querySelector(${J(s)})?.textContent`)) || '').replace(/\s+/g, ' ').trim();
const cnt = s => ev(`document.querySelectorAll(${J(s)}).length`);
const vis = s => ev(`(()=>{const e=document.querySelector(${J(s)});return !!e && !e.hidden && e.getBoundingClientRect().width>0})()`);
const click = async (s, wait = 700) => { await ev(`document.querySelector(${J(s)}).click()`); await sleep(wait); };
const setv = (s, v) => ev(`(()=>{const e=document.querySelector(${J(s)});e.value=${J(v)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const submit = async (s, wait = 1000) => { await ev(`document.querySelector(${J(s)}).requestSubmit()`); await sleep(wait); };
const hash = () => ev('location.hash');
const focusId = () => ev('document.activeElement.id');
const noOverflow = () => ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1');
const api = (p, body, ip) => fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: API, 'X-Test-IP': ip }, body: J(body) }).then(r => r.json());
const resetLimits = () => fetch(API + '/__test/reset?only=limits');
const toastHas = async re => re.test(await txt('#toast'));
await fetch(API + '/__test/reset');
await c.fresh(BASE + '?bu=' + Date.now(), 2500);

// ---------- 위쪽 버튼·목록 ----------
const pos = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.querySelector('#btnBoard').getBoundingClientRect(),t=document.querySelector('.topbar .tt').getBoundingClientRect(),i=document.querySelector('#btnBigText').getBoundingClientRect();return {bl:Math.round(b.left),br:Math.round(b.right),tr:Math.round(t.right),il:Math.round(i.left)}})())`));
check('U1 위쪽 「의견」 버튼이 제목과 글자 크기 버튼 사이에 있음', pos.bl >= pos.tr && pos.br <= pos.il, J(pos));
await click('#btnBoard', 1000);
check('U2 누르면 게시판 목록(주소 #board, 제목 「의견 게시판」, 제목에 포커스)', (await vis('#view-board')) && (await hash()) === '#board' && (await txt('#pageTitle')) === '의견 게시판' && (await focusId()) === 'boardH');
check('U3 처음엔 「전체 0개」·글이 없다는 안내, 맨 위에 공지(이용 안내)', /전체 0개/.test(await txt('.bcount')) && /아직 올라온 글이 없어요/.test(await txt('.btable')) && (await cnt('.bnotice')) === 1);
check(`U4 ${desktop ? '넓은 화면은 표 머리줄(번호·제목·글쓴이·날짜·조회)이 보임' : '휴대폰은 표 머리줄 없이 두 줄 목록'}`, (await vis('.bth')) === desktop && /번호제목글쓴이날짜조회/.test((await txt('.bth')).replace(/ /g, '')));
await click('[data-brules]', 600);
check('U5 공지를 누르면 이용 안내(주소 #board/rules, 비밀번호로 직접 지우기·욕설 안 됨 안내)', (await hash()) === '#board/rules' && /게시판 이용 안내/.test(await txt('#bpH')) && /글과 댓글은 쓸 때 정한 비밀번호로 직접 지울 수 있어요/.test(await txt('.boardrules')) && /올린 글은 고칠 수 없으니/.test(await txt('.boardrules')) && /욕설이 들어간 글·댓글·닉네임은 올릴 수 없어요/.test(await txt('.boardrules')) && (await focusId()) === 'bpH');
await click('[data-blist]', 800);

// ---------- 글쓰기 ----------
await click('[data-bwrite]', 600);
check('U6 「글쓰기」: 주소 #board/write, 닉네임·비밀번호·제목·내용 칸, 내용 칸 글자 수 제한 없음', (await hash()) === '#board/write' && (await txt('#bpH')) === '글쓰기' && (await cnt('#bwNick,#bwPw,#bwTitle,#bwText')) === 4 && (await ev(`document.querySelector('#bwText').hasAttribute('maxlength')`)) === false && !(await cnt('#boardCount')));
await submit('#bwForm', 300);
const m1 = await txt('#bwMsg'); const f1 = await focusId();
await setv('#bwPw', '1234'); await submit('#bwForm', 300); const m2 = await txt('#bwMsg');
await setv('#bwTitle', '수어 사전에 바라는 점'); await submit('#bwForm', 300); const m3 = await txt('#bwMsg');
check('U7 빈 칸이면 보내지 않고 차례로 안내(비밀번호 4글자 → 제목 2글자 → 내용 5글자)', /비밀번호를 4글자/.test(m1) && f1 === 'bwPw' && /제목을 2글자/.test(m2) && /내용을 5글자/.test(m3), [m1, m2, m3].join(' / '));
await sleep(1800);
await setv('#bwText', '연락은 010-1234-5678 로 주세요 감사합니다'); await submit('#bwForm');
check('U8 서버가 거절한 글은 이유를 알림(전화번호)', /전화번호/.test(await txt('#bwMsg')), await txt('#bwMsg'));
await setv('#bwText', '이거 씨1발 왜 안 돼요 알려 주세요'); await submit('#bwForm');
check('U8b 욕설이 든 글은 「고운 말로 바꿔 주세요」 안내(찾은 말은 「씨*」로 가려 보여 줌), 쓴 내용은 그대로 남음', /내용에 쓸 수 없는 말\(「씨\*」\).*고운 말로/.test(await txt('#bwMsg')) && /씨1발/.test(await ev(`document.querySelector('#bwText').value`)), await txt('#bwMsg'));
const LONG = '수어 사전에 이런 단어가 더 있으면 좋겠어요.\n' + '사회복지 상담 사례관리 바우처 '.repeat(40).trim();
await setv('#bwNick', '수어배움이'); await setv('#bwText', LONG); await submit('#bwForm', 1500);
const id1 = Number((await hash()).split('/')[1]);
check('U9 500글자가 넘는 글도 올라가고 바로 그 글이 열림(제목·글쓴이·조회 1·줄바꿈 그대로)', (await hash()) === '#board/' + id1 && (await txt('#bpH')) === '수어 사전에 바라는 점' && /수어배움이/.test(await txt('.bmeta2')) && /조회 1/.test(await txt('.bmeta2')) && (await ev(`document.querySelector('.bbody').textContent.length`)) === LONG.length && (await ev(`document.querySelector('.bbody').innerText.includes('\\n')`)) === true && await toastHas(/글을 올렸어요/), `${LONG.length}글자`);
check('U10 글 보기 화면이 옆으로 넘치지 않음', await noOverflow());
await click('[data-blist]', 800); await click('[data-bwrite]', 2300);
await setv('#bwPw', '4321'); await setv('#bwTitle', '<b>굵게</b> 제목'); await setv('#bwText', '<script>alert(1)</script> <img src=x onerror="alert(2)"> 시험 글입니다'); await submit('#bwForm', 1500);
check('U11 글 속의 HTML은 글자로만 보임(코드가 실행되지 않음)', (await ev(`!document.querySelector('#bpH b') && !document.querySelector('.bbody img') && document.querySelector('.bbody').textContent.includes('<script>')`)) === true && c.errs.length === 0);
const id2 = Number((await hash()).split('/')[1]);
await click('[data-blist]', 900);
check('U12 목록: 전체 2개, 최신 글이 위, 새 글 표시(N)·글쓴이·조회수', /전체 2개/.test(await txt('.bcount')) && (await cnt('.btable [data-bid]')) === 2 && (await txt('.btable [data-bid] .bttl')) === '<b>굵게</b> 제목' && (await cnt('.bnew')) === 2 && /수어배움이/.test(await txt(`[data-bid="${id1}"]`)) && await noOverflow());

// ---------- 댓글 ----------
await click(`[data-bid="${id1}"]`, 2400);
check('U13 목록에서 제목을 누르면 그 글(주소 #board/번호)', (await hash()) === '#board/' + id1 && (await txt('#bpH')) === '수어 사전에 바라는 점');
await setv('#bcNick', '하늘'); await setv('#bcPw', '5678'); await setv('#bcText', '저도 같은 생각이에요!'); await submit('#bcForm', 1300);
check('U14 댓글을 달면 바로 보이고 댓글 수 1', (await cnt('.bcmt')) === 1 && (await txt('#bcH .bcc')) === '1' && /하늘/.test(await txt('.bcmt')) && /같은 생각/.test(await txt('.bcmt .btext')));
await click('[data-blist]', 900);
check('U15 목록 제목 옆에 댓글 수 [1]', (await txt(`[data-bid="${id1}"] .bcc`)) === '[1]');
await click(`[data-bid="${id1}"]`, 1200);
await click('.bcmt [data-cdel]', 300);
check('U16 댓글 「삭제」를 누르면 비밀번호 칸이 열리고 포커스', (await vis('.bcmt .bpw')) && /^bpw-cdel-/.test(await focusId()));
await setv('.bcmt .bpw input', '0000'); await submit('.bcmt .bpw', 900);
check('U17 틀린 비밀번호는 거절 안내', /맞지 않아요/.test(await txt('.bcmt .bpwmsg')) && (await cnt('.bcmt')) === 1);
await setv('.bcmt .bpw input', '5678'); await submit('.bcmt .bpw', 1200);
check('U18 맞는 비밀번호면 댓글이 지워짐(댓글 0)', (await cnt('.bcmt')) === 0 && (await txt('#bcH .bcc')) === '0' && await toastHas(/댓글을 지웠어요/));

// ---------- 글 고치기는 없음(2026-11-19 작업자님 요청으로 없앰) ----------
check('U19 글 보기에는 「목록·삭제·신고」만 있고 「수정」 버튼은 없음', !(await cnt('[data-bown="edit"]')) && (await cnt('[data-bown="delete"]')) === 1 && !/수정/.test(await txt('.bacts')), await txt('.bacts'));
await click('[data-bown="delete"]', 300);
await setv('#bPostPanel .bpw input', '9999'); await submit('#bPostPanel .bpw', 900);
check('U20 「삭제」: 비밀번호가 틀리면 지워지지 않고 그 글에 머묾', /맞지 않아요/.test(await txt('#bPostPanel .bpwmsg')) && (await hash()) === '#board/' + id1);
await click('#bPostPanel [data-pclose]', 300);
check('U21 글쓰기 안내에 「올린 글은 고칠 수 없어요」, 비밀번호 설명은 「지울 때 필요」', await (async () => { await click('[data-blist]', 800); await click('[data-bwrite]', 600); const ok = /올린 글은 고칠 수 없으니/.test(await txt('#bwForm')) && /글을 지울 때 필요해요/.test(await txt('#bwPwHelp')) && !/고치거나/.test(await txt('#bwForm')); await click('[data-bcancel]', 600); return ok; })());

// ---------- 주소로 바로 열기·뒤로 가기 ----------
await c.goto(BASE + '?r=' + Date.now() + '#board/' + id1, 2200);
check('U22 글 주소(#board/번호)로 바로 열면 그 글이 열림', (await vis('#view-board')) && (await txt('#bpH')) === '수어 사전에 바라는 점');
await click('#boardBack', 900);
check('U23 바로 연 글에서 왼쪽 위 화살표 → 게시판 목록', (await hash()) === '#board' && (await cnt('.btable [data-bid]')) === 2);
await click(`[data-bid="${id2}"]`, 1000);
await ev('history.back()'); await sleep(1000);
check('U24 브라우저 뒤로 가기: 글 → 목록', (await hash()) === '#board' && (await cnt('.btable [data-bid]')) === 2);
await c.goto(BASE + '?r2=' + Date.now() + '#board/edit/' + id1, 2200);
check('U25 예전 수정 주소(#board/edit/번호)로 들어오면 그 글 보기로', (await txt('#bpH')) === '수어 사전에 바라는 점' && !(await cnt('#bwForm')) && (await hash()) === '#board/' + id1, await hash());

// ---------- 신고 ----------
await c.goto(BASE + '?r3=' + Date.now() + '#board/' + id2, 2200);
await click('[data-breport]', 300);
check('U26 「신고」: 이유 4가지 중 고르는 칸이 열리고 포커스', (await cnt('#bPostPanel input[type=radio]')) === 4 && (await ev('document.activeElement.type')) === 'radio');
await ev(`document.querySelectorAll('#bPostPanel input[type=radio]')[2].click()`);
await click('[data-rsend]', 900);
check('U27 신고하면 알림 + 「신고함」으로 바뀌어 다시 못 누름', await toastHas(/신고했어요/) && (await txt('.bacts [data-breport]')) === '신고함' && (await ev(`document.querySelector('.bacts [data-breport]').disabled`)) === true);
for (const ip of ['192.0.2.11', '192.0.2.12']) await api('/api/board/report', { kind: 'post', id: id2, reason: '기타' }, ip);
await c.goto(BASE + '?r4=' + Date.now() + '#board', 2000);
check('U28 다른 두 사람이 더 신고해 3건이 되면 그 글은 목록에서 사라짐', /전체 1개/.test(await txt('.bcount')) && !(await cnt(`[data-bid="${id2}"]`)));

// ---------- 쪽 번호·검색 ----------
for (let i = 1; i <= 25; i++) await api('/api/board', { title: `쪽 시험 글 ${i}번`, text: `쪽 번호 시험용 ${i}번 글입니다`, nick: '', pw: '1111', hp: '', ms: 5000 }, '10.9.0.' + i);
await c.goto(BASE + '?r5=' + Date.now() + '#board', 2000);
check('U29 글이 26개면 1쪽 20개 + 쪽 번호 1·2', (await cnt('.btable [data-bid]')) === 20 && (await cnt('.bpager button')) === 2 && (await ev(`document.querySelector('.bpager [aria-current]').textContent`)) === '1');
await click('[data-bpage="2"]', 1000);
check('U30 2쪽을 누르면 나머지 6개, 2쪽 표시', (await cnt('.btable [data-bid]')) === 6 && (await ev(`document.querySelector('.bpager [aria-current]').textContent`)) === '2' && !(await cnt('.bnotice')));
await ev(`document.querySelector('#bsField').value='title'`); await setv('#bsQ', '쪽 시험'); await submit('#bsForm', 1000);
check('U31 제목 검색: 「쪽 시험」 검색 결과 25개, 공지는 안 보임', /「쪽 시험」 검색 결과 25개/.test(await txt('.bcount')) && !(await cnt('.bnotice')));
await click('[data-bclear]', 900);
check('U32 「검색 지우기」 → 전체 26개', /전체 26개/.test(await txt('.bcount')));

// ---------- 본인 삭제 ----------
await click('[data-bpage="2"]', 1000); await click(`[data-bid="${id1}"]`, 1200);   // 가장 오래된 글이라 2쪽에 있음
await click('[data-bown="delete"]', 300);
check('U33 「삭제」: 댓글도 함께 지워진다는 안내와 비밀번호 칸', /댓글도 함께 지워져요/.test(await txt('#bPostPanel')));
await setv('#bPostPanel .bpw input', '1234'); await submit('#bPostPanel .bpw', 1300);
check('U34 맞는 비밀번호로 지우면 목록으로 돌아가고 그 글은 없음(전체 25개)', (await hash()) === '#board' && /전체 25개/.test(await txt('.bcount')) && !(await cnt(`[data-bid="${id1}"]`)) && await toastHas(/글을 지웠어요/));
check('U35 JS 오류 없음(여기까지)', c.errs.length === 0, c.errs.join(' | '));

// ---------- 관리 화면 ----------
const cmtId = (await api('/api/board/comment', { action: 'add', post_id: id2 + 1, text: '관리 화면 시험 댓글이에요', nick: '바람', pw: '2222', hp: '', ms: 5000 }, '10.8.0.1')).id;
await ev(`sessionStorage.removeItem('sonbit-admin')`);
await c.goto(BASE + 'admin?x=' + Date.now(), 1500);
check('U36 관리 화면은 로그인 칸만, 검색 제외(noindex)', (await vis('#login')) && !(await vis('#panel')) && (await ev(`document.querySelector('meta[name=robots]').content`)) === 'noindex, nofollow');
await setv('#pw', '틀린비밀번호'); await submit('#login', 800);
check('U37 틀린 비밀번호(한글이 섞여도)는 거절 안내', /맞지 않아요/.test(await txt('#msg')) && !(await vis('#panel')));
await setv('#pw', 'test-admin-pw'); await submit('#login', 1000);
check('U38 맞으면 글/댓글 전환·거르기·글 목록(제목·글쓴이·조회)', (await vis('#panel')) && /글 26/.test(await txt('#kinds')) && /댓글 1/.test(await txt('#kinds')) && (await cnt('.post')) === 26 && (await cnt('.post.hidden')) === 1);
await click('.chip[data-f="hidden"]', 700);
check('U39 「숨겨짐」: 신고 3건·이유', (await cnt('.post')) === 1 && /신고 3건/.test(await txt('.post')) && /신고 이유/.test(await txt('.post')) && /굵게/.test(await txt('.post .ttl')));
await click('.post [data-a="show"]', 900);
check('U40 「공개」 → 숨겨진 글 0개', (await cnt('.post')) === 0 && /숨겨짐 0/.test(await txt('#chips')));
await click('#kinds [data-k="comment"]', 800);
check('U41 「댓글」로 바꾸면 댓글과 어느 글에 단 댓글인지 보임', (await cnt('.post')) === 1 && new RegExp('글 #' + (id2 + 1)).test(await txt('.post')) && /관리 화면 시험 댓글/.test(await txt('.post .txt')));
await ev(`window.confirm = () => true`); await click('.post [data-a="delete"]', 900);
check('U42 댓글 「삭제」', (await cnt('.post')) === 0 && new RegExp(`#${cmtId} 댓글을 지웠어요`).test(await txt('#msg')));
await click('#premod', 700);
check('U43 「검토 후 공개」를 켬', /승인해야 보여요/.test(await txt('#msg')));
await resetLimits();
await c.goto(BASE + '?r6=' + Date.now() + '#board/write', 2600);
await setv('#bwPw', '1234'); await setv('#bwTitle', '검토 후 공개 시험'); await setv('#bwText', '검토 후 공개 시험용 글입니다 안녕'); await submit('#bwForm', 1500);
check('U44 새 글은 「운영자가 확인한 뒤에」 알림만, 목록에는 안 올라가고 안내가 보임', await toastHas(/확인한 뒤에/) && (await hash()) === '#board' && /전체 26개/.test(await txt('.bcount')) && /운영자가 확인한 뒤에/.test(await txt('#boardPage .note.amber')));
await fetch(API + '/__test/reset');
check('U45 JS 오류·콘솔 오류 없음', c.errs.length === 0 && c.cons.length === 0, c.errs.concat(c.cons).join(' | '));
await c.close(); process.exit(0);
