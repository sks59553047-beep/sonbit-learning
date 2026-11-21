// 교육 영상 12편이 「학습 홈의 기초 영상 4편」+「점자 탭의 교육 영상 칸 8편」 두 자리에만 있는지, 10편 모두 실제로 열리는지
// 사용: node placement5.mjs <주소> [mobile|desktop]
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const size = process.argv[3] || 'mobile';
const c = await open(size === 'mobile' ? { w: 390, h: 844 } : { w: 1280, h: 800, mobile: false });
const { ev, sleep } = c;
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const HOME = ['v8-ksl-intro', 'v1-braille-basics', 'v11-ksl-dictionary-guide', 'v5-etiquette'];
const LEARN = ['v12-braille-life', 'v2-braille-initials', 'v3-braille-words', 'v6-braille-batchim2', 'v7-braille-numbers', 'v9-braille-double', 'v10-braille-contractions', 'v13-braille-english'];
await c.fresh(BASE + '?pl=' + Date.now(), 2500);

check('P0 교육 영상 12편이 목록에 있음', eq(await J(`VIDEO_LIST.map(v => v.id).sort()`), HOME.concat(LEARN).sort()), await ev(`VIDEO_LIST.length + '편'`));
// ── 두 자리 ──
const homeIds = () => J(`[...document.querySelectorAll('#homeVideoList [data-open-video]')].map(b => b.dataset.openVideo)`);
const learnIds = () => J(`[...document.querySelectorAll('#learnList [data-open-video]')].map(b => b.dataset.openVideo)`);
check('P1 학습 페이지: 기초 영상 4편(수어의 시작 → 점자의 시작 → 사전 사용법 → 소통 예절)', eq(await homeIds(), HOME), JSON.stringify(await homeIds()));
await c.click('[data-nav="braille"]'); await sleep(300);
await c.click('[data-bpanel="learn"]'); await sleep(400);
check('P2 점자 탭 교육 영상 칸: 8편(생활 속 점자 → ① → … → ⑥ → 영어 점자)', eq(await learnIds(), LEARN), JSON.stringify(await learnIds()));
check('P3 두 자리가 겹치지 않고 합치면 12편 전부', new Set((await homeIds()).concat(await learnIds())).size === 12);
// ── 다른 곳에는 영상 목록·링크가 없다(두 자리 바깥의 영상 열기 버튼 수) ──
const outside = () => ev(`[...document.querySelectorAll('[data-open-video]')].filter(b => !b.closest('#homeVideoList') && !b.closest('#learnList')).length + document.querySelectorAll('.vcard, .relvid, .rvbtn, #homeVideoGrid, #brailleVideoGrid').length`);
const spots = [];
spots.push(['점자 탭 · 교육 영상 칸 바깥', await outside()]);
for (const p of ['convert', 'pad']) { await c.click(`[data-bpanel="${p}"]`); await sleep(250); spots.push(['점자 탭 · ' + p, await outside()]); }
await c.click('[data-bpanel="table"]'); await sleep(250);
for (const g of ['첫소리', '모음', '받침', '숫자', '약자·약어', '문장부호', '영어 알파벳', '영어 약자']) { await ev(`document.querySelector('[data-tg="${g}"]').click()`); await sleep(120); spots.push(['점자 표 · ' + g, await outside()]); }
await c.click('[data-nav="sign"]'); await sleep(350); spots.push(['수어 사전 첫 화면', await outside()]);
await ev(`document.querySelector('[data-topic="인사·예절"]').click()`); await sleep(300); spots.push(['수어 주제 목록', await outside()]);
await ev(`document.querySelector('#signList .wordrow').open = true`); await sleep(500); spots.push(['수어 단어 펼침', await outside()]);
await c.click('[data-nav="quiz"]'); await sleep(350); spots.push(['퀴즈 첫 화면', await outside()]);
await c.click('[data-nav="home"]'); await sleep(350); spots.push(['학습 페이지(기초 영상 칸 바깥: 로드맵·기록·출처)', await outside()]);
const bad = spots.filter(s => s[1] !== 0);
check('P4 그 밖의 화면에는 영상 목록·링크가 없음(' + spots.length + '곳)', bad.length === 0, bad.map(s => s[0] + ' ' + s[1] + '개').join(', '));
// ── 카드 모양: 그림이 실제로 뜨는지 ──
const imgs = await J(`[...document.querySelectorAll('#homeVideoList img, #learnList img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src') }))`);
await c.click('[data-nav="braille"]'); await sleep(300); await c.click('[data-bpanel="learn"]'); await sleep(700);
const imgs2 = await J(`[...document.querySelectorAll('#learnList img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src') }))`);
await c.click('[data-nav="home"]'); await sleep(700);
const imgs1 = await J(`[...document.querySelectorAll('#homeVideoList img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src') }))`);
check('P5 카드 그림 11장이 모두 뜸', imgs1.length === 4 && imgs2.length === 8 && imgs1.concat(imgs2).every(i => i.ok), imgs1.concat(imgs2).filter(i => !i.ok).map(i => i.src).join(','));
// ── 12편이 모두 실제로 열리고 자막이 나오는지 ──
async function openAndCheck(listSel, id) {
  await ev(`document.querySelector('${listSel} [data-open-video="${id}"]').click()`); await sleep(1800);
  const r = await J(`({ active: document.querySelector('#view-player').classList.contains('active'), title: document.querySelector('#playerTitle').textContent, rs: document.querySelector('#playerVideo').readyState, src: document.querySelector('#playerVideo').getAttribute('src'), cues: document.querySelectorAll('#playerTranscript .tline').length, tracks: document.querySelectorAll('#playerVideo track').length })`);
  const want = await ev(`VIDEO_LIST.find(v => v.id === '${id}').title`);
  const ok = r.active && r.title === want && r.rs >= 1 && r.src === 'videos/' + id + '.mp4' && r.cues >= 3 && r.tracks === 1;
  await ev(`document.querySelector('#playerBack').click()`); await sleep(500);
  return [ok, id + ' ' + JSON.stringify(r)];
}
const fails = [];
for (const id of HOME) { const [ok, d] = await openAndCheck('#homeVideoList', id); if (!ok) fails.push(d); }
await c.click('[data-nav="braille"]'); await sleep(300); await c.click('[data-bpanel="learn"]'); await sleep(400);
for (const id of LEARN) { const [ok, d] = await openAndCheck('#learnList', id); if (!ok) fails.push(d); }
check('P6 12편 모두 열림(제목·영상 파일·자막 줄·자막 트랙)', fails.length === 0, fails.join(' || '));
check('P7 영상을 열어 본 뒤 뒤로 가면 원래 칸으로 돌아옴(점자 교육 영상 칸)', (await ev(`document.querySelector('#view-braille').classList.contains('active') && !document.querySelector('#bp-learn').hidden`)) === true);
check('P8 JS 오류·콘솔 오류·404 없음', c.errs.length === 0 && c.cons.length === 0 && c.bad.length === 0, c.errs.concat(c.cons, c.bad).slice(0, 4).join(' | '));
await c.close(); process.exit(0);
