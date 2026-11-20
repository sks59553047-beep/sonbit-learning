// 대본 따라가기·이전/다음 단어(2026-11-20)
// ① 영상 대본: 줄마다 시각, 줄을 누르면 그 부분부터 재생, 재생 위치를 따라 지금 줄 표시(대본 칸 안에서만 굴러감)
// ② 수어 단어: 펼친 단어 맨 아래 「이전 단어 / 다음 단어」로 목록 앞뒤 단어를 바로 펼침, 끝에서는 「더 보기」 뒤 단어로
// 사용: node transcript-nav.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;

// ---------- ① 대본 따라가기 ----------
await c.fresh(BASE + '?tn=' + Date.now() + '#player/v1-braille-basics', 3000);
const lines = await ev(`[...document.querySelectorAll('#playerTranscript .tline')].map(b => ({ tag: b.tagName, time: b.dataset.time, text: b.textContent }))`);
check('T1 대본 줄이 누를 수 있는 단추이고 줄마다 시각(0:00 …)이 붙음', lines.length >= 5 && lines.every(l => l.tag === 'BUTTON' && /^\d+:\d\d$/.test(l.time)) && lines[0].time === '0:00', JSON.stringify(lines.slice(0, 2)));
check('T2 줄 글은 대본 문장 그대로(시각은 글에 섞이지 않음)', /^안녕하세요, 손빛 배움터입니다/.test(lines[0].text), lines[0].text.slice(0, 30));
check('T3 재생 전에는 표시된 줄이 없음', (await ev(`document.querySelectorAll('#playerTranscript .tline.on').length`)) === 0);
const pageY0 = await ev('scrollY');
await ev(`document.querySelectorAll('#playerTranscript .tline')[4].click()`); await sleep(1800);
const s1 = await ev(`(() => { const v = document.querySelector('#playerVideo'); const on = [...document.querySelectorAll('#playerTranscript .tline')].findIndex(b => b.classList.contains('on')); return { t: v.currentTime, paused: v.paused, on, cur: document.querySelectorAll('#playerTranscript [aria-current="true"]').length } })()`);
const cue4 = await ev(`transcriptCues[4].start`);
check('T4 다섯째 줄을 누르면 영상이 그 줄 시각부터 재생', s1.t >= cue4 && s1.t < cue4 + 4 && !s1.paused, JSON.stringify(s1) + ' 줄 시각 ' + cue4);
check('T5 누른 줄이 지금 줄로 표시(민트 바탕·aria-current 하나)', s1.on === 4 && s1.cur === 1, JSON.stringify(s1));
// 재생 위치를 뒤쪽으로 옮기면 표시도 따라가고, 대본 칸 안에서 그 줄이 보이게 굴러감
const last = await ev(`transcriptCues.length - 1`);
await ev(`document.querySelector('#playerVideo').currentTime = transcriptCues[${last}].start + 0.5`); await sleep(1500);
const s2 = await ev(`(() => { const box = document.querySelector('#playerTranscript'); const on = box.querySelector('.tline.on'); const bb = box.getBoundingClientRect(), ob = on ? on.getBoundingClientRect() : null;
  return { on: on ? +on.dataset.cue : -1, visible: !!ob && ob.top >= bb.top - 1 && ob.bottom <= bb.bottom + 1, scrolled: box.scrollTop > 0 } })()`);
