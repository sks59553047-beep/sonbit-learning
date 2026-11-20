// 실사용 평가 반영(2026-11-20, 지피티 실사용 + 사람처럼 써 보기 2차)
// ① 이름이 같은 수어 ①② 표시 ② 말끝을 바꾼 꼴·띄어 쓴 말로 검색 ③ 점자 칸 이름을 쉬운 말로 ④ 점자 퀴즈 힌트
// ⑤ 퀴즈 수 안내·처음은 「하」 ⑥ 퀴즈 위 단추 줄 ⑦ 「영상을 따라 하세요」 안내
// 사용: node real-use-fixes.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
await c.fresh(BASE + '?ruf=' + Date.now(), 3000);

// ---------- ① 이름이 같은 수어 ----------
await ev(`go('sign'); document.querySelector('#signShortcuts [data-topic="기본 숫자"]').click(); 1`); await sleep(600);
const rows = await ev(`[...document.querySelectorAll('#signList .wordrow summary')].map(s => s.querySelector('.wname').textContent + (s.querySelector('.wmark')?.textContent || ''))`);
check('U1 기본 숫자 목록: 「십①·십②」「백①·백②」로 구분(이름 칸 글자는 그대로 「십」)', rows.includes('십①') && rows.includes('십②') && rows.includes('백①') && rows.includes('백②') && !rows.includes('십'), rows.join(' '));
const i10 = rows.indexOf('십①');
await ev(`document.querySelectorAll('#signList .wordrow summary')[${i10}].click(); 1`); await sleep(800);
const n1 = await ev(`(() => { const r = document.querySelector('#signList .wordrow[open]'); return { nav: [...r.querySelectorAll('[data-wnav] b')].map(b => b.textContent), note: r.querySelector('.samenote')?.textContent || '' } })()`);
check('U2 「십①」 펼침: 다음 단어 단추가 「십 ②」, 맨 위에 「2가지 있어요」 안내', n1.nav.includes('십 ②') && /2가지 있어요\(이 수어는 ①\)/.test(n1.note), JSON.stringify(n1));
await ev(`document.querySelector('#signList .wordrow[open] .samenote [data-suggest]').click(); 1`); await sleep(600);
const all10 = await ev(`[...document.querySelectorAll('#signList .wordrow')].filter(r => r.querySelector('.wname').textContent === '십').length`);
check('U3 「2가지 모두 보기」 → 검색으로 「십」 두 가지가 함께 나옴', all10 === 2, String(all10));

// ---------- ② 검색 ----------
const search = async q => { await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(250);
  return ev(`({ names: [...document.querySelectorAll('#signList .wordrow')].slice(0, 6).map(r => r.querySelector('.wname').textContent), subs: [...document.querySelectorAll('#signList .wordrow .wsub')].slice(0, 3).map(e => e.textContent), count: document.querySelector('#signCount').hidden ? '' : document.querySelector('#signCount').textContent, none: !!document.querySelector('#signList .nores') })`); };
let r = await search('고마워요');
check('U4 「고마워요」 → 고맙다·감사합니다', r.names[0] === '고맙다' && r.names.includes('감사합니다'), JSON.stringify(r.names));
r = await search('고맙습니다');
check('U5 「고맙습니다」 → 첫 결과는 그대로 감사합니다(다른 말이 똑같은 것이 먼저)', r.names[0] === '감사합니다', JSON.stringify(r.names));
r = await search('괜찮아요'); check('U6 「괜찮아요」 → 괜찮다', r.names.includes('괜찮다'), JSON.stringify(r.names));
r = await search('반가워요'); check('U7 「반가워요」 → 반갑습니다', r.names.includes('반갑습니다'), JSON.stringify(r.names));
r = await search('아프다'); check('U8 「아프다」 → 아파요가 앞쪽(3번째 안)', r.names.slice(0, 3).includes('아파요'), JSON.stringify(r.names));
r = await search('사랑해'); check('U9 「사랑해」 → 사랑합니다', r.names.includes('사랑합니다'), JSON.stringify(r.names));
r = await search('병원 가요'); check('U10 「병원 가요」 → 병원·가다, 「나눠 찾았어요」 안내', r.names.includes('병원') && r.names.some(n => n === '가다') && /나눠 찾았어요/.test(r.count), JSON.stringify(r));
r = await search('화장실 어디'); check('U11 「화장실 어디」 → 화장실·어디', r.names.includes('화장실') && r.names.includes('어디'), JSON.stringify(r.names));
r = await search('수어'); check('U12 「수어」 → 수화가 센터보다 앞', r.names.indexOf('수화') >= 0 && (r.names.indexOf('센터') < 0 || r.names.indexOf('수화') < r.names.indexOf('센터')), JSON.stringify(r.names));
r = await search('밥'); check('U13 「밥」 → 뜻풀이로 찾은 단어는 줄에 「밥」이 든 뜻이 보임', r.subs.length > 0 && r.subs[0].includes('밥'), JSON.stringify(r));
r = await search('학교에다녀오겠습니다'); check('U14 맞는 게 없는 긴 말은 그대로 「찾지 못했어요」 안내', r.none, JSON.stringify(r));
r = await search('ㄱㅅ'); check('U15 자음 검색 그대로', r.names.length > 0 && r.names.includes('감사합니다'), JSON.stringify(r.names));
r = await search('가방'); check('U16 보통 낱말은 그대로 첫 결과', r.names[0] === '가방' || r.none, JSON.stringify(r.names));
await search('');

