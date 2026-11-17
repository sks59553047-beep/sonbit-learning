// CDP 공용 도우미: 크롬(9333)에 붙어 화면을 조작·검사한다.
// Node 22 이상에 기본으로 들어 있는 WebSocket 을 쓴다(설치할 부품 없음 — 구글 드라이브 폴더에 node_modules 를 두면 파일이 깨질 수 있어서)
import fs from 'node:fs';
export async function open(opts = {}) {
  const { w = 390, h = 844, mobile = true, dpr = 2 } = opts;
  const t = (await (await fetch('http://localhost:9333/json')).json()).find(x => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map(); const errs = []; const cons = []; const bad = [];
  ws.addEventListener('message', ev => { const d = ev.data;
    const m = JSON.parse(d);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') cons.push(m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 200));
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) bad.push(m.params.response.status + ' ' + m.params.response.url.slice(-80));
    if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => r({ T: 1 }), 60000); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.exceptionDetails ? 'EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result?.result?.value; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  if (mobile) await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: true });
  else await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const goto = async (url, wait = 2500) => { await send('Page.navigate', { url }); await sleep(wait); };
  // 저장소를 비운 새 방문자로 시작
  const fresh = async (url, wait = 2500) => { await goto(url, 800); await ev('localStorage.clear()'); await goto(url, wait); };
  const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'NOEL';e.click();return 'ok'})()`);
  const shot = async (name, full) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!full }); fs.writeFileSync(name, Buffer.from(r.result.data, 'base64')); };
  const close = async () => { await send('Emulation.clearDeviceMetricsOverride'); ws.close(); };
  return { send, ev, sleep, goto, fresh, click, shot, close, errs, cons, bad };
}
export const results = [];
export const check = (name, ok, detail = '') => { results.push([ok ? 'OK  ' : 'FAIL', name, detail]); console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail !== '' ? '  ' + detail : '')); };
