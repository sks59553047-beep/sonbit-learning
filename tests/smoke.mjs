// v3 첫 점검: 오류 없이 뜨는지, 화면 4개가 제대로 그려지는지, 그림을 찍는다
import { open, check } from './lib/cdp.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const size = process.argv[3] || 'mobile';
const c = await open(size === 'mobile' ? {} : { w: 1280, h: 800, mobile: false });
await c.fresh(BASE + '?s=' + Date.now(), 3000);
const { ev } = c;
check('JS 오류 없음(첫 화면)', c.errs.length === 0, c.errs.join(' | '));
check('홈 활성', (await ev(`document.querySelector('#view-home').classList.contains('active')`)) === true);
check('처음 방문자: 위쪽 카드 없음(로드맵 하나로 안내)', (await ev(`document.querySelector('#homeNext').hidden`)) === true);
check('처음 방문자: 「지금 할 단계」 표시 1개 + 안내 문구', (await ev(`document.querySelectorAll('#roadList .rstep.now .nowtag').length`)) === 1 && (await ev(`!document.querySelector('#roadHint').hidden`)) === true);
check('복습 칩 숨김', (await ev(`document.querySelector('#homeReview').hidden`)) === true);
check('로드맵 단계(수어 트랙 3단계)', (await ev(`document.querySelectorAll('#roadList .rbox').length`)) === 3, await ev(`document.querySelector('#roadProg').textContent`));
check('학습 페이지: 기초 영상 카드 4편(수어의 시작·점자의 시작·사전 사용법·소통 예절)', (await ev(`document.querySelectorAll('#homeVideoList .vrow').length`)) === 4 && (await ev(`document.querySelectorAll('.vcard, #homeVideoGrid, #brailleVideoGrid').length`)) === 0, await ev(`[...document.querySelectorAll('#homeVideoList .vtitle')].map(e=>e.textContent.slice(0,10)).join(' | ')`));
check('학습 페이지: 카드에 그림·길이·제목·설명', (await ev(`[...document.querySelectorAll('#homeVideoList .vrow')].every(r=>r.querySelector('.vthumb img')&&/^[0-9]+:[0-9]{2}$/.test(r.querySelector('.vdur').textContent)&&r.querySelector('.vtitle').textContent.length>3&&r.querySelector('.vdesc').textContent.length>5)`)) === true);
check('학습 페이지: 첫 영상에 「다음에 볼 영상」 표시', (await ev(`document.querySelectorAll('#homeVideoList .vrow')[0].textContent.includes('다음에 볼 영상')`)) === true && (await ev(`document.querySelector('#basicProg').textContent`)) === '0 / 4편 봤어요');
check('통계', true, await ev(`[...document.querySelectorAll('.hstats span')].map(e=>e.textContent.trim()).join(' | ')`));
check('기록 카드', true, await ev(`document.querySelector('#recCounts').textContent.replace(/\\s+/g,' ')`));
await c.shot('v3_home.png');
await c.shot('v3_home_full.png', true);
// 수어
await c.click('[data-nav="sign"]'); await c.sleep(500);
check('수어: 바로가기 2개', (await ev(`document.querySelectorAll('#signShortcuts .shortcut').length`)) === 2);
check('수어: 주제 카드', (await ev(`document.querySelectorAll('#signTopics .topiccard').length`)) >= 20, await ev(`document.querySelectorAll('#signTopics .topiccard').length`) + '개');
await c.shot('v3_sign.png');
await c.click('[data-topic="인사·예절"]'); await c.sleep(500);
await ev(`(()=>{const d=document.querySelector('#signList .wordrow');d.open=true;d.scrollIntoView({block:'start'})})()`); await c.sleep(1500);
check('수어: 단어 펼침(영상+단어장 버튼)', (await ev(`!!document.querySelector('#signList .wordrow[open] video') && !!document.querySelector('#signList .wordrow[open] .favbtn')`)) === true);
await c.shot('v3_word.png');
// 점자
await c.click('[data-nav="braille"]'); await c.sleep(500);
check('점자: 변환기 패널 보임', (await ev(`!document.querySelector('#bp-convert').hidden && document.querySelector('#bp-pad').hidden`)) === true);
await ev(`(()=>{const i=document.querySelector('#bpInput');i.value='그래서 가나다 2025년';i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await c.sleep(300);
check('점자: 변환 결과', true, await ev(`document.querySelector('#bpSummary').textContent + ' / ' + document.querySelector('#bpOut').textContent`));
await c.shot('v3_braille.png');
await c.click('[data-bpanel="pad"]'); await c.sleep(300);
await ev(`document.querySelectorAll('#padCell [data-dot]')[0].click()`); await ev(`document.querySelectorAll('#padCell [data-dot]')[3].click()`); await c.sleep(200);
check('점자: 패드 읽기(1·4번)', true, await ev(`document.querySelector('#padResultKind').textContent + ' / ' + document.querySelector('#padReadings').textContent.replace(/\\s+/g,' ')`));
check('점자: 연습 패드·글자 바꾸기·점자 표·수어 사전에는 영상 링크가 없음(영상은 두 자리에만)', (await ev(`document.querySelectorAll('#bp-pad [data-open-video], #bp-convert [data-open-video], #bp-table [data-open-video], #view-sign [data-open-video], #view-quiz [data-open-video]').length`)) === 0);
await c.shot('v3_pad.png');
await c.click('[data-bpanel="table"]'); await c.sleep(400);
for (const g of ['첫소리', '모음', '받침', '숫자', '약자·약어', '문장부호']) {
  await ev(`document.querySelector('[data-tg="${g}"]').click()`); await c.sleep(200);
  check('점자 표: ' + g, (await ev(`document.querySelectorAll('#tableBody .guide-card').length`)) > 5, (await ev(`document.querySelectorAll('#tableBody .guide-card').length`)) + '카드');
}
await ev(`document.querySelector('[data-tg="약자·약어"]').click()`); await c.sleep(200);
await c.shot('v3_table.png');
// 교육 영상 칸(점자 탭): 점자 영상 8편이 순서대로
await c.click('[data-bpanel="learn"]'); await c.sleep(500);
check('점자 탭 「교육 영상」 칸: 8편 순서대로(①~⑥, 생활 속 점자, 영어 점자)', (await ev(`document.querySelectorAll('#learnList .vrow').length`)) === 8 && (await ev(`!document.querySelector('#bp-learn').hidden && document.querySelector('#bp-table').hidden`)) === true, await ev(`[...document.querySelectorAll('#learnList .vtitle')].map(e=>e.textContent.slice(0,9)).join(' | ')`));
check('교육 영상 칸: 모두 점자 영상(수어·공통 영상은 학습 페이지에)', (await ev(`[...document.querySelectorAll('#learnList .vrow')].every(r=>r.querySelector('.tag').textContent==='점자')`)) === true);
await c.shot('v3_learn.png');
// 퀴즈
await c.click('[data-nav="quiz"]'); await c.sleep(500);
check('퀴즈: 카드 3개 + 복습 칩 2개', (await ev(`document.querySelectorAll('.qcard').length`)) === 3 && (await ev(`document.querySelectorAll('.quizhub .revchip').length`)) === 2);
await c.shot('v3_quiz.png');
check('JS 오류 없음(전체)', c.errs.length === 0, c.errs.join(' | '));
check('콘솔 오류 없음', c.cons.length === 0, c.cons.join(' | '));
check('404 없음', c.bad.length === 0, c.bad.slice(0, 5).join(' | '));
await c.close(); process.exit(0);