check('T6 재생 바로 마지막 부분으로 옮기면 마지막 줄이 표시되고, 대본 칸이 굴러 그 줄이 보임', s2.on === last && s2.visible && s2.scrolled, JSON.stringify(s2));
check('T7 대본 칸만 구르고 페이지 전체는 그대로', Math.abs((await ev('scrollY')) - pageY0) < 2, `${pageY0} → ${await ev('scrollY')}`);
// 키보드: Tab 으로 줄에 가서 Enter
await ev(`document.querySelector('#playerVideo').pause(); document.querySelectorAll('#playerTranscript .tline')[2].focus()`);
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await sleep(1200);
const s3 = await ev(`({ t: document.querySelector('#playerVideo').currentTime, c2: transcriptCues[2].start, on: +(document.querySelector('#playerTranscript .tline.on')?.dataset.cue ?? -1) })`);
check('T8 키보드로 셋째 줄에서 Enter → 그 부분부터 재생', s3.on === 2 && s3.t >= s3.c2 && s3.t < s3.c2 + 4, JSON.stringify(s3));
await ev(`document.querySelector('#playerVideo').pause()`);
// 시청 완료는 실제로 재생한 구간으로(2026-11-20 외부 평가: 마지막 줄을 누르기만 해도 완료가 됐음)
await ev(`localStorage.removeItem('sonbit:watched:v1-braille-basics'); 1`);
await ev(`document.querySelectorAll('#playerTranscript .tline')[transcriptCues.length - 1].click()`); await sleep(2500);
await ev(`document.querySelector('#playerVideo').pause()`);
check('T10 마지막 대본 줄로 건너뛰어 끝부분만 재생하면 시청 완료가 아님', (await ev(`localStorage.getItem('sonbit:watched:v1-braille-basics')`)) === null, String(await ev(`playedRatio(document.querySelector('#playerVideo')).toFixed(2)`)));
await ev(`(() => { const v = document.querySelector('#playerVideo'); v.muted = true; v.currentTime = 0; v.playbackRate = 16; v.play(); return 1 })()`);
for (let i = 0; i < 40 && !(await ev(`document.querySelector('#playerVideo').ended`)); i++) await sleep(500);
check('T11 처음부터 끝까지 재생하면 시청 완료', (await ev(`localStorage.getItem('sonbit:watched:v1-braille-basics')`)) === 'true', String(await ev(`playedRatio(document.querySelector('#playerVideo')).toFixed(2)`)));
// 다른 영상으로 바꾸면 표시가 처음부터
await ev(`go('player', { arg: { id: 'v8-ksl-intro' } })`); await sleep(2200);
check('T9 다른 영상을 열면 그 영상 대본이 나오고 표시된 줄 없음', /수어의 시작/.test(await ev(`document.querySelector('#playerTitle').textContent`)) && (await ev(`document.querySelectorAll('#playerTranscript .tline.on').length`)) === 0);

// ---------- ② 이전/다음 단어 ----------
await ev(`document.querySelector('#playerVideo').pause(); go('sign'); 1`); await sleep(500);
await ev(`document.querySelector('#signTopics [data-topic="몸·건강·긴급"]').click()`); await sleep(600);
const ids = await ev(`[...document.querySelectorAll('#signList .wordrow')].map(r => r.dataset.wid)`);
const nameOf = id => ev(`WORD_BY_ID.get(${JSON.stringify(id)}).w`);
await ev(`document.querySelector('#signList .wordrow summary').click()`); await sleep(500);
const n1 = await ev(`(() => { const nav = document.querySelector('#signList .wordrow[open] .wnav'); return nav ? [...nav.querySelectorAll('[data-wnav]')].map(b => b.dataset.wnav + ':' + b.querySelector('b').textContent) : null })()`);
check('W1 첫 단어를 펼치면 맨 아래 「다음 단어」만(이전 없음), 이름은 목록 둘째 단어', JSON.stringify(n1) === JSON.stringify(['next:' + await nameOf(ids[1])]), JSON.stringify(n1));
await ev(`document.querySelector('#signList .wordrow[open] [data-wnav="next"]').click()`); await sleep(700);
const s4 = await ev(`(() => { const open = [...document.querySelectorAll('#signList .wordrow[open]')].map(r => r.dataset.wid); const r = document.querySelector('#signList .wordrow[open]'); const top = r ? r.getBoundingClientRect().top : -1;
  return { open, top, focus: document.activeElement?.closest('.wordrow')?.dataset.wid || '', body: !!r?.querySelector('.wbody').dataset.ready, nav: r ? [...r.querySelectorAll('[data-wnav]')].map(b => b.dataset.wnav) : [] } })()`);
