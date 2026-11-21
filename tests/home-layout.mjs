// 학습(첫) 화면(2026-11-20 정리): 학습 탭은 처음 배우는 곳 — 맨 위 소개 카드, 기초 영상, 학습 로드맵, 내 학습 기록, 접힌 「자료 출처」.
// 찾기는 아래 「수어」·「점자」 탭이 맡으므로 첫 화면에 검색칸을 두지 않는다. 외부 평가에 따라 글을 줄이고 출처는 접는다.
// 사용: node home-layout.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/[?#].*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const home = async () => { await c.fresh(BASE + '?hl=' + Date.now(), 2600); };

await home();
const hero = await ev(`(() => { const h = document.querySelector('#view-home .hero'); const subs = [...h.querySelectorAll('.hsub')].map(p => p.textContent.replace(/\\s+/g, ' ').trim()); return { t: h.querySelector('h2').textContent, subs, head: h.querySelector('.hcanh')?.textContent || '', rows: [...h.querySelectorAll('.hcan .hrow')].map(b => ({ n: b.querySelector('b').textContent, d: b.querySelector(':scope > span:not(.hi)').textContent.replace(/\\s+/g, ' ') })), boxes: h.querySelectorAll('.hfeat').length, start: h.querySelector('.hstart')?.textContent || '', inputs: h.querySelectorAll('input').length } })()`);
check('L1 맨 위 카드(2026-11-21): 제목 「수어와 점자를 처음 배우는 곳」, 누구를 위한 무료 사이트인지, 「여기서 할 수 있는 것」 = 아래 탭 네 줄(학습 기초 영상 4편·수어 1,190개·점자 영상 7편·퀴즈), 시작 단추(상자 목록·검색칸 없음)',
  /수어와 점자를처음 배우는 곳/.test(hero.t) && hero.subs.length === 1 && /수어와 점자에 관심이 있거나 배워 보고 싶은 분/.test(hero.subs[0]) && !/장애인/.test(hero.subs[0]) && /무료/.test(hero.subs[0]) && /할 수 있는 것/.test(hero.head) && hero.rows.map(r => r.n).join() === '학습,수어,점자,퀴즈' && /4편/.test(hero.rows[0].d) && /1,190개/.test(hero.rows[1].d) && /8편/.test(hero.rows[2].d) && hero.boxes === 0 && /기초 영상부터/.test(hero.start) && hero.inputs === 0, JSON.stringify(hero));
