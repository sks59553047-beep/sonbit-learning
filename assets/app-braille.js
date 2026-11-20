// 손빛 배움터 — 점자: 화면 전환, 연습 패드(한 칸·두 칸), 글자 → 점자 변환기, 점자 표
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
// ================= 점자 =================
const T = KB.tables;
const SYL1 = { 'ㄱ': '가', 'ㄴ': '나', 'ㄷ': '다', 'ㅁ': '마', 'ㅂ': '바', 'ㅅ': '사', 'ㅈ': '자', 'ㅋ': '카', 'ㅌ': '타', 'ㅍ': '파', 'ㅎ': '하' };
const SYL2 = { 'ㅓㄱ': '억', 'ㅓㄴ': '언', 'ㅓㄹ': '얼', 'ㅕㄴ': '연', 'ㅕㄹ': '열', 'ㅕㅇ': '영', 'ㅗㄱ': '옥', 'ㅗㄴ': '온', 'ㅗㅇ': '옹', 'ㅜㄴ': '운', 'ㅜㄹ': '울', 'ㅡㄴ': '은', 'ㅡㄹ': '을', 'ㅣㄴ': '인' };
const PUNCT_NAME = { '.': '마침표', '?': '물음표', '!': '느낌표', ',': '쉼표', '·': '가운뎃점', ':': '쌍점', '/': '빗금', '…': '줄임표', '“': '여는 큰따옴표', '”': '닫는 큰따옴표', '‘': '여는 작은따옴표', '’': '닫는 작은따옴표', '(': '여는 소괄호', ')': '닫는 소괄호', '{': '여는 중괄호', '}': '닫는 중괄호', '[': '여는 대괄호', ']': '닫는 대괄호', '『': '여는 겹낫표', '』': '닫는 겹낫표', '「': '여는 낫표', '」': '닫는 낫표', '《': '여는 겹화살괄호', '》': '닫는 겹화살괄호', '〈': '여는 홑화살괄호', '〉': '닫는 홑화살괄호', '―': '줄표', '-': '붙임표', '~': '물결표' };
const cellKey = c => c.join('-');
function dotsLabel(dots) { return dots && dots.length ? dots.slice().sort((a, b) => a - b).join('·') + '번 점' : '점이 없는 빈칸'; }
function dotsToUnicode(dots) { let v = 0; dots.forEach(n => { v |= 1 << (n - 1); }); return String.fromCharCode(0x2800 + v); }
// 점자 한 칸 그림. 화면낭독기에는 점 번호를 읽어 주고, 옆에 글이 이미 있는 곳(가이드 카드 등)은 decorative=true 로 숨긴다
function miniDots(dots, decorative) {
  const a = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${dotsLabel(dots)}"`;
  return `<div class="mini" ${a}>${[1, 2, 3, 4, 5, 6].map(n => `<i class="${dots.includes(n) ? 'on' : ''}"></i>`).join('')}</div>`;
}
// ---- 한 칸이 글자 안에서 어떻게 읽히는지(읽는 자리별) ----
const READINGS = (() => {
  const map = {};
  const add = (brf, label, kind) => { const cs = KB.brfCells(brf); if (cs.length !== 1) return; (map[cellKey(cs[0])] = map[cellKey(cs[0])] || []).push({ label, kind }); };
  for (const [ch, b] of Object.entries(T.CHO)) if (b) add(b, ch, '첫소리');
  for (const [ch, b] of Object.entries(T.JUNG)) add(b, ch, '모음');
  for (const [ch, b] of Object.entries(T.JONG)) add(b, ch + ' 받침', '받침');
  for (const [k, b] of Object.entries(T.ABBR1)) add(b, SYL1[k], '약자');
  for (const [k, b] of Object.entries(T.ABBR2)) add(b, SYL2[k], '약자');
  for (const [d, dots] of Object.entries(BRAILLE_NUMBERS)) (map[dots] = map[dots] || []).push({ label: d, kind: '숫자(수표 뒤)' });
  (map[BRAILLE_NUMBER_SIGN] = map[BRAILLE_NUMBER_SIGN] || []).push({ label: '수표', kind: '수표' });
  for (const [ch, b] of Object.entries(T.PUNCT)) if (PUNCT_NAME[ch]) add(b, PUNCT_NAME[ch] + ' ' + ch, '문장부호');
  return map;
})();
const READ_ORDER = ['첫소리', '모음', '받침', '약자', '숫자(수표 뒤)', '수표', '문장부호'];
// ---- 화면 전환(변환기·연습 패드·점자 표) ----
const BPANELS = ['convert', 'pad', 'table', 'learn', 'life'];
function showBraillePanel(name, byUser) {
  if (!BPANELS.includes(name)) name = 'convert';
  BPANELS.forEach(n => { $('#bp-' + n).hidden = n !== name; });
  $$('[data-bpanel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bpanel === name)));
  store.set('bpanel', name);
  if (name === 'table') { renderTable(tableGroup); if (byUser) markDid('braille'); }
  if (name === 'learn') renderLearnPanel();
  if (name === 'life') renderLifePanel();
}
$('#bpSeg').addEventListener('click', e => { const b = e.target.closest('[data-bpanel]'); if (b) showBraillePanel(b.dataset.bpanel, true); });
// ---- 생활 속 점자(2026-11-21): 카드마다 어디에·무엇이(예시 글자의 점자)·설명·근거 ----
function renderLifePanel() {
  const host = $('#lifeList'); if (host.dataset.done) return;
  const kindTag = k => `<span class="tag ${k === 'law' ? '' : k === 'guide' ? 'amber' : 'gray'}">${LIFE_KIND[k]}</span>`;
  // 예시 글자: 문자열이면 규정대로 만든 예시, { w, real } 이면 실물 사진에서 점을 읽어 같다고 확인한 글자(「실물 확인」 표시)
  const wordBtn = x => {
    const w = typeof x === 'string' ? x : x.w, real = typeof x === 'string' ? '' : x.real;
    const cells = KB.convert(w, { contract: true }).cells.filter(c => c.kind !== '줄바꿈' && !c.unsupported);
    return `<button type="button" class="lifeword${real ? ' real' : ''}" data-lifeword="${esc(w)}" aria-label="${esc(w)}, 점자 ${cells.length}칸${real ? ', 실제 제품 사진과 같음을 확인' : ''}. 글자 바꾸기에서 보기"><span class="lw">${esc(w)}${real ? '<span class="lreal">실물 확인</span>' : ''}</span><span class="lcells">${cells.map(c => miniDots(c.dots, true)).join('')}</span></button>`;
  };
  const srcOf = it => it.src.concat([...new Set(it.words.map(x => typeof x === 'string' ? '' : x.real).filter(Boolean))].map(k => REAL[k]));
  host.innerHTML = LIFE_BRAILLE.map(it => `<article class="card lifecard">
      <div class="lifehead"><h3>${esc(it.place)}</h3>${kindTag(it.kind)}</div>
      ${it.words.length ? `<div class="lifewords">${it.words.map(wordBtn).join('')}</div>` : ''}
      <p class="lifesay">${esc(it.say)}</p>
      <p class="lifesrc">근거: ${srcOf(it).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>
    </article>`).join('');
  host.dataset.done = '1';
}
// 예시 글자를 누르면 「글자 바꾸기」에 넣어 점을 하나하나 보여 준다
$('#lifeList').addEventListener('click', e => {
  const b = e.target.closest('[data-lifeword]'); if (!b) return;
  $('#bpInput').value = b.dataset.lifeword; $('#bpContract').checked = true; renderBraillePanel();
  showBraillePanel('convert', true);
  $('#bpResult').scrollIntoView({ block: 'start' }); window.scrollBy(0, -80);
  markDid('braille');
});
// ---- 연습 패드(처음엔 한 칸, 「칸 추가」를 누르면 두 칸) ----
let padDots = new Set(), padDots2 = new Set(), padTwo = false;
const sortedDots = s => Array.from(s).sort((a, b) => a - b);
function dotBtns(set, cellNo) {
  const pre = padTwo ? (cellNo === 2 ? '둘째 칸 ' : '첫째 칸 ') : '';
  return [1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="dot ${set.has(n) ? 'on' : ''}" data-dot="${n}" data-cell="${cellNo}" aria-pressed="${set.has(n)}" aria-label="${pre}${n}번 점">${n}</button>`).join('');
}
function renderPadCell() { $('#padCell').innerHTML = dotBtns(padDots, 1); $('#padCell2').innerHTML = dotBtns(padDots2, 2); }
function syncPadCell() {
  [['#padCell', padDots], ['#padCell2', padDots2]].forEach(([sel, set]) => $$('[data-dot]', $(sel)).forEach(b => { const on = set.has(Number(b.dataset.dot)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }));
}
function setPadTwo(on) {
  padTwo = on; if (!on) padDots2.clear();
  $('#padCol2').hidden = !on; $('.padlbl', $('#padCells')).hidden = !on; $('#padCells').classList.toggle('two', on);
  $('#padTwo').setAttribute('aria-pressed', String(on)); $('#padTwo').textContent = on ? '한 칸으로' : '칸 추가(두 칸으로)';
  renderPadCell(); renderPadResult();
}
const oneReadings = dots => (READINGS[dots.join('-')] || []).slice().sort((a, b) => READ_ORDER.indexOf(a.kind) - READ_ORDER.indexOf(b.kind));
// 두 칸 읽기 표: 손으로 정하지 않고, 규정 표(된소리·두 칸 모음·쌍받침·겹받침·약어·문장부호)와
// 점자 엔진으로 바꾼 결과(수표+숫자, 가~힣 11,172자 중 두 칸이 되는 글자)로 만든다. 처음 쓸 때 한 번만 만든다(0.1초 안쪽).
let TWO_READ = null;
function twoReadings() {
  if (TWO_READ) return TWO_READ;
  const map = {}, key = cs => cs.map(cellKey).join('|');
  const conv = (s, contract) => KB.convert(s, { contract }).cells.filter(c => c.kind !== '띄어쓰기' && c.kind !== '줄바꿈').map(c => c.dots);
  const add = (cs, label, kind) => { if (cs.length !== 2) return; const l = (map[key(cs)] = map[key(cs)] || []); if (!l.some(x => x.label === label)) l.push({ label, kind }); };
  for (const [ch, b] of Object.entries(T.CHO)) if (b) add(KB.brfCells(b), ch, '된소리 첫소리');
  for (const [ch, b] of Object.entries(T.JUNG)) if (b) add(KB.brfCells(b), ch, '모음(두 칸)');
  for (const [ch, b] of Object.entries(T.JONG)) if (b) add(KB.brfCells(b), ch + ' 받침', ch === 'ㄲ' ? '쌍받침' : '겹받침');
  for (const [w, b] of Object.entries(T.ABBR_WORDS)) add(KB.brfCells(b), w, '약어');
  for (const [ch, b] of Object.entries(T.PUNCT)) if (PUNCT_NAME[ch]) add(KB.brfCells(b), PUNCT_NAME[ch] + ' ' + ch, '문장부호');
  for (let d = 0; d <= 9; d++) add(conv(String(d), false), '숫자 ' + d, '숫자(수표+숫자)');
  for (let c = 0xAC00; c <= 0xD7A3; c++) {
    const s = String.fromCharCode(c), a = conv(s, true);
    if (a.length === 2) add(a, s, key(a) === key(conv(s, false)) ? '글자' : '글자(약자 사용)');
  }
  return (TWO_READ = map);
}
const readList = rs => rs.map(r => `<li><b>${esc(r.label)}</b> — ${esc(r.kind)}</li>`).join('');
const readInline = rs => rs.length ? rs.map(r => `${r.label}(${r.kind})`).join(', ') : '한 칸으로 읽는 글자 없음';
function renderPadResult() {
  const d1 = sortedDots(padDots), d2 = sortedDots(padDots2);
  if (padTwo && d2.length) {
    if (!d1.length) { $('#padResultChar').textContent = '첫째 칸부터 눌러 주세요'; $('#padResultKind').textContent = ''; $('#padReadings').innerHTML = ''; return; }
    $('#padResultChar').textContent = `${d1.join('·')} | ${d2.join('·')}번 점`;
    $('#padResultKind').textContent = '점자 문자 ' + dotsToUnicode(d1) + dotsToUnicode(d2);
    const both = twoReadings()[d1.join('-') + '|' + d2.join('-')] || [];
    $('#padReadings').innerHTML = (both.length ? `<p>두 칸을 함께 읽으면 이렇게 읽혀요.</p><ul>${readList(both)}</ul>` : '<p>두 칸이 한 덩어리로 읽히는 글자·부호는 없어요.</p>')
      + `<p style="margin-top:8px">칸마다 따로 읽으면</p><ul><li>첫째 칸: ${esc(readInline(oneReadings(d1)))}</li><li>둘째 칸: ${esc(readInline(oneReadings(d2)))}</li></ul>`;
    return;
  }
  if (!d1.length) { $('#padResultChar').textContent = '점을 눌러 보세요'; $('#padResultKind').textContent = ''; $('#padReadings').innerHTML = ''; return; }
  $('#padResultChar').textContent = d1.join('·') + '번 점';
  $('#padResultKind').textContent = '점자 문자 ' + dotsToUnicode(d1);
  const rs = oneReadings(d1);
  $('#padReadings').innerHTML = (rs.length
    ? `<p>${rs.length > 1 ? '같은 모양이 글자 안의 자리에 따라 이렇게 읽혀요.' : '이렇게 읽혀요.'}</p><ul>${readList(rs)}</ul>`
    : '<p>한 칸으로 읽는 글자가 아직 없는 모양이에요.</p>') + (padTwo ? '<p style="margin-top:8px">둘째 칸도 누르면 두 칸을 함께 읽어 줘요.</p>' : '');
}
$('#padCells').addEventListener('click', e => {
  const b = e.target.closest('[data-dot]'); if (!b) return;
  const set = b.dataset.cell === '2' ? padDots2 : padDots, n = Number(b.dataset.dot);
  set.has(n) ? set.delete(n) : set.add(n);
  syncPadCell(); renderPadResult(); markDid('braille');
});
$('#padTwo').addEventListener('click', () => setPadTwo(!padTwo));
$('#padReset').addEventListener('click', () => { padDots.clear(); padDots2.clear(); syncPadCell(); renderPadResult(); });
// ---- 글자 → 점자 변환기 ----
function renderBraillePanel() {
  const BP_MAX = 200;   // 한 번에 바꾸는 글자 수(입력 칸도 이만큼만 받는다)
  const text = $('#bpInput').value.slice(0, BP_MAX), full = $('#bpInput').value.length >= BP_MAX;
  const contract = $('#bpContract').checked;
  const r = KB.convert(text, { contract });
  const cells = r.cells.filter(c => c.kind !== '줄바꿈');
  // 칸 수에는 바꾸지 못한 글자 자리(점선 칸)를 넣지 않고, 띄어쓰기 칸은 따로 밝힌다
  const real = cells.filter(c => !c.unsupported), spaces = real.filter(c => c.kind === '띄어쓰기').length, bad = r.unsupported.length;
  $('#bpSummary').textContent = text ? `점자 ${real.length}칸${spaces ? `(띄어쓰기 ${spaces}칸 포함)` : ''}으로 바뀌었어요${bad ? ` · 바꾸지 못한 글자 ${bad}개` : ''}${full ? ` · 한 번에 ${BP_MAX}자까지만 바꿀 수 있어요` : ''}` : '글자를 입력하면 여기에 몇 칸인지 나와요';
  const warn = r.warnings.slice();
  if (r.unsupported.length) {
    // 영어: 대문자 약어(KTX·TV 등)만 바꾼다(2026-11-21). 소문자가 섞인 단어는 통일영어점자 약자 규칙이 많아 아직 바꾸지 않는다
    const en = r.unsupported.some(c => /[A-Za-z]/.test(c)), other = r.unsupported.some(c => !/[A-Za-z]/.test(c));
    const why = [en ? '영어는 KTX·TV 같은 대문자 약어만 바꿔요. 소문자가 섞인 영어 단어나 OPEN·STOP처럼 영어 약자가 들어갈 수 있는 낱말, 세 단어 넘게 이어진 대문자는 통일영어점자의 약자 규칙이 많아 아직 바꾸지 않아요.' : '',
      other ? '그리스 문자·수식 기호·옛 글자 등은 규정이 따로 있어 지원하지 않아요.' : ''].filter(Boolean).join(' ');
    warn.unshift(`바꿔 주지 않는 글자가 있어요: ${[...new Set(r.unsupported)].join(' ')} (${why} 점선 칸으로 표시했어요.)`);
  }
  $('#bpWarn').hidden = !warn.length; $('#bpWarn').textContent = warn.join(' ');
  $('#bpCells').innerHTML = cells.map(c => {
    const label = c.kind === '띄어쓰기' ? '␣' : (c.text || '');
    const tip = c.kind + (c.rule ? ' · ' + c.rule : '');
    return `<div class="ccell ${c.unsupported ? 'unverified' : ''}" title="${esc(tip)}">${miniDots(c.dots)}<label>${esc(label)}</label><small>${esc(c.kind === '띄어쓰기' || c.unsupported ? c.kind : kindPlain(c.kind))}</small></div>`;
  }).join('');
  // 칸 아래 이름(첫소리·모음·약자…)이 무슨 뜻인지, 이번 결과에 나온 것만 한 줄로 풀어 준다(2026-11-20 실사용 평가: 「초성·중성」이 어렵다)
  const used = [...new Set(cells.filter(c => !c.unsupported).map(c => kindPlain(c.kind)))].filter(k => KIND_HELP[k]);
  $('#bpLegend').hidden = !used.length; $('#bpLegend').textContent = used.map(k => `${k}: ${KIND_HELP[k]}`).join(' · ');
  const uni = cells.map(c => (c.kind === '띄어쓰기' ? ' ' : (c.unsupported ? '?' : dotsToUnicode(c.dots)))).join('');
  $('#bpOutWrap').hidden = !text; $('#bpOut').textContent = uni; $('#bpOutNote').hidden = !bad;
  $('#bpCopyTop').hidden = !text;
  if (text) markDid('braille');
}
// 점자 칸 아래 이름: 규정 용어(초성·중성) 대신 쉬운 말로. 칸에 마우스를 올리면(title) 규정 용어와 조항이 그대로 나온다
const KIND_WORD = { '초성': '첫소리', '중성': '모음', '종성': '받침', '단독 자모': '낱자', '로마자 종료표': '로마자 끝', '대문자 단어표': '대문자들', '1급 점자표': '그대로표' };
function kindPlain(k) { const b = String(k).replace(/\(.*\)/, ''); return KIND_WORD[b] || b; }
const KIND_HELP = {
  '첫소리': '글자 맨 앞 자음(초성)', '모음': 'ㅏ·ㅓ 같은 가운데 소리(중성)', '받침': '글자 아래 자음(종성)',
  '약자': '자주 쓰는 글자를 줄여 쓴 것(대부분 한 칸, 것·성·정·청은 두 칸)', '약어': '「그래서」 같은 낱말을 두 칸으로 줄여 쓴 것',
  '된소리표': 'ㄲ·ㄸ처럼 된소리 앞에 붙이는 칸', '로마자표': '여기부터 영어(로마자)', '로마자 끝': '영어가 끝났다는 표시', '로마자': '영어 알파벳(통일영어점자)', '대문자표': '다음 한 글자가 대문자', '대문자들': '이어지는 글자가 모두 대문자', '그대로표': '영어 줄임말이 아니라 글자 그대로 읽으라는 표시(1급 점자표)', '붙임표': '영어와 숫자를 잇는 -', '수표': '여기부터 숫자라는 표시', '자릿점': '숫자 사이 쉼표', '소수점': '숫자 사이 마침표', '낱자': '글자 없이 따로 쓴 자음·모음'
};
$('#bpInput').addEventListener('input', renderBraillePanel);
$('#bpContract').addEventListener('change', renderBraillePanel);
const BP_EXAMPLES = ['그래서 가나다', '성정청 억울한 것', '2025년 3월 1일', '안녕하세요.', 'KTX, 새마을호'];   // 마지막은 규정 제33항 예시(영어 대문자 약어)
$('#bpExamples').innerHTML = BP_EXAMPLES.map(t => `<button class="chip" type="button" data-ex="${esc(t)}">${esc(t)}</button>`).join('');
$('#bpExamples').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (!b) return; $('#bpInput').value = b.dataset.ex; renderBraillePanel(); });
// 복사 단추는 둘: 결과 맨 아래(점자 문자 옆)와 칸 수 안내 옆(2026-11-21 실사용 평가: 긴 글은 아래 단추가 화면 몇 쪽 아래에 있음)
function copyBraille(btn, label) {
  const t = $('#bpOut').textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { btn.textContent = '복사했어요'; setTimeout(() => { btn.textContent = label; }, 1500); })
    .catch(() => {
      const r = document.createRange(); r.selectNodeContents($('#bpOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = '선택됐어요 — 직접 복사하세요';
      if (btn.id === 'bpCopyTop') $('#bpOut').scrollIntoView({ block: 'center' });   // 골라 둔 점자 글이 보이게
    });
}
$('#bpCopy').addEventListener('click', () => copyBraille($('#bpCopy'), '복사'));
$('#bpCopyTop').addEventListener('click', () => copyBraille($('#bpCopyTop'), '점자 복사'));
// ---- 점자 표(규정 표를 엔진과 같은 표에서 만든다) ----
const TABLE_GROUPS = ['첫소리', '모음', '받침', '숫자', '약자·약어', '문장부호'];
let tableGroup = store.get('tgroup', '첫소리'); if (!TABLE_GROUPS.includes(tableGroup)) tableGroup = '첫소리';
function guideCardHtml(label, cells, sub) {
  const nums = cells.map(c => (c.length ? c.join('·') : '빈칸')).join(' + ');
  return `<div class="guide-card${cells.length > 1 ? ' wide' : ''}"><div class="ch">${esc(label)}</div><div class="cc">${cells.map(c => miniDots(c, true)).join('')}</div><div class="dn">${esc(nums)}번${sub ? ' · ' + esc(sub) : ''}</div></div>`;
}
function guideGrid(items, multi) { return `<div class="guide-grid${multi ? ' multi' : ''}">${items.join('')}</div>`; }
function subHead(title, tag, note) { return `<div class="sub-h"><h2>${esc(title)}</h2>${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</div>${note ? `<p class="note" style="margin:8px 0">${note}</p>` : ''}`; }
function convCells(text) { return KB.convert(text, { contract: true }).cells.filter(c => c.kind !== '띄어쓰기' && c.kind !== '줄바꿈').map(c => c.dots); }
function tableHtml(g) {
  const brf = b => KB.brfCells(b);
  if (g === '첫소리') {
    const main = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'], dbl = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];
    return subHead('기본 첫소리', '13개', '첫소리 ㅇ은 점자로 쓰지 않고 모음만 써요.') + guideGrid(main.map(ch => guideCardHtml(ch, brf(T.CHO[ch]))))
      + subHead('된소리(쌍자음)', '5개', '6번 점(된소리표)을 먼저 쓰고, 뒤에 예사소리를 이어 써요.') + guideGrid(dbl.map(ch => guideCardHtml(ch, brf(T.CHO[ch]))), true);
  }
  if (g === '모음') {
    const base = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'], one = ['ㅐ', 'ㅔ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅢ'], two = ['ㅒ', 'ㅙ', 'ㅞ', 'ㅟ'];
    return subHead('기본 모음', '10개') + guideGrid(base.map(ch => guideCardHtml(ch, brf(T.JUNG[ch]))))
      + subHead('겹모음', '7개') + guideGrid(one.map(ch => guideCardHtml(ch, brf(T.JUNG[ch]))))
      + subHead('두 칸으로 쓰는 겹모음', '4개', 'ㅒ ㅙ ㅞ ㅟ는 앞 모음 뒤에 ㅐ(1·2·3·5번)를 한 칸 더 붙여 두 칸으로 써요.') + guideGrid(two.map(ch => guideCardHtml(ch, brf(T.JUNG[ch]))), true);
  }
  if (g === '받침') {
    const main = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'], dbl = ['ㄲ', 'ㅆ'], multi = ['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ'];
    return subHead('기본 받침', '14개', '받침은 첫소리와 점 모양이 달라요. 같은 자음이라도 자리(첫소리·받침)에 따라 다른 점을 써요.') + guideGrid(main.map(ch => guideCardHtml(ch, brf(T.JONG[ch]))))
      + subHead('쌍받침', '2개') + guideGrid(dbl.map(ch => guideCardHtml(ch, brf(T.JONG[ch]))))
      + subHead('겹받침', '11개', '두 자음을 차례로 이어 써요.') + guideGrid(multi.map(ch => guideCardHtml(ch, brf(T.JONG[ch]))), true);
  }
  if (g === '숫자') {
    const sign = guideCardHtml('수표', [BRAILLE_NUMBER_SIGN.split('-').map(Number)]);
    const digits = Object.keys(BRAILLE_NUMBERS).sort().map(ch => guideCardHtml(ch, [BRAILLE_NUMBERS[ch].split('-').map(Number)]));
    return subHead('수표와 숫자', '0~9', '숫자 앞에는 수표(3·4·5·6번 점)를 한 번 써요. 그 뒤에 아래 모양의 숫자를 이어 써요. 예: 25 → 수표 + 2 + 5') + guideGrid([sign].concat(digits))
      + `<ul class="exlist" style="margin-top:12px"><li>숫자 사이의 쉼표와 자릿점은 2번 점, 소수점은 2·5·6번 점이에요. 예: 9,375 → 수표 9 (2번 점) 3 7 5</li><li>숫자 뒤에 ㄴ·ㄷ·ㅁ·ㅋ·ㅌ·ㅍ·ㅎ으로 시작하는 글자나 '운'이 오면 숫자와 한 칸을 띄어요. 예: 1년 → 수표 1, 빈칸, 년</li><li>「한국 점자 규정」 제40~44항을 따랐어요. 연산 기호(+ - × ÷)와 분수는 아직 지원하지 않아요.</li></ul>`;
  }
  if (g === '약자·약어') {
    const one = Object.keys(SYL1).map(k => SYL1[k]).concat(Object.values(SYL2));
    return subHead('약자 — 한 글자를 한 칸으로', '25개', '자주 나오는 글자를 줄여 쓴 거예요. 글자 앞뒤에 따라 쓰지 않는 경우(제14항 등)가 있어서, 정확한 적용은 「글자 바꾸기」가 알아서 해 줘요.')
      + guideGrid(one.map(ch => guideCardHtml(ch, convCells(ch))))
      + subHead('약자 — 두 칸으로 쓰는 것', '4개') + guideGrid(['것', '성', '정', '청'].map(ch => guideCardHtml(ch, convCells(ch))), true)
      + subHead('약어 — 낱말 전체를 줄인 것', '7개', '낱말 앞에 한글이 붙어 있지 않을 때만 써요.') + guideGrid(Object.keys(T.ABBR_WORDS).map(w => guideCardHtml(w, convCells(w))), true);
  }
  const keys = Object.keys(PUNCT_NAME).filter(ch => T.PUNCT[ch] !== undefined);
  return subHead('문장 부호', keys.length + '개', '「한국 점자 규정」 제49항의 부호예요. 쉼표(5번)는 첫소리 ㄹ과 점 모양이 같아서 앞뒤 글자를 보고 구분해요.')
    + guideGrid(keys.map(ch => guideCardHtml(ch, brf(T.PUNCT[ch]), PUNCT_NAME[ch])));
}
function renderTable(g) {
  tableGroup = g; store.set('tgroup', g);
  $('#tableChips').innerHTML = TABLE_GROUPS.map(x => `<button class="chip${x === g ? ' active' : ''}" type="button" data-tg="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join('');
  $('#tableBody').innerHTML = tableHtml(g);
}
$('#tableChips').addEventListener('click', e => { const b = e.target.closest('[data-tg]'); if (b) renderTable(b.dataset.tg); });
