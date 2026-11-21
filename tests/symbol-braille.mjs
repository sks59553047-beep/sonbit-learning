// 기호(규정 제65~72항: 화폐·단위·화살표·자주 쓰는 기호) 화면 시험 (2026-11-22)
// 규정 예시와 같은 점자가 나오는지, 칸 아래 이름(단위 기호·화살표·기호)과 이름 뜻이 보이는지, 짧은 입력에 옆으로 안 넘치는지
// 사용: node symbol-braille.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 375, h: 812 });
const { ev, sleep } = c;
await c.fresh(BASE + '?sy=' + Date.now(), 3000);
await ev(`go('braille'); showBraillePanel('convert', true); 1`); await sleep(400);
const typeBp = async t => { await ev(`(() => { const i = document.querySelector('#bpInput'); i.value = ${JSON.stringify(t)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`); await sleep(350); return ev(`JSON.stringify({ out: document.querySelector('#bpOut').textContent.replace(/ /g, ''), kinds: [...new Set([...document.querySelectorAll('#bpCells small')].map(e => e.textContent))], legend: document.querySelector('#bpLegend').textContent, bad: document.querySelectorAll('#bpCells .unverified').length, over: document.documentElement.scrollWidth > innerWidth + 1 })`).then(JSON.parse); };
const CASES = [["직각은 90°이다.","⠨⠕⠁⠫⠁⠵⠼⠊⠚⠴⠙⠕⠊⠲"],["물은 100 ℃에서 끓는다.","⠑⠯⠵⠼⠁⠚⠚⠴⠙⠠⠉⠝⠠⠎⠠⠈⠮⠴⠉⠵⠊⠲"],["1평은 3.3㎡이다.","⠼⠁⠙⠻⠵⠼⠉⠲⠉⠴⠍⠘⠼⠃⠕⠊⠲"],["부산 → 서울","⠘⠍⠇⠒⠒⠕⠠⠎⠯"],["상표 기호는 ™로 표시한다.","⠇⠶⠙⠬⠈⠕⠚⠥⠉⠵⠴⠘⠞⠲⠐⠥⠙⠬⠠⠕⠚⠒⠊⠲"],["₩100,000","⠴⠈⠺⠼⠁⠚⠚⠂⠚⠚⠚"]];
for (const [t, exp] of CASES) {
  const r = await typeBp(t);
  check(`Y1 「${t}」 → 규정 예시와 같은 점자(점 하나까지)`, r.out === exp && r.bad === 0 && !r.over, r.out + ' / ' + exp);
}
let r = await typeBp('물은 100 ℃에서 끓는다.');
check('Y2 칸 아래 이름에 「단위 기호」, 이름 뜻 풀이에도 나옴', r.kinds.includes('단위 기호') && /단위 기호/.test(r.legend), JSON.stringify(r.kinds));
r = await typeBp('부산 → 서울');
check('Y3 칸 아래 이름에 「화살표」와 풀이', r.kinds.includes('화살표') && /화살표/.test(r.legend), JSON.stringify(r.kinds));
r = await typeBp('1평은 3.3㎡이다.');
check('Y4 위 첨자·로마자 단위: 「위 첨자」 칸이 나오고 지원 안 함 없음', r.kinds.includes('위 첨자') && r.bad === 0, JSON.stringify(r.kinds));
r = await typeBp('5V 전압, 100m 달리기, 80km/h');
check('Y5 한 글자 단위(5V·100m)와 km/h도 바뀜(지원 안 함 없음)', r.bad === 0 && r.out.length > 10, r.out);
check('JS 오류 없음', !c.errs.length, c.errs.join(' | '));
await ev(`localStorage.clear(); 1`);
await c.close(); process.exit(0);
