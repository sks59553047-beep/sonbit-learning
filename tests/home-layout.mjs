// 학습(첫) 화면(2026-11-20 정리): 학습 탭은 처음 배우는 곳 — 맨 위 소개 카드, 기초 영상, 학습 로드맵, 내 학습 기록, 접힌 「자료 출처」.
// 찾기는 아래 「수어」·「점자」 탭이 맡으므로 첫 화면에 검색칸을 두지 않는다. 외부 평가에 따라 글을 줄이고 출처는 접는다.
// 사용: node home-layout.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const home = async () => { await c.fresh(BASE + '?hl=' + Date.now(), 2600); };

await home();
const hero = await ev(`(() => { const h = document.querySelector('#view-home .hero'); const subs = [...h.querySelectorAll('.hsub')].map(p => p.textContent.replace(/\\s+/g, ' ').trim()); return { t: h.querySelector('h2').textContent, subs, links: [...h.querySelectorAll('.hlinks .hlink')].map(b => b.textContent.trim()), boxes: h.querySelectorAll('.hfeat').length, start: h.querySelector('.hstart')?.textContent || '', inputs: h.querySelectorAll('input').length } })()`);
check('L1 맨 위 카드: 제목, 누구를 위한 곳인지, 할 수 있는 것은 문장으로(수어 1,190개·점자·교육 영상 10편과 퀴즈), 링크 3개, 시작 안내(상자 목록·검색칸 없음)',
  /공식 자료로 배우는수어와 점자/.test(hero.t) && /처음 배우는 분/.test(hero.subs[0]) && /무료/.test(hero.subs[0]) && /수어 1,190개/.test(hero.subs[1]) && /점자로 바꿔/.test(hero.subs[1]) && /10편/.test(hero.subs[1]) && hero.links.length === 3 && hero.boxes === 0 && /기초 영상부터/.test(hero.start) && hero.inputs === 0, JSON.stringify(hero));
const order = await ev(`(() => { const v = document.querySelector('#view-home'); const ids = ['.hero', '#homeVideos', '#roadList', '#recordCard', '#sourceCard']; const els = ids.map(s => v.querySelector(s)); return els.every(Boolean) && els.every((e, i) => i === 0 || (els[i - 1].compareDocumentPosition(e) & 4)) })()`);
check('L2 순서: 소개 카드 → 기초 영상 → 학습 로드맵 → 내 학습 기록 → 자료 출처', order === true);
check('L3 찾기 칸·바로 가기 줄은 없음(찾기는 아래 수어·점자 탭)', (await ev(`document.querySelectorAll('#view-home form, #view-home .homequick').length`)) === 0);
const chars = await ev(`document.querySelector('#view-home').innerText.replace(/\\s+/g, ' ').trim().length`);
check('L4 첫 화면 글이 예전보다 짧음(900자 이하, 예전 약 1,400자)', chars <= 900, chars + '자');
check('L5 기초 영상 4편, 설명은 한 줄로', (await ev(`document.querySelectorAll('#homeVideoList .vrow').length`)) === 4 && (await ev(`getComputedStyle(document.querySelector('#homeVideoList .vdesc')).webkitLineClamp`)) === '1');
check('L6 「자료 출처」는 처음엔 접혀 있음', (await ev(`!document.querySelector('#sourceCard').open`)) && (await ev(`!document.querySelector('#sourceCard .sourcelist').checkVisibility()`)));
await ev(`document.querySelector('#sourceCard summary').click()`); await sleep(200);
check('L7 누르면 펼쳐져 출처 4줄(국립국어원·서울복지포털·점자 규정·교육 영상)', (await ev(`document.querySelector('#sourceCard').open`)) && (await ev(`document.querySelectorAll('#sourceCard .sourcelist li').length`)) === 4 && /서울복지포털 「수어 표준사전」/.test(await ev(`document.querySelector('#sourceCard').textContent`)));
// 소개 세 줄은 누르면 그 화면으로(2026-11-20 사람처럼 써 보기에서 「버튼처럼 보이는데 반응 없음」)
const goes = [];
for (const [i, want] of [[0, 'view-sign'], [1, 'view-braille'], [2, 'view-quiz']]) {
  await ev(`go('home')`); await sleep(300);
  await ev(`document.querySelectorAll('#view-home .hlinks .hlink')[${i}].click()`); await sleep(500);
  goes.push((await ev(`document.querySelector('.view.active').id`)) === want);
}
check('L9 소개 아래 링크(수어 사전 보기·점자로 바꿔 보기·퀴즈 풀기)를 누르면 수어·점자·퀴즈 화면으로', goes.every(Boolean), JSON.stringify(goes));
// 「AI가 만든 티」 평가(2026-11-20): 첫 화면·수어 탭에 이모지·구호 배지·「제목 — 부제」를 쓰지 않음
const tells = await ev(`(() => { go('home'); const h = document.querySelector('#view-home').innerText; go('sign'); const s = document.querySelector('#view-sign').innerText; go('home');
  const em = t => (t.match(/\\p{Extended_Pictographic}/gu) || []).filter(x => x !== '★').length;
  return { homeEmoji: em(h), signEmoji: em(s), slogan: /오늘도 손빛과 함께/.test(h), dash: / — /.test(h) } })()`);
check('L10 첫 화면·수어 탭에 이모지(★ 제외)·구호 배지·「 — 」 제목이 없음', tells.homeEmoji === 0 && tells.signEmoji === 0 && !tells.slogan && !tells.dash, JSON.stringify(tells));
const look = await ev(`(() => { const k = document.querySelector('.brand .k'); const card = getComputedStyle(document.querySelector('#recordCard')); const note = getComputedStyle(document.querySelector('#recStatus'));
  return { kicker: !k || getComputedStyle(k).display === 'none', shadow: card.boxShadow, noteBg: note.backgroundColor, grad: /gradient/.test(getComputedStyle(document.querySelector('.brand .logo')).backgroundImage) } })()`);
check('L11 머리줄 영어 글씨(손빛 SONBIT) 없음, 카드 그림자 없음, 안내는 상자 없이 글, 로고 단색', look.kicker && look.shadow === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(look.noteBg) && !look.grad, JSON.stringify(look));
await c.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true });
await home();
check('L8 320px 좁은 화면에서도 옆으로 넘치지 않음', await ev(`document.documentElement.scrollWidth <= window.innerWidth`));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
