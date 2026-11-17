// 손빛 배움터 — 퀴즈 화면과 풀이 상태(문제 만들기는 quiz-engine.js 의 QZ)
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
// ================= 퀴즈 =================
// 문제는 assets/quiz-engine.js(QZ)가 만든다: 수어·점자 문제 구성, 난이도 하·중·상 배분, 보기 고르기, 저장·복원.
// 여기서는 화면과 풀이 상태(점수·목숨·이어 풀기)만 맡는다.
function clueCellsHtml(cells) { return '<div class="cellsrow">' + cells.map(c => miniDots(c, true)).join('') + '</div>'; }
// ---- 점자 문제의 글 설명(화면낭독기용·오답 해설용). 정답 글자는 포함하지 않는다 ----
const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째'];
function cellsDescription(cells) {
  if (cells.length === 1) return cells[0].length ? dotsLabel(cells[0]) + '이 있는 점자 한 칸' : '점이 없는 빈칸';
  return '점자 ' + cells.length + '칸. ' + cells.map((c, i) => (ORD[i] || (i + 1) + '번째') + ' 칸 ' + dotsLabel(c)).join(', ');
}
function dotsDiffText(ans, got, who) {
  who = who || '고른 글자';
  if (ans.length !== got.length) return `정답은 ${ans.length}칸, ${who}는 ${got.length}칸이에요`;
  const parts = [];
  ans.forEach((a, i) => {
    const g = got[i], miss = a.filter(n => !g.includes(n)), extra = g.filter(n => !a.includes(n));
    const bits = [];
    if (miss.length) bits.push(`정답에만 있는 점 ${miss.join('·')}번`);
    if (extra.length) bits.push(`${who}에만 있는 점 ${extra.join('·')}번`);
    if (bits.length) parts.push((ans.length > 1 ? ORD[i] + ' 칸: ' : '') + bits.join(', '));
  });
  return parts.join(' / ');
}
// ---- 풀이 상태 저장(잠시 나가도 이어 풀 수 있게) ----
const QKINDS = { sign: '수어 퀴즈', braille: '점자 읽기 퀴즈', build: '점자 쓰기 퀴즈', fav: '내 단어장 퀴즈', review: '틀린 문제 복습' };
const LEVEL_NAME = QZ.LEVELS;
const lvText = s => (s.kind === 'review' ? '난이도 섞임' : '난이도 ' + LEVEL_NAME[s.lv]);        // 복습은 문제마다 난이도가 달라 「섞임」
const toLevel = n => '「' + LEVEL_NAME[n] + '」' + (n === 1 ? '로' : '으로');                    // 하→로, 중·상→으로
let quizState = { active: false };
const modeNow = () => (store.get('qmode', 'practice') === 'challenge' ? 'challenge' : 'practice');
const levelNow = () => { const v = Number(store.get('qlevel', 2)); return v === 1 || v === 3 ? v : 2; };
const scopeNow = () => { const v = store.get('qscope', 'all'); return QZ.SCOPES.some(s => s.key === v) ? v : 'all'; };
const scopeLabel = k => (QZ.SCOPES.find(s => s.key === k) || QZ.SCOPES[0]).label;
// 풀이 상태 → 저장할 모양(기록 파일로 내보낼 때도 같은 모양)
const runData = s => ({ v: 2, kind: s.kind, mode: s.mode, lv: s.lv, scope: s.scope, i: s.answered ? s.i + 1 : s.i, score: s.score, lives: s.lives, done: s.done, qs: s.qs.map(q => QZ.compact(q)), wrong: s.wrong.map(q => QZ.compact(q, true)) });
// 저장에 성공했는지 돌려준다(「잠시 나가기」에서 성공했을 때만 「저장했어요」라고 하기 위해)
function saveRun(quiet) {
  const s = quizState; if (!s.active) return false;
  return store.set('quizrun', runData(s), quiet);
}
// 저장된 모양 → 풀이 상태. 이 기기의 저장소와 가져온 기록 파일 모두 이것으로 검사한다(알 수 없는 값이면 null)
function runFrom(r) {
  if (!r || typeof r !== 'object' || r.v !== 2 || !QKINDS[r.kind] || !Array.isArray(r.qs) || !r.qs.length || r.qs.length > 50) return null;
  const qs = r.qs.map(QZ.restore); if (qs.some(q => !q)) return null;
  const i = Math.max(0, Math.min(Number(r.i) || 0, qs.length));
  return { active: true, kind: r.kind, mode: r.mode === 'challenge' ? 'challenge' : 'practice', lv: [1, 2, 3].includes(r.lv) ? r.lv : 2, scope: QZ.SCOPES.some(s => s.key === r.scope) ? r.scope : 'all', i, score: Number(r.score) || 0, lives: Number.isFinite(Number(r.lives)) ? Number(r.lives) : 3, done: Number(r.done) || 0, qs, answered: false, wrong: (Array.isArray(r.wrong) ? r.wrong : []).map(QZ.restore).filter(Boolean) };
}
function loadRun() {
  const r = store.get('quizrun', null);
  if (r && r.v !== 2) { store.del('quizrun'); return null; }           // 옛 방식으로 저장된 풀이는 이어 풀 수 없다
  return runFrom(r);
}
function resumeQuiz() {
  const run = loadRun();
  if (!run) { store.del('quizrun'); toast('풀던 퀴즈를 찾지 못했어요'); renderHome(); return; }
  quizState = run; ensureQuizView(); renderQuiz(); window.scrollTo(0, 0);
}
// 이미 퀴즈 화면이면 기록(뒤로 가기 목록)을 또 쌓지 않는다
function ensureQuizView() { if (!$('#view-quiz').classList.contains('active')) go('quiz'); }
function questionsFor(kind) {
  const lv = levelNow();
  if (kind === 'sign') return QZ.makeSignQuiz(lv);
  if (kind === 'braille') return QZ.makeBrailleQuiz('read', scopeNow(), lv);
  if (kind === 'build') return QZ.makeBrailleQuiz('write', scopeNow(), lv);
  if (kind === 'fav') return QZ.makeFavQuiz(favWords().map(w => QZ.wordById(w.id)).filter(Boolean), lv);
  if (kind === 'review') return shuffle(getWrong().map(QZ.restore).filter(Boolean)).slice(0, QZ.SIZE);
  return [];
}
function startQuizWith(kind, qs, mode) {
  quizState = { active: true, kind, mode: mode || modeNow(), lv: levelNow(), scope: scopeNow(), i: 0, score: 0, lives: 3, done: 0, qs, answered: false, wrong: [] };
  saveRun(); renderQuiz(); window.scrollTo(0, 0);
}
// 풀던 퀴즈가 남아 있는데 다른 퀴즈를 새로 시작하려 하면, 풀던 진행이 사라진다는 것을 먼저 알리고 고르게 한다(알렸으면 true)
const eulReul = name => { const c = name.charCodeAt(name.length - 1) - 0xAC00; return c >= 0 && c % 28 !== 0 ? '을' : '를'; };
function askSwitch(kind) {
  const run = loadRun(); if (!run) return false;
  quizState = { active: false }; ensureQuizView(); renderQuizHub();
  const box = $('#qSwitch'); box.dataset.kind = kind;
  $('#qSwitchText').textContent = `풀던 「${QKINDS[run.kind]}」(${Math.min(run.i + 1, run.qs.length)} / ${run.qs.length}번째)가 있어요. 「${QKINDS[kind]}」${eulReul(QKINDS[kind])} 새로 시작하면 풀던 진행은 사라져요.`;
  box.hidden = false; box.scrollIntoView({ block: 'nearest' }); $('#qSwitchNew').focus({ preventScroll: true });
  return true;
}
function startQuiz(kind, force) {
  const qs = questionsFor(kind);
  if (!qs.length) { toast(kind === 'fav' ? '단어장에 퀴즈로 낼 수 있는 단어가 아직 없어요' : '풀 문제가 아직 없어요'); return false; }
  if (!force && askSwitch(kind)) return false;
  startQuizWith(kind, qs); return true;
}
function startQuizFromAnywhere(kind, force) {
  const qs = questionsFor(kind);
  if (!qs.length) { toast(kind === 'fav' ? '내 단어장에 단어를 먼저 담아 주세요(영상이 겹치는 단어는 퀴즈에서 빠져요)' : '틀린 문제가 아직 없어요'); return; }
  if (!force && askSwitch(kind)) return;
  quizState = { active: false }; ensureQuizView(); startQuizWith(kind, qs);
}
// ---- 퀴즈 홈 ----
function modeNoteText(m) {
  return m === 'challenge' ? '도전: 힌트 없이 10문제, 목숨 3개예요. 목숨이 모두 없어지면 끝나요.' : '연습: 목숨이 없고 힌트를 쓸 수 있어요. 틀려도 설명을 보며 천천히 익혀요.';
}
const SCOPE_NOTE = { all: '모든 범위에서 골고루 나와요.', cho: '첫소리 13개를 연습해요. (한글 점자 ①)', vb: '기본 모음·받침과 쉬운 낱말을 연습해요. (②③)', num: '숫자와 문장부호를 연습해요. (④)', two: '된소리·겹모음·겹받침과 낱말을 연습해요. (⑤)', abbr: '약자·약어와 줄여 쓰는 낱말을 연습해요. (⑥)' };
function renderQuizHub() {
  quizState = { active: false };
  const run = loadRun(), mode = modeNow(), lv = levelNow(), scope = scopeNow();
  const wrongN = getWrong().filter(c => QZ.valid(c)).length, favN = favWords().filter(w => QZ.favOk(QZ.wordById(w.id))).length;
  const resume = run ? `<div class="resumebar"><div class="rt">풀던 퀴즈가 있어요<small>${esc(QKINDS[run.kind])} · ${Math.min(run.i + 1, run.qs.length)} / ${run.qs.length}번째 · ${run.mode === 'challenge' ? '도전' : '연습'} · ${lvText(run)}</small></div><button class="btn primary small" type="button" id="qResume">이어서 풀기</button><button class="btn line small" type="button" id="qDiscard">그만두기</button></div>` : '';
  $('#quizArea').innerHTML = `<div class="quizhub">${resume}
    <div class="qconfirm qswitch" id="qSwitch" role="alert" hidden><span id="qSwitchText"></span><span class="qsbtns"><button class="btn primary small" type="button" id="qSwitchNew">새로 시작</button><button class="btn line small" type="button" id="qSwitchResume">풀던 퀴즈 이어서 풀기</button><button class="btn ghost small" type="button" id="qSwitchNo">취소</button></span></div>
    <div class="card"><div class="section-h"><h2>방식과 난이도</h2></div>
      <p class="lbl2">방식</p>
      <div class="seg" role="group" aria-label="퀴즈 방식">
        <button type="button" data-qmode="practice" aria-pressed="${mode === 'practice'}">연습</button>
        <button type="button" data-qmode="challenge" aria-pressed="${mode === 'challenge'}">도전</button>
      </div>
      <p class="note" id="qmodeNote" style="margin-top:8px">${modeNoteText(mode)}</p>
      <p class="lbl2">난이도</p>
      <div class="seg" role="group" aria-label="퀴즈 난이도">
        ${[1, 2, 3].map(n => `<button type="button" data-qlevel="${n}" aria-pressed="${lv === n}">${LEVEL_NAME[n]}</button>`).join('')}
      </div>
      <p class="note" id="qlevelNote" style="margin-top:8px">${esc(QZ.LEVEL_NOTES[lv])}</p></div>
    <div class="qcards c1">
      <button class="qcard" type="button" data-quiz="sign"><span class="qci">${icon('hand', 24)}</span><span class="qct">수어 퀴즈</span><span class="qcs">영상을 보고 뜻을 맞히고, 뜻을 보고 알맞은 영상을 골라요. (수어 ${QZ.eligible.length.toLocaleString('ko-KR')}개에서 10문제)</span><span class="qcg" aria-hidden="true">›</span></button>
    </div>
    <div class="card"><div class="section-h"><h2>점자 범위</h2></div>
      <div class="chiprow wrap" role="group" aria-label="점자 범위" style="margin-top:10px">${QZ.SCOPES.map(s => `<button type="button" class="chip${s.key === scope ? ' active' : ''}" data-qscope="${s.key}" aria-pressed="${s.key === scope}">${esc(s.label)}</button>`).join('')}</div>
      <p class="note" id="qscopeNote" style="margin-top:10px">${esc(SCOPE_NOTE[scope])}</p></div>
    <div class="qcards c2">
      <button class="qcard braille" type="button" data-quiz="braille"><span class="qci">${icon('braille', 24)}</span><span class="qct">점자 읽기</span><span class="qcs">점 모양을 보고 글자·숫자·낱말을 맞혀요.</span><span class="qcg" aria-hidden="true">›</span></button>
      <button class="qcard braille" type="button" data-quiz="build"><span class="qci">${icon('pencil', 24)}</span><span class="qct">점자 쓰기</span><span class="qcs">글자·숫자·낱말을 보고 점을 직접 눌러 써 봐요.</span><span class="qcg" aria-hidden="true">›</span></button>
    </div>
    <div class="reviewrow">
      <button class="revchip" type="button" data-quiz="review"><span class="rn">${wrongN}</span><span class="rl">틀린 문제 복습<span class="rs">${wrongN ? '틀린 문제를 다시 풀어요' : '틀린 문제가 여기에 모여요'}</span></span></button>
      <button class="revchip" type="button" data-quiz="fav"><span class="rn">${favN}</span><span class="rl">내 단어장 퀴즈<span class="rs">${favN ? '담아 둔 수어로 연습해요' : '수어 사전에서 단어를 담아요'}</span></span></button>
    </div></div>`;
}
$('#quizArea').addEventListener('click', e => {
  const t = e.target;
  const q = t.closest('[data-quiz]');
  if (q && !quizState.active) { const k = q.dataset.quiz; if (k === 'review' || k === 'fav') startQuizFromAnywhere(k); else startQuiz(k); return; }
  const m = t.closest('[data-qmode]');
  if (m) { store.set('qmode', m.dataset.qmode); $$('[data-qmode]').forEach(b => b.setAttribute('aria-pressed', String(b === m))); $('#qmodeNote').textContent = modeNoteText(m.dataset.qmode); return; }
  const lb = t.closest('[data-qlevel]');
  if (lb) { const n = Number(lb.dataset.qlevel); store.set('qlevel', n); $$('[data-qlevel]').forEach(b => b.setAttribute('aria-pressed', String(b === lb))); $('#qlevelNote').textContent = QZ.LEVEL_NOTES[n]; return; }
  const sb = t.closest('[data-qscope]');
  if (sb) { store.set('qscope', sb.dataset.qscope); $$('[data-qscope]').forEach(b => { const on = b === sb; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); }); $('#qscopeNote').textContent = SCOPE_NOTE[sb.dataset.qscope]; return; }
  if (t.closest('#qResume')) { resumeQuiz(); return; }
  if (t.closest('#qDiscard')) { store.del('quizrun'); renderQuizHub(); return; }
  if (t.closest('#qSwitchNew')) { const k = $('#qSwitch').dataset.kind; store.del('quizrun'); if (k === 'review' || k === 'fav') startQuizFromAnywhere(k, true); else startQuiz(k, true); return; }
  if (t.closest('#qSwitchResume')) { resumeQuiz(); return; }
  if (t.closest('#qSwitchNo')) { $('#qSwitch').hidden = true; return; }
});
// ---- 문제 화면 ----
function livesHtml(lives) { return Array.from({ length: 3 }, (_, i) => `<span class="life${i < lives ? ' on' : ''}">${icon('star', 16)}</span>`).join(''); }
function quizOptHtml(o, i) { return `<button class="qopt" type="button" data-opt="${esc(o)}"><span class="num" aria-hidden="true">${i + 1}</span><span>${esc(o)}</span></button>`; }
function clipHtml(c, i) { return `<button type="button" class="vopt" data-opt="${esc(c.id)}" aria-label="영상 ${i + 1}번"><video src="${esc(kslUrl(c.src))}" autoplay loop muted playsinline preload="auto" tabindex="-1" aria-hidden="true"></video><span class="vn" aria-hidden="true">${i + 1}</span></button>`; }
function quizClueHtml(q) {
  if (q.clueType === 'dots') return `<div class="qclue qclue-dots">${esc(q.prompt)}<div class="quizdots" role="img" aria-label="${esc(cellsDescription(q.clue))}">${clueCellsHtml(q.clue)}</div></div>`;
  if (q.clueType === 'build') return `<div class="qclue">다음을 점자로 써 보세요.<div style="font-size:1.75rem;font-weight:900;margin:10px 0 2px">「${esc(q.answer)}」</div><div style="font-size:.8125rem;opacity:.85">${esc(q.group)} · ${q.clue.length}칸</div></div>`;
  if (q.clueType === 'pickvideo') return `<div class="qclue">다음 뜻의 수어는 어느 영상일까요?<div style="font-size:1.75rem;font-weight:900;margin:10px 0 2px">「${esc(q.answer)}」</div>${q.gloss ? `<div style="font-size:.8125rem;opacity:.85">${esc(q.gloss)}</div>` : ''}</div>`;
  return `<div class="qclue">이 수어 영상이 뜻하는 단어는 무엇일까요?<video class="kslvideo qvideo" id="quizClueVideo" src="${esc(kslUrl(q.clue))}" autoplay loop muted playsinline controls preload="auto" aria-label="수어 영상 문제"></video></div>`;
}
function buildCellsHtml(q) {
  return `<div class="buildcells" id="buildCells">${q.clue.map((c, ci) => `<div class="bcell" data-cell="${ci}"><div class="bgrid" role="group" aria-label="${q.clue.length > 1 ? ORD[ci] + ' 칸' : '점자 한 칸'}">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="dot" data-bdot="${n}" aria-pressed="false" aria-label="${q.clue.length > 1 ? ORD[ci] + ' 칸 ' : ''}${n}번 점">${n}</button>`).join('')}</div>${q.clue.length > 1 ? `<span class="bl">${ORD[ci]} 칸</span>` : ''}</div>`).join('')}</div>`;
}
function renderQuiz() {
  const s = quizState; if (!s.active) return;
  const total = s.qs.length, chal = s.mode === 'challenge';
  if (s.i >= total || (chal && s.lives <= 0)) return renderQuizResult();
  const q = s.qs[s.i], build = q.clueType === 'build', pick = q.clueType === 'pickvideo';
  s.answered = false;
  saveRun();
  const hints = chal ? '' : `${build ? '' : '<button class="btn ghost small" type="button" id="hintCut">보기 하나 지우기</button>'}<button class="btn ghost small" type="button" id="hintText">힌트 보기</button>`;
  const opts = build ? `<div style="margin-top:16px">${buildCellsHtml(q)}</div><button class="btn primary block" type="button" id="buildCheck" style="margin-top:16px">확인하기</button>`
    : pick ? `<div class="vgrid" id="quizOpts" role="group" aria-label="영상 4개 중에서 고르세요" style="margin-top:16px">${q.clips.map(clipHtml).join('')}</div>`
      : `<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px" id="quizOpts">${q._opts.map(quizOptHtml).join('')}</div>`;
  $('#quizArea').innerHTML = `
    <div class="quizhead">
      <div><span class="qbadge${chal ? ' chal' : ''}">${chal ? '도전' : '연습'}</span> <span class="qbadge lv">${lvText(s)}</span> <span id="quizQ" tabindex="-1" style="font-weight:800;margin-left:6px">${esc(QKINDS[s.kind])} · ${s.i + 1} / ${total}</span></div>
      ${chal ? `<span class="lives" role="img" aria-label="남은 목숨 ${s.lives}개">${livesHtml(s.lives)}</span>` : ''}
    </div>
    <div class="progress" style="margin:10px 0 12px"><b style="width:${s.done / total * 100}%"></b></div>
    <div class="qtools">${hints}<span class="sp"></span><button class="btn line small" type="button" id="quizPause">잠시 나가기</button><button class="btn line small" type="button" id="quizEnd">끝내기</button></div>
    <div class="qconfirm" id="quizEndConfirm" hidden style="margin-top:10px"><span>지금까지 푼 ${s.done}문제의 결과를 보고 끝낼까요?</span><button class="btn danger small" type="button" id="quizEndYes">끝내기</button><button class="btn ghost small" type="button" id="quizEndNo">계속 풀기</button></div>
    <div id="quizHint" class="note" hidden aria-live="polite" style="margin-top:10px"></div>
    <div style="margin-top:14px">${quizClueHtml(q)}</div>
    ${opts}
    <div id="quizFeedback" tabindex="-1" style="margin-top:14px" aria-live="polite"></div>`;
  // 첫 문제도 포함해 늘 문제 제목으로 포커스를 옮긴다(키보드·화면낭독기 사용자가 시작하자마자 위치를 잃지 않게)
  const qq = $('#quizQ'); if (qq) qq.focus({ preventScroll: true });
}
$('#quizArea').addEventListener('click', e => {
  const s = quizState; if (!s.active) return;
  const t = e.target, q = s.qs[s.i];
  const opt = t.closest('[data-opt]'); if (opt && !opt.disabled) { answerChoice(opt, q); return; }
  const bd = t.closest('[data-bdot]');
  if (bd && !s.answered) { const on = !bd.classList.contains('on'); bd.classList.toggle('on', on); bd.setAttribute('aria-pressed', String(on)); return; }
  if (t.closest('#buildCheck')) { if (!s.answered) answerBuild(q); return; }
  if (t.closest('#hintCut')) { cutOption(q); return; }
  if (t.closest('#hintText')) { showHint(q); return; }
  if (t.closest('#quizPause')) { const ok = saveRun(true); renderQuizHub(); toast(ok ? '저장했어요. 퀴즈 화면에서 이어서 풀 수 있어요' : '풀던 퀴즈를 저장하지 못해서 나중에 이어서 풀 수 없어요. ' + STORE_FAIL_WHY); return; }
  if (t.closest('#quizEnd')) { $('#quizEndConfirm').hidden = false; $('#quizEndNo').focus(); return; }
  if (t.closest('#quizEndNo')) { $('#quizEndConfirm').hidden = true; return; }
  if (t.closest('#quizEndYes')) { s.ended = true; renderQuizResult(); return; }
  if (t.closest('#quizNext')) { s.i++; renderQuiz(); window.scrollTo(0, 0); return; }
  if (t.closest('#quizConv')) { $('#bpInput').value = convTextOf(q); $('#bpContract').checked = true; renderBraillePanel(); store.set('track', 'braille'); go('braille'); showBraillePanel('convert'); return; }
  if (t.closest('#quizPad')) { const two = q.clue.length === 2; setPadTwo(two); padDots = new Set(q.clue[0]); padDots2 = new Set(two ? q.clue[1] : []); syncPadCell(); renderPadResult(); store.set('track', 'braille'); go('braille'); showBraillePanel('pad'); return; }
  if (t.closest('#quizRelearn')) { const w = WORD_BY_ID.get(String(q.id)); if (w) openWordInDictionary(w); return; }
  if (t.closest('#quizReplay')) { const v = $('#quizClueVideo'); if (v) { v.currentTime = 0; v.play(); } return; }
});
// ---- 힌트(연습 방식에서만) ----
const isRightOpt = (q, v) => (q.clueType === 'pickvideo' ? String(v) === String(q.id) : v === q.answer);
function cutOption(q) {
  const left = $$('[data-opt]', $('#quizOpts')).filter(b => !b.disabled);
  if (left.length <= 2) { $('#hintCut').disabled = true; return; }
  const wrong = left.filter(b => !isRightOpt(q, b.dataset.opt));
  const b = wrong[Math.floor(Math.random() * wrong.length)];
  b.disabled = true; b.classList.add('gone'); b.setAttribute('aria-label', (b.classList.contains('vopt') ? b.getAttribute('aria-label') : b.dataset.opt) + ' (지운 보기)');
  const v = b.querySelector('video'); if (v) v.pause();
  if (left.length - 1 <= 2) $('#hintCut').disabled = true;
}
function hintTextFor(q) {
  if (q.clueType === 'pickvideo') {
    const w = WORD_BY_ID.get(String(q.id)), inf = w && typeof KSL_INFO !== 'undefined' && String(w.id).charAt(0) === 'N' ? KSL_INFO[String(w.id).slice(1)] : null;
    if (inf) { const pos = KSL_POS_NAME[inf[2]] || ''; return `정답 영상은 ${inf[0] === 1 ? '한 손' : '두 손'}으로 하는 수어예요${pos ? ', 손 위치는 ' + pos + ' 쪽이에요' : ''}.`; }
    return `정답은 ${q.answer.replace(/\s+/g, '').length}글자 낱말이에요.`;
  }
  if (q.clueType === 'dots') {
    if (q.bk === 'n') return `첫 칸은 수표(3·4·5·6번 점)예요. 숫자는 모두 ${q.answer.length}개예요.`;
    if (q.bk === 'w' || q.bk === 'c') return `${q.answer.length}글자 낱말이에요. 모두 ${q.clue.length}칸이에요.`;
    const n = q.clue[0].length; return q.clue.length > 1 ? `첫 칸에는 점이 ${n}개 있고, 모두 ${q.clue.length}칸이에요.` : `점이 ${n}개 있는 칸이에요.`;
  }
  if (q.clueType === 'build') {
    if (q.bk === 'n') return `수표(3·4·5·6번 점)로 시작하고, 그다음 숫자 ${q.answer.length}개를 이어 써요.`;
    if (q.bk === 'w' || q.bk === 'c') return `${q.answer.length}글자 낱말이고, 모두 ${q.clue.length}칸이에요.`;
    return '점 개수: ' + q.clue.map((c, i) => `${q.clue.length > 1 ? ORD[i] + ' 칸 ' : ''}${c.length}개`).join(', ') + '예요.';
  }
  const cho = choOf(q.answer).replace(/\s+/g, '').charAt(0);
  return `정답은 ${q.answer.replace(/\s+/g, '').length}글자예요. 첫 글자는 ${/[ㄱ-ㅎ]/.test(cho) ? '자음 「' + cho + '」으로 시작해요.' : '「' + cho + '」이에요.'}`;
}
function showHint(q) { const h = $('#quizHint'); h.hidden = false; h.textContent = '힌트: ' + hintTextFor(q); }
// ---- 답하기 ----
function recordAnswer(q, correct) {
  const s = quizState;
  s.done++; s.answered = true;
  if (correct) { s.score++; dropWrong(q); } else { if (s.mode === 'challenge') s.lives--; s.wrong.push(q); addWrong(q); }
  saveRun();
}
function feedbackMsgHtml(correct, q) {
  if (correct) return '정답이에요! 잘하셨어요.';
  if (q.clueType === 'build') return `아쉬워요. 「${esc(q.answer)}」의 점 모양은 아래 설명을 확인해 보세요.`;
  if (q.clueType === 'pickvideo') return `아쉬워요. 「${esc(q.answer)}」 수어는 「정답」이라고 표시된 영상이에요.`;
  return `아쉬워요. 정답은 「${esc(q.answer)}」예요.`;
}
function showFeedback(q, correct, explainHtml) {
  const s = quizState;
  const last = s.i + 1 >= s.qs.length || (s.mode === 'challenge' && s.lives <= 0);
  const lifeNote = s.mode === 'challenge' && !correct ? `<p class="qx" style="margin-top:8px">남은 목숨 ${Math.max(s.lives, 0)}개</p>` : '';
  const f = $('#quizFeedback');
  f.innerHTML = `<div class="qfeedback ${correct ? 'ok' : 'bad'}">${feedbackMsgHtml(correct, q)}</div>${lifeNote}${explainHtml}<button class="btn primary block" id="quizNext" type="button" style="margin-top:12px">${last ? '결과 보기' : '다음 문제로'} →</button>`;
  const h = $('#hintCut'); if (h) h.disabled = true; const h2 = $('#hintText'); if (h2) h2.disabled = true;
  if (s.mode === 'challenge' && !correct) { const lv = $('.lives'); if (lv) { lv.innerHTML = livesHtml(s.lives); lv.setAttribute('aria-label', '남은 목숨 ' + s.lives + '개'); } }
  f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
// 영상 고르기 문제는 답한 뒤 각 영상이 어느 단어인지 이름표를 붙이고, 정답·내 선택을 글자로도 알려 준다(색만으로 알리지 않는다)
function revealClips(q, chosenBtn) {
  $$('.vopt', $('#quizOpts')).forEach((b, i) => {
    const c = q.clips[i], right = String(c.id) === String(q.id), mine = b === chosenBtn && !right;
    b.insertAdjacentHTML('beforeend', `<span class="vname">${esc(c.name)}</span>${right ? '<span class="vtag">정답</span>' : mine ? '<span class="vtag bad">내 선택</span>' : ''}`);
    b.setAttribute('aria-label', `영상 ${i + 1}번: ${c.name}${right ? ' (정답)' : mine ? ' (내 선택)' : ''}`);
  });
}
function answerChoice(btn, q) {
  if (quizState.answered) return;
  const chosen = btn.dataset.opt, correct = isRightOpt(q, chosen);
  $$('[data-opt]', $('#quizOpts')).forEach(b => { b.disabled = true; if (isRightOpt(q, b.dataset.opt)) b.classList.add('correct'); else if (b === btn) b.classList.add('wrong'); });
  if (q.clueType === 'pickvideo') revealClips(q, btn);
  recordAnswer(q, correct);
  showFeedback(q, correct, q.clueType === 'dots' ? brailleExplainHtml(q, chosen, correct) : signExplainHtml(q));
}
function answerBuild(q) {
  const entered = $$('.bcell', $('#buildCells')).map(c => $$('.dot.on', c).map(b => Number(b.dataset.bdot)).sort((a, b) => a - b));
  const correct = entered.length === q.clue.length && entered.every((c, i) => c.join() === q.clue[i].slice().sort((a, b) => a - b).join());
  $$('.dot', $('#buildCells')).forEach(b => { b.disabled = true; });
  $('#buildCheck').hidden = true;
  recordAnswer(q, correct);
  showFeedback(q, correct, buildExplainHtml(q, entered, correct));
}
// ---- 정답 해설 ----
// 한 칸 글자는 자리에 따라 여러 가지로 읽히므로(예: ㄴ 첫소리 = 나 약자 = 수표 뒤 숫자 3), 그 목록을 해설에 덧붙인다
// 해설의 연습 버튼: 연습 패드는 두 칸까지라, 정답이 세 칸 이상이면 글자 바꾸기(변환기)로 보낸다
function practiceBtnHtml(q) {
  return q.clue.length <= 2
    ? '<button class="btn ghost" id="quizPad" type="button">연습 패드에서 눌러 보기</button>'
    : '<button class="btn ghost" id="quizConv" type="button">글자 바꾸기에서 보기</button>';
}
// 변환기에 넣을 글자: 낱말·숫자는 정답 그대로, 부호처럼 「이름(기호)」 모양이면 괄호 안의 기호
function convTextOf(q) {
  if (q.bk !== 'p') return q.answer;
  const i = q.answer.indexOf('(');
  return i > 0 && q.answer.endsWith(')') ? q.answer.slice(i + 1, -1) : q.answer;
}
function readingsNote(q) {
  if (q.bk !== 'p' || q.clue.length !== 1) return '';
  const rs = READINGS[q.clue[0].join('-')] || [];
  return rs.length > 1 ? `<p class="qx">같은 점 모양이 글자 안의 자리에 따라 이렇게도 읽혀요: ${esc(rs.map(r => r.label + '(' + r.kind + ')').join(', '))}.</p>` : '';
}
function brailleExplainHtml(q, chosen, correct) {
  let html = `<p class="qx">정답 「${esc(q.answer)}」: ${esc(cellsDescription(q.clue))}.</p>`;
  let cmp = `<div><span class="qcl">정답 ${esc(q.answer)}</span>${clueCellsHtml(q.clue)}</div>`;
  if (!correct) {
    const got = q.optCells && q.optCells[chosen];
    if (got) {
      html += `<p class="qx">고른 「${esc(chosen)}」: ${esc(cellsDescription(got))}.</p>`;
      const d = dotsDiffText(q.clue, got);
      if (d) html += `<p class="qx">차이: ${esc(d)}.</p>`;
      cmp += `<div><span class="qcl">내가 고른 ${esc(chosen)}</span>${clueCellsHtml(got)}</div>`;
    }
  }
  return `<div class="qexplain">${html}${readingsNote(q)}<div class="qcompare" aria-hidden="true">${cmp}</div><div class="qexbtns">${practiceBtnHtml(q)}</div></div>`;
}
function buildExplainHtml(q, entered, correct) {
  let html = `<p class="qx">정답 「${esc(q.answer)}」: ${esc(cellsDescription(q.clue))}.</p>`;
  let cmp = `<div><span class="qcl">정답</span>${clueCellsHtml(q.clue)}</div>`;
  if (!correct) {
    html += `<p class="qx">내가 쓴 것: ${esc(cellsDescription(entered))}.</p>`;
    const d = dotsDiffText(q.clue, entered, '내가 쓴 것'); if (d) html += `<p class="qx">차이: ${esc(d)}.</p>`;
    cmp += `<div><span class="qcl">내가 쓴 것</span>${clueCellsHtml(entered)}</div>`;
  }
  return `<div class="qexplain">${html}${readingsNote(q)}<div class="qcompare" aria-hidden="true">${cmp}</div><div class="qexbtns">${practiceBtnHtml(q)}</div></div>`;
}
function signMeaning(w) {
  if (w.x && w.g) { const s = w.g.split(' / ').slice(0, 2).join(' · '); return s.length > 70 ? s.slice(0, 70) + '…' : s; }
  return w.al ? '같은 수어: ' + w.al : '';
}
function signExplainHtml(q) {
  const w = WORD_BY_ID.get(String(q.id)); if (!w) return '';
  let meaning = signMeaning(w); if (meaning === w.w) meaning = '';
  const motion = descOf(w);
  let html = `<p class="qx"><b>${esc(w.w)}</b>${meaning ? ' — ' + esc(meaning) : ''}</p>`;
  if (q.clueType === 'pickvideo') html += `<p class="qx">보기 영상: ${q.clips.map((c, i) => `${i + 1}번 ${esc(c.name)}`).join(' · ')}</p>`;
  if (motion) html += `<p class="qx">동작 설명: ${esc(motion)}</p>${officialNoteHtml(w)}`;
  const btns = (q.clueType === 'video' ? '<button class="btn ghost" id="quizReplay" type="button">영상 다시 재생</button>' : '') + '<button class="btn ghost" id="quizRelearn" type="button">사전에서 다시 보기</button>';
  return `<div class="qexplain">${html}<div class="qexbtns">${btns}</div></div>`;
}
// ---- 결과 ----
function renderQuizResult() {
  const s = quizState; quizState.active = false; store.del('quizrun');
  if (s.done > 0) { if (s.kind === 'sign' || s.kind === 'fav') markDid('quiz-sign'); else if (s.kind === 'braille' || s.kind === 'build') markDid('quiz-braille'); }
  const total = s.qs.length, pct = s.done ? Math.round(s.score / s.done * 100) : 0, wrongN = s.wrong.length;
  const why = s.ended ? `중간에 끝냈어요 (${total}문제 중 ${s.done}문제 풀이)` : (s.mode === 'challenge' && s.lives <= 0 ? `목숨을 모두 썼어요 (${total}문제 중 ${s.done}문제 풀이)` : '');
  const msg = !s.done ? '푼 문제가 없어요. 다시 시작해 볼까요?' : pct >= 80 ? '정말 잘했어요! 다음에도 도전해 보세요.' : pct >= 50 ? '좋아요! 조금만 더 연습하면 돼요.' : '틀린 문제를 다시 풀면서 익혀 보세요.';
  const wrongList = wrongN ? `<p class="note" style="margin:10px 0;text-align:left">틀린 문제: ${s.wrong.map(q => esc(q.answer)).join(' · ')}<br>틀린 문제는 퀴즈 첫 화면의 「틀린 문제 복습」에 저장돼요.</p>` : '';
  const study = s.kind === 'braille' || s.kind === 'build' ? ['braille', '점자 표 보기'] : ['sign', '수어 사전 보기'];
  const scopeTxt = (s.kind === 'braille' || s.kind === 'build') ? ' · ' + scopeLabel(s.scope) : '';
  // 점수에 맞춰 난이도를 바꿔 볼 것을 권한다(끝까지 푼 퀴즈만)
  const full = s.done === total && s.done > 0;
  const canTune = full && s.kind !== 'review';
  const up = canTune && pct >= 90 && s.lv < 3, down = canTune && pct < 50 && s.lv > 1;
  const lvBtn = up ? `<button class="btn line block" id="quizLvUp" type="button">난이도를 ${toLevel(s.lv + 1)} 올려서 풀기</button>` : down ? `<button class="btn line block" id="quizLvDown" type="button">난이도를 ${toLevel(s.lv - 1)} 낮춰서 풀기</button>` : '';
  $('#quizArea').innerHTML = `<div class="card qresult">
    <div class="qbadge${s.mode === 'challenge' ? ' chal' : ''}">${esc(QKINDS[s.kind])} · ${s.mode === 'challenge' ? '도전' : '연습'} · ${lvText(s)}${esc(scopeTxt)}</div>
    <div class="score" role="status" tabindex="-1">${s.score} / ${s.done}</div>
    <p class="note" style="margin:14px 0">${esc(why ? why + '. ' : '')}${esc(msg)}</p>${wrongList}
    <div style="display:flex;flex-direction:column;gap:10px">
      ${wrongN ? `<button class="btn primary block" id="quizRetryWrong" type="button">틀린 문제 ${wrongN}개 다시 풀기</button>` : ''}
      ${lvBtn}
      <button class="btn ${wrongN ? 'ghost' : 'primary'} block" id="quizRetry" type="button">같은 퀴즈 새로 풀기</button>
      <button class="btn ghost block" id="quizToStudy" type="button">${study[1]}</button>
      <button class="btn line block" id="quizToHub" type="button">퀴즈 첫 화면으로</button>
    </div></div>`;
  const again = () => { if (s.kind === 'review' || s.kind === 'fav') startQuizFromAnywhere(s.kind); else startQuiz(s.kind); };
  $('#quizRetry').addEventListener('click', again);
  $('#quizToStudy').addEventListener('click', () => { if (study[0] === 'braille') { go('braille'); showBraillePanel('table'); } else go('sign'); });
  $('#quizToHub').addEventListener('click', renderQuizHub);
  const lu = $('#quizLvUp'), ld = $('#quizLvDown');
  if (lu) lu.addEventListener('click', () => { store.set('qlevel', s.lv + 1); toast('난이도를 ' + toLevel(s.lv + 1) + ' 바꿨어요'); again(); });
  if (ld) ld.addEventListener('click', () => { store.set('qlevel', s.lv - 1); toast('난이도를 ' + toLevel(s.lv - 1) + ' 바꿨어요'); again(); });
  const rw = $('#quizRetryWrong'); if (rw) rw.addEventListener('click', () => startQuizWith(s.kind, s.wrong.map(q => QZ.restore(QZ.compact(q, true))).filter(Boolean), s.mode));
  const sc = $('.score', $('#quizArea')); if (sc) sc.focus({ preventScroll: true });
}
