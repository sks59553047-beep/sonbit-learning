// 두 칸 패드가 좁은 화면(320/360/390)과 큰 글자에서 옆으로 넘치지 않는지
import { open, check } from './lib/cdp.mjs';
const BASE = 'http://127.0.0.1:8765/';
const c = await open({ w: 390, h: 800 });
const { ev, sleep, send } = c;
for (const w of [320, 360, 390]) for (const big of [false, true]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: true });
  await c.fresh(BASE + '?f=' + Date.now(), 1500);
  if (big) { await ev(`localStorage.setItem('sonbit:bigtext','true')`); await c.goto(BASE + '?f2=' + Date.now(), 1500); }
  await ev(`document.querySelector('[data-nav="braille"]').click()`); await sleep(200);
  await ev(`document.querySelector('[data-bpanel="pad"]').click()`); await sleep(200);
  await ev(`document.querySelector('#padTwo').click()`); await sleep(200);
  for (const d of [4, 5, 6]) await ev(`document.querySelector('#padCell [data-dot="${d}"]').click()`);
  for (const d of [2, 3, 4]) await ev(`document.querySelector('#padCell2 [data-dot="${d}"]').click()`);
  await sleep(200);
  const m = JSON.parse(await ev(`JSON.stringify((()=>{const vw=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('#bp-pad *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>vw+1||r.left<-1)}).length;const a=document.querySelector('#padCell').getBoundingClientRect(),b=document.querySelector('#padCell2').getBoundingClientRect();return {sw:document.documentElement.scrollWidth,vw,bad,side:Math.abs(a.top-b.top)<2,dot:Math.round(document.querySelector('#padCell .dot').getBoundingClientRect().width)}})())`));
  check(`폭 ${w}px · 큰 글자 ${big ? '켬' : '끔'}: 넘침 없음, 두 칸 나란히(점 ${m.dot}px)`, m.sw <= m.vw + 1 && m.bad === 0 && m.side, JSON.stringify(m));
}
await send('Emulation.clearDeviceMetricsOverride'); await c.close(); process.exit(0);