check('W2 「다음 단어」 → 앞 단어는 접히고 둘째 단어가 펼쳐짐(내용·초점도 그 단어)', JSON.stringify(s4.open) === JSON.stringify([ids[1]]) && s4.body && s4.focus === ids[1], JSON.stringify(s4));
check('W3 넘어간 단어가 화면 위쪽(머리줄 아래)에 보임', s4.top >= 60 && s4.top < 200, String(s4.top));
check('W4 둘째 단어에는 이전·다음 둘 다', JSON.stringify(s4.nav) === '["prev","next"]', JSON.stringify(s4.nav));
await ev(`document.querySelector('#signList .wordrow[open] [data-wnav="prev"]').click()`); await sleep(600);
check('W5 「이전 단어」 → 다시 첫 단어', JSON.stringify(await ev(`[...document.querySelectorAll('#signList .wordrow[open]')].map(r => r.dataset.wid)`)) === JSON.stringify([ids[0]]));
// 마지막 단어: 다음 없음
await ev(`(() => { document.querySelector('#signList .wordrow[open]').open = false; const rs = document.querySelectorAll('#signList .wordrow'); rs[rs.length - 1].open = true })()`); await sleep(500);
check('W6 마지막 단어에는 「이전 단어」만', JSON.stringify(await ev(`[...document.querySelectorAll('#signList .wordrow[open] [data-wnav]')].map(b => b.dataset.wnav)`)) === '["prev"]');
// 150개보다 많은 목록: 150번째에서 「다음 단어」 → 더 보기를 붙이고 151번째로
await ev(`document.querySelector('#signTopicBack').click()`); await sleep(400);
const bigTopic = await ev(`TOPICS.find(t => ALL_WORDS.filter(w => w.t === t).length > 150) || ''`);
if (bigTopic) {
  await ev(`document.querySelector('#signTopics [data-topic=' + JSON.stringify(${JSON.stringify(bigTopic)}) + ']').click()`); await sleep(700);
  await ev(`(() => { const rs = document.querySelectorAll('#signList .wordrow'); rs[rs.length - 1].open = true })()`); await sleep(500);
  const before = await ev(`document.querySelectorAll('#signList .wordrow').length`);
  const want = await ev(`signShown.list[${before}].id`);
  await ev(`document.querySelector('#signList .wordrow[open] [data-wnav="next"]').click()`); await sleep(800);
  const s5 = await ev(`({ n: document.querySelectorAll('#signList .wordrow').length, open: [...document.querySelectorAll('#signList .wordrow[open]')].map(r => r.dataset.wid) })`);
  check(`W7 「${bigTopic}」 ${before}번째 단어에서 「다음 단어」 → 다음 묶음을 붙이고 ${before + 1}번째 단어가 펼쳐짐`, s5.n > before && JSON.stringify(s5.open) === JSON.stringify([want]), JSON.stringify({ before, ...s5, want }));
} else check('W7 150개 넘는 주제가 없어 건너뜀', true);
// 검색 결과 한 개(링크로 연 단어)에는 앞뒤 단추가 없음
await c.goto(BASE + '?tn2=' + Date.now() + '#sign/N421', 2800);
const single = await ev(`document.querySelectorAll('#signList .wordrow').length`);
check('W8 링크로 연 단어: 결과가 하나면 앞뒤 단추 없음, 여럿이면 있음', single === 1 ? !(await ev(`!!document.querySelector('#signList .wordrow[open] .wnav')`)) : (await ev(`!!document.querySelector('#signList .wordrow[open] .wnav')`)), 'rows ' + single);
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await c.close(); process.exit(0);
