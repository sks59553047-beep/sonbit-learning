// 지피티 2차 지적 고친 것 확인: ①저장 실패 안내 ②대본 순서·없는 대본 ③단어장·틀린 문제 개수 ④풀던 퀴즈 백업 ⑤범위 이름
// 사용: node fixes6.mjs <주소>
import { open, check } from './lib/cdp.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8765/').replace(/\?.*$/, '');
const c = await open({ w: 390, h: 844 });
const { ev, sleep } = c;
const txt = async s => (await ev(`document.querySelector(${JSON.stringify(s)})?.textContent`)) || '';
const importJson = async obj => { await ev(`(()=>{const f=new File([${JSON.stringify(JSON.stringify(obj))}],'r.json',{type:'application/json'});const dt=new DataTransfer();dt.items.add(f);const i=document.querySelector('#importFile');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(900); return txt('#recStatus'); };
await c.fresh(BASE + '?f6=' + Date.now(), 2500);

// ───── ① 저장 실패(저장 공간이 꽉 찬 상황을 흉내) ─────
await ev(`window.__realSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('꽉 참', 'QuotaExceededError'); }`);
await ev(`document.querySelector('#btnTheme').click()`); await sleep(300);
check('1-1 설정 저장 실패 → 「저장하지 못했어요」 알림', /저장하지 못했어요/.test(await txt('#toast')), await txt('#toast'));
const st = await importJson({ app: 'sonbit', version: 1, data: { fav: ['KSL-0003', 'KSL-0005'], wrong: [], watched: {}, did: {} } });
check('1-2 기록 가져오기 저장 실패 → 「가져왔어요」라고 하지 않고 실패를 알림', /저장하지 못했어요/.test(st) && !/가져왔어요/.test(st) && /가져오지 못했어요/.test(await txt('#toast')), st);
await ev(`document.querySelector('[data-nav="sign"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-topic="인사·예절"]').click()`); await sleep(300);
await ev(`(()=>{const d=document.querySelector('#signList .wordrow');d.open=true})()`); await sleep(400);
await ev(`document.querySelector('#signList .wordrow[open] [data-fav]').click()`); await sleep(200);
check('1-3 단어장 담기 저장 실패 → 「담았어요」 대신 실패 알림, 버튼도 그대로', /단어장에 저장하지 못했어요/.test(await txt('#toast')) && (await ev(`document.querySelector('#signList .wordrow[open] [data-fav]').getAttribute('aria-pressed')`)) === 'false', await txt('#toast'));
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-quiz="braille"]').click()`); await sleep(500);
await ev(`document.querySelector('#quizPause').click()`); await sleep(300);
check('1-4 「잠시 나가기」 저장 실패 → 「저장했어요」 대신 이어 풀 수 없다고 알림', /저장하지 못해서 나중에 이어서 풀 수 없어요/.test(await txt('#toast')) && (await ev(`!document.querySelector('#qResume')`)) === true, await txt('#toast'));
await ev(`Storage.prototype.setItem = window.__realSet`);

// ───── ② 대본 ─────
await c.fresh(BASE + '?f6b=' + Date.now(), 2500);
await ev(`window.__f = window.fetch; window.fetch = (u, o) => String(u).includes('v8-ksl-intro.vtt') ? new Promise(r => setTimeout(() => r(window.__f(u, o)), 1500)) : window.__f(u, o)`);
await ev(`document.querySelector('#homeVideoList [data-open-video="v8-ksl-intro"]').click()`); await sleep(200);
await ev(`history.back()`); await sleep(300);
await ev(`document.querySelector('#homeVideoList [data-open-video="v1-braille-basics"]').click()`); await sleep(2500);
const first = await txt('#playerTranscript .tline');
const vB = await ev(`window.__f('videos/v1-braille-basics.vtt').then(r=>r.text())`);
check('2-1 「수어의 시작」 대본이 늦게 와도 「점자의 시작」 화면에는 점자의 시작 대본만', (await txt('#playerTitle')).startsWith('점자의 시작') && vB.includes(first), first.slice(0, 40));
await ev(`history.back()`); await sleep(300);
await ev(`window.fetch = (u, o) => String(u).includes('.vtt') ? window.__f('videos/__없는파일__.vtt', o) : window.__f(u, o)`);
await ev(`document.querySelector('#homeVideoList [data-open-video="v5-etiquette"]').click()`); await sleep(1500);
check('2-2 대본 파일이 없으면 화면 코드 대신 「자막을 불러오지 못했어요」', (await txt('#playerTranscript')).trim() === '자막을 불러오지 못했어요.', (await txt('#playerTranscript')).slice(0, 50));
await ev(`window.fetch = window.__f`); await ev(`history.back()`); await sleep(300);