const order = await ev(`(() => { const v = document.querySelector('#view-home'); const ids = ['.hero', '#homeVideos', '#roadList', '#recordCard', '#sourceCard']; const els = ids.map(s => v.querySelector(s)); return els.every(Boolean) && els.every((e, i) => i === 0 || (els[i - 1].compareDocumentPosition(e) & 4)) })()`);
check('L2 순서: 소개 카드 → 기초 영상 → 학습 로드맵 → 내 학습 기록 → 자료 출처', order === true);
check('L3 찾기 칸·바로 가기 줄은 없음(찾기는 아래 수어·점자 탭)', (await ev(`document.querySelectorAll('#view-home form, #view-home .homequick').length`)) === 0);
const chars = await ev(`document.querySelector('#view-home').innerText.replace(/\\s+/g, ' ').trim().length`);
check('L4 첫 화면 글이 예전보다 짧음(900자 이하, 예전 약 1,400자)', chars <= 900, chars + '자');
check('L5 기초 영상 4편, 설명은 한 줄로', (await ev(`document.querySelectorAll('#homeVideoList .vrow').length`)) === 4 && (await ev(`getComputedStyle(document.querySelector('#homeVideoList .vdesc')).webkitLineClamp`)) === '1');
check('L6 「자료 출처」는 처음엔 접혀 있음', (await ev(`!document.querySelector('#sourceCard').open`)) && (await ev(`!document.querySelector('#sourceCard .sourcelist').checkVisibility()`)));
await ev(`document.querySelector('#sourceCard summary').click()`); await sleep(200);
check('L7 누르면 펼쳐져 출처 5줄(국립국어원·서울복지포털·점자 규정·생활 속 점자·교육 영상)', (await ev(`document.querySelector('#sourceCard').open`)) && (await ev(`document.querySelectorAll('#sourceCard .sourcelist li').length`)) === 5 && /서울복지포털 「수어 표준사전」/.test(await ev(`document.querySelector('#sourceCard').textContent`)));
// 소개 세 줄은 누르면 그 화면으로(2026-11-20 사람처럼 써 보기에서 「버튼처럼 보이는데 반응 없음」)
const goes = [];
for (const [i, want] of [[0, 'view-home'], [1, 'view-sign'], [2, 'view-braille'], [3, 'view-quiz']]) {
  await ev(`go('home')`); await sleep(300);
  await ev(`document.querySelectorAll('#view-home .hcan .hrow')[${i}].click()`); await sleep(500);
  goes.push((await ev(`document.querySelector('.view.active').id`)) === want);
}
check('L9 「할 수 있는 것」 네 줄을 누르면 학습(기초 영상 칸)·수어·점자·퀴즈 화면으로', goes.every(Boolean), JSON.stringify(goes));
// 점자 탭에서 교육 영상 칸을 보고 온 뒤에도 「점자로 바꿔 보기」는 글자 바꾸기 칸으로(2026-11-20 외부 평가)
await ev(`go('braille'); showBraillePanel('learn', true); go('home'); 1`); await sleep(400);
await ev(`document.querySelectorAll('#view-home .hcan .hrow')[2].click()`); await sleep(500);
const conv = await ev(`({ view: document.querySelector('.view.active').id, convert: !document.querySelector('#bp-convert').hidden, learn: !document.querySelector('#bp-learn').hidden })`);
check('L9b 교육 영상 칸을 보고 와도 「점자」 줄 → 글자 바꾸기 칸', conv.view === 'view-braille' && conv.convert && !conv.learn, JSON.stringify(conv));
// 교육 영상은 있는 곳이 둘(2026-11-21): 「기초 영상」 줄 → 학습 화면의 기초 영상 칸으로 내려감, 「한글 점자 영상」 줄 → 점자 탭 교육 영상 칸
await ev(`go('home'); window.scrollTo(0, 0); 1`); await sleep(400);
await ev(`document.querySelectorAll('#view-home .hcan .hrow')[0].click()`); await sleep(1200);
const vb = await ev(`({ top: Math.round(document.querySelector('#homeVideos').getBoundingClientRect().top), y: Math.round(scrollY), n: document.querySelectorAll('#homeVideoList .vrow').length, label: document.querySelectorAll('#view-home .hcan .hrow')[0].textContent })`);
await ev(`go('home'); 1`); await sleep(300);
await ev(`go('braille'); showBraillePanel('learn', true); 1`); await sleep(600);
const vl = await ev(`({ view: document.querySelector('.view.active').id, learn: !document.querySelector('#bp-learn').hidden, n: document.querySelectorAll('#bp-learn [data-open-video]').length, label: document.querySelectorAll('#view-home .hcan .hrow')[2].textContent })`);
await ev(`go('home'); window.scrollTo(0, 0); 1`); await sleep(400);
await ev(`document.querySelector('#view-home .hero .hstart').click()`); await sleep(1200);
const sb = await ev(`({ tag: document.querySelector('#view-home .hero .hstart').tagName, top: Math.round(document.querySelector('#homeVideos').getBoundingClientRect().top), y: Math.round(scrollY) })`);
check('L9d 소개 왼쪽 「처음이라면 기초 영상부터」 단추 → 기초 영상 칸으로', sb.tag === 'BUTTON' && sb.y > 200 && sb.top >= 0 && sb.top < 200, JSON.stringify(sb));
check('L9c 「학습」 줄(기초 영상 4편) → 학습 화면 기초 영상 칸으로, 「점자」 줄의 영상 편 수 = 점자 탭 교육 영상 수', vb.y > 200 && vb.top >= 0 && vb.top < 200 && vb.label.includes(vb.n + '편') && vl.view === 'view-braille' && vl.learn && vl.label.includes(vl.n + '편'), JSON.stringify({ vb, vl }));
// 「AI가 만든 티」 평가(2026-11-20): 첫 화면 글에 이모지·구호 배지·「제목 — 부제」를 쓰지 않음.
// 같은 날 「너무 밋밋하다」 → 모양은 처음으로 섞어 되살림: 수어 주제 카드에는 작은 아이콘이 다시 있음
const tells = await ev(`(() => { go('home'); const h = document.querySelector('#view-home').innerText; go('sign'); const icons = [...document.querySelectorAll('#view-sign .topiccard .ti')].filter(e => e.textContent.trim()).length; go('home');
  const em = t => (t.match(/\\p{Extended_Pictographic}/gu) || []).filter(x => x !== '★').length;
  return { homeEmoji: em(h), topicIcons: icons, slogan: /오늘도 손빛과 함께/.test(h), dash: / — /.test(h) } })()`);
