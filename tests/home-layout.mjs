// 학습(첫) 화면(2026-11-20 정리): 학습 탭은 처음 배우는 곳 — 맨 위 소개 카드, 기초 영상, 학습 로드맵, 내 학습 기록, 접힌 「자료 출처」.
// 찾기는 아래 「수어」·「점자」 탭이 맡으므로 첫 화면에 검색칸을 두지 않는다. 외부 평가에 따라 글을 줄이고 출처는 접는다.
// 사용: node home-layout.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const home = async () => { await c.fresh(BASE + '?hl=' + Date.now(), 2600); };

await home();
const hero = await ev(`(() => { const h = document.querySelector('#view-home .hero'); return { t: h.querySelector('h2').textContent, sub: h.querySelector('.hsub')?.textContent || '', feats: [...h.querySelectorAll('.hfeat li')].map(l => l.textContent.replace(/\\s+/g, ' ').trim()), start: h.querySelector('.hstart')?.textContent || '', inputs: h.querySelectorAll('input').length } })()`);
check('L1 맨 위 카드: 제목, 누구를 위한 곳인지, 할 수 있는 것 3줄(수어 사전 1,190개·점자·교육 영상 10편과 퀴즈), 시작 안내(검색칸 없음)',
  /공식 자료로 배우는수어와 점자/.test(hero.t) && /처음 배우는 분/.test(hero.sub) && /무료/.test(hero.sub) && hero.feats.length === 3 && /수어 사전.*1,190개/.test(hero.feats[0]) && /점자/.test(hero.feats[1]) && /10편/.test(hero.feats[2]) && /기초 영상부터/.test(hero.start) && hero.inputs === 0, JSON.stringify(hero));
const order = await ev(`(() => { const v = document.querySelector('#view-home'); const ids = ['.hero', '#homeVideos', '#roadList', '#recordCard', '#sourceCard']; const els = ids.map(s => v.querySelector(s)); return els.every(Boolean) && els.every((e, i) => i === 0 || (els[i - 1].compareDocumentPosition(e) & 4)) })()`);
check('L2 순서: 소개 카드 → 기초 영상 → 학습 로드맵 → 내 학습 기록 → 자료 출처', order === true);
check('L3 찾기 칸·바로 가기 줄은 없음(찾기는 아래 수어·점자 탭)', (await ev(`document.querySelectorAll('#view-home form, #view-home .homequick').length`)) === 0);
const chars = await ev(`document.querySelector('#view-home').innerText.replace(/\\s+/g, ' ').trim().length`);
check('L4 첫 화면 글이 예전보다 짧음(900자 이하, 예전 약 1,400자)', chars <= 900, chars + '자');
check('L5 기초 영상 4편, 설명은 한 줄로', (await ev(`document.querySelectorAll('#homeVideoList .vrow').length`)) === 4 && (await ev(`getComputedStyle(document.querySelector('#homeVideoList .vdesc')).webkitLineClamp`)) === '1');
check('L6 「자료 출처」는 처음엔 접혀 있음', (await ev(`!document.querySelector('#sourceCard').open`)) && (await ev(`!document.querySelector('#sourceCard .sourcelist').checkVisibility()`)));
await ev(`document.querySelector('#sourceCard summary').click()`); await sleep(200);
check('L7 누르면 펼쳐져 출처 4줄(국립국어원·서울복지포털·점자 규정·교육 영상)', (await ev(`document.querySelector('#sourceCard').open`)) && (await ev(`document.querySelectorAll('#sourceCard .sourcelist li').length`)) === 4 && /서울복지포털 「수어 표준사전」/.test(await ev(`document.querySelector('#sourceCard').textContent`)));
await c.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true });
await home();
check('L8 320px 좁은 화면에서도 옆으로 넘치지 않음', await ev(`document.documentElement.scrollWidth <= window.innerWidth`));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
