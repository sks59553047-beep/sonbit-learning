// v3 종합 점검(옛 qa.mjs 를 새 화면에 맞게 다시 씀). 사용: node qa3.mjs <주소> [mobile|desktop]
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const size = process.argv[3] || 'mobile';
const c = await open(size === 'mobile' ? { w: 400, h: 860, dpr: 1 } : { w: 1280, h: 800, mobile: false });
const { ev, sleep } = c;
await c.fresh(BASE + '?qa=' + Date.now(), 3500);
const num = async e => Number(await ev(e));

check('홈 통계', /1,?190/.test(await ev(`document.getElementById('statWords').textContent`)), await ev(`[...document.querySelectorAll('.hstats span')].map(e=>e.textContent.trim()).join(' | ')`));
check('홈: 기초 영상 4편 카드, 로드맵에는 영상 목록 없음', (await num(`document.querySelectorAll('#homeVideoList .vrow').length`)) === 4 && (await num(`document.querySelectorAll('#roadList [data-act="video"], .vcard, #homeVideoGrid').length`)) === 0, (await num(`document.querySelectorAll('#homeVideoList .vrow').length`)) + '편');

// 교육 영상 재생
await ev(`document.querySelector('#homeVideoList [data-open-video]').click()`); await sleep(1800);
check('교육 영상 플레이어(16:9)', (await num(`(()=>{const w=document.querySelector('.player-wrap').getBoundingClientRect();return +(w.width/w.height).toFixed(2)})()`)) === 1.78);
check('교육 영상 로드', (await num(`document.querySelector('#playerVideo').readyState`)) >= 1, 'readyState ' + await ev(`document.querySelector('#playerVideo').readyState`));
check('자막(대본) 줄 표시', (await num(`document.querySelectorAll('#playerTranscript .tline').length`)) >= 3, (await num(`document.querySelectorAll('#playerTranscript .tline').length`)) + '줄');
await ev(`document.querySelector('#playerBack').click()`); await sleep(600);
check('뒤로가기 시 영상 중단', (await ev(`document.querySelector('#playerVideo').getAttribute('src')`)) === null);
check('뒤로가기로 홈 복귀', (await ev(`document.querySelector('#view-home').classList.contains('active')`)) === true);

