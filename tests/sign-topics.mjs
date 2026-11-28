// 수어 사전 주제·순서(2026-11-28 재정비): 모든 단어가 주제표에 정확히 한 번(이름까지 맞게), 주제 화면의 작은 제목·순서, 기본 숫자, 「오늘의 수어」.
// 사용: node sign-topics.mjs <주소>
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
await c.fresh(BASE + '?st=' + Date.now(), 2500);

// ---------- 주제표 ----------
const t = await ev(`(() => {
  const items = []; for (const [topic, , groups] of SIGN_TOPICS) for (const [g, list] of groups) for (const it of list.split(' · ')) { const k = it.indexOf(' '); items.push({ id: it.slice(0, k), name: it.slice(k + 1), topic, g }); }
  const ids = items.map(x => x.id);
  return { n: items.length, words: ALL_WORDS.length, dup: ids.length - new Set(ids).size,
    wrong: items.filter(x => !WORD_BY_ID.has(x.id) || WORD_BY_ID.get(x.id).w !== x.name).map(x => x.id + ' ' + x.name).slice(0, 5),
    missing: ALL_WORDS.filter(w => !ids.includes(String(w.id))).map(w => w.w).slice(0, 5),
    unplaced: ALL_WORDS.filter(w => !w.sg || !(w.so < 1e6)).length, general: ALL_WORDS.filter(w => w.t === '일반 단어').length,
    topics: SIGN_TOPICS.length, cards: [...document.querySelectorAll('#signTopics .topiccard')].map(b => b.dataset.topic), names: SIGN_TOPICS.map(x => x[0]),
    biggest: Math.max(...SIGN_TOPICS.map(([n]) => ALL_WORDS.filter(w => w.t === n).length)) };
})()`);
check(`S1 단어 ${t.words}개가 모두 주제표에 정확히 한 번, 번호와 이름이 자료와 같음`, t.n === t.words && t.dup === 0 && !t.wrong.length && !t.missing.length && t.unplaced === 0, JSON.stringify({ n: t.n, dup: t.dup, wrong: t.wrong, missing: t.missing, unplaced: t.unplaced }));
await ev(`go('sign')`); await sleep(300);
const cards = await ev(`[...document.querySelectorAll('#signTopics .topiccard')].map(b => b.dataset.topic)`);
check(`S2 주제 카드가 주제표 순서대로 ${t.topics}개, 「일반 단어」는 없고, 가장 큰 주제도 150개 아래`, JSON.stringify(cards) === JSON.stringify(t.names) && t.general === 0 && t.biggest < 150, `${cards.length}개, 가장 큰 ${t.biggest}`);

