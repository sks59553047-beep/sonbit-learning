// 전체 기능 점검(여러 유형의 처음 쓰는 사람) 반영 (2026-11-22)
// ① 검색 상자는 돋보기·여백을 눌러도 입력칸에 초점 ② 「칸 아래 이름 뜻」 줄 44px ③ 붙여넣은 글의 숨은 글자·전각 문자·탭 정리
// 사용: node real-use-fixes5.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 360, h: 740 });
const { ev, sleep, send } = c;
await c.fresh(BASE + '?r5=' + Date.now(), 3000);
// ① 검색 상자
for (const big of [false, true]) {
  await ev(`document.documentElement.classList.toggle('big-text', ${big}); go('sign'); 1`); await sleep(400);
  const g = JSON.parse(await ev(`(() => { const i = document.querySelector('#signSearch'), p = i.parentElement, r = p.getBoundingClientRect(), ir = i.getBoundingClientRect(); return JSON.stringify({ wx: r.left, wy: r.top, ww: r.width, wh: r.height, ih: ir.height }) })()`));
  check(`S1 검색 입력칸 높이가 상자와 거의 같음(${big ? '큰 글씨' : '보통'}): 입력칸 ${Math.round(g.ih)} / 상자 ${Math.round(g.wh)}`, g.ih >= 44 && g.wh - g.ih <= 12, '');
  const pts = { '위 여백': [g.wx + g.ww / 2, g.wy + 3], '아래 여백': [g.wx + g.ww / 2, g.wy + g.wh - 3], '왼쪽 끝(돋보기)': [g.wx + 8, g.wy + g.wh / 2], '오른쪽 끝': [g.wx + g.ww - 6, g.wy + g.wh / 2] };
  for (const [name, [x, y]] of Object.entries(pts)) {
    await ev(`document.activeElement.blur(); 1`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); await sleep(150);
    check(`S2 검색 상자 ${name}을 누르면 입력칸에 초점(${big ? '큰 글씨' : '보통'})`, await ev(`document.activeElement.id === 'signSearch'`), '');
  }
}
await ev(`document.documentElement.classList.remove('big-text'); 1`);
// ② 이름 뜻 줄
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(300);
const typeBp = async t => { await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = ${JSON.stringify(t)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(300); return ev(`document.querySelector('#bpOut').textContent`); };
await typeBp('가나다');
check('L1 「칸 아래 이름 뜻」 줄이 44px 이상', (await ev(`Math.round(document.querySelector('#bpLegend summary').getBoundingClientRect().height)`)) >= 44, '');
// ③ 입력 정리
const same = async (a, b, label) => { const x = await typeBp(a), y = await typeBp(b); check(label, x === y && x.length > 0, JSON.stringify([x, y])); };
await same('１２３ ＡＢＣ', '123 ABC', 'N1 전각 숫자·영문(１２３ ＡＢＣ)은 보통 글자(123 ABC)와 같은 결과');
await same('한\u200b글', '한글', 'N2 보이지 않는 글자(너비 없는 공백)는 무시');
await same('가\t나', '가 나', 'N3 탭은 띄어쓰기로');
await same('가\u3000나', '가 나', 'N4 전각 띄어쓰기는 띄어쓰기로');
await same('안녕\u00a0하세요', '안녕 하세요', 'N5 줄 안 바뀌는 공백(NBSP)은 띄어쓰기로');
await typeBp('ㄱㄴㄷ'); check('N6 한글 자모(ㄱㄴㄷ)는 그대로(호환 자모를 바꾸지 않음)', (await ev(`document.querySelector('#bpSummary').textContent`)) === '점자 6칸으로 바뀌었어요', await ev(`document.querySelector('#bpSummary').textContent`));
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