// ---------- ③ 점자 칸 이름 ----------
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(400);
await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = '안녕하세요. 그래서 3'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(400);
const b = await ev(`({ labels: [...new Set([...document.querySelectorAll('#bpCells .ccell small')].map(e => e.textContent))], legend: document.querySelector('#bpLegend').hidden ? '' : document.querySelector('#bpLegend').textContent, tip: document.querySelector('#bpCells .ccell')?.title })`);
check('U17 칸 이름은 첫소리·모음·받침·약자(초성·중성 없음)', ['첫소리', '모음', '받침', '약자'].every(k => b.labels.includes(k)) && !b.labels.includes('초성') && !b.labels.includes('중성'), JSON.stringify(b.labels));
check('U18 결과 위에 이번에 나온 이름만 풀이(첫소리: 글자 맨 앞 자음(초성) …)', /첫소리: 글자 맨 앞 자음\(초성\)/.test(b.legend) && /약어:/.test(b.legend) && /수표:/.test(b.legend) && !/된소리표/.test(b.legend), b.legend);
check('U19 칸에 마우스를 올리면 규정 용어·조항은 그대로', /제\d+항/.test(b.tip || ''), b.tip);

// ---------- ⑤ 퀴즈 안내·처음 난이도 ----------
await ev(`go('quiz'); 1`); await sleep(500);
const qc = await ev(`({ lv: document.querySelector('[data-qlevel][aria-pressed="true"]')?.textContent, card: document.querySelector('[data-quiz="sign"] .qcs').textContent })`);
check('U20 처음 온 사람의 퀴즈 난이도는 「하」', qc.lv === '하', qc.lv);
check('U21 수어 퀴즈 카드에 1,162개와 1,190개가 다른 까닭', /1,162개 중 10문제/.test(qc.card) && /사전 1,190개 중 .*28개는 뺐어요/.test(qc.card), qc.card);

// ---------- ④ 점자 퀴즈 힌트 ----------
await ev(`document.querySelector('[data-quiz="braille"]').click(); 1`); await sleep(1200);
await ev(`document.querySelector('#hintText').click(); 1`); await sleep(300);
const hint = await ev(`document.querySelector('#quizHint').textContent`);
check('U22 점자 읽기 힌트: 「점이 N개」 대신 점 번호와 점자 표에서 찾을 곳', /번 점/.test(hint) && /점자 표/.test(hint) && !/점이 \d+개/.test(hint), hint);
// ⑥ 단추 줄
const tools = await ev(`(() => { const p = document.querySelector('#quizPause').getBoundingClientRect(), e = document.querySelector('#quizEnd').getBoundingClientRect(); return { same: Math.abs(p.top - e.top) < 2, pr: Math.round(p.right), er: Math.round(e.right), w: innerWidth } })()`);
check('U23 휴대폰 퀴즈 단추 줄: 「잠시 나가기·끝내기」가 같은 줄(끝내기만 떨어지지 않음)', tools.same, JSON.stringify(tools));
await ev(`document.querySelector('#quizEnd').click(); 1`); await sleep(300); await ev(`document.querySelector('#quizEndYes')?.click(); 1`); await sleep(500);

// ---------- ⑦ 영상 기준 안내 ----------
await ev(`go('sign', { arg: { wid: 'N117' } }); 1`); await sleep(1500);
const on = await ev(`document.querySelector('#signList .wordrow[open] .onote')?.textContent || ''`);
check('U24 같은 뜻 낱말 설명에는 「영상과 다르게 보이면 영상을 따라 하세요」', /영상을 따라 하세요/.test(on), on);
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