// ---------- 주제 화면 ----------
const openTopic = async n => { await ev(`document.querySelector('#signTopicBack').click()`); await sleep(200); await ev(`document.querySelector('#signTopics [data-topic=' + JSON.stringify(${JSON.stringify(n)}) + ']').click()`); await sleep(500); };
const view = () => ev(`[...document.querySelector('#signList').children].filter(e => e.matches('.wgroup, .wordrow')).map(e => e.matches('.wgroup') ? '#' + e.textContent : e.querySelector('.wname').textContent)`);
await openTopic('시간·날짜');
let v = await view();
const week = v.slice(v.indexOf('#요일') + 1, v.indexOf('#요일') + 8);
check('S3 「시간·날짜」: 작은 제목이 있고 요일이 월~일 순서', v.includes('#요일') && JSON.stringify(week) === JSON.stringify(['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']), week.join(' '));
const time = v.slice(1, 14).join(' ');
check('S4 지난날 → 어제·오늘·지금·내일 → 나중 순서', v.indexOf('어제') < v.indexOf('오늘') && v.indexOf('오늘') < v.indexOf('내일') && v.indexOf('내일') < v.indexOf('나중에'), time);
await openTopic('숫자·순서');
v = await view();
const nums = v.slice(1, 12).map(s => s.replace(/[①-⑳]/g, '').trim());
check('S5 「숫자·순서」: 영·일~구·십 순서로 시작', v[0] === '#0~10' && JSON.stringify(nums) === JSON.stringify(['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십']), nums.join(' '));
const all = [];
for (const n of t.names) {
  await openTopic(n); v = await view();
  const heads = v.filter(x => x[0] === '#').length, words = v.filter(x => x[0] !== '#').length;
  const emptyHead = v.some((x, i) => x[0] === '#' && (i === v.length - 1 || v[i + 1][0] === '#'));
  const want = await ev(`ALL_WORDS.filter(w => w.t === ${JSON.stringify(n)}).length`);
  const groups = await ev(`SIGN_TOPICS.find(x => x[0] === ${JSON.stringify(n)})[2].length`);
  if (!(v[0] && v[0][0] === '#') || words !== want || heads !== groups || emptyHead) all.push(`${n} 제목${heads}/${groups} 단어${words}/${want}`);
}
check('S6 모든 주제: 첫 줄이 작은 제목, 단어 수가 맞고, 빈 제목 없음', all.length === 0, all.join(', '));
const same = await ev(`(() => { const bad = []; for (const [n] of SIGN_TOPICS) { const l = ALL_WORDS.filter(w => w.t === n).sort(bySignOrder); const seen = {}; for (const w of l) { const s = SAME_NAME.get(String(w.id)); if (!s) continue; if (seen[w.w] && s[0] < seen[w.w]) bad.push(w.w); seen[w.w] = s[0]; } } return bad; })()`);
check('S7 이름이 같은 수어의 ①②③ 번호가 화면 순서대로', same.length === 0, same.join(' '));

// 초성 칩: 거른 뒤에도 빈 제목 없음
await openTopic('시간·날짜');
await ev(`document.querySelector('#signCho [data-cho="ㅇ"]').click()`); await sleep(400);
v = await view();
check('S8 초성으로 거르면 남은 단어가 있는 묶음의 제목만', v.some(x => x[0] !== '#') && !v.some((x, i) => x[0] === '#' && (i === v.length - 1 || v[i + 1][0] === '#')), v.slice(0, 8).join(' '));
// 검색 결과·기본 숫자에는 작은 제목 없음
await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = '학교'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await sleep(400);
check('S9 검색 결과에는 작은 제목 없음', (await ev(`document.querySelectorAll('#signList .wgroup').length`)) === 0 && (await ev(`document.querySelectorAll('#signList .wordrow').length`)) > 0);
await ev(`(() => { const i = document.querySelector('#signSearch'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await sleep(300);
await ev(`document.querySelector('#signTopicBack').click()`); await sleep(300);
await ev(`document.querySelector('#signShortcuts [data-topic="기본 숫자"]').click()`); await sleep(500);
const basic = await ev(`basicNumberWords().map(w => w.w)`);
const ids = await ev(`basicNumberWords().map(w => String(w.id))`);
check('S10 「기본 숫자」: 영부터 조까지, 만(일만) 있고, 뜻이 다른 「일(유일)」「만(오직)」은 없음', basic[0] === '영' && basic[basic.length - 1] === '조' && basic.includes('일만') && !ids.includes('N457') && !ids.includes('N863') && (await ev(`document.querySelectorAll('#signList .wgroup').length`)) === 0, basic.join(' '));
const today = await ev(`(() => { const l = todayList(); return { n: l.length, bad: l.filter(w => TODAY_SKIP_TOPICS.has(w.t) || TODAY_SKIP_OLD.has(w.t0) || TODAY_SKIP.has(w.w)).length }; })()`);
check('S11 「오늘의 수어」 낱말 목록(300~700개)에 뺄 낱말 없음', today.n >= 300 && today.n <= 700 && today.bad === 0, JSON.stringify(today));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
await openTopic('시간·날짜');
await c.shot(fileURLToPath(new URL('./out/sign-topics-390.png', import.meta.url)));   // 한글 폴더 이름이라 pathname 을 그대로 쓰면 안 됨
await c.close(); process.exit(0);