// 「오늘도 손빛과 함께」 꼬리표는 작업자님이 좋다고 해 되살림(2026-11-20)
check('L10 첫 화면에 이모지(★ 제외)·「 — 」 제목이 없고, 「오늘도 손빛과 함께」 꼬리표와 수어 주제 아이콘은 있음', tells.homeEmoji === 0 && tells.topicIcons > 10 && tells.slogan && !tells.dash, JSON.stringify(tells));
const look = await ev(`(() => { const k = document.querySelector('.brand .k'); const card = getComputedStyle(document.querySelector('#recordCard')); const note = getComputedStyle(document.querySelector('#recStatus')); const hero = getComputedStyle(document.querySelector('.hero'));
  return { kicker: !!k && getComputedStyle(k).display !== 'none', shadow: card.boxShadow, noteBg: note.backgroundColor, grad: /gradient/.test(getComputedStyle(document.querySelector('.brand .logo')).backgroundImage), hero: /gradient/.test(hero.backgroundImage) } })()`);
check('L11 섞은 모양: 머리줄 「손빛 SONBIT」, 남색 첫 화면, 카드 그림자, 안내 상자 배경, 로고 그라데이션', look.kicker && look.hero && look.shadow !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(look.noteBg) && look.grad, JSON.stringify(look));
await c.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true });
await home();
check('L8 320px 좁은 화면에서도 옆으로 넘치지 않음', await ev(`document.documentElement.scrollWidth <= window.innerWidth`));
// 「오늘의 수어」(2026-11-21): 휴대폰에서는 숨기고 영상도 안 불러옴, 컴퓨터 화면에서는 두 칸 소개 왼쪽 아래에 영상·점자, 누르면 사전의 그 단어
// 2026-11-21: 휴대폰에서도 보이되(「할 수 있는 것」 아래), 화면에 들어오기 전에는 영상을 불러오지 않고 들어오면 불러와 재생
const m1 = await ev(`(() => { const b = document.querySelector('#htoday'), r = b.getBoundingClientRect(), last = document.querySelector('.hcan').getBoundingClientRect(); return { shown: !b.hidden && r.height > 0, below: r.top > last.bottom - 2, src: !!b.querySelector('video').getAttribute('src'), over: document.documentElement.scrollWidth > innerWidth } })()`);
await ev(`document.querySelector('#htoday').scrollIntoView({ block: 'center' }); 1`); await sleep(1500);
const m2 = await ev(`({ src: !!document.querySelector('#htoday video').getAttribute('src'), playing: !document.querySelector('#htoday video').paused, poster: !!document.querySelector('#htoday video').poster })`);
check('L12 휴대폰: 「오늘의 수어」가 「할 수 있는 것」 아래에 보이고, 화면에 들어오기 전엔 영상 안 불러옴 → 들어오면 불러와 재생', m1.shown && m1.below && !m1.src && !m1.over && m2.src && m2.playing && m2.poster, JSON.stringify({ m1, m2 }));
await c.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false });
await home(); await sleep(2500);
const td = await ev(`(() => { const b = document.querySelector('#htoday'), v = b.querySelector('video'), h = document.querySelector('.hero'), r = b.getBoundingClientRect(), last = [...document.querySelectorAll('.hcan .hrow')].pop().getBoundingClientRect(), kick = document.querySelector('.hero .kick').getBoundingClientRect(), head = document.querySelector('.hcanh').getBoundingClientRect();
  return { shown: !b.hidden, word: document.querySelector('#htodayWord').textContent, cells: document.querySelectorAll('#htodayBr .mini').length, src: !!v.getAttribute('src'), playing: !v.paused, cols: getComputedStyle(h).gridTemplateColumns.split(' ').length, bottomGap: Math.round(Math.abs(r.bottom - last.bottom)), topGap: Math.round(Math.abs(kick.top - head.top)), id: b.dataset.arg } })()`);
