// 생활 속 점자(2026-11-21): 점자 탭 다섯째 칸. 카드 12개(어디에·예시 글자의 점자·설명·근거), 예시 글자를 누르면 글자 바꾸기로,
// 휴대폰에서 점자 탭 버튼 다섯 개가 두 줄(3+2)로 넘치지 않음
// 사용: node life-braille.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep, send } = c;
await c.fresh(BASE + '?lb=' + Date.now(), 2500);
await ev(`go('braille'); document.querySelector('[data-bpanel="life"]').click(); 1`); await sleep(500);
const st = await ev(`(() => { const cards = [...document.querySelectorAll('#lifeList .lifecard')];
  return { shown: !document.querySelector('#bp-life').hidden, pressed: document.querySelector('[data-bpanel="life"]').getAttribute('aria-pressed'), n: cards.length,
    noTag: cards.filter(k => !k.querySelector('.lifehead .tag')).length, noSrc: cards.filter(k => !k.querySelector('.lifesrc a[href^="https://"]')).length,
    law: cards.filter(k => /법으로 정해짐/.test(k.querySelector('.tag').textContent)).length, lawLink: cards.filter(k => /법으로 정해짐/.test(k.querySelector('.tag').textContent) && k.querySelector('.lifesrc a').href.startsWith('https://www.law.go.kr/')).length,
    newTab: [...document.querySelectorAll('#lifeList .lifesrc a')].every(a => a.target === '_blank' && /noopener/.test(a.rel)),
    note: /실제 시설이나 제품에 찍힌 점자와 다를 수 있어요/.test(document.querySelector('#bp-life').textContent) } })()`);
check('L1 「생활 속 점자」 칸: 카드 12개, 모두 꼬리표(법으로 정해짐 등)와 근거 링크, 새 창으로 열림, 「실제와 다를 수 있어요」 안내', st.shown && st.pressed === 'true' && st.n === 12 && !st.noTag && !st.noSrc && st.newTab && st.note, JSON.stringify(st));
check('L2 「법으로 정해짐」 카드 7개는 모두 국가법령정보센터 원문으로 연결', st.law === 7 && st.lawLink === 7, JSON.stringify({ law: st.law, link: st.lawLink }));
// 예시 글자의 점자 = 점자 엔진 결과(약자 사용)와 점 하나까지 같음
const words = await ev(`(() => { const out = []; document.querySelectorAll('#lifeList .lifeword').forEach(b => {
  const w = b.dataset.lifeword, want = KB.convert(w, { contract: true }).cells.filter(c => c.kind !== '줄바꿈' && !c.unsupported).map(c => c.dots.slice().sort().join('')).join('|');
  const got = [...b.querySelectorAll('.mini')].map(m => [...m.querySelectorAll('i')].map((i, k) => i.classList.contains('on') ? k + 1 : 0).filter(Boolean).sort().join('')).join('|');
  out.push({ w, ok: want === got && want.length > 0 }); }); return out })()`);
