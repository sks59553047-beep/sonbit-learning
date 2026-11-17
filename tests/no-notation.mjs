// 수어 사전에서 단어를 펼쳤을 때 누리사전 「표기 기호」 그림이 하나도 안 나오고, 국립국어원 사전 손 그림은 그대로 나오는지
// 사용: node notation_check.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
await c.fresh(BASE + '?nc=' + Date.now(), 2500);
await ev(`document.querySelector('[data-nav="sign"]').click()`); await sleep(300);
const topics = JSON.parse(await ev(`JSON.stringify(['기본 숫자'].concat([...document.querySelectorAll('#signTopics .topiccard')].map(b=>b.dataset.topic)))`));
let rows = 0, notation = 0, nRows = 0, nWithFig = 0, kslDraw = 0; const bad = [];
for (const t of topics) {
  if (t === '기본 숫자') await ev(`document.querySelector('[data-topic="기본 숫자"]').click()`); else { await ev(`document.querySelector('#signTopicBack')?.click()`); await sleep(150); await ev(`document.querySelector('#signTopics [data-topic="${t}"]').click()`); }
  await sleep(250);
  const r = JSON.parse(await ev(`(()=>{const rs=[...document.querySelectorAll('#signList .wordrow')];rs.forEach(d=>d.open=true);return JSON.stringify(rs.length)})()`)); await sleep(400);
  const s = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('#signList .wordrow[open]')].map(d=>{const f=d.querySelector('[data-fav]');const id=f?f.dataset.fav:'';const imgs=[...d.querySelectorAll('.signmedia img')].map(i=>i.getAttribute('src'));return {id,imgs}}))`));
  rows += s.length;
  s.forEach(x => {
    if (x.imgs.some(src => /assets\/media\/N\d+\.jpg/.test(src))) { notation++; bad.push(t + ':' + x.id); }
    if (x.id.startsWith('N')) { nRows++; if (x.imgs.length) nWithFig++; }
    if (x.imgs.some(src => /assets\/media\/KSL-\d+\.jpg/.test(src))) kslDraw++;
  });
  await ev(`document.querySelectorAll('#signList .wordrow').forEach(d=>d.open=false)`); await sleep(100);
}
check(`단어 ${rows}개 펼쳐 봄(주제 ${topics.length}개 + 기본 숫자): 누리사전 표기 기호 그림 0개`, notation === 0, bad.slice(0, 5).join(', '));
check(`누리사전 단어 ${nRows}개는 그림 없이 영상만`, nWithFig === 0, nWithFig + '개에 그림');
check(`국립국어원 사전 손 그림은 그대로 나옴(${kslDraw}개)`, kslDraw > 50, kslDraw + '개');
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