// ───── ③ 단어장 1,190개 + 사전에 없는 단어, 틀린 문제 150개 ─────
const ids = JSON.parse(await ev(`JSON.stringify(KSL_WORDS.map(w=>String(w.id)).concat(KSL_EXTRA.map(x=>'N'+x.i)))`));
const wr = JSON.parse(await ev(`JSON.stringify(QZ.eligible.slice(0,150).map(w=>({t:'sv',i:w.id,l:2})))`));
await c.fresh(BASE + '?f6c=' + Date.now(), 2500);
const s3 = await importJson({ app: 'sonbit', version: 1, data: { fav: ids.concat(['없는단어1', '없는단어2']), wrong: wr, watched: {}, did: {} } });
const favN = await ev(`JSON.parse(localStorage.getItem('sonbit:fav')||'[]').length`), wrongN = await ev(`JSON.parse(localStorage.getItem('sonbit:wrong')||'[]').length`);
check('3-1 단어장 1,190개가 모두 들어오고, 사전에 없는 단어 2개는 건너뛰었다고 알림', favN === ids.length && /단어장 \+1190/.test(s3) && /사전에 없는 단어 2개는 건너뛰었어요/.test(s3), `${favN}개 | ${s3}`);
check('3-2 틀린 문제 150개 → 100개만 보관, 50개는 못 넣었다고 정확히 알림', wrongN === 100 && /틀린 문제 \+100/.test(s3) && /100개까지만 보관해서 50개는 넣지 못했어요/.test(s3), `${wrongN}개`);

// ───── ④ 풀던 퀴즈도 기록 파일로 옮겨진다 ─────
await c.fresh(BASE + '?f6d=' + Date.now(), 2500);
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-quiz="braille"]').click()`); await sleep(500);
for (let k = 0; k < 2; k++) { await ev(`document.querySelector('#quizOpts [data-opt]').click()`); await sleep(150); await ev(`document.querySelector('#quizNext').click()`); await sleep(300); }
const optsBefore = await ev(`JSON.stringify([...document.querySelectorAll('#quizOpts [data-opt]')].map(b=>b.dataset.opt))`);
await ev(`document.querySelector('#quizPause').click()`); await sleep(300);
await ev(`document.querySelector('[data-nav="home"]').click()`); await sleep(400);
await ev(`window.__blobs=[];const o=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__blobs.push(b);return o(b)}`);
await ev(`document.querySelector('#recExport').click()`); await sleep(400);
const exp = JSON.parse(await ev(`window.__blobs[0].text()`));
check('4-1 내보낸 파일에 풀던 퀴즈가 들어 있음(점자 읽기, 3번째 문제부터)', exp.data.quizrun && exp.data.quizrun.kind === 'braille' && exp.data.quizrun.i === 2 && exp.data.quizrun.qs.length === 10, exp.data.quizrun ? exp.data.quizrun.kind + ' i=' + exp.data.quizrun.i : '없음');
await ev(`document.querySelector('#recClear').click()`); await sleep(150); await ev(`document.querySelector('#recClearYes').click()`); await sleep(300);
const s4 = await importJson(exp);
check('4-2 기록을 지운 뒤 가져오면 「풀던 퀴즈도 가져왔어요」', /풀던 퀴즈도 가져왔어요/.test(s4), s4);
await ev(`document.querySelector('#homeNext [data-act="resume"]').click()`); await sleep(600);
const optsAfter = await ev(`JSON.stringify([...document.querySelectorAll('#quizOpts [data-opt]')].map(b=>b.dataset.opt))`);
check('4-3 이어서 풀기 → 같은 3번째 문제, 같은 보기', /점자 읽기 퀴즈 · 3 \/ 10/.test(await txt('#quizQ')) && optsBefore === optsAfter, await txt('#quizQ'));
await ev(`document.querySelector('#quizPause').click()`); await sleep(300);
await ev(`document.querySelector('[data-nav="home"]').click()`); await sleep(300);
const s5 = await importJson(exp);
check('4-4 이 기기에 풀던 퀴즈가 있으면 파일 것으로 덮어쓰지 않음', /이 기기에 풀던 퀴즈가 있어서 파일의 풀던 퀴즈는 가져오지 않았어요/.test(s5), s5);
await ev(`localStorage.removeItem('sonbit:quizrun')`);
const s6 = await importJson({ app: 'sonbit', version: 1, data: { quizrun: { v: 2, kind: 'braille', qs: [{ t: 'zz' }] } } });
check('4-5 깨진 풀던 퀴즈는 가져오지 않고 알림', /읽을 수 없어서 가져오지 않았어요/.test(s6) && (await ev(`localStorage.getItem('sonbit:quizrun')`)) === null, s6);

// ───── ⑤ 범위 이름 ─────
await ev(`document.querySelector('[data-nav="quiz"]').click()`); await sleep(300);
check('5 범위 이름이 「된소리·겹모음·겹받침」(두 칸 글자 아님)', (await txt('[data-qscope="two"]')) === '된소리·겹모음·겹받침', await txt('[data-qscope="two"]'));
check('6 JS 오류·콘솔 오류 없음', c.errs.length === 0 && c.cons.length === 0, c.errs.concat(c.cons).join(' | '));
await c.close(); process.exit(0);