check('L13 컴퓨터 화면: 소개 두 칸, 위(「오늘도 손빛과 함께」·「여기서 할 수 있는 것」)·아래(「오늘의 수어」·마지막 줄) 끝이 맞음, 「오늘의 수어」 영상 재생·점자 칸', td.shown && td.word && td.cells > 0 && td.src && td.playing && td.cols === 2 && td.bottomGap <= 2 && td.topGap <= 4, JSON.stringify(td));
await ev(`document.querySelector('#htoday').click()`); await sleep(1200);
const tg = await ev(`({ view: document.querySelector('.view.active').id, open: document.querySelector('#signList .wordrow[open]')?.dataset.wid || '' })`);
// 「움직임 줄이기」를 켠 사람에게는 영상을 자동으로 틀거나 내려받지 않고 그림만
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await c.fresh(BASE + '?hl=' + Date.now(), 2600); await sleep(1800);
const calm = await ev(`({ poster: !!document.querySelector('#htoday video').poster, src: !!document.querySelector('#htoday video').getAttribute('src'), paused: document.querySelector('#htoday video').paused })`);
check('L16 움직임 줄이기: 「오늘의 수어」는 그림만 보이고 영상은 내려받지 않고 재생하지 않음', calm.poster && !calm.src && calm.paused, JSON.stringify(calm));
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
check('L14 「오늘의 수어」를 누르면 수어 사전에서 그 단어가 펼쳐짐', tg.view === 'view-sign' && tg.open === td.id, JSON.stringify(tg));
// 날마다 무작위 + 한 바퀴 돌기 전엔 같은 낱말이 다시 안 나옴 + 간추린 목록(뺀 주제·낱말 없음)
const rot = await ev(`(() => { const l = todayList(), n = l.length, base = new Date(2026, 10, 21), ids = [];
  for (let k = 0; k < n + 3; k++) { const d = new Date(base); d.setDate(d.getDate() + k); ids.push(String(todayWord(d).id)); }
  const first = ids.slice(0, n); const uniq = new Set(first).size;
  return { n, uniq, wrap: ids[n] === ids[0] && ids[n + 1] === ids[1], skipTopic: l.filter(w => TODAY_SKIP_TOPICS.has(w.t)).length, skipWord: l.filter(w => TODAY_SKIP.has(w.w)).length, hard: l.filter(w => ['나라·지명', '법·사건', '사회·제도'].includes(w.t) && QZ.wordById(w.id).tier > 2).length, sample: first.slice(0, 7).map(id => WORD_BY_ID.get(id).w).join(' ') } })()`);
check('L15 「오늘의 수어」: 간추린 목록(300~700개)을 날마다 하나씩, 한 바퀴 동안 겹치지 않고 그다음 바퀴는 같은 순서, 뺀 주제·낱말 없음', rot.n >= 300 && rot.n <= 700 && rot.uniq === rot.n && rot.wrap && !rot.skipTopic && !rot.skipWord && !rot.hard, JSON.stringify(rot));
check('JS 오류 없음', c.errs.length === 0, c.errs.join(' | '));
await c.close(); process.exit(0);
