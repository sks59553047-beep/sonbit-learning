// 영상이 안 불러와질 때(인터넷 끊김 흉내: .mp4 요청을 막음) 화면마다 안내·다른 방법·「다시 불러오기」가 나오는지
// 사용: node vfail5.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep, send } = c;
const cnt = s => ev(`document.querySelectorAll(${JSON.stringify(s)}).length`);
const txt = async s => (await ev(`document.querySelector(${JSON.stringify(s)})?.textContent`)) || '';
await c.fresh(BASE + '?vf=' + Date.now(), 2500);
// 0) 평소(막지 않음)에는 안내가 하나도 없어야 한다
await ev(`document.querySelector('#homeVideoList [data-open-video]').click()`); await sleep(2000);
const normalPlayer = await cnt('.vfail');
await ev(`history.back()`); await sleep(500);
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-qlevel="3"]').click()`); await ev(`document.querySelector('[data-quiz="sign"]').click()`); await sleep(2500);
const normalQuiz = await cnt('.vfail');
await ev(`document.querySelector('#quizPause').click()`); await sleep(200); await ev(`document.querySelector('#qDiscard').click()`); await sleep(200);
check('V0 평소에는 「불러오지 못했어요」 안내가 없음(플레이어·퀴즈)', normalPlayer === 0 && normalQuiz === 0, `플레이어 ${normalPlayer}, 퀴즈 ${normalQuiz}`);

// 영상 파일(.mp4)을 모두 막는다
await send('Network.setBlockedURLs', { urls: ['*.mp4'] });
// 1) 교육 영상 플레이어
await ev(`document.querySelector('[data-nav="home"]').click()`); await sleep(400);
await ev(`document.querySelector('#homeVideoList [data-open-video]').click()`); await sleep(2500);
const p = await txt('#view-player .vfail');
check('V1 교육 영상: 안내 + 대본으로 읽기 안내 + 「다시 불러오기」, 대본은 그대로 보임', /불러오지 못했어요/.test(p) && /대본/.test(p) && (await cnt('#view-player .vfail [data-vretry]')) === 1 && (await cnt('#playerTranscript .tline')) >= 3, p);
await ev(`history.back()`); await sleep(500);
// 2) 수어 사전 단어
await ev(`document.querySelector('[data-nav="sign"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-topic="인사·예절"]').click()`); await sleep(300);
await ev(`(()=>{const d=document.querySelector('#signList .wordrow');d.open=true;d.scrollIntoView()})()`); await sleep(2500);
const s = await txt('#signList .wordrow[open] .vfail');
await ev(`document.querySelector('#signList .wordrow[open] .vfail').scrollIntoView({block:'center'})`); await sleep(300); await c.shot('vfail_dict.png', false);
check('V2 수어 사전: 안내 + 그림·동작 설명 안내 + 「다시 불러오기」, 수어 그림은 그대로 남음', /불러오지 못했어요/.test(s) && /그림/.test(s) && (await cnt('#signList .wordrow[open] .shapeimg img')) >= 1, s + ' | 그림 ' + (await cnt('#signList .wordrow[open] .shapeimg img')) + '장');
// 3) 퀴즈: 영상 보고 뜻(하) / 영상 4개 고르기(상)
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-qlevel="1"]').click()`); await ev(`document.querySelector('[data-quiz="sign"]').click()`); await sleep(2500);
const q1 = await txt('#quizArea .vfail');
await ev(`document.querySelector('#quizArea .vfail').scrollIntoView({block:'center'})`); await sleep(300); await c.shot('vfail_quiz.png', false);
check('V3 퀴즈(영상 보고 뜻): 안내 + 「끝내기」 안내 + 「다시 불러오기」', /불러오지 못했어요/.test(q1) && /끝내기/.test(q1) && (await cnt('#quizArea .vfail')) === 1, q1);
await ev(`document.querySelector('#quizEnd').click()`); await sleep(100); await ev(`document.querySelector('#quizEndYes').click()`); await sleep(300);
await ev(`document.querySelector('#quizToHub').click()`); await sleep(300);
await ev(`document.querySelector('[data-qlevel="3"]').click()`); await ev(`document.querySelector('[data-quiz="sign"]').click()`); await sleep(800);
for (let i = 0; i < 10 && !(await ev(`!!document.querySelector('.vgrid')`)); i++) { await ev(`document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`); await sleep(150); await ev(`document.querySelector('#quizNext').click()`); await sleep(400); }
await sleep(2500);
check('V4 퀴즈(영상 4개 고르기): 4칸이 모두 안 나와도 안내는 묶음 아래 한 번만', (await cnt('#quizArea .vfail')) === 1 && (await ev(`document.querySelector('.vgrid').nextElementSibling.classList.contains('vfail')`)) === true, (await cnt('#quizArea .vfail')) + '개');
// 4) 다시 불러오기: 막은 것을 풀고 누르면 영상이 다시 나오고 안내가 사라진다
await send('Network.setBlockedURLs', { urls: [] });
await ev(`document.querySelector('#quizArea .vfail [data-vretry]').click()`); await sleep(2500);
const rs = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vgrid video')].map(v => v.readyState))`));
check('V5 「다시 불러오기」 → 영상 4개가 다시 나오고 안내가 사라짐', (await cnt('#quizArea .vfail')) === 0 && rs.length === 4 && rs.every(r => r >= 2), JSON.stringify(rs));
check('V6 JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await send('Network.setBlockedURLs', { urls: [] });
await c.close(); process.exit(0);
