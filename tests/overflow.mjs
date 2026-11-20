// 좁은 화면(320/360/390)·큰 글자·어두운 화면에서 옆으로 넘치거나 잘리는 곳이 없는지
import { open, check } from './lib/cdp.mjs';
const BASE = 'http://127.0.0.1:8765/';
const c = await open({ w: 390, h: 800 });
const { ev, sleep, send } = c;
const measure = () => ev(`(()=>{const vw=document.documentElement.clientWidth;const bad=[];
  document.querySelectorAll('body *').forEach(e=>{ if(e.closest('video,svg')||e.closest('.navbar')&&false) return; const r=e.getBoundingClientRect(); if(r.width===0||r.height===0) return;
    const cs=getComputedStyle(e); if(cs.position==='fixed'||cs.visibility==='hidden') return; if(e.closest('.chiprow:not(.wrap)')) return; if(e.closest('.transcript')) return;
    if(r.right>vw+1||r.left<-1) bad.push((e.id?'#'+e.id:e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:''))+' '+Math.round(r.left)+'~'+Math.round(r.right)); });
  const lim={tag:2.4,qbadge:2.4,nowtag:2.4,chip:3.0}; const wrapBad=[];
  document.querySelectorAll('.tag,.qbadge,.nowtag,.chip').forEach(e=>{const r=e.getBoundingClientRect(); if(!r.width) return; const cs2=getComputedStyle(e); const fs=parseFloat(cs2.fontSize); const k=['tag','qbadge','nowtag','chip'].find(x=>e.classList.contains(x)); if(r.height>fs*lim[k]) wrapBad.push(k+' '+Math.round(r.height)+'px '+e.textContent.trim().slice(0,8));});
  document.querySelectorAll('.navbtn span:last-child,.seg button,.rvbtn').forEach(e=>{const r=e.getBoundingClientRect(); if(!r.width) return; const fs=parseFloat(getComputedStyle(e).fontSize); const mx=e.classList.contains('rvbtn')?fs*4.6:(e.closest('.seg')?fs*4.6:fs*3.2); if(r.height>mx+ (e.classList.contains('rvbtn')||e.closest('.seg')?0:0)) wrapBad.push(e.className.split(' ')[0]+' '+Math.round(r.height)+'px '+e.textContent.trim().slice(0,8));});
  return JSON.stringify({sw:document.documentElement.scrollWidth,vw,bad:[...new Set(bad)].slice(0,6),wrapBad:[...new Set(wrapBad)].slice(0,6)})})()`);
