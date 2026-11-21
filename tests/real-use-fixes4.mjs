// 지피티 평가 반영(2026-11-21)
// ① 점자 복사: 띄어쓰기 칸만 남은 변환(iPhone X·a b c·공백만)은 복사가 꺼진다 / 일부만 바뀐 것(iPhone 3)은 안내와 함께 복사 가능
// ② 생활 속 점자: 「돌아가기」·크롬 뒤로 가기로 돌아오면 방금 누른 낱말 단추에 키보드 초점이 돌아온다
// 사용: node real-use-fixes4.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 375, h: 760 });
const { ev, sleep, send } = c;
const key = async (k, code, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: '', unmodifiedText: '' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await sleep(150); };
await c.fresh(BASE + '?r4=' + Date.now(), 3000);
// ---------- ① 점자 복사 ----------
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(400);
const typeBp = async t => { await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = ${JSON.stringify(t)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(350); };
const st = () => ev(`({ off: document.querySelector('#bpCopyTop').hidden || document.querySelector('#bpCopyTop').disabled, hidden: document.querySelector('#bpCopyTop').hidden, label: document.querySelector('#bpCopyTop').textContent, wrapHidden: document.querySelector('#bpOutWrap').hidden, out: document.querySelector('#bpOut').textContent, sum: document.querySelector('#bpSummary').textContent, note: !document.querySelector('#bpOutNote').hidden })`);
for (const t of ['iPhone', 'iPhone XR', 'iPhone XR ', 'a b c']) {
  await typeBp(t); const s = await st();
  check(`C1 「${t}」: 바뀐 점자가 없어서 복사가 꺼지고 점자 문자 칸이 숨음`, s.off && s.label === '복사할 점자가 없어요' && s.wrapHidden && /바뀐 점자가 없어요/.test(s.sum) && !/1칸|띄어쓰기/.test(s.sum), JSON.stringify(s));
}
await typeBp('   '); { const s = await st(); check('C2 공백만 넣으면 복사 단추가 숨고 「글자를 입력하면…」 안내', s.hidden && /글자를 입력하면/.test(s.sum), JSON.stringify(s)); }
await typeBp('iPhone 3'); { const s = await st(); check('C3 「iPhone 3」: 숫자는 바뀌었으므로 복사는 켜지고, 「?로 들어가요」 안내가 보임', !s.off && s.note && /⠼⠉/.test(s.out), JSON.stringify(s)); }
await typeBp('KTX 안녕 iPhone'); { const s = await st(); check('C4 「KTX 안녕 iPhone」: 일부만 바뀜 → 복사 켜짐 + ? 안내, 앞부분은 KTX 점자', !s.off && s.note && s.out.startsWith('⠴⠠⠠⠅⠞⠭') && s.out.endsWith('??????'), JSON.stringify(s)); }
await typeBp('ktx tv'); { const s = await st(); check('C4b 소문자 「ktx tv」: 영어 낱말로 바뀌어 복사 켜짐(⠅⠞⠭ ⠞⠧)', !s.off && !s.note && s.out === '⠴⠅⠞⠭ ⠞⠧⠲', JSON.stringify(s)); }
await typeBp('KTX'); { const s = await st(); check('C5 「KTX」 7칸 그대로 복사 가능', !s.off && !s.note && /점자 7칸/.test(s.sum), JSON.stringify(s)); }
await typeBp('TV 안녕'); { const s = await st(); check('C6 「TV 안녕」 띄어쓰기 1칸 포함으로 정상', !s.off && /띄어쓰기 1칸 포함/.test(s.sum), JSON.stringify(s)); }
// ---------- ② 생활 속 점자 키보드 초점 ----------
const info = `(() => { const a = document.activeElement; return a && a.dataset && a.dataset.lifeword !== undefined ? a.dataset.lifeword + '#' + [...document.querySelectorAll('#lifeList [data-lifeword]')].indexOf(a) : (a ? a.tagName + (a.id ? '#' + a.id : '') : 'null'); })()`;
async function pickLife(word) {
  await ev(`localStorage.clear(); go('braille'); showBraillePanel('life', true); 1`); await sleep(700);
  const r = JSON.parse(await ev(`(() => { const all = [...document.querySelectorAll('#lifeList [data-lifeword]')]; const b = all.find(x => x.dataset.lifeword === ${JSON.stringify(word)}); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, i: all.indexOf(b) }); })()`));
  await sleep(250);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(800);
  return r.i;
}
let i = await pickLife('생수');
check('F0 생수를 누르면 글자 바꾸기로 가고 「돌아가기」가 보임', await ev(`!document.querySelector('#bp-convert').hidden && !document.querySelector('#lifeBack').hidden`));
await ev(`document.querySelector('#lifeBack').click(); 1`); await sleep(900);
check('F1 「돌아가기」로 오면 생활 속 점자이고 초점이 생수 단추', (await ev(`!document.querySelector('#bp-life').hidden`)) && (await ev(info)) === '생수#' + i, await ev(info));
const y1 = await ev(`Math.round(document.querySelector('#lifeList [data-lifeword]:focus')?.getBoundingClientRect().top ?? -9999)`);
check('F2 초점 단추가 화면 안에 그대로(스크롤이 튀지 않음)', y1 > 0 && y1 < 760, String(y1));
await key('Tab', 'Tab', 9);
const nxt = await ev(info); check('F3 다음 Tab은 생수 바로 다음 예시(목록 맨 위 아님)', nxt === '생수#' + (i + 1) || /^[^#]+#\d+$/.test(nxt) && +nxt.split('#')[1] === i + 1 || (nxt.split('#')[1] > 3 && !/^1#0$/.test(nxt)), nxt);
// 크롬 뒤로 가기
i = await pickLife('생수');
await ev(`history.back(); 1`); await sleep(900);
check('F4 뒤로 가기로 와도 초점이 생수 단추', (await ev(info)) === '생수#' + i, await ev(info));
await key('Tab', 'Tab', 9);
const n2 = await ev(info); check('F5 뒤로 가기 뒤 Tab도 그 자리 근처(맨 위 탭·제목으로 튀지 않음)', /#\d+$/.test(n2) && +n2.split('#')[1] > 3, n2);
// 앞으로 가기 → 다시 뒤로
await ev(`history.forward(); 1`); await sleep(700); await ev(`history.back(); 1`); await sleep(900);
check('F6 앞으로 갔다 다시 뒤로 와도 초점이 생수', (await ev(info)) === '생수#' + i, await ev(info));
// 다른 카드(맨 위 엘리베이터 1)도 정상
i = await pickLife('1');
await ev(`document.querySelector('#lifeBack').click(); 1`); await sleep(900);
check('F7 맨 위 낱말(1)도 돌아오면 그 단추에 초점', (await ev(info)) === '1#' + i, await ev(info));
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
