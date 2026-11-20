// v3 기능 시험: 단어장·검색 실패 안내·퀴즈 연습/도전·이어서 풀기·점자 쓰기·틀린 문제 복습·기록 내보내기/가져오기/지우기·홈 개인화
import { open, check } from './lib/cdp.mjs';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const c = await open();
const { ev, sleep } = c;
const LS = k => ev(`JSON.parse(localStorage.getItem('sonbit:${k}'))`);
const txt = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent`);
const cnt = sel => ev(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
await c.fresh(BASE + '?f=' + Date.now(), 2500);

// ───────── A. 단어장 ─────────
await c.click('[data-nav="sign"]'); await sleep(300);
check('A0 단어장 바로가기: 처음엔 안내 문구', (await txt('#signShortcuts .shortcut.fav .scc')) === '담아 둔 수어 모음', await txt('#signShortcuts .shortcut.fav .scc'));
await c.click('[data-topic="인사·예절"]'); await sleep(300);
await ev(`(()=>{const rows=[...document.querySelectorAll('#signList .wordrow')];rows[0].open=true;rows[1].open=true})()`); await sleep(1200);
const names = await ev(`[...document.querySelectorAll('#signList .wordrow')].slice(0, 2).map(r => r.querySelector('.wname').textContent)`);
check('A1 단어 펼침 → 영상 있음', (await cnt('#signList .wordrow[open] video')) >= 2);
check('A2 did:sign 기록', (await LS('did:sign')) === true);
await ev(`document.querySelectorAll('#signList .wordrow')[0].querySelector('.favbtn').click()`); await sleep(200);
let fav = await LS('fav');
check('A3 단어장 담기 → 저장', Array.isArray(fav) && fav.length === 1, JSON.stringify(fav));
check('A4 버튼 상태·표시', (await ev(`(()=>{const r=document.querySelectorAll('#signList .wordrow')[0];return r.querySelector('.favbtn').getAttribute('aria-pressed')==='true' && !r.querySelector('.favmark').hidden && r.querySelector('.favbtn .fl').textContent==='단어장에 담김'})()`)) === true);
check('A5 알림 표시', /단어장에 담았어요/.test(await txt('#toast')), await txt('#toast'));
await ev(`document.querySelectorAll('#signList .wordrow')[1].querySelector('.favbtn').click()`); await sleep(200);
check('A6 두 번째 담기 → 2개', (await LS('fav')).length === 2);
await ev(`document.querySelectorAll('#signList .wordrow')[1].querySelector('.favbtn').click()`); await sleep(200);
check('A7 다시 누르면 빼기 → 1개', (await LS('fav')).length === 1 && /뺐어요/.test(await txt('#toast')));
await c.click('#signTopicBack'); await sleep(300);
check('A8 바로가기에 개수 표시', /1개 담음/.test(await txt('#signShortcuts .shortcut.fav .scc')), await txt('#signShortcuts .shortcut.fav .scc'));
await c.click('.shortcut.fav'); await sleep(300);
check('A9 내 단어장 목록 1개 + 퀴즈 버튼', (await cnt('#signList .wordrow')) === 1 && (await cnt('#signActions button')) === 1, await txt('#signActions'));

// ───────── B. 검색(순위·띄어쓰기·초성·실패 안내) ─────────
const search = async q => { await ev(`(()=>{const i=document.querySelector('#signSearch');i.value=${JSON.stringify(q)};i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(300); };
await search('감사');
const first = await ev(`document.querySelector('#signList .wordrow .wname')?.textContent`);
check('B1 검색: 결과가 있고 이름 일치가 앞에', (await cnt('#signList .wordrow')) > 0, `첫 결과 「${first}」, ${await cnt('#signList .wordrow')}개`);
await search('ㄱㅅ'); check('B2 초성 검색', (await cnt('#signList .wordrow')) > 0, (await cnt('#signList .wordrow')) + '개');
await search('감사 합니다'); check('B3 띄어쓰기 섞어도 찾음', (await cnt('#signList .wordrow')) > 0, (await cnt('#signList .wordrow')) + '개 / ' + await ev(`[...document.querySelectorAll('#signList .wname')].slice(0,3).map(e=>e.textContent).join(',')`));
await search('학교에다녀오겠습니다');
check('B4 검색 실패 안내 카드', (await cnt('#signList .nores')) === 1, await txt('#signList .nores h3'));
check('B5 실패 안내: 팁 4개', (await cnt('#signList .nores li')) === 4);
const sug = await ev(`[...document.querySelectorAll('#signList .nores [data-suggest]')].map(b=>b.dataset.suggest)`);
check('B6 비슷한 단어 제안(학교 등)', sug.length > 0, JSON.stringify(sug));
if (sug.length) { await ev(`document.querySelector('#signList .nores [data-suggest]').click()`); await sleep(300); check('B7 제안 칩 누르면 검색됨', (await cnt('#signList .wordrow')) > 0 && (await ev(`document.querySelector('#signSearch').value`)) === sug[0]); }
await search('zzzqqq'); check('B8 알파벳 검색 실패도 오류 없이 안내', (await cnt('#signList .nores')) === 1);
await ev(`document.querySelector('#signList .nores [data-act="signtopics"]').click()`); await sleep(300);
check('B9 「주제로 찾아보기」 → 주제 화면', (await ev(`!document.querySelector('#signHome').hidden`)) === true && (await ev(`document.querySelector('#signSearch').value`)) === '');

// ───────── C. 퀴즈: 연습/도전, 힌트, 이어서 풀기 ─────────
// 현재 문제의 정답을 알아내는 도우미(저장된 퀴즈 상태 + 사전 자료로 계산)
const answerNow = () => ev(`(()=>{const r=JSON.parse(localStorage.getItem('sonbit:quizrun'));const q=r.qs[r.i];
  if(q.t==='br'||q.t==='bu') return q.a;
  if(q.t==='pv') return String(q.i);
  const id=String(q.i); const w=KSL_WORDS.find(x=>String(x.id)===id)||(KSL_EXTRA.find(x=>'N'+x.i===id)&&{w:KSL_EXTRA.find(x=>'N'+x.i===id).w}); return w.w})()`);
const clickOpt = async (ans, correct) => ev(`(()=>{const bs=[...document.querySelectorAll('#quizOpts [data-opt]')];const b=bs.find(x=>(x.dataset.opt===${JSON.stringify(ans)})===${correct});b.click();document.querySelector('#pickGo')?.click();return b.dataset.opt})()`);
await c.click('[data-nav="quiz"]'); await sleep(400);
check('C1 퀴즈 홈: 기본은 연습', (await ev(`document.querySelector('[data-qmode="practice"]').getAttribute('aria-pressed')`)) === 'true');
await c.click('[data-quiz="sign"]'); await sleep(500);
check('C2 연습 문제 화면: 힌트 2개·목숨 없음', (await cnt('#hintCut')) === 1 && (await cnt('#hintText')) === 1 && (await cnt('.lives')) === 0);
let run = await LS('quizrun');
check('C3 풀이 상태가 저장됨', run && run.kind === 'sign' && run.mode === 'practice' && run.qs.length === 10 && run.i === 0, run ? `kind=${run.kind} i=${run.i} 문제 ${run.qs.length}` : 'null');
await c.click('#hintCut'); await sleep(150);
check('C4 보기 하나 지우기', (await cnt('#quizOpts [data-opt]:disabled')) === 1);
await c.click('#hintText'); await sleep(150);
check('C5 힌트(글자 수 또는 영상 설명)', /힌트: (정답은 \d+글자|정답 영상은 (한|두) 손)/.test(await txt('#quizHint')), await txt('#quizHint'));
let ans = await answerNow();
await clickOpt(ans, true); await sleep(400);
check('C6 정답 처리·설명', (await ev(`!!document.querySelector('#quizFeedback .qfeedback.ok')`)) === true && (await cnt('#quizFeedback .qexplain')) === 1, ans);
run = await LS('quizrun');
check('C7 답한 뒤 저장(다음 문제 위치)', run.i === 1 && run.score === 1 && run.done === 1, `i=${run.i} score=${run.score}`);
await c.click('#quizNext'); await sleep(500);
ans = await answerNow();
await clickOpt(ans, false); await sleep(400);
check('C8 오답 처리(연습은 목숨 안 줄어듦)', (await ev(`!!document.querySelector('#quizFeedback .qfeedback.bad')`)) === true && (await LS('quizrun')).lives === 3);
check('C9 틀린 문제가 복습 목록에 저장', (await LS('wrong')).length === 1, JSON.stringify(await LS('wrong')));
await c.click('#quizNext'); await sleep(500);
const optsBefore = await ev(`[...document.querySelectorAll('#quizOpts [data-opt]')].map(b=>b.dataset.opt)`);
await c.click('#quizPause'); await sleep(400);
check('C10 잠시 나가기 → 퀴즈 홈에 이어서 풀기', (await cnt('#qResume')) === 1, (await txt('.resumebar .rt')).replace(/\s+/g, ' '));
await c.goto(BASE + '?r=' + Date.now(), 2200); // 새로고침(저장소는 그대로)
check('C11 새로고침 후 홈에도 이어서 하기 카드', (await cnt('#homeNext .nextcard')) === 1 && /풀던 퀴즈/.test(await txt('#homeNext')), (await txt('#homeNext')).replace(/\s+/g, ' ').slice(0, 80));
await ev(`document.querySelector('#homeNext [data-act="resume"]').click()`); await sleep(600);
const optsAfter = await ev(`[...document.querySelectorAll('#quizOpts [data-opt]')].map(b=>b.dataset.opt)`);
check('C12 이어 풀기: 3번째 문제·같은 보기', /3 \/ 10/.test(await txt('#quizQ')) && JSON.stringify(optsBefore) === JSON.stringify(optsAfter), (await txt('#quizQ')));
// 끝내기
await c.click('#quizEnd'); await sleep(150);
check('C13 끝내기 확인 표시', (await ev(`!document.querySelector('#quizEndConfirm').hidden`)) === true);
await c.click('#quizEndNo'); await sleep(100);
check('C14 계속 풀기로 되돌림', (await ev(`document.querySelector('#quizEndConfirm').hidden`)) === true);
await c.click('#quizEnd'); await c.click('#quizEndYes'); await sleep(400);
check('C15 중간 종료 결과(2문제 중 1개)', /1 \/ 2/.test(await txt('.qresult .score')) && /중간에 끝냈어요/.test(await txt('.qresult')), (await txt('.qresult .score')) + ' | ' + (await txt('.qresult .note')).slice(0, 40));
check('C16 끝나면 저장된 풀이 삭제', (await LS('quizrun')) === null);
check('C17 did:quiz-sign 기록', (await LS('did:quiz-sign')) === true);
check('C18 틀린 문제 다시 풀기 버튼', (await cnt('#quizRetryWrong')) === 1);
await c.click('#quizToHub'); await sleep(300);
check('C19 퀴즈 홈의 복습 칩 개수', (await ev(`document.querySelector('[data-quiz="review"] .rn').textContent`)) === '1');

// 도전
await c.click('[data-qmode="challenge"]'); await sleep(100);
check('C20 도전 선택 저장', (await LS('qmode')) === 'challenge' && /목숨 3개/.test(await txt('#qmodeNote')));
await c.click('[data-quiz="braille"]'); await sleep(500);
check('C21 도전 화면: 힌트 없음·목숨 3', (await cnt('#hintCut')) + (await cnt('#hintText')) === 0 && (await cnt('.lives .life.on')) === 3);
for (let k = 1; k <= 3; k++) {
  ans = await answerNow(); await clickOpt(ans, false); await sleep(300);
  if (k < 3) { check(`C22.${k} 오답 → 목숨 ${3 - k}개`, (await cnt('.lives .life.on')) === 3 - k, await ev(`document.querySelector('.lives').getAttribute('aria-label')`)); await c.click('#quizNext'); await sleep(400); }
}
check('C23 목숨 0 → 「결과 보기」 버튼', /결과 보기/.test(await txt('#quizNext')));
await c.click('#quizNext'); await sleep(400);
check('C24 목숨 소진 결과', /목숨을 모두 썼어요/.test(await txt('.qresult')) && /0 \/ 3/.test(await txt('.qresult .score')), (await txt('.qresult .score')));
check('C25 did:quiz-braille', (await LS('did:quiz-braille')) === true);
await c.click('#quizToHub'); await sleep(200);
await c.click('[data-qmode="practice"]'); await sleep(100);

// ───────── D. 점자 쓰기(직접 입력): 규정표로 직접 만든 정답으로 시험 ─────────
const KNOWN = [
  ['ㄱ', [[4]]], ['ㅏ', [[1, 2, 6]]], ['1', [[3, 4, 5, 6], [1]]], ['가(약자)', [[1, 2, 4, 6]]], ['그래서(약어)', [[1], [2, 3, 4]]],
  ['것(약자)', [[4, 5, 6], [2, 3, 4]]], ['마침표(.)', [[2, 5, 6]]], ['ㄲ', [[6], [4]]], ['ㅒ', [[3, 4, 5], [1, 2, 3, 5]]]
];
await ev(`localStorage.setItem('sonbit:quizrun', JSON.stringify({v:2,kind:'build',mode:'practice',lv:2,scope:'all',i:0,score:0,lives:3,done:0,qs:${JSON.stringify(KNOWN.map(k => ({ t: 'bu', k: /^[0-9]+$/.test(k[0]) ? 'n' : 'p', a: k[0], l: 2 })))},wrong:[]}))`);
await c.goto(BASE + '?b=' + Date.now(), 2200);
await ev(`document.querySelector('#homeNext [data-act="resume"]').click()`); await sleep(500);
for (let k = 0; k < KNOWN.length; k++) {
  const [a, cells] = KNOWN[k];
  const prompt = await txt('.qclue');
  const nCells = await cnt('#buildCells .bcell');
  const okShape = nCells === cells.length && prompt.includes('「' + a + '」');
  // 일부러 한 문제는 틀리게(마지막): 점 하나 모자라게
  const wrongOnPurpose = k === KNOWN.length - 1;
  await ev(`(()=>{const cells=${JSON.stringify(cells)};document.querySelectorAll('#buildCells .bcell').forEach((bc,i)=>{cells[i].forEach((n,j)=>{ if(${wrongOnPurposeJs(wrongOnPurpose)} && i===0 && j===0) return; bc.querySelector('[data-bdot="'+n+'"]').click()})})})()`);
  await c.click('#buildCheck'); await sleep(250);
  const good = await ev(`!!document.querySelector('#quizFeedback .qfeedback.ok')`);
  check(`D${k + 1} 점자 쓰기 「${a}」 ${wrongOnPurpose ? '(일부러 오답)' : ''}`, okShape && (wrongOnPurpose ? good === false : good === true), `칸 ${nCells}/${cells.length}, ${good ? '정답' : '오답'}`);
  if (wrongOnPurpose) {
    check('D-해설: 정답/내가 쓴 것 비교 + 차이 문장', (await cnt('#quizFeedback .qcompare .mini')) === cells.length * 2 && /차이: .*정답에만 있는 점/.test(await txt('#quizFeedback')), (await txt('#quizFeedback .qexplain')).replace(/\s+/g, ' ').slice(0, 120));
    check('D-오답이 복습 목록(bu)에 저장', (await LS('wrong')).some(x => x.t === 'bu' && x.a === a));
  }
  if (k < KNOWN.length - 1) { await c.click('#quizNext'); await sleep(350); }
}
await c.click('#quizNext'); await sleep(400);
check('D-결과: 8 / 9', /8 \/ 9/.test(await txt('.qresult .score')), await txt('.qresult .score'));

// ───────── E. 틀린 문제 복습: 맞히면 목록에서 빠진다 ─────────
await c.click('#quizToHub'); await sleep(200);
const wrongBefore = (await LS('wrong')).length;
await c.click('[data-quiz="review"]'); await sleep(500);
check('E1 복습 퀴즈 시작', /틀린 문제 복습/.test(await txt('#quizQ')), `틀린 문제 ${wrongBefore}개 → ${await txt('#quizQ')}`);
// 첫 문제를 맞히기
const run2 = await LS('quizrun'); const q0 = run2.qs[run2.i];
if (q0.t === 'bu') {
  const cells = JSON.parse(await ev(`(()=>{const m=${JSON.stringify(Object.fromEntries(KNOWN))};return JSON.stringify(m[${JSON.stringify(q0.a)}]||null)})()`));
  if (cells) { await ev(`(()=>{const cells=${JSON.stringify(cells)};document.querySelectorAll('#buildCells .bcell').forEach((bc,i)=>cells[i].forEach(n=>bc.querySelector('[data-bdot="'+n+'"]').click()))})()`); await c.click('#buildCheck'); }
} else { const a = await answerNow(); await clickOpt(a, true); }
await sleep(400);
check('E2 맞히면 틀린 문제 목록에서 빠짐', (await LS('wrong')).length === wrongBefore - 1, `${wrongBefore} → ${(await LS('wrong')).length}`);
await c.click('#quizPause'); await sleep(300); await c.click('#qDiscard'); await sleep(300);
check('E3 그만두기 → 풀이 삭제', (await LS('quizrun')) === null);

// ───────── F. 단어장 퀴즈 ─────────
await c.click('[data-quiz="fav"]'); await sleep(600);
check('F1 단어장 퀴즈 시작(담은 1개 → 1문제)', /내 단어장 퀴즈 · 1 \/ 1/.test(await txt('#quizQ')), await txt('#quizQ'));
ans = await answerNow(); await clickOpt(ans, true); await sleep(300);
check('F2 단어장 문제 정답 = 담은 단어', names.includes(ans), `정답 ${ans} / 담은 단어 후보 ${names.join(',')}`);
await c.click('#quizNext'); await sleep(300);
check('F3 결과 1 / 1', /1 \/ 1/.test(await txt('.qresult .score')));
await c.click('#quizToHub'); await sleep(200);

// ───────── P. 난이도(하·중·상)·영상 고르기 문제·난이도 권유 ─────────
const nameOfId = id => ev(`(()=>{const id=${JSON.stringify(String(id))};const w=KSL_WORDS.find(x=>String(x.id)===id);if(w)return w.w;const e=KSL_EXTRA.find(x=>'N'+x.i===id);return e?e.w:null})()`);
await c.click('[data-nav="quiz"]'); await sleep(300);
// 2026-11-20부터 처음 온 사람은 「하」(실사용 평가: 「중」은 처음엔 어려움)
check('P1 난이도 기본값은 하', (await ev(`document.querySelector('[data-qlevel="1"]').getAttribute('aria-pressed')`)) === 'true' && /^하:/.test(await txt('#qlevelNote')), await txt('#qlevelNote'));
await c.click('[data-qlevel="3"]'); await sleep(100);
check('P2 상 선택 → 저장·설명 바뀜', (await LS('qlevel')) === 3 && /^상:/.test(await txt('#qlevelNote')) && (await ev(`document.querySelector('[data-qlevel="2"]').getAttribute('aria-pressed')`)) === 'false', await txt('#qlevelNote'));
await c.click('[data-qscope="abbr"]'); await sleep(100);
check('P3 점자 범위 선택 → 저장·설명 바뀜', (await LS('qscope')) === 'abbr' && /약자·약어/.test(await txt('#qscopeNote')), await txt('#qscopeNote'));
await c.click('[data-qscope="all"]'); await sleep(100);
await c.click('[data-quiz="sign"]'); await sleep(600);
check('P4 상 수어 퀴즈 시작: 난이도 표시·저장', (await txt('.qbadge.lv')) === '난이도 상' && (await LS('quizrun')).lv === 3, await txt('.qbadge.lv'));
let pickSeen = 0, pickWrongChecked = false, pickRightChecked = false, pickProblems = [];
for (let i = 0; i < 10; i++) {
  const kind = await ev(`document.querySelector('.vgrid')?'pick':'video'`);
  const id = (await LS('quizrun')).qs[(await LS('quizrun')).i].i;
  if (kind === 'pick') {
    pickSeen++;
    const tiles = await ev(`[...document.querySelectorAll('#quizOpts .vopt')].map(b=>({v:!!b.querySelector('video')&&!!b.querySelector('video').getAttribute('src'),n:b.querySelector('.vn')?.textContent,l:b.getAttribute('aria-label'),o:b.dataset.opt}))`);
    if (tiles.length !== 4) pickProblems.push('q' + i + ' 타일 ' + tiles.length);
    if (!tiles.every((t, k) => t.v && t.n === String(k + 1) && t.l === '영상 ' + (k + 1) + '번')) pickProblems.push('q' + i + ' 타일 모양/이름 노출 ' + JSON.stringify(tiles));
    if (new Set(tiles.map(t => t.o)).size !== 4 || !tiles.some(t => t.o === String(id))) pickProblems.push('q' + i + ' 보기 id 문제');
    if (!pickWrongChecked) {
      await c.click('#hintCut'); await sleep(100);
      if ((await cnt('#quizOpts .vopt:disabled')) !== 1) pickProblems.push('보기 지우기 후 비활성 1개 아님');
      // 일부러 오답(지워지지 않은 오답 하나)
      await ev(`(()=>{const b=[...document.querySelectorAll('#quizOpts .vopt:not([disabled])')].find(x=>x.dataset.opt!==${JSON.stringify(String(id))});b.click();document.querySelector('#pickGo').click()})()`); await sleep(300);
      const tags = await ev(`[...document.querySelectorAll('#quizOpts .vtag')].map(x=>x.textContent).sort().join(',')`);
      const names = await cnt('#quizOpts .vname');
      const rightName = await ev(`document.querySelector('#quizOpts .vopt.correct .vname')?.textContent`);
      const want = await nameOfId(id);
      check('P5 영상 고르기 오답: 「정답」·「내 선택」 글자 표시 + 이름 4개 공개', tags === '내 선택,정답' && names === 4 && rightName === want && (await cnt('#quizOpts .vopt.wrong')) === 1 && (await cnt('#quizOpts .vopt.correct')) === 1, `태그 ${tags} / 이름 ${names}개 / 정답 이름 ${rightName} (기대 ${want})`);
      check('P6 오답 설명: 보기 영상 이름표·사전 버튼', /보기 영상: 1번/.test(await txt('#quizFeedback .qexplain')) && (await cnt('#quizRelearn')) === 1, (await txt('#quizFeedback .qexplain')).replace(/\s+/g, ' ').slice(0, 90));
      pickWrongChecked = true;
    } else if (!pickRightChecked) {
      await ev(`document.querySelector('#quizOpts .vopt[data-opt="${id}"]').click();document.querySelector('#pickGo').click()`); await sleep(300);
      const tags = await ev(`[...document.querySelectorAll('#quizOpts .vtag')].map(x=>x.textContent).join(',')`);
      check('P7 영상 고르기 정답: 「정답」 글자만 표시', tags === '정답' && (await cnt('#quizFeedback .qfeedback.ok')) === 1, '태그 ' + tags);
      pickRightChecked = true;
    } else {
      await ev(`document.querySelector('#quizOpts .vopt').click();document.querySelector('#pickGo').click()`); await sleep(120);
    }
  } else {
    await ev(`document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`); await sleep(120);
  }
  await c.click('#quizNext'); await sleep(250);
}
check('P8 영상 고르기 문제 구성(상: 10문제 중 6개 안팎)', pickSeen === 6, pickSeen + '개');
check('P9 영상 고르기 화면 점검(4칸·번호·이름 숨김)', pickProblems.length === 0, pickProblems.join(' | '));
check('P10 결과 화면에 난이도 표시', /난이도 상/.test(await txt('.qresult .qbadge')) && (await LS('quizrun')) === null, await txt('.qresult .qbadge'));
await c.click('#quizToHub'); await sleep(200);

// 난이도 권유: 전부 맞히면 올려 보라고, 많이 틀리면 낮춰 보라고
async function runAll(correct) {
  await c.click('[data-quiz="sign"]'); await sleep(500);
  for (let i = 0; i < 10; i++) { const a = await answerNow(); await clickOpt(a, correct); await sleep(120); await c.click('#quizNext'); await sleep(150); }
}
await c.click('[data-qlevel="2"]'); await sleep(100);
await runAll(true);
check('P11 중에서 10/10 → 「상으로 올려서 풀기」 제안', (await cnt('#quizLvUp')) === 1 && /「상」/.test(await txt('#quizLvUp')) && (await cnt('#quizLvDown')) === 0, await txt('.qresult .score'));
await c.click('#quizLvUp'); await sleep(600);
check('P12 제안 수락 → 상으로 바뀌어 새 퀴즈 시작', (await LS('qlevel')) === 3 && (await txt('.qbadge.lv')) === '난이도 상', await txt('.qbadge.lv'));
await c.click('#quizPause'); await sleep(200); await c.click('#qDiscard'); await sleep(200);
await c.click('[data-qlevel="2"]'); await sleep(100);
await runAll(false);
check('P13 중에서 0/10 → 「하로 낮춰서 풀기」 제안', (await cnt('#quizLvDown')) === 1 && /「하」/.test(await txt('#quizLvDown')) && (await cnt('#quizLvUp')) === 0, await txt('.qresult .score'));
await c.click('#quizLvDown'); await sleep(600);
check('P14 제안 수락 → 하로 바뀜(영상 고르기 없이 영상→뜻만)', (await LS('qlevel')) === 1 && (await txt('.qbadge.lv')) === '난이도 하' && (await cnt('.vgrid')) === 0, await txt('.qbadge.lv'));
await c.click('#quizPause'); await sleep(200); await c.click('#qDiscard'); await sleep(200);
await c.click('[data-qlevel="2"]'); await sleep(100);
await c.click('[data-qmode="practice"]'); await sleep(100);

// ───────── G. 학습 기록 내보내기·지우기·가져오기 ─────────
await c.click('[data-nav="home"]'); await sleep(500);
check('G0 홈 개인화: 기록이 있으면 안내 문구는 사라지고 「지금 할 단계」가 로드맵에 하나', (await ev(`document.querySelector('#roadHint').hidden`)) === true && (await cnt('#roadList .rstep.now')) === 1, (await txt('#roadList .rstep.now')).replace(/\s+/g, ' ').slice(0, 60));
check('G0b 복습 칩 표시', (await cnt('#homeReview .revchip')) >= 1, (await txt('#homeReview')).replace(/\s+/g, ' '));
// 영상을 끝까지 본 것으로: ended 이벤트
await ev(`document.querySelector('#homeVideoList [data-open-video]').click()`); await sleep(1200);
const vid = (await LS('watched:v8-ksl-intro'));
check('G1 영상을 열기만 하면 시청 완료가 아님', vid === null, String(vid));
// 2026-11-20부터 실제로 재생한 구간(85% 이상)으로 잼 → 16배속으로 처음부터 끝까지 재생(약 5초)
await ev(`(() => { const v = document.querySelector('#playerVideo'); v.muted = true; v.currentTime = 0; v.playbackRate = 16; v.play(); return 1 })()`);
for (let i = 0; i < 40 && !(await ev(`document.querySelector('#playerVideo').ended`)); i++) await sleep(500);
const watchedKeys = await ev(`Object.keys(localStorage).filter(k=>k.startsWith('sonbit:watched:'))`);
check('G2 끝까지 보면 시청 완료로 기록', watchedKeys.length === 1, JSON.stringify(watchedKeys));
await c.click('#playerBack'); await sleep(600);
check('G2b 영상을 보고 돌아오면 「봤어요」·진행·다음 영상 표시가 바뀜', (await txt('#basicProg')) === '1 / 4편 봤어요' && (await cnt('#homeVideoList .vrow.seen')) === 1 && (await ev(`document.querySelectorAll('#homeVideoList .vrow')[1].textContent.includes('다음에 볼 영상')`)) === true && /1 \/ 4편 봤어요/.test(await txt('#roadList .rstep.now')), (await txt('#basicProg')) + ' / ' + (await txt('#roadList .rstep.now')).replace(/\s+/g, ' ').slice(0, 70));
// 로드맵의 「영상 보기」 단계는 영상 목록으로 안내한다(수어: 학습 페이지의 기초 영상 칸, 점자: 점자 탭의 교육 영상 칸)
await ev(`document.querySelector('#roadList .rstep.now .rbox').click()`); await sleep(700);
check('G2c 로드맵 「기초 영상 보기」 → 기초 영상 칸으로 이동', (await ev(`document.activeElement && document.activeElement.id`)) === 'basicVidH', await ev(`document.activeElement && document.activeElement.id`));
await c.click('#roadTabBraille'); await sleep(300);
check('G2d 점자 트랙: 1단계 기초 영상 보기(공통), 2단계 「점자 교육 영상 보기」', /기초 영상 보기/.test(await txt('#roadList .rstep:nth-child(1)')) && /점자 교육 영상 보기/.test(await txt('#roadList .rstep:nth-child(2)')) && /①~⑥ \d+편/.test(await txt('#roadList .rstep:nth-child(2)')), (await txt('#roadList .rstep:nth-child(2)')).replace(/\s+/g, ' ').slice(0, 80));
await ev(`document.querySelector('#roadList .rstep:nth-child(2) .rbox').click()`); await sleep(600);
check('G2e 눌러 보면 점자 탭의 「교육 영상」 칸이 열림(①~⑥ 6편)', (await ev(`document.querySelector('#view-braille').classList.contains('active') && !document.querySelector('#bp-learn').hidden && document.querySelectorAll('#learnList .vrow').length`)) === 6);
await c.click('[data-nav="home"]'); await sleep(400);
await c.click('#roadTabSign'); await sleep(200);
await ev(`window.__blobs=[];const o=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__blobs.push(b);return o(b)}`);
await c.click('[data-nav="home"]'); await sleep(300);
await c.click('#recExport'); await sleep(400);
const exported = await ev(`window.__blobs[0].text()`);
const exp = JSON.parse(exported);
check('G3 내보내기 파일 형식', exp.app === 'sonbit' && exp.version === 1 && Array.isArray(exp.data.fav) && Array.isArray(exp.data.wrong) && typeof exp.data.watched === 'object', `fav ${exp.data.fav.length}, wrong ${exp.data.wrong.length}, watched ${Object.keys(exp.data.watched).length}, did ${Object.keys(exp.data.did)}`);
check('G4 내보내기에 설정·진행 중 퀴즈는 안 들어감', !('theme' in exp.data) && !('quizrun' in exp.data));
const tmp = (await import('node:path')).resolve('rec_export.json');
fs.writeFileSync(tmp, exported);
const before = await ev(`JSON.stringify({fav:JSON.parse(localStorage.getItem('sonbit:fav')),wrong:JSON.parse(localStorage.getItem('sonbit:wrong')),w:Object.keys(localStorage).filter(k=>k.startsWith('sonbit:watched:')),d:Object.keys(localStorage).filter(k=>k.startsWith('sonbit:did:')).sort()})`);
await c.click('#recClear'); await sleep(150);
check('G5 지우기 확인 표시', (await ev(`!document.querySelector('#recConfirm').hidden`)) === true);
await c.click('#recClearNo'); await sleep(100);
check('G6 취소하면 그대로', (await ev(`document.querySelector('#recConfirm').hidden`)) === true && (await LS('fav')).length === 1);
await c.click('#recClear'); await c.click('#recClearYes'); await sleep(400);
check('G7 지우기 후 기록 0', /^0\/\d+본영상0단어장0틀린문제$/.test((await txt('#recCounts')).replace(/\s+/g, '')) && (await LS('fav')) === null, (await txt('#recCounts')).replace(/\s+/g, ' '));
check('G8 지우면 처음 방문자 화면(위쪽 카드 없음·안내 문구)', (await ev(`document.querySelector('#homeNext').hidden`)) === true && (await ev(`!document.querySelector('#roadHint').hidden`)) === true);
// 가져오기(파일 선택 흉내)
const importFile = async path => { const doc = await c.send('DOM.getDocument', { depth: 1 }); const q = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#importFile' }); await c.send('DOM.setFileInputFiles', { files: [path], nodeId: q.result.nodeId }); await sleep(600); };
await importFile(tmp);
const after = await ev(`JSON.stringify({fav:JSON.parse(localStorage.getItem('sonbit:fav')),wrong:JSON.parse(localStorage.getItem('sonbit:wrong')),w:Object.keys(localStorage).filter(k=>k.startsWith('sonbit:watched:')),d:Object.keys(localStorage).filter(k=>k.startsWith('sonbit:did:')).sort()})`);
check('G9 가져오기 → 지우기 전과 같은 기록', before === after, before === after ? '완전히 같음' : before.slice(0, 100) + ' ≠ ' + after.slice(0, 100));
check('G10 가져오기 안내 문구', /기록을 가져왔어요/.test(await txt('#recStatus')), (await txt('#recStatus')).slice(0, 80));
await importFile(tmp);
check('G11 같은 파일을 또 가져와도 늘어나지 않음(합치기)', (await ev(`JSON.stringify({fav:JSON.parse(localStorage.getItem('sonbit:fav')),wrong:JSON.parse(localStorage.getItem('sonbit:wrong'))})`)) === JSON.stringify({ fav: JSON.parse(before).fav, wrong: JSON.parse(before).wrong }), (await txt('#recStatus')).slice(0, 90));
// 잘못된 파일들
const bad = (name, content) => { const p = tmp.replace('rec_export', name); fs.writeFileSync(p, content); return p; };
await importFile(bad('rec_bad1', '이건 JSON이 아니에요'));
check('G12 JSON 아님 → 안내', /읽을 수 없어요/.test(await txt('#recStatus')), (await txt('#recStatus')).slice(0, 60));
await importFile(bad('rec_bad2', JSON.stringify({ hello: 'world' })));
check('G13 손빛 파일 아님 → 안내', /내보낸 기록 파일이 아니에요/.test(await txt('#recStatus')));
const beforeHostile = await ev(`JSON.stringify(Object.keys(localStorage).sort())`);
await importFile(bad('rec_bad3', JSON.stringify({ app: 'sonbit', version: 1, data: { fav: ['__proto__', 'XXXX', { a: 1 }, 12345678, '<img src=x onerror=alert(1)>'], wrong: [{ t: 'zz', a: 1 }, null, 'x', { t: 'sv', i: 'NOPE' }], watched: { 'no-such-video': true, '__proto__': true }, did: { evil: true, sign: 'yes' }, track: '<script>' } })));
check('G14 엉터리 값은 모두 버림(저장소 변화 없음)', (await ev(`JSON.stringify(Object.keys(localStorage).sort())`)) === beforeHostile && /단어장 \+0, 틀린 문제 \+0, 본 영상 \+0/.test(await txt('#recStatus')), (await txt('#recStatus')).slice(0, 70));

// ───────── H. 오류 여부 ─────────
check('H1 JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
check('H2 콘솔 오류 없음', c.cons.length === 0, c.cons.join(' | '));
const fails = (await import('./lib/cdp.mjs')).results.filter(r => r[0] === 'FAIL');
console.log('\n실패', fails.length, '건'); fails.forEach(f => console.log(' -', f[1], f[2]));
await c.close(); process.exit(0);
function wrongOnPurposeJs(b) { return b ? 'true' : 'false'; }