// 정해 둔 문제로 퀴즈를 저장소에 넣고 홈의 「이어서 풀기」로 연다
async function seedRun(kind, lv, qs) {
  await ev(`localStorage.setItem('sonbit:quizrun', JSON.stringify({v:2,kind:${JSON.stringify(kind)},mode:'practice',lv:${lv},scope:'all',i:0,score:0,lives:3,done:0,qs:${JSON.stringify(qs)},wrong:[]}))`);
  await c.goto(BASE + '?o=' + Date.now(), 1500);
  await ev(`document.querySelector('#homeNext [data-act="resume"]').click()`);
}
const views = [
  ['홈', async () => { await c.click('[data-nav="home"]'); }],
  ['수어 주제', async () => { await c.click('[data-nav="sign"]'); await ev(`document.querySelector('#signTopicBack').click()`); }],
  ['수어 단어 펼침', async () => { await c.click('[data-topic="인사·예절"]'); await ev(`document.querySelector('#signList .wordrow').open=true`); await sleep(900); }],
  ['수어 검색 실패', async () => { await ev(`(()=>{const i=document.querySelector('#signSearch');i.value='학교에다녀오겠습니다';i.dispatchEvent(new Event('input',{bubbles:true}))})()`); }],
  ['점자 변환', async () => { await ev(`document.querySelector('#signSearch').value='';document.querySelector('#signSearch').dispatchEvent(new Event('input',{bubbles:true}))`); await c.click('[data-nav="braille"]'); await c.click('[data-bpanel="convert"]'); await ev(`(()=>{const i=document.querySelector('#bpInput');i.value='그래서 가나다 2025년 성정청 억울한 것. 안녕하세요?';i.dispatchEvent(new Event('input',{bubbles:true}))})()`); }],
  ['점자 패드', async () => { await c.click('[data-bpanel="pad"]'); await ev(`document.querySelectorAll('#padCell [data-dot]')[0].click();document.querySelectorAll('#padCell [data-dot]')[3].click()`); }],
  ['점자 표(약자·약어)', async () => { await c.click('[data-bpanel="table"]'); await ev(`document.querySelector('[data-tg="약자·약어"]').click()`); }],
  ['점자 표(문장부호)', async () => { await ev(`document.querySelector('[data-tg="문장부호"]').click()`); }],
  ['생활 속 점자', async () => { await ev(`document.querySelector('[data-bpanel="life"]').click()`); await sleep(300); }],
  ['점자 교육 영상 칸', async () => { await ev(`document.querySelector('[data-bpanel="learn"]').click()`); await sleep(500); }],
  ['홈(기초 영상·봤어요 표시)', async () => { await ev(`localStorage.setItem('sonbit:watched:v8-ksl-intro','true')`); await c.click('[data-nav="home"]'); await sleep(500); }],
  ['퀴즈 홈', async () => { await c.click('[data-nav="quiz"]'); }],
  ['수어 퀴즈 문제', async () => { await c.click('[data-quiz="sign"]'); await sleep(700); }],
  ['수어 퀴즈 답한 뒤', async () => { await ev(`document.querySelector('#hintCut').click();document.querySelector('#hintText').click();document.querySelector('#quizOpts [data-opt]').click();document.querySelector('#pickGo')?.click()`); await sleep(500); }],
  ['영상 고르기 문제(상)', async () => { await c.click('#quizPause'); await seedRun('sign', 3, [{ t: 'pv', i: 'N809', l: 3 }, { t: 'pv', i: 'N489', l: 3 }]); await sleep(1200); }],
  ['영상 고르기: 고른 뒤(크게 보기·「이 영상으로 답하기」)', async () => { await ev(`document.querySelectorAll('#quizOpts .vopt')[1].click()`); await sleep(700); }],
  ['영상 고르기 답한 뒤(내 선택·정답 표시)', async () => { await ev(`document.querySelector('#hintCut').click();document.querySelector('#hintText').click();document.querySelector('#quizOpts [data-opt]:not([disabled])').click();document.querySelector('#pickGo')?.click()`); await sleep(600); }],
  ['점자 읽기: 낱말(6칸) 문제', async () => { await c.click('#quizPause'); await seedRun('braille', 3, [{ t: 'br', k: 'w', a: '어디예요', l: 3 }, { t: 'br', k: 'n', a: '4096', l: 3 }]); await sleep(500); }],
  ['점자 읽기 낱말 답한 뒤(긴 비교)', async () => { await ev(`document.querySelectorAll('#quizOpts [data-opt]')[0].click()`); await sleep(400); }],
  ['점자 쓰기 문제(2칸 이상)', async () => { await c.click('#quizPause'); await seedRun('build', 2, [{ t: 'bu', k: 'p', a: '줄임표(…)', l: 2 }, { t: 'bu', k: 'p', a: 'ㅒ', l: 2 }, { t: 'bu', k: 'w', a: '원숭이', l: 2 }]); await sleep(400); }],
  ['점자 쓰기 답한 뒤', async () => { await ev(`document.querySelectorAll('#buildCells .dot')[0].click()`); await c.click('#buildCheck'); await sleep(300); }],
  ['퀴즈 전환 안내(풀던 퀴즈가 있을 때)', async () => { await c.click('#quizPause'); await sleep(250); await c.click('[data-quiz="braille"]'); await sleep(300); }],
  ['도전(목숨) 문제', async () => { await ev(`localStorage.removeItem('sonbit:quizrun')`); await ev(`localStorage.setItem('sonbit:qmode','"challenge"')`); await c.click('[data-quiz="braille"]'); await sleep(400); }],
  ['점자 변환(바꾸지 못한 글자 안내)', async () => { await c.click('[data-nav="braille"]'); await c.click('[data-bpanel="convert"]'); await ev(`(()=>{const i=document.querySelector('#bpInput');i.value='안녕 abc 😊 가나다 2025년';i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(300); }],
  ['홈(복습할 문제 표시)', async () => { await ev(`localStorage.setItem('sonbit:did:quiz-sign','true');localStorage.setItem('sonbit:wrong',JSON.stringify([{t:'sv',i:'N205',l:2},{t:'pv',i:'KSL-0003',l:2}]))`); await c.click('[data-nav="home"]'); await sleep(500); }]
];
for (const w of (process.argv[2] || '320,360,390').split(',').map(Number)) for (const big of (process.argv[3] === 'big' ? [true] : [false, true])) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: true });
  await c.fresh(BASE + '?o=' + Date.now(), 1800);
  if (big) { await ev(`localStorage.setItem('sonbit:bigtext','true')`); await c.goto(BASE + '?o=' + Date.now(), 1500); }
  await ev(`localStorage.setItem('sonbit:qmode','"practice"')`);
  let worst = [];
  for (const [name, fn] of views) {
    await fn(); await sleep(250);
    const m = JSON.parse(await measure());
    const over = m.sw > m.vw + 1 || m.bad.length || m.wrapBad.length;
    if (over) worst.push(`${name}: sw=${m.sw}/${m.vw} ${m.bad.join(', ')} ${m.wrapBad.length ? '[글자 깨져 줄바꿈: ' + m.wrapBad.join(', ') + ']' : ''}`);
  }
  check(`폭 ${w}px · 큰 글자 ${big ? '켬' : '끔'}: 가로 넘침 없음`, worst.length === 0, worst.join(' || '));
}
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await send('Emulation.clearDeviceMetricsOverride'); await c.close(); process.exit(0);
