// 지피티가 지적한 보완 4가지 점검: ①퀴즈 전환 안내 ②완료/복습 구분 ③점자 칸 수 표현 ④복사 안내
// 사용: node fixes5.mjs <주소> [mobile|desktop]
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const size = process.argv[3] || 'mobile';
const c = await open(size === 'mobile' ? { w: 390, h: 844 } : { w: 1280, h: 800, mobile: false });
const { ev, sleep } = c;
const LS = async k => JSON.parse(await ev(`localStorage.getItem('sonbit:${k}')`) || 'null');
const txt = async s => (await ev(`document.querySelector(${JSON.stringify(s)})?.textContent`)) || '';
const cnt = s => ev(`document.querySelectorAll(${JSON.stringify(s)}).length`);
const vis = s => ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)});return !!e && !e.hidden})()`);
await c.fresh(BASE + '?fx=' + Date.now(), 2500);

// ───── ① 풀던 퀴즈가 있을 때 다른 퀴즈를 시작하면 먼저 알린다 ─────
await c.click('[data-nav="quiz"]'); await sleep(300);
await c.click('[data-qlevel="1"]'); await sleep(100);
await c.click('[data-quiz="sign"]'); await sleep(500);
await ev(`document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`); await sleep(300);
await c.click('#quizPause'); await sleep(300);
check('F1-1 풀던 퀴즈가 있으면 퀴즈 첫 화면에 이어서 풀기가 보임', (await cnt('#qResume')) === 1 && (await vis('#qSwitch')) === false);
await c.click('[data-quiz="braille"]'); await sleep(300);
const sw = await txt('#qSwitchText');
check('F1-2 다른 퀴즈를 누르면 시작하지 않고 안내가 먼저 뜸(풀던 퀴즈 이름·새 퀴즈 이름·사라진다는 말)', (await vis('#qSwitch')) === true && /풀던 「수어 퀴즈」\(2 \/ 10번째\)/.test(sw) && /「점자 읽기 퀴즈」를 새로 시작하면 풀던 진행은 사라져요/.test(sw) && (await LS('quizrun')).kind === 'sign', sw);
check('F1-3 안내의 버튼 3개(새로 시작·이어서 풀기·취소)', (await cnt('#qSwitchNew, #qSwitchResume, #qSwitchNo')) === 3 && (await ev(`document.activeElement && document.activeElement.id`)) === 'qSwitchNew', await ev(`document.activeElement && document.activeElement.id`));
await c.click('#qSwitchNo'); await sleep(150);
check('F1-4 취소하면 안내만 닫히고 풀던 진행은 그대로', (await vis('#qSwitch')) === false && (await LS('quizrun')).kind === 'sign' && (await LS('quizrun')).i === 1);
await c.click('[data-quiz="braille"]'); await sleep(200);
await c.click('#qSwitchResume'); await sleep(500);
check('F1-5 「풀던 퀴즈 이어서 풀기」 → 풀던 수어 퀴즈 2번째 문제', /수어 퀴즈 · 2 \/ 10/.test(await txt('#quizQ')), await txt('#quizQ'));
await c.click('#quizPause'); await sleep(300);
await c.click('[data-quiz="build"]'); await sleep(200);
check('F1-6 받침 있는 이름도 조사가 맞음(점자 쓰기 퀴즈를)', /「점자 쓰기 퀴즈」를 새로 시작/.test(await txt('#qSwitchText')), await txt('#qSwitchText'));
await c.click('#qSwitchNew'); await sleep(500);
const run = await LS('quizrun');
check('F1-7 「새로 시작」 → 새 퀴즈(점자 쓰기)가 시작되고 풀던 수어 퀴즈는 대체됨', run && run.kind === 'build' && run.i === 0 && (await cnt('#buildCells')) === 1, run ? run.kind + ' i=' + run.i : 'null');
// 홈의 「틀린 문제 다시 풀기」 칩에서도 같은 안내
await c.click('#quizPause'); await sleep(300);
await ev(`localStorage.setItem('sonbit:wrong', JSON.stringify([{t:'sv',i:'KSL-0003',l:2}]))`);
await c.click('[data-nav="home"]'); await sleep(500);
await ev(`document.querySelector('#homeReview [data-arg="review"]').click()`); await sleep(500);
check('F1-8 홈의 복습 칩에서 눌러도 퀴즈 화면에서 안내가 뜸(을/를: 복습을)', (await ev(`document.querySelector('#view-quiz').classList.contains('active')`)) === true && (await vis('#qSwitch')) === true && /「틀린 문제 복습」을 새로 시작/.test(await txt('#qSwitchText')), await txt('#qSwitchText'));
await c.click('#qSwitchNew'); await sleep(500);
check('F1-9 복습 퀴즈 시작', /틀린 문제 복습 · 1 \/ 1/.test(await txt('#quizQ')), await txt('#quizQ'));
await c.click('#quizPause'); await sleep(200); await c.click('#qDiscard'); await sleep(200);
await c.click('[data-quiz="braille"]'); await sleep(500);
check('F1-10 풀던 퀴즈가 없으면 안내 없이 바로 시작', (await vis('#qSwitch')) === false && (await LS('quizrun')) && (await LS('quizrun')).kind === 'braille');
await c.click('#quizPause'); await sleep(200); await c.click('#qDiscard'); await sleep(200);

// ───── ② 퀴즈를 마쳤어도 틀린 문제가 남아 있으면 「복습할 문제」 표시 ─────
await ev(`localStorage.setItem('sonbit:did:quiz-sign','true'); localStorage.setItem('sonbit:wrong', JSON.stringify([{t:'sv',i:'N205',l:2},{t:'pv',i:'KSL-0003',l:2},{t:'br',k:'p',a:'ㄱ',l:2}]))`);
await c.goto(BASE + '?fx2=' + Date.now(), 2000);
const q3 = '#roadList .rstep:nth-child(3)';
check('F2-1 수어 트랙: 퀴즈 단계는 완료로 표시하되 「복습할 문제 2개」를 함께 표시', (await ev(`document.querySelector('${q3}').classList.contains('done')`)) === true && /복습할 문제 2개/.test(await txt(q3)) && /완료\./.test(await ev(`document.querySelector('${q3} .rbox').getAttribute('aria-label')`)) && /복습할 문제 2개 있음/.test(await ev(`document.querySelector('${q3} .rbox').getAttribute('aria-label')`)), (await txt(q3)).replace(/\s+/g, ' ').slice(0, 70));
await c.click('#roadTabBraille'); await sleep(300);
const q4 = '#roadList .rstep:nth-child(4)';
check('F2-2 점자 트랙: 점자 문제(1개)만 세어 「복습할 문제 1개」', /점자 퀴즈로 복습/.test(await txt(q4)) && /복습할 문제 1개/.test(await txt(q4)) && !/복습할 문제 2개/.test(await txt(q4)), (await txt(q4)).replace(/\s+/g, ' ').slice(0, 70));
await c.click('#roadTabSign'); await sleep(200);
// 복습 퀴즈에서 모두 맞히면 표시가 사라진다
await ev(`localStorage.setItem('sonbit:wrong', JSON.stringify([{t:'sv',i:'N205',l:2}]))`);
await c.click('[data-nav="home"]'); await sleep(300);
await ev(`document.querySelector('#homeReview [data-arg="review"]').click()`); await sleep(500);
const nm = await ev(`QZ.wordById('N205').w`);
await ev(`[...document.querySelectorAll('#quizOpts [data-opt]')].find(b => b.dataset.opt === ${JSON.stringify(nm)}).click()`); await sleep(300);
await c.click('#quizNext'); await sleep(400);
await c.click('[data-nav="home"]'); await sleep(500);
check('F2-3 복습 문제를 맞히면 「복습할 문제」 표시가 사라지고 완료는 그대로', !/복습할 문제/.test(await txt(q3)) && (await ev(`document.querySelector('${q3}').classList.contains('done')`)) === true, (await txt(q3)).replace(/\s+/g, ' ').slice(0, 60));

// ───── ③ 점자 변환: 칸 수에 바꾸지 못한 글자 자리를 넣지 않는다 ─────
await c.click('[data-nav="braille"]'); await sleep(300);
await c.click('[data-bpanel="convert"]'); await sleep(200);
const setInput = async t => { await ev(`(()=>{const i=document.querySelector('#bpInput');i.value=${JSON.stringify(t)};i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(250); };
await setInput('안녕 abc 😊');
const sum = await txt('#bpSummary');
const m = sum.match(/점자 (\d+)칸(?:\(띄어쓰기 (\d+)칸 포함\))?으로 바뀌었어요 · 바꾸지 못한 글자 (\d+)개/);
const realCells = await cnt('#bpCells .ccell:not(.unverified)'), badCells = await cnt('#bpCells .ccell.unverified'), spaceCells = await ev(`[...document.querySelectorAll('#bpCells .ccell')].filter(e => e.querySelector('label').textContent === '␣').length`);
check('F3-1 칸 수 = 바꾼 칸만(바꾸지 못한 글자 자리 제외), 띄어쓰기 칸·바꾸지 못한 글자 수를 따로 표시', !!m && Number(m[1]) === realCells && Number(m[2] || 0) === spaceCells && Number(m[3]) === badCells && badCells > 0, sum + ' | 화면의 칸: 바꾼 ' + realCells + ', 띄어쓰기 ' + spaceCells + ', 못 바꾼 ' + badCells);
check('F3-2 못 바꾼 글자가 있으면 복사 안내(?로 들어감)가 보임, 복사 글에도 ?가 있음', (await vis('#bpOutNote')) === true && /\?/.test(await txt('#bpOut')) && /\?로 들어가요/.test(await txt('#bpOutNote')), await txt('#bpOutNote'));
await setInput('안녕 하세요');
const sum2 = await txt('#bpSummary');
check('F3-3 모두 바꿀 수 있으면 「바꾸지 못한 글자」·복사 안내가 없음', /^점자 \d+칸\(띄어쓰기 1칸 포함\)으로 바뀌었어요$/.test(sum2) && (await vis('#bpOutNote')) === false && !/\?/.test(await txt('#bpOut')), sum2);
await setInput('가나다');
check('F3-4 띄어쓰기가 없으면 괄호 설명 없음', /^점자 \d+칸으로 바뀌었어요$/.test(await txt('#bpSummary')), await txt('#bpSummary'));
await setInput('');
check('F3-5 비우면 안내 문구로 돌아가고 복사 안내도 숨김', /몇 칸인지/.test(await txt('#bpSummary')) && (await vis('#bpOutNote')) === false);
check('F4 JS 오류·콘솔 오류·404 없음', c.errs.length === 0 && c.cons.length === 0 && c.bad.length === 0, c.errs.concat(c.cons, c.bad).slice(0, 4).join(' | '));
await c.close(); process.exit(0);