// 수어 사전
await ev(`document.querySelector('[data-nav="sign"]').click()`); await sleep(400);
const topics = await num(`document.querySelectorAll('#signTopics .topiccard').length`);
check('주제 카드', topics >= 20, topics + '개');
const bad = [];
const topicNames = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('#signTopics .topiccard')].map(b=>b.dataset.topic))`));
for (const tn of topicNames) {
  await ev(`document.querySelector('#signTopics [data-topic="${tn}"]').click()`); await sleep(200);
  if (!(await num(`document.querySelectorAll('.wordrow').length`))) bad.push(tn + '(0개)');
  await ev(`document.querySelector('.wordrow summary').click()`); await sleep(250);
  const info = await ev(`(()=>{const v=document.querySelector('.wordrow[open] video');if(!v)return 'NOVIDEO';const r=v.getBoundingClientRect();return JSON.stringify({p:!!v.getAttribute('poster'),s:!!v.getAttribute('src'),w:Math.round(r.width)})})()`);
  if (info === 'NOVIDEO' || !JSON.parse(info).p || !JSON.parse(info).s) bad.push(tn + ' 영상/포스터 문제');
  await ev(`document.querySelector('#signTopicBack').click()`); await sleep(150);
}
check('모든 주제 열림 + 첫 단어 영상·포스터', bad.length === 0, bad.join(', '));
const search = async q => { await ev(`(()=>{const i=document.querySelector('#signSearch');i.value=${JSON.stringify(q)};i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(300); };
await search('ㄱㅅ'); check('초성 검색', (await num(`document.querySelectorAll('.wordrow').length`)) > 0);
await search('고맙습니다'); check('다른 말로 검색(고맙습니다 → 감사합니다)', (await ev(`document.querySelector('.wname')?.textContent`)) === '감사합니다');
await search('');

// 점자
await ev(`document.querySelector('[data-nav="braille"]').click()`); await sleep(400);
await ev(`document.querySelector('[data-bpanel="table"]').click()`); await sleep(200);
const counts = {};
for (const g of ['첫소리', '모음', '받침', '숫자', '약자·약어', '문장부호']) { await ev(`document.querySelector('[data-tg="${g}"]').click()`); await sleep(100); counts[g] = await num(`document.querySelectorAll('#tableBody .guide-card').length`); }
check('점자 표 카드 수(첫소리18·모음21·받침27·숫자11·약자약어36·부호29)', JSON.stringify(counts) === JSON.stringify({ '첫소리': 18, '모음': 21, '받침': 27, '숫자': 11, '약자·약어': 36, '문장부호': 29 }), JSON.stringify(counts));
await ev(`document.querySelector('[data-bpanel="convert"]').click()`); await sleep(200);
await ev(`(()=>{const i=document.querySelector('#bpInput');i.value='왜 위 학교';i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(300);
check('점자 변환(왜 위 학교)', (await num(`document.querySelectorAll('#bpCells .ccell').length`)) > 6, await ev(`[...document.querySelectorAll('#bpCells label')].map(e=>e.textContent).join('')`));
check('변환기 약자 안내문', (await ev(`document.querySelector('#bp-convert').textContent.includes('약자')`)) === true);
await ev(`document.querySelector('[data-tg="첫소리"]').click()`); await sleep(100);
check('점자 표(첫소리)에는 영상 링크 없음(영상은 「교육 영상」 칸에만)', (await num(`document.querySelectorAll('#tableBody [data-open-video], #view-braille .vcard').length`)) === 0);
await ev(`document.querySelector('[data-bpanel="learn"]').click()`); await sleep(300);
check('점자 탭 「교육 영상」 칸 6편', (await num(`document.querySelectorAll('#learnList .vrow').length`)) === 6, (await num(`document.querySelectorAll('#learnList .vrow').length`)) + '편');
await ev(`document.querySelector('#learnList [data-open-video]').click()`); await sleep(1800);
check('교육 영상 칸에서 영상 열기(플레이어)', (await ev(`document.querySelector('#view-player').classList.contains('active')`)) === true && (await num(`document.querySelector('#playerVideo').readyState`)) >= 1, await ev(`document.querySelector('#playerTitle').textContent`));
await ev(`document.querySelector('#playerBack').click()`); await sleep(600);
check('플레이어에서 뒤로 가면 점자 탭의 교육 영상 칸으로 돌아옴', (await ev(`document.querySelector('#view-braille').classList.contains('active') && !document.querySelector('#bp-learn').hidden`)) === true);
await ev(`document.querySelector('[data-bpanel="convert"]').click()`); await sleep(200);

// 퀴즈 종류 × 난이도(하·중·상) 10문제 완주(연습). 보기 수·문제 형식·난이도 표시까지 확인
async function runQuiz(kind, level = 2, scope = 'all', n = 10) {
  await ev(`document.querySelector('[data-nav="home"]').click();document.querySelector('[data-nav="quiz"]').click()`); await sleep(300);
  await ev(`document.querySelector('[data-qlevel="${level}"]').click()`);
  if (kind === 'braille' || kind === 'build') await ev(`document.querySelector('[data-qscope="${scope}"]').click()`);
  await ev(`document.querySelector('[data-quiz="${kind}"]').click()`); await sleep(500);
  const badge = await ev(`document.querySelector('.qbadge.lv')?.textContent`);
  if (badge !== '난이도 ' + ['', '하', '중', '상'][level]) return '난이도 표시 ' + badge;
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    seen.add(await ev(`document.querySelector('video.qvideo')?'video':document.querySelector('.vgrid')?'pick':document.querySelector('.quizdots')?'dots':document.querySelector('#buildCells')?'build':'text'`));
    if (kind === 'build') { await ev(`document.querySelector('#buildCells .dot').click()`); await ev(`document.querySelector('#buildCheck').click()`); }
    else {
      const opts = await num(`document.querySelectorAll('#quizOpts [data-opt]').length`);
      if (opts !== 4) return 'q' + i + ' 보기 ' + opts + '개';
      await ev(`document.querySelector('#quizOpts [data-opt]:not([disabled])').click()`);
    }
    if ((await ev(`!!document.querySelector('#quizNext')`)) !== true) return 'q' + i + ' 다음 버튼 없음';
    await ev(`document.querySelector('#quizNext').click()`); await sleep(120);
  }
  const res = await ev(`document.querySelector('.qresult .score')?.textContent`);
  return res ? 'OK ' + res + ' (' + [...seen].join('/') + ')' : '결과 화면 없음';
}
for (const [k, nm] of [['sign', '수어 퀴즈'], ['braille', '점자 읽기 퀴즈'], ['build', '점자 쓰기 퀴즈']]) {
  for (const lv of [1, 2, 3]) { const r = await runQuiz(k, lv); check(nm + ' ' + ['', '하', '중', '상'][lv] + ' 10문제 완주', r.startsWith('OK'), r); }
}
for (const sc of ['cho', 'vb', 'num', 'two', 'abbr']) { const r = await runQuiz('braille', 2, sc); check('점자 읽기 범위 ' + sc + ' 10문제 완주', r.startsWith('OK'), r); }
for (const sc of ['cho', 'vb', 'num', 'two', 'abbr']) { const r = await runQuiz('build', 3, sc); check('점자 쓰기 범위 ' + sc + ' (상) 10문제 완주', r.startsWith('OK'), r); }

// 어두운 화면·큰 글자 토글
await ev(`document.querySelector('[data-nav="home"]').click()`); await sleep(200);
const dark0 = await ev(`document.documentElement.getAttribute('data-theme')`);
await ev(`document.querySelector('#btnTheme').click()`); await ev(`document.querySelector('#btnBigText').click()`); await sleep(200);
check('어두운 화면 토글', (await ev(`document.documentElement.getAttribute('data-theme')`)) !== dark0);
check('큰 글자 토글', (await ev(`document.documentElement.classList.contains('big-text')`)) === true && (await num(`parseFloat(getComputedStyle(document.documentElement).fontSize)`)) === 20);
check('자바스크립트 오류 없음', c.errs.length === 0, c.errs.join(' | '));
check('콘솔 오류 없음', c.cons.length === 0, c.cons.join(' | '));
check('네트워크 오류(4xx) 없음', c.bad.length === 0, c.bad.slice(0, 8).join(' | '));
const fails = (await import('./lib/cdp.mjs')).results.filter(r => r[0] === 'FAIL');
console.log('\n실패', fails.length, '건'); fails.forEach(f => console.log(' -', f[1], f[2]));
await c.close(); process.exit(0);
