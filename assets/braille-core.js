// 한글 점자 변환 엔진 v2 — 「한국 점자 규정」(문화체육관광부고시 제2024-0005호, 2024.3.1. 시행)을 조항 순서대로 구현.
// 모든 표는 규정 본문의 점자 표기(ASCII 점자)를 그대로 옮겨 적었고, 규정에 실린 예시 전체를 시험 문제로 검증한다(braille-tests/).
// 지원 범위: 제1장 자모(제1~12항), 제2장 약자·약어(제13~18항), 제4장 로마자 중 대문자 약어(제28~36항, 2026-11-21), 제5장 숫자(제40~44항), 제6장 문장 부호 일부(제49항).
// 지원하지 않는 글자(소문자가 섞인 영어 단어·그리스 문자·옛 글자·수식 기호 등)는 점자를 추측해서 만들지 않고 '지원 안 함'으로 표시한다.
(function (root) {
  'use strict';
  const UEB = typeof module !== 'undefined' && module.exports && typeof require === 'function' ? require('./ueb-g2.js') : root.UEB;   // 통일영어점자 2급(영어 약자)
  // ---- ASCII 점자(규정 본문 표기) ↔ 점 번호. 소문자 기호 { | } ~ 는 [ \ ] ^ 와 같은 점이다. ----
  const BRF_DOTS = {
    ' ': '', '!': '2346', '"': '5', '#': '3456', '$': '1246', '%': '146', '&': '12346', "'": '3', '(': '12356', ')': '23456', '*': '16', '+': '346', ',': '6', '-': '36', '.': '46', '/': '34',
    '0': '356', '1': '2', '2': '23', '3': '25', '4': '256', '5': '26', '6': '235', '7': '2356', '8': '236', '9': '35', ':': '156', ';': '56', '<': '126', '=': '123456', '>': '345', '?': '1456', '@': '4',
    'a': '1', 'b': '12', 'c': '14', 'd': '145', 'e': '15', 'f': '124', 'g': '1245', 'h': '125', 'i': '24', 'j': '245', 'k': '13', 'l': '123', 'm': '134', 'n': '1345', 'o': '135', 'p': '1234', 'q': '12345', 'r': '1235', 's': '234', 't': '2345', 'u': '136', 'v': '1236', 'w': '2456', 'x': '1346', 'y': '13456', 'z': '1356',
    '[': '246', '\\': '1256', ']': '12456', '^': '45', '_': '456', '`': '', '{': '246', '|': '1256', '}': '12456', '~': '45'
  };
  const brfCell = ch => { const d = BRF_DOTS[ch]; if (d === undefined) throw new Error('알 수 없는 점자 기호: ' + ch); return d.split('').map(Number); };
  const brfCells = s => [...s].map(brfCell);
  const key = cell => cell.join('');
  const DOTS_BRF = {}; // 점 → 대표 ASCII 문자(출력용)
  for (const ch of '@abcdefghijklmnopqrstuvwxyz[\\]^_ !"#$%&\'()*+,-./0123456789:;<=>?') { const k = BRF_DOTS[ch]; if (DOTS_BRF[k] === undefined) DOTS_BRF[k] = ch; }
  const toBrf = cells => cells.map(c => DOTS_BRF[key(c.dots || c)] || '?').join('');

  // ---- 제1~7항: 초성·중성·받침 ----
  const CHO = { 'ㄱ': '@', 'ㄴ': 'c', 'ㄷ': 'i', 'ㄹ': '"', 'ㅁ': 'e', 'ㅂ': '^', 'ㅅ': ',', 'ㅇ': '', 'ㅈ': '.', 'ㅊ': ';', 'ㅋ': 'f', 'ㅌ': 'h', 'ㅍ': 'd', 'ㅎ': 'j',
    'ㄲ': ',@', 'ㄸ': ',i', 'ㅃ': ',^', 'ㅆ': ',,', 'ㅉ': ',.' };
  const JUNG = { 'ㅏ': '<', 'ㅑ': '>', 'ㅓ': 's', 'ㅕ': ':', 'ㅗ': 'u', 'ㅛ': '+', 'ㅜ': 'm', 'ㅠ': '%', 'ㅡ': '{', 'ㅣ': 'o',
    'ㅐ': 'r', 'ㅒ': '>r', 'ㅔ': 'n', 'ㅖ': '/', 'ㅘ': 'v', 'ㅙ': 'vr', 'ㅚ': 'y', 'ㅝ': 'p', 'ㅞ': 'pr', 'ㅟ': 'mr', 'ㅢ': 'w' };
  const JONG = { 'ㄱ': 'a', 'ㄴ': '3', 'ㄷ': '9', 'ㄹ': '1', 'ㅁ': '5', 'ㅂ': 'b', 'ㅅ': "'", 'ㅇ': '7', 'ㅈ': 'k', 'ㅊ': '2', 'ㅋ': '6', 'ㅌ': '8', 'ㅍ': '4', 'ㅎ': '0',
    'ㄲ': 'aa', 'ㅆ': '/', 'ㄳ': "a'", 'ㄵ': '3k', 'ㄶ': '30', 'ㄺ': '1a', 'ㄻ': '15', 'ㄼ': '1b', 'ㄽ': "1'", 'ㄾ': '18', 'ㄿ': '14', 'ㅀ': '10', 'ㅄ': "b'" };
  // ---- 제13~17항 약자 ----
  const ABBR1 = { 'ㄱ': '$', 'ㄴ': 'c', 'ㄷ': 'i', 'ㅁ': 'e', 'ㅂ': '^', 'ㅅ': 'l', 'ㅈ': '.', 'ㅋ': 'f', 'ㅌ': 'h', 'ㅍ': 'd', 'ㅎ': 'j' }; // 가 나 다 마 바 사 자 카 타 파 하 (ㅏ 생략)
  const NEED_GAP = new Set(['ㄴ', 'ㄷ', 'ㅁ', 'ㅂ', 'ㅈ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']); // 제14항: 모음이 붙어 나오면 약자를 쓰지 않는 글자(나 다 마 바 자 카 타 파 하)
  const ABBR2 = { 'ㅓㄱ': '?', 'ㅓㄴ': ')', 'ㅓㄹ': 't', 'ㅕㄴ': '*', 'ㅕㄹ': '|', 'ㅕㅇ': '}', 'ㅗㄱ': 'x', 'ㅗㄴ': '(', 'ㅗㅇ': '=', 'ㅜㄴ': 'g', 'ㅜㄹ': '&', 'ㅡㄴ': 'z', 'ㅡㄹ': '!', 'ㅣㄴ': 'q' };
  const SPLIT_JONG = { 'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'], 'ㄲ': ['ㄱ', 'ㄱ'] };
  const PALATAL = new Set(['ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ']); // 제17항: 성 썽 정 쩡 청
  // ---- 제18항 약어 ----
  const ABBR_WORDS = { '그래서': 'as', '그러나': 'ac', '그러면': 'a3', '그러므로': 'a5', '그런데': 'an', '그리고': 'au', '그리하여': 'a:' };
  // ---- 제5장 숫자 ----
  const NUM_SIGN = '#', DIGIT = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e', '6': 'f', '7': 'g', '8': 'h', '9': 'i', '0': 'j' };
  const DIGIT_COLLIDE = new Set(['14', '24', '15', '124', '125', '145', '245', '1245']); // ㄴ ㄷ ㅁ ㅋ ㅌ ㅍ ㅎ 첫소리, 운 약자(숫자 c i e f h d j g 와 같은 점)
  // ---- 제6장 문장 부호(제49항) ----
  const PUNCT = { '.': '4', '?': '8', '!': '6', ',': '"', '·': '"2', ':': '"1', '/': '_/', '…': ',,,', '“': '8', '”': '0', '‘': ',8', '’': "0'", '(': "8'", ')': ',0', '{': '81', '}': '"0', '[': '82', ']': ';0',
    '『': ';8', '』': '02', '「': '"8', '」': '01', '《': ';7', '》': '72', '〈': '"7', '〉': '71', '―': '--', '-': '-', '~': '@9', '∼': '@9' };

  const CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  function decompose(ch) {
    const c = ch.charCodeAt(0); if (c < 0xAC00 || c > 0xD7A3) return null;
    const o = c - 0xAC00, jo = o % 28, ju = ((o - jo) / 28) % 21, ch0 = (((o - jo) / 28) - ju) / 21;
    return { cho: CHO_LIST[ch0], jung: JUNG_LIST[ju], jong: JONG_LIST[jo] };
  }
  const isSyl = ch => ch !== undefined && decompose(ch) !== null;

  // 한 음절을 점자 조각 목록으로: [{brf, kind, rule}]
  function syllable(d, next, prevSyl, contract) {
    const out = [];
    const add = (brf, kind, rule) => { if (brf) out.push({ cells: brfCells(brf), kind, rule }); };
    const { cho, jung, jong } = d;
    const nextVowelInitial = next && next.cho === 'ㅇ';
    const choBrf = CHO[cho];
    // 제15항 것·껏 (제16항)
    if (contract && (cho === 'ㄱ' || cho === 'ㄲ') && jung === 'ㅓ' && jong === 'ㅅ') {
      if (cho === 'ㄲ') add(',', '된소리표', '제16항'); add('_s', '약자(것)', cho === 'ㄲ' ? '제16항' : '제15항'); return out;
    }
    // 제17항 성 썽 정 쩡 청
    if (contract && PALATAL.has(cho) && jung === 'ㅓ' && jong === 'ㅇ') { add(choBrf, '초성', '제17항'); add('}', '약자(영)', '제17항'); return out; }
    // 제15항 억 언 얼 연 열 영 옥 온 옹 운 울 은 을 인 (겹받침·쌍받침의 앞 글자 포함 — 붙임)
    if (contract && jong) {
      const parts = SPLIT_JONG[jong] || [jong];
      const ab = ABBR2[jung + parts[0]];
      if (ab) {
        add(choBrf, cho === 'ㅇ' ? '' : '초성', '제15항');
        add(ab, '약자(' + jung + parts[0] + ')', '제15항');
        const rest = parts.slice(1); for (const r of rest) add(JONG[r], '받침', '제5항');
        return out;
      }
    }
    // 제13~16항 가 나 다 마 바 사 자 카 타 파 하 (붙임: 받침·된소리 포함)
    const base = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' }[cho] || cho;
    if (contract && jung === 'ㅏ' && ABBR1[base]) {
      const pap = (cho === 'ㅍ' && jong === 'ㅆ'); // 제13항 붙임: 팠은 ㅏ를 생략하지 않는다
      const gap = !jong && NEED_GAP.has(cho) && nextVowelInitial; // 제14항
      if (!pap && !gap) {
        if (base !== cho) add(',', '된소리표', cho === 'ㄲ' || cho === 'ㅆ' ? '제16항' : '제13항');
        add(ABBR1[base], '약자(' + base + 'ㅏ)', '제13항');
        if (jong) pushJong(out, jong);
        return out;
      }
    }
    // 일반 표기
    add(choBrf, '초성', cho.length && ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'].includes(cho) ? '제2항' : '제1항');
    add(JUNG[jung], '중성', jung.match(/[ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ]/) ? '제7항' : '제6항');
    if (jong) pushJong(out, jong);
    return out;
  }
  function pushJong(out, jong) { out.push({ cells: brfCells(JONG[jong]), kind: '받침', rule: jong.length && SPLIT_JONG[jong] ? (jong === 'ㄲ' ? '제4항' : '제5항') : (jong === 'ㅆ' ? '제4항' : '제3항') }); }

  // ---- 제4장 로마자(제28~35항): 대문자 약어만(2026-11-21) ----
  // 국어 문장 속 로마자는 「통일영어점자」로 적는데(제28·32항), 소문자 단어는 영어 약자(2급) 규칙이 많아 아직 바꾸지 않는다(지원 안 함).
  // 대문자로만 쓴 약어(KTX, TV, USB, CD, MP3, KF94, A4, D-100, 로마 숫자 II·V 등)만 규정 예시대로 바꾼다:
  //   로마자표(356) … 로마자 종료표(256) (제29항), 대문자 한 글자 = 대문자표(6), 두 글자 이상 = 대문자 단어표(6,6) (제28항 붙임),
  //   영어 줄임말(shortform)과 같은 글자 조합(CD = could 등)이나 홀로 쓴 한 글자 앞에는 1급 점자표(56) (통일영어점자, 규정 예시 「CD 1장」·「George V」),
  //   종료표를 적지 않는 경우: 뒤에 숫자(제35항), , : ; ― (제33항), . ? ! (제33항 다만), 닫는 따옴표·괄호(제34항). / - ~ 앞에는 적는다(제33항 다만).
  const RO_SIGN = '0', RO_END = '4', RO_CAP = ',', RO_CAPW = ',,', RO_G1 = ';';
  // 글자만으로 된 통일영어점자 줄임말(shortform) — 같은 글자 조합의 약어는 1급 점자표가 필요하다
  const LETTER_SHORTFORMS = new Set('ab abv ac acr af afn afw ag al alm alr alt alw bl brl cd dcl dclg dcv dcvg ei fr gd grt hm hmf imm lr ll myf nec nei pd qk rcv rcvg rjc rjcg sd td tgr tm tn wd xf xs yr yrf yrvs'.split(' '));
  const RO_WORD_OK = new Set(['WHO']);   // 규정 예시(제33항)에서 약자 없이 그대로 쓴 대문자 약어
  // 세 글자 이상 대문자 단어에 영어 약자(묶음 약자)가 들어갈 수 있는 글자 조합이 있으면(OPEN·STOP 같은 낱말일 수 있음) 바꾸지 않는다
  const roRisky = w => /TH|SH|CH|WH|GH|ED|ER|OU|OW|ST|AR|ING|EN|IN|THE|AND|FOR|OF|WITH/.test(w) || /.(EA|BB|CC|FF|GG)./.test(w) || /^(BE|CON|DIS|COM)/.test(w);
  const isRoL = c => /[A-Za-z]/.test(c || ''), isDg = c => /[0-9]/.test(c || '');
  // chars[i]부터 로마자 덩어리(대문자 단어·숫자·단어 사이 빈칸, KBS 1 TV / LP 1장 / D-100)를 읽는다
  function romanRun(chars, i, closingNext) {
    const toks = []; let j = i;
    for (;;) {
      if (!isRoL(chars[j])) break;
      let k = j; while (isRoL(chars[k])) k++;
      const wd = chars.slice(j, k).join(''); j = k;
      // 하이픈·아포스트로피로 이은 낱말(well-known, Wi-Fi, don't, I'm): 부분마다 따로 약자를 적고 사이에 -(3·6번)·'(3번)을 쓴다
      const parts = [{ sep: '', s: wd }];
      while ((chars[j] === '-' || chars[j] === "'" || chars[j] === '’') && isRoL(chars[j + 1])) { let m = j + 1; while (isRoL(chars[m])) m++; parts.push({ sep: chars[j] === '-' ? '-' : "'", s: chars.slice(j + 1, m).join('') }); j = m; }
      toks.push(parts.length > 1 ? { t: 'w', s: parts.map(q => q.sep + q.s).join(''), parts } : { t: 'w', s: wd });
      if (chars[j] === '.' && isRoL(chars[j + 1])) { let m = j + 1; while (isRoL(chars[m])) m++; return { ok: false, end: m }; }   // a.b — 낱말 사이 마침표는 아직 안 바꿈(덩어리째 지원 안 함)
      if (chars[j] === ',' && chars[j + 1] === ' ' && isRoL(chars[j + 2]) && toks.length) { toks.push({ t: 'c' }); j++; }   // apples, bananas (규정 제32항 예시)
      if (chars[j] === '-' && isDg(chars[j + 1])) { toks.push({ t: 'h' }); j++; }
      if (isDg(chars[j])) { let m = j; while (isDg(chars[m])) m++; toks.push({ t: 'n', s: chars.slice(j, m).join('') }); j = m; }
      if (chars[j] === ' ' && isRoL(chars[j + 1])) { toks.push({ t: 's' }); j++; continue; }
      if (chars[j] === ' ' && isDg(chars[j + 1]) && toks[toks.length - 1].t === 'w') {
        let m = j + 1; while (isDg(chars[m])) m++;
        if (chars[m] === ' ' && isRoL(chars[m + 1])) { toks.push({ t: 's' }, { t: 'n', s: chars.slice(j + 1, m).join('') }, { t: 's' }); j = m + 1; continue; }   // KBS 1 TV
        if (!isRoL(chars[m])) { toks.push({ t: 's' }, { t: 'n', s: chars.slice(j + 1, m).join('') }); j = m; }   // LP 1장(제35항)
      }
      break;
    }
    const words = toks.filter(t => t.t === 'w');
    const compoundOk = ps => ps.length <= 3 && ps.every((q, i) => q.sep === "'" ? /^(s|t|m|d|re|ll|ve)$/.test(q.s) : q.s === 'I' ? i === 0 && !!ps[1] && ps[1].sep === "'" : /^[A-Z]?[a-z]+$/.test(q.s) && q.s.length > 1);   // 한 글자 조각(e-mail·T-shirt)은 규칙이 달라 아직 안 바꿈
    words.forEach(w => { if (w.parts) { w.caps = false; w.eng = compoundOk(w.parts); return; } w.caps = /^[A-Z]+$/.test(w.s); w.eng = !w.caps && /^[A-Z]?[a-z]+$/.test(w.s) && (w.s.length > 1 || w.s === 'a' || w.s === 'I'); });   // 대문자 약어 / 영어 낱말(소문자·첫 글자만 대문자)
    const capsN = words.filter(w => w.caps).length, engN = words.filter(w => w.eng).length;
    const ok = !!UEB && words.length <= 8 && capsN <= 2 && words.length === capsN + engN && words.length > (words.length === 1 && words[0].s === 'a' ? 1 : 0) && words.every(w => w.eng || (w.s.length <= 5 && (w.s.length < 3 || RO_WORD_OK.has(w.s) || !roRisky(w.s))));
    if (!ok) return { ok: false, end: j };
    const out = [], P = (brf, text, kind, rule) => brfCells(brf).forEach(d => out.push({ dots: d, text, kind, rule }));
    P(RO_SIGN, '로마자표', '로마자표', '제29항');
    toks.forEach((t, n) => {
      if (t.t === 's') out.push({ dots: [], text: ' ', kind: '띄어쓰기', rule: '' });
      else if (t.t === 'h') P('-', '-', '붙임표', '제32항');
      else if (t.t === 'c') P('1', ',', '쉼표', '제32항');
      else if (t.t === 'n') { P(NUM_SIGN, '수표', '수표', '제35항'); for (const d of t.s) P(DIGIT[d], d, '숫자', '제35항'); }
      else if (t.eng) {
        for (const q of (t.parts || [{ sep: '', s: t.s }])) {   // 영어 낱말: 대문자표 + 약자(통일영어점자 2급). 이은 낱말은 부분마다
        if (q.sep === '-') P('-', '-', '붙임표', '제32항'); else if (q.sep === "'") P("'", "'", '아포스트로피', '통일영어점자');
        const segs = UEB.word(q.s, { noAlpha: n === 0 || !!t.parts, noG1: q.sep === "'" });
        if (/^[A-Z]/.test(q.s)) P(RO_CAP, '대문자', '대문자표', '제28항');
        for (const sg of segs) sg.cells.forEach((d, k) => out.push({ dots: d, text: k === 0 ? (sg.kind === '1급 점자표' ? '1급표' : sg.s) : '', kind: sg.kind === '영어' ? '로마자' : sg.kind === '1급 점자표' ? '1급 점자표' : '영어 약자', rule: sg.kind === '영어' || sg.kind === '1급 점자표' ? '제28항' : '통일영어점자(' + sg.kind + ')' }));
        }
      }
      else {
        const nx = toks[n + 1], alone = !nx || nx.t === 's';   // 뒤에 숫자·붙임표가 붙지 않고 홀로
        const one = t.s.length === 1;
        if (alone && ((one && !'AIO'.includes(t.s) && n > 0) || LETTER_SHORTFORMS.has(t.s.toLowerCase()))) P(RO_G1, '1급표', '1급 점자표', '제32항');
        P(one ? RO_CAP : RO_CAPW, '대문자', one ? '대문자표' : '대문자 단어표', '제28항');
        for (const c of t.s) P(c.toLowerCase(), c, '로마자', '제28항');
      }
    });
    const endsNum = toks[toks.length - 1].t === 'n', nc = chars[j];
    const noEnd = endsNum || (nc !== undefined && (',:;―.?!'.includes(nc) || closingNext(nc)));
    if (!noEnd) P(RO_END, '종료표', '로마자 종료표', '제29항');
    return { ok: true, end: j, cells: out, endsNum };
  }

  const WORDS = Object.keys(ABBR_WORDS);
  // 텍스트 → { cells:[{dots, text, kind, rule}], unsupported:[...], rules:Set }
  function convert(text, opts) {
    const contract = !(opts && opts.contract === false); // 약자·약어 사용(규정 방식). false면 모두 풀어 쓴다(학습용)
    const cells = [], unsupported = [], warnings = [];
    const push = (arr, text0, kind, rule) => { for (const c of arr) cells.push({ dots: c, text: text0, kind, rule }); };
    const chars = [...String(text)];
    let i = 0, inNumber = false, quoteOpen = false, squoteOpen = false, roBadUntil = -1;
    const sylAt = k => (chars[k] !== undefined ? decompose(chars[k]) : null);
    // 로마자 덩어리 바로 뒤가 닫는 따옴표·괄호인지(제34항: 그때는 로마자 종료표를 적지 않는다)
    const closingNext = c => '”’)]}』」》〉'.includes(c) || (c === '"' && quoteOpen) || (c === "'" && squoteOpen);
    while (i < chars.length) {
      const ch = chars[i];
      // 제4장 로마자: 대문자 약어는 바꾸고, 그 밖의 영어(소문자가 섞인 단어 등)는 덩어리째 「지원 안 함」
      if (isRoL(ch)) {
        if (i >= roBadUntil) {
          const r = romanRun(chars, i, closingNext);
          if (r.ok) { cells.push(...r.cells); i = r.end; inNumber = r.endsNum; continue; }
          roBadUntil = r.end;
        }
        unsupported.push(ch); cells.push({ dots: [], text: ch, kind: '지원 안 함', rule: '', unsupported: true }); i++; inNumber = false; continue;
      }
      // 제18항 약어: 앞에 한글이 붙어 있지 않을 때, 뒤에는 무엇이 붙어도 된다
      if (contract && !isSyl(chars[i - 1])) {
        const w = WORDS.find(x => chars.slice(i, i + x.length).join('') === x);
        if (w) { push(brfCells(ABBR_WORDS[w]), w, '약어', '제18항'); i += w.length; inNumber = false; continue; }
      }
      // 숫자 (제40~44항)
      if (/[0-9]/.test(ch)) {
        if (!inNumber) { push(brfCells(NUM_SIGN), '수표', '수표', '제40항'); inNumber = true; }
        push(brfCells(DIGIT[ch]), ch, '숫자', '제40항'); i++; continue;
      }
      if (inNumber && (ch === ',' || ch === '.') && /[0-9]/.test(chars[i + 1] || '')) { // 제41·43항
        push(brfCells(ch === ',' ? '1' : '4'), ch, ch === ',' ? '자릿점' : '소수점', ch === ',' ? '제41항' : '제43항'); i++; continue;
      }
      const d = decompose(ch);
      if (d) {
        const parts = syllable(d, sylAt(i + 1), sylAt(i - 1), contract);
        if (inNumber && parts.length) { // 제44항 다만: 숫자와 혼동되는 글자는 띄어 쓴다
          if (DIGIT_COLLIDE.has(key(parts[0].cells[0]))) cells.push({ dots: [], text: ' ', kind: '띄어쓰기', rule: '제44항' });
        }
        inNumber = false;
        // 제11·12항 구분표
        const pv = sylAt(i - 1);
        if (pv && !pv.jong && d.cho === 'ㅇ') {
          if (d.jung === 'ㅖ') push([[3, 6]], '-', '구분표', '제11항');
          else if (d.jung === 'ㅐ' && ['ㅑ', 'ㅘ', 'ㅜ', 'ㅝ'].includes(pv.jung)) push([[3, 6]], '-', '구분표', '제12항');
        }
        for (const p of parts) push(p.cells, ch, p.kind, p.rule);
        i++; continue;
      }
      inNumber = false;
      if (ch === ' ' || ch === ' ' || ch === '　') { cells.push({ dots: [], text: ' ', kind: '띄어쓰기', rule: '' }); i++; continue; }
      if (ch === '\n') { cells.push({ dots: [], text: '\n', kind: '줄바꿈', rule: '' }); i++; continue; }
      // 제8항 단독으로 쓰인 자모
      if (/[ㄱ-ㅎ]/.test(ch) && JONG[ch]) { push(brfCells('=' + JONG[ch]), ch, '단독 자모', '제8항'); i++; continue; }
      if (/[ㅏ-ㅣ]/.test(ch) && JUNG[ch]) { push(brfCells('=' + JUNG[ch]), ch, '단독 자모', '제8항'); i++; continue; }
      // 줄임표(제49항): … 한두 개 → ,,, / 마침표 셋 또는 여섯 → 444
      if (ch === '…') { let n = 1; if (chars[i + 1] === '…') n = 2; push(brfCells(',,,'), '…'.repeat(n), '문장부호', '제49항'); i += n; continue; }
      if (ch === '.' && chars[i + 1] === '.' && chars[i + 2] === '.') { const n = (chars.slice(i, i + 6).join('') === '......') ? 6 : 3; push(brfCells('444'), '.'.repeat(n), '문장부호', '제49항'); i += n; continue; }
      // 따옴표(키보드 " ')는 열고 닫는 모양으로 번갈아 처리
      let key2 = ch;
      if (ch === '"') { key2 = quoteOpen ? '”' : '“'; quoteOpen = !quoteOpen; }
      else if (ch === "'") { key2 = squoteOpen ? '’' : '‘'; squoteOpen = !squoteOpen; }
      if (PUNCT[key2] !== undefined) {
        let brf = PUNCT[key2];
        if (key2 === '-' && /[0-9]/.test(chars[i - 1] || '') && /[0-9]/.test(chars[i + 1] || '')) warnings.push('숫자 사이의 -는 붙임표(3·6번 점)로 바꿨어요(전화번호처럼 쓸 때). 빼기(−) 기호는 아직 바꾸지 않아요.');
        push(brfCells(brf), ch, '문장부호', '제49항'); i++; continue;
      }
      unsupported.push(ch); cells.push({ dots: [], text: ch, kind: '지원 안 함', rule: '', unsupported: true }); i++;
    }
    return { cells, unsupported, warnings: [...new Set(warnings)] };
  }
  const api = { convert, toBrf, brfCells, brfToDots: s => [...s].map(c => key(brfCell(c))), decompose, tables: { CHO, JUNG, JONG, ABBR1, ABBR2, ABBR_WORDS, PUNCT } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KB = api;
})(typeof window !== 'undefined' ? window : globalThis);