check(`L3 예시 글자 ${words.length}개의 점자가 엔진 결과와 같음(빈 칸·바꾸지 못한 글자 없음)`, words.length >= 15 && words.every(x => x.ok), JSON.stringify(words.filter(x => !x.ok)));
await ev(`[...document.querySelectorAll('#lifeList .lifeword')].find(b => b.dataset.lifeword === '탄산').click(); 1`); await sleep(600);
const cv = await ev(`({ view: document.querySelector('.view.active').id, conv: !document.querySelector('#bp-convert').hidden, input: document.querySelector('#bpInput').value, sum: document.querySelector('#bpSummary').textContent, cells: document.querySelectorAll('#bpCells .ccell').length })`);
check('L4 예시 글자 「탄산」을 누르면 글자 바꾸기 칸에 그 글자와 점자', cv.view === 'view-braille' && cv.conv && cv.input === '탄산' && /점자 \d+칸/.test(cv.sum) && cv.cells > 0, JSON.stringify(cv));
// 다시 열면 마지막에 본 칸(생활 속 점자)으로
await ev(`document.querySelector('[data-bpanel="life"]').click(); 1`); await sleep(200);
await c.goto(BASE + '?lb2=' + Date.now() + '#braille', 2500);
check('L5 점자 탭을 다시 열면 마지막에 본 「생활 속 점자」가 열림', await ev(`!document.querySelector('#bp-life').hidden && document.querySelectorAll('#lifeList .lifecard').length === 12`));
// 좁은 휴대폰: 점자 탭 버튼 다섯 개가 두 줄(3+2), 옆으로 넘치지 않음
for (const w of [320, 360]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 760, deviceScaleFactor: 2, mobile: true }); await sleep(300);
  const seg = await ev(`(() => { const b = [...document.querySelectorAll('#bpSeg button')].map(x => x.getBoundingClientRect()); return { rows: new Set(b.map(r => Math.round(r.top))).size, cut: [...document.querySelectorAll('#bpSeg button')].filter(x => x.scrollWidth > x.clientWidth + 1).length, over: document.documentElement.scrollWidth > innerWidth } })()`);
  check(`L6 ${w}px: 점자 탭 버튼 다섯 개가 두 줄, 글자 안 잘림, 옆으로 안 넘침`, seg.rows === 2 && !seg.cut && !seg.over, JSON.stringify(seg));
}
await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false }); await sleep(400);
check('L7 컴퓨터 화면: 점자 탭 버튼 다섯 개가 한 줄, 카드는 두 줄씩', await ev(`new Set([...document.querySelectorAll('#bpSeg button')].map(x => Math.round(x.getBoundingClientRect().top))).size === 1 && getComputedStyle(document.querySelector('#lifeList')).gridTemplateColumns.split(' ').length === 2`));
// ---------- 영어 대문자 약어(2026-11-21, 규정 제4장) ----------
await ev(`document.querySelector('[data-bpanel="convert"]').click(); 1`); await sleep(300);
const ex = await ev(`!![...document.querySelectorAll('#bpExamples [data-ex]')].find(b => b.dataset.ex === 'KTX, 새마을호')`);
await ev(`[...document.querySelectorAll('#bpExamples [data-ex]')].find(b => b.dataset.ex === 'KTX, 새마을호').click(); 1`); await sleep(300);
const en = await ev(`({ brf: KB.toBrf(KB.convert(document.querySelector('#bpInput').value).cells).replace(/ /g, '\`'), labels: [...new Set([...document.querySelectorAll('#bpCells .ccell small')].map(e => e.textContent))], legend: document.querySelector('#bpLegend').textContent, warn: document.querySelector('#bpWarn').hidden, copy: document.querySelector('#bpOut').textContent.length })`);
check('L8 예시 단추 「KTX, 새마을호」 → 규정 제33항 예시와 같은 점자, 칸 이름(로마자표·대문자들·로마자)과 풀이, 경고 없음', ex && en.brf.startsWith('0,,ktx"') && ['로마자표', '대문자들', '로마자'].every(k => en.labels.includes(k)) && /로마자표: 여기부터 영어/.test(en.legend) && en.warn && en.copy > 0, JSON.stringify(en));
await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = '그는 Canada로 갔다'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(300);
const w = await ev(`document.querySelector('#bpWarn').hidden ? '' : document.querySelector('#bpWarn').textContent`);
check('L9 소문자가 섞인 영어(Canada)는 바꾸지 않고, 「영어는 대문자 약어만」 안내', /영어는 KTX·TV 같은 대문자 약어만 바꿔요/.test(w) && !/그리스/.test(w), w);
const note = await ev(`document.querySelector('#bp-convert').textContent`);
check('L10 점자 바꾸기 안내: 「예시 248개」와 「영어는 대문자 약어만」', /예시 248개/.test(note) && /대문자 약어만 바꾸고/.test(note), '');
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
