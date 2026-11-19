// 손빛 배움터 퀴즈 문제 만들기(화면 없음). 수어·점자 자료는 전역에서 읽는다:
// KSL_WORDS·KSL_EXTRA·KSL_INFO·MEDIA_VIDEO(수어), BRAILLE_NUMBERS·BRAILLE_NUMBER_SIGN(braille.js), KB(braille-core.js, 한국 점자 규정 2024).
// 난이도 하·중·상: ① 어떤 낱말·글자를 내는지(배분) ② 보기를 얼마나 비슷하게 만드는지 ③ 문제 형식 — 세 가지를 함께 바꾼다.
(function (root) {
  'use strict';
  const QZ = {};
  let rng = Math.random;
  QZ.setRng = f => { rng = f || Math.random; };
  const rint = n => Math.floor(rng() * n);
  function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rint(i + 1); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
  const pickN = (a, n) => shuffle(a).slice(0, n);
  QZ.SIZE = 10;
  QZ.LEVELS = { 1: '하', 2: '중', 3: '상' };
  QZ.LEVEL_NOTES = {
    1: '하: 쉬운 단어와 기본 글자, 보기가 서로 많이 달라요.',
    2: '중: 쉬운 단어와 생활 단어, 보기가 조금 비슷해요.',
    3: '상: 어려운 단어와 글자, 보기가 많이 비슷해요.'
  };
  // 한 번에 낼 문제 수 배분: [등급, 문제 수]
  const MIX = { 1: [[1, 10]], 2: [[2, 7], [1, 3]], 3: [[3, 6], [2, 4]] };
  QZ.MIX = MIX;
  const PV_SHARE = { 1: 0, 2: 0.4, 3: 0.6 };   // 「뜻 보고 영상 고르기」 비율

  // ───────────────────────── 수어 ─────────────────────────
  // 영상 파일 내용이 똑같은 단어(영상으로 맞히는 문제에서 정답이 둘이 되므로 문제에서 뺀다)
  const DUP = new Set(['KSL-0018', 'KSL-0044', 'N223', 'N224', 'N248', 'N1485', 'N775', 'N1019', 'N1008', 'N770', 'N408', 'N574', 'N426', 'N549', 'N1049', 'N1017', 'N999', 'N637', 'N423', 'N1032', 'N2454']);
  const HARD_TOPICS = new Set(['나라·지명', '법·사건', '사회·제도']);
  // 기초 일상 낱말(하). 자체 사전 181개는 전부 기초로 본다.
  const BASIC = new Set(('안녕 안녕히 감사 고맙습니다 미안합니다 죄송합니다 괜찮다 괜찮아요 예 아니요 아니다 맞다 틀리다 환영 축하 부탁 좋다 싫다 이름 나이 누구 무엇 언제 어디 왜 어떻게 얼마 몇 이것 그것 저것 여기 거기 저기 나 너 우리 사람 남자 여자 아기 어린이 학생 가족 엄마 아빠 부모 형 오빠 누나 언니 동생 할머니 할아버지 아들 딸 아내 남편 이모 삼촌 고모 의사 경찰 간호사 ' +
    '기쁘다 슬프다 화나다 무섭다 놀라다 행복 사랑 즐겁다 외롭다 걱정 부끄럽다 피곤하다 졸리다 배고프다 아프다 힘들다 편안하다 생각 기억 마음 ' +
    '밥 물 빵 우유 고기 생선 계란 달걀 과일 사과 바나나 포도 딸기 수박 귤 라면 김치 국 떡 과자 아이스크림 커피 차 주스 맥주 술 치킨 피자 햄버거 맛있다 먹다 마시다 요리 식당 음식 야채 채소 ' +
    '머리 얼굴 눈 코 입 귀 손 발 다리 팔 몸 가슴 목 병원 약 병 감기 열 건강 응급 ' +
    '영 공 일 이 삼 사 오 육 칠 팔 구 십 백 천 만 하나 둘 셋 넷 다섯 오늘 내일 어제 지금 아침 점심 저녁 밤 낮 오전 오후 주말 월요일 화요일 수요일 목요일 금요일 토요일 일요일 년 월 시간 분 매일 항상 가끔 나중 먼저 처음 마지막 봄 여름 가을 겨울 생일 휴일 ' +
    '집 학교 회사 가게 시장 은행 화장실 공원 역 버스 지하철 택시 기차 비행기 자동차 자전거 길 한국 서울 가다 오다 들어가다 나가다 타다 내리다 앞 뒤 위 아래 옆 안 밖 오른쪽 왼쪽 ' +
    '하다 되다 있다 없다 주다 받다 사다 팔다 열다 닫다 앉다 서다 자다 일어나다 보다 듣다 말하다 읽다 쓰다 알다 모르다 만나다 기다리다 도와주다 웃다 울다 걷다 뛰다 공부하다 일하다 쉬다 놀다 만들다 씻다 입다 벗다 사랑하다 좋아하다 싫어하다 시작하다 끝나다 배우다 가르치다 찾다 묻다 대답하다 전화하다 필요하다 원하다 ' +
    '크다 작다 많다 적다 길다 짧다 높다 낮다 빠르다 느리다 쉽다 어렵다 예쁘다 귀엽다 멋있다 깨끗하다 더럽다 춥다 덥다 뜨겁다 차갑다 비싸다 싸다 같다 다르다 새롭다 젊다 착하다 똑똑하다 ' +
    '책 연필 가방 옷 신발 모자 안경 시계 전화 휴대폰 컴퓨터 텔레비전 문 창문 의자 책상 침대 우산 돈 열쇠 색 빨강 파랑 노랑 초록 검정 하양 보라 분홍 비 바람 해 달 별 하늘 구름 날씨 산 바다 강 꽃 나무 개 고양이 새 소 말 돼지 닭 물고기 원 값 쇼핑 카드').split(/\s+/));
  const nm = s => String(s).replace(/\s+/g, '');
  const WORDS = [], BY_ID = new Map();
  (function build() {
    const own = typeof KSL_WORDS !== 'undefined' ? KSL_WORDS : [], ext = typeof KSL_EXTRA !== 'undefined' ? KSL_EXTRA : [];
    own.forEach(w => WORDS.push({ id: String(w.id), w: w.w, t: w.t, al: w.al || '', g: '', own: true, k: w.k || '' }));
    ext.forEach(x => WORDS.push({ id: 'N' + x.i, w: x.w, t: x.t, al: '', g: x.g || '', own: false, k: x.m ? '/signFile/video/' + x.m : '' }));
    WORDS.forEach(w => BY_ID.set(w.id, w));
  })();
  const videoSrc = w => (typeof MEDIA_VIDEO !== 'undefined' && MEDIA_VIDEO.has(w.id)) ? 'assets/media/' + w.id + '.mp4' : w.k;
  const eligible = w => !!w.k && !DUP.has(w.id) && nm(w.w).length <= 8 && !/[~\-]/.test(w.w);
  const senseCount = w => (w.g ? w.g.split(' / ').filter(Boolean).length : 1);
  function tierOf(w) {
    if (w.own) return 1;
    const n = nm(w.w);
    if (BASIC.has(n)) return 1;
    if (HARD_TOPICS.has(w.t) || /\s/.test(w.w) || n.length >= 5 || senseCount(w) >= 3) return 3;
    return 2;
  }
  WORDS.forEach(w => { w.tier = tierOf(w); });
  const ELIG = WORDS.filter(eligible);
  const ELIG_TIER = { 1: ELIG.filter(w => w.tier === 1), 2: ELIG.filter(w => w.tier === 2), 3: ELIG.filter(w => w.tier === 3) };
  QZ.words = WORDS; QZ.eligible = ELIG; QZ.byTier = ELIG_TIER; QZ.wordById = id => BY_ID.get(String(id)) || null; QZ.videoSrc = videoSrc; QZ.isEligible = eligible; QZ.dupIds = DUP; QZ.signTier = tierOf;
  // 뜻이 겹쳐 한 문제에 같이 나오면 정답이 둘이 될 수 있는 짝인지(이름이 같거나 한쪽이 다른 쪽을 포함하거나, 같은 수어/뜻풀이를 공유)
  const tokCache = new Map();
  function tokens(w) {
    let t = tokCache.get(w.id); if (t) return t;
    t = new Set([nm(w.w)]);
    String(w.g + ',' + w.al).split(/[,/]/).forEach(part => { const s = nm(part.replace(/\(.*?\)/g, '')); if (s.length >= 2) t.add(s); });
    tokCache.set(w.id, t); return t;
  }
  function conflict(a, b) {
    const na = nm(a.w), nb = nm(b.w);
    if (na === nb) return true;
    if (na.length >= 2 && nb.length >= 2 && (na.includes(nb) || nb.includes(na))) return true;
    const tb = tokens(b); for (const x of tokens(a)) if (tb.has(x)) return true;
    return false;
  }
  QZ.conflict = conflict;
  function info(w) {
    if (w.own || typeof KSL_INFO === 'undefined') return null;
    const r = KSL_INFO[w.id.slice(1)]; return r ? { h: r[0], shapes: r[1] || [], pos: r[2] || '' } : null;
  }
  QZ.info = info;
  // 두 수어가 비슷해 보이는 정도: 한 손/두 손, 손모양, 손 위치가 같을수록 높다(자체 사전 단어는 정보가 없어 주제·글자 수만 본다)
  function sim(a, b) {
    let s = 0; const ia = info(a), ib = info(b);
    if (ia && ib) { if (ia.h === ib.h) s += 1; if (ia.shapes.some(x => ib.shapes.includes(x))) s += 2; if (ia.pos && ia.pos === ib.pos) s += 1.5; }
    if (a.t === b.t) s += 0.5;
    if (nm(a.w).length === nm(b.w).length) s += 0.3;
    return s;
  }
  QZ.sim = sim;
  // 보기 3개 고르기: 하=서로 많이 다른 기초 낱말, 중=같은 주제 위주 무작위, 상=손모양·위치가 비슷한 낱말
  function distractors(w, level, n) {
    n = n || 3;
    let base = ELIG.filter(c => c.id !== w.id && !conflict(w, c));
    const allow = level === 1 ? [1] : level === 2 ? [1, 2] : [2, 3];
    let cand = base.filter(c => allow.includes(c.tier)); if (cand.length < 30) cand = base;
    let ordered;
    if (level === 2) { const same = shuffle(cand.filter(c => c.t === w.t)), rest = shuffle(cand.filter(c => c.t !== w.t)); ordered = same.slice(0, 6).concat(rest); }
    else {
      const sample = cand.length > 260 ? pickN(cand, 260) : cand;
      const scored = sample.map(c => ({ c, s: sim(w, c) }));
      scored.sort((x, y) => (level === 3 ? y.s - x.s : x.s - y.s));
      ordered = shuffle(scored.slice(0, 20)).map(o => o.c);
    }
    const out = [];
    for (const c of ordered) { if (out.length >= n) break; if (out.some(o => conflict(o, c))) continue; out.push(c); }
    if (out.length < n) for (const c of shuffle(base)) { if (out.length >= n) break; if (out.some(o => conflict(o, c))) continue; if (out.includes(c)) continue; out.push(c); }
    return out;
  }
  QZ.distractors = distractors;
  const glossOf = w => { if (w.g) { const s = w.g.split(' / ').slice(0, 2).join(' · '); return s.length > 44 ? s.slice(0, 44) + '…' : s; } return w.al ? w.al.replace(/, /g, ' · ') : ''; };
  QZ.glossOf = glossOf;
  function makeSignVideoQ(w, level, optNames) {
    const names = optNames || shuffle([w.w].concat(distractors(w, level).map(d => d.w)));
    return { ck: 'sv', clueType: 'video', id: w.id, answer: w.w, group: w.t, level, clue: videoSrc(w), _opts: names };
  }
  function makePickVideoQ(w, level, optIds) {
    const ids = optIds || shuffle([w.id].concat(distractors(w, level).map(d => d.id)));
    return { ck: 'pv', clueType: 'pickvideo', id: w.id, answer: w.w, gloss: glossOf(w), group: w.t, level, clips: ids.map(id => { const x = BY_ID.get(id); return { id: x.id, name: x.w, src: videoSrc(x) }; }), _opts: ids };
  }
  QZ.makeSignVideoQ = makeSignVideoQ; QZ.makePickVideoQ = makePickVideoQ;
  // 수어 퀴즈 10문제: 등급 배분(MIX) + 형식 배분(PV_SHARE)
  QZ.makeSignQuiz = function (level) {
    const chosen = [], used = new Set();
    const take = (tier, k) => { for (const w of shuffle(ELIG_TIER[tier])) { if (k <= 0) break; if (used.has(nm(w.w))) continue; if (chosen.some(c => conflict(c, w))) continue; chosen.push(w); used.add(nm(w.w)); k--; } return k; };
    let short = 0; for (const [tier, k] of MIX[level]) short += take(tier, k);
    if (short > 0) for (const tier of [2, 1, 3]) short = take(tier, short);
    const ws = shuffle(chosen), nPick = Math.round(ws.length * PV_SHARE[level]);
    return shuffle(ws.map((w, i) => (i < nPick ? makePickVideoQ(w, level) : makeSignVideoQ(w, level))));
  };
  // 내 단어장 퀴즈: 담은 단어(영상이 있고 헷갈리지 않는 것)로 영상→뜻, 뜻→영상을 번갈아
  QZ.makeFavQuiz = function (words, level) {
    const ws = shuffle(words.filter(w => w && eligible(w))).slice(0, QZ.SIZE);
    return ws.map((w, i) => (i % 2 ? makePickVideoQ(w, level) : makeSignVideoQ(w, level)));
  };
  QZ.favOk = w => !!w && eligible(w);

  // ───────────────────────── 점자 ─────────────────────────
  const T = () => KB.tables;
  const brf = s => KB.brfCells(s);
  const conv = (text, contract) => KB.convert(text, { contract: !!contract }).cells.filter(c => c.kind !== '띄어쓰기' && c.kind !== '줄바꿈').map(c => c.dots);
  const ckey = cells => cells.map(c => c.join('')).join('|');
  const mask = c => c.reduce((m, n) => m | (1 << (n - 1)), 0);
  const pop = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };
  function cdist(a, b) { const n = Math.max(a.length, b.length); let d = 0; for (let i = 0; i < n; i++) d += (a[i] && b[i]) ? pop(mask(a[i]) ^ mask(b[i])) : 6; return d; }
  QZ.cdist = cdist; QZ.ckey = ckey;
  const PNAME = { '.': '마침표', '?': '물음표', '!': '느낌표', ',': '쉼표', '·': '가운뎃점', ':': '쌍점', '/': '빗금', '…': '줄임표', '“': '여는 큰따옴표', '”': '닫는 큰따옴표', '‘': '여는 작은따옴표', '’': '닫는 작은따옴표', '(': '여는 소괄호', ')': '닫는 소괄호', '[': '여는 대괄호', ']': '닫는 대괄호', '「': '여는 낫표', '」': '닫는 낫표', '―': '줄표', '-': '붙임표' };
  const SYL1 = { 'ㄱ': '가', 'ㄴ': '나', 'ㄷ': '다', 'ㅁ': '마', 'ㅂ': '바', 'ㅅ': '사', 'ㅈ': '자', 'ㅋ': '카', 'ㅌ': '타', 'ㅍ': '파', 'ㅎ': '하' };
  const SYL2 = { 'ㅓㄱ': '억', 'ㅓㄴ': '언', 'ㅓㄹ': '얼', 'ㅕㄴ': '연', 'ㅕㄹ': '열', 'ㅕㅇ': '영', 'ㅗㄱ': '옥', 'ㅗㄴ': '온', 'ㅗㅇ': '옹', 'ㅜㄴ': '운', 'ㅜㄹ': '울', 'ㅡㄴ': '은', 'ㅡㄹ': '을', 'ㅣㄴ': '인' };
  QZ.SCOPES = [{ key: 'all', label: '전체' }, { key: 'cho', label: '첫소리' }, { key: 'vb', label: '모음·받침' }, { key: 'num', label: '숫자·부호' }, { key: 'two', label: '된소리·겹모음·겹받침' }, { key: 'abbr', label: '약자·약어' }];
  let ITEMS = null, ITEM_BY = null, DROPPED = [];
  function items() {
    if (ITEMS) return ITEMS;
    const t = T(), out = [], seen = new Set();
    const add = o => { const key = o.fam + '#' + ckey(o.cells); if (seen.has(key)) { DROPPED.push(o.answer + '[' + o.group + ']'); return; } seen.add(key); out.push(Object.assign({ kind: 'p', key: ckey(o.cells) }, o)); };
    for (const ch of ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']) add({ answer: ch, group: '첫소리', fam: 'cho', scope: 'cho', tier: 1, cells: brf(t.CHO[ch]) });
    for (const ch of ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ']) add({ answer: ch, group: '된소리', fam: 'dbl', scope: 'two', tier: 2, cells: brf(t.CHO[ch]) });
    for (const ch of ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ']) add({ answer: ch, group: '모음', fam: 'vow1', scope: 'vb', tier: 1, cells: brf(t.JUNG[ch]) });
    for (const ch of ['ㅐ', 'ㅔ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅢ']) add({ answer: ch, group: '겹모음', fam: 'vow1', scope: 'two', tier: 2, cells: brf(t.JUNG[ch]) });
    for (const ch of ['ㅒ', 'ㅙ', 'ㅞ', 'ㅟ']) add({ answer: ch, group: '겹모음(두 칸)', fam: 'vow2', scope: 'two', tier: 3, cells: brf(t.JUNG[ch]) });
    for (const ch of ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']) add({ answer: ch + '(받침)', group: '받침', fam: 'jong1', scope: 'vb', tier: 'ㄱㄴㄹㅁㅇ'.includes(ch) ? 1 : 2, cells: brf(t.JONG[ch]) });
    add({ answer: 'ㅆ(받침)', group: '쌍받침', fam: 'jong1', scope: 'two', tier: 2, cells: brf(t.JONG['ㅆ']) });
    add({ answer: 'ㄲ(받침)', group: '쌍받침', fam: 'jong2', scope: 'two', tier: 3, cells: brf(t.JONG['ㄲ']) });
    for (const ch of ['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ']) add({ answer: ch + '(받침)', group: '겹받침', fam: 'jong2', scope: 'two', tier: 3, cells: brf(t.JONG[ch]) });
    // 문장부호: 한 칸짜리(마침표·물음표·느낌표·쉼표…)와 두 칸 이상짜리를 따로 묶는다. 같은 묶음 안에서 점 모양이 같은 것(물음표 = 여는 큰따옴표)은 앞의 하나만 문제로 쓴다.
    for (const ch of ['.', '?', '!', ',', '“', '”', '-', '·', ':', '/', '…', '‘', '’', '(', ')', '[', ']', '「', '」', '―']) {
      const cells = brf(t.PUNCT[ch]); const one = cells.length === 1;
      add({ answer: PNAME[ch] + '(' + ch + ')', group: '문장부호', fam: one ? 'p1' : 'p2', scope: 'num', tier: one ? ('.?!'.includes(ch) ? 1 : 2) : 3, cells });
    }
    for (const [k, b] of Object.entries(t.ABBR1)) add({ answer: SYL1[k] + '(약자)', group: '약자', fam: 'ab1', scope: 'abbr', tier: 2, cells: brf(b) });
    for (const [k, b] of Object.entries(t.ABBR2)) add({ answer: SYL2[k] + '(약자)', group: '약자', fam: 'ab1', scope: 'abbr', tier: 3, cells: brf(b) });
    for (const s of ['것', '성', '정', '청']) add({ answer: s + '(약자)', group: '약자(두 칸)', fam: 'ab2', scope: 'abbr', tier: 3, cells: conv(s, true) });
    for (const [w, b] of Object.entries(t.ABBR_WORDS)) add({ answer: w + '(약어)', group: '약어', fam: 'ab2', scope: 'abbr', tier: 3, cells: brf(b) });
    ITEMS = out; ITEM_BY = new Map(out.map(i => [i.answer, i])); return out;
  }
  QZ.brailleItems = () => items(); QZ.droppedItems = () => { items(); return DROPPED.slice(); };
  // 숫자: 수표 + 숫자(규정 제40~44항, 엔진으로 변환)
  const numItem = s => { const cells = conv(String(s), false); return { kind: 'n', answer: String(s), group: '숫자', fam: 'num', scope: 'num', tier: String(s).length === 1 ? 1 : String(s).length === 2 ? 2 : 3, cells, key: ckey(cells) }; };
  // 낱말: 사전 낱말 중 한글 2~4자, 너무 어렵지 않은 것(등급 1·2). 약자를 써도 똑같은 것은 풀어쓰기('w'), 달라지는 것은 약자 사용('c')
  const isH = s => /^[가-힣]{2,4}$/.test(s);
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const BASIC_J = new Set('ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('')), BASIC_C = new Set(['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']);
  function usesTwo(s) { return [...s].some(ch => { const o = ch.charCodeAt(0) - 0xAC00, jo = o % 28, ju = ((o - jo) / 28) % 21, c = Math.floor(o / 588); return !BASIC_C.has(CHO[c]) || !BASIC_J.has(JUNG[ju]) || (JONG[jo] !== '' && !BASIC_C.has(JONG[jo])); }); }
  let WPOOL = null;
  function wordPool() {
    if (WPOOL) return WPOOL;
    const names = [...new Set(ELIG.filter(w => w.tier <= 2).map(w => nm(w.w)).filter(isH))];
    WPOOL = [];
    for (const s of names) {
      const a = conv(s, false), b = conv(s, true), same = ckey(a) === ckey(b), two = usesTwo(s), cells = same ? a : b, n = cells.length;
      if (n < 2 || n > 8) continue;
      WPOOL.push({ kind: same ? 'w' : 'c', answer: s, group: '낱말', fam: 'word', scope: same ? (two ? 'two' : 'vb') : 'abbr', tier: n <= 3 ? 1 : n <= 5 ? 2 : 3, cells, key: ckey(cells), syl: s.length, two, same });
    }
    return WPOOL;
  }
  QZ.wordPool = () => wordPool();
  const wordItem = (s, k) => { const p = wordPool().find(x => x.answer === s && x.kind === k); return p || null; };
  // 같은 모양을 다른 자리에서 읽는 것들(설명에서 알려 주기 위해)
  QZ.sameCellsAs = item => items().filter(x => x !== item && x.key === item.key).map(x => x.answer);

  // 보기(점자) 고르기: 하=점 모양이 많이 다른 것, 중=중간, 상=점 하나만 다른 것
  function pickByDist(level, cells, cands) {
    const sc = cands.map(c => ({ c, d: cdist(cells, c.cells) })).sort((x, y) => x.d - y.d);
    let ordered;
    if (level === 3) ordered = sc.slice(0, 8);
    else if (level === 1) ordered = sc.slice(-8);
    else { const mid = Math.floor(sc.length / 2); ordered = sc.slice(Math.max(0, mid - 4), mid + 4); }
    const out = [];
    for (const o of shuffle(ordered)) { if (out.length >= 3) break; if (!out.some(x => x.c.key === o.c.key || x.c.answer === o.c.answer)) out.push(o); }
    if (out.length < 3) for (const o of shuffle(sc)) { if (out.length >= 3) break; if (!out.some(x => x.c.answer === o.c.answer)) out.push(o); }
    return out.map(o => o.c);
  }
  function nearNumbers(str, level) {
    const digs = str.split(''), edits = new Set();
    for (let i = 0; i < digs.length; i++) for (let d = 0; d <= 9; d++) { if (String(d) !== digs[i]) { const t = digs.slice(); t[i] = String(d); const s = t.join(''); if (s.length === 1 || s[0] !== '0') edits.add(s); } }
    for (let i = 0; i + 1 < digs.length; i++) if (digs[i] !== digs[i + 1]) { const t = digs.slice(); const x = t[i]; t[i] = t[i + 1]; t[i + 1] = x; const s = t.join(''); if (s[0] !== '0') edits.add(s); }
    edits.delete(str); return [...edits];
  }
  function randNum(len) { let s = String(1 + rint(9)); for (let i = 1; i < len; i++) s += String(rint(10)); return s; }
  function numberOptions(str, level) {
    let pool;
    if (str.length === 1) pool = '0123456789'.split('').filter(x => x !== str);
    else if (level === 3 || level === 2) { pool = nearNumbers(str, level); if (level === 2) pool = pickN(pool, 1).concat([randNum(str.length), randNum(str.length), randNum(str.length)]); }
    else pool = [randNum(str.length), randNum(str.length), randNum(str.length), randNum(str.length)];
    const cs = [...new Set(pool.filter(x => x !== str))].map(numItem);
    if (str.length === 1) return pickByDist(level, numItem(str).cells, cs);
    const out = []; for (const c of shuffle(cs)) { if (out.length >= 3) break; out.push(c); }
    while (out.length < 3) { const x = numItem(randNum(str.length)); if (x.answer !== str && !out.some(o => o.answer === x.answer)) out.push(x); }
    return out;
  }
  function wordOptions(it, level) {
    const pool = wordPool().filter(x => x.kind === it.kind && x.answer !== it.answer && ckey(x.cells) !== ckey(it.cells) && Math.abs(x.syl - it.syl) <= 1);
    const same = pool.filter(x => x.syl === it.syl), cands = same.length >= 6 ? same : pool;
    return pickByDist(level, it.cells, cands);
  }
  function optionItems(it, level) {
    if (it.kind === 'p') { const fam = items().filter(x => x.fam === it.fam && x.key !== it.key && x.answer !== it.answer); return pickByDist(level, it.cells, fam.length >= 3 ? fam : items().filter(x => x.cells.length === it.cells.length && x.key !== it.key)); }
    if (it.kind === 'n') return numberOptions(it.answer, level);
    return wordOptions(it, level);
  }
  const promptOf = it => it.kind === 'p' ? `이 점자는 무슨 글자(${it.group})일까요?` : it.kind === 'n' ? '이 점자가 나타내는 숫자는 무엇일까요?' : it.kind === 'c' ? '약자·약어를 써서 줄여 쓴 낱말이에요. 어떤 낱말일까요?' : '이 점자는 어떤 낱말일까요?';
  function readQ(it, level, optItems, order) {
    const opts = optItems || optionItems(it, level), pool = [it].concat(opts);
    const all = order ? order.map(a => pool.find(x => x.answer === a)) : shuffle(pool);
    return { ck: 'br', bk: it.kind, clueType: 'dots', answer: it.answer, group: it.group, level, clue: it.cells, prompt: promptOf(it), _opts: all.map(i => i.answer), optCells: Object.fromEntries(all.map(i => [i.answer, i.cells])) };
  }
  function buildGroup(it) { return it.kind === 'n' ? '숫자(수표 포함)' : it.kind === 'c' ? '낱말(약자·약어 사용)' : it.kind === 'w' ? '낱말' : it.group; }
  function writeQ(it, level) { return { ck: 'bu', bk: it.kind, clueType: 'build', answer: it.answer, group: buildGroup(it), level, clue: it.cells }; }
  // 범위별 구성(문제 수): p=글자·부호·약자 등, n=숫자, w=낱말
  const PLAN = { all: { p: 5, n: 2, w: 3 }, cho: { p: 10 }, vb: { p: 7, w: 3 }, num: { n: 5, p: 5 }, two: { p: 7, w: 3 }, abbr: { p: 7, w: 3 } };
  // 등급 배분: 하=하 위주, 중=중 70%+하, 상=상 60%+중. 그 등급 글자가 모자라면 같은 범위의 다른 등급으로 채운다.
  function chooseByTier(pool, level, k, used) {
    const out = []; if (k <= 0) return out;
    const quota = level === 1 ? [[1, k]] : level === 2 ? [[2, Math.round(k * 0.7)], [1, k]] : [[3, Math.round(k * 0.6)], [2, k]];
    for (const [tier, q] of quota) {
      let got = 0;
      for (const it of shuffle(pool.filter(x => x.tier === tier))) { if (out.length >= k || got >= q) break; if (used.has(it.answer)) continue; out.push(it); used.add(it.answer); got++; }
    }
    for (const it of shuffle(pool)) { if (out.length >= k) break; if (used.has(it.answer)) continue; out.push(it); used.add(it.answer); }
    return out;
  }
  function numAnswers(level, k, used) {
    const out = [];
    for (let guard = 0; out.length < k && guard < 200; guard++) { const len = level === 1 ? 1 : level === 2 ? 2 : (rng() < 0.5 ? 3 : 4); const s = len === 1 ? String(rint(10)) : randNum(len); if (used.has(s)) continue; used.add(s); out.push(numItem(s)); }
    return out;
  }
  function wordsFor(scope, level) {
    const all = wordPool();
    if (scope === 'vb') return all.filter(x => x.scope === 'vb');
    if (scope === 'two') return all.filter(x => x.scope === 'two');
    if (scope === 'abbr') return all.filter(x => x.scope === 'abbr');
    return level === 3 ? all : all.filter(x => x.kind === 'w');          // 전체 범위의 하·중은 풀어쓰기와 약자 결과가 같은 낱말만
  }
  QZ.makeBrailleQuiz = function (mode, scope, level) {
    scope = PLAN[scope] ? scope : 'all'; const plan = PLAN[scope], used = new Set(), picked = [];
    const pPool = items().filter(x => scope === 'all' || x.scope === scope);
    if (plan.p) picked.push(...chooseByTier(pPool, level, plan.p, used));
    if (plan.n) picked.push(...numAnswers(level, plan.n, used));
    if (plan.w) picked.push(...chooseByTier(wordsFor(scope, level), level, plan.w, used));
    // 모자라면 같은 범위에서 더 채운다
    for (const it of shuffle(pPool)) { if (picked.length >= QZ.SIZE) break; if (!used.has(it.answer)) { picked.push(it); used.add(it.answer); } }
    if (picked.length < QZ.SIZE) for (const it of shuffle(items())) { if (picked.length >= QZ.SIZE) break; if (!used.has(it.answer)) { picked.push(it); used.add(it.answer); } }
    return shuffle(picked.slice(0, QZ.SIZE)).map(it => (mode === 'write' ? writeQ(it, level) : readQ(it, level)));
  };

  // ───────────────────────── 저장·복원(퀴즈를 중간에 나갔다 와도 같은 문제·같은 보기) ─────────────────────────
  // 저장 모양: 키 순서를 늘 같게(t, i 또는 k·a, l, o) 해 두면 내보내고 다시 가져와도 글자까지 똑같다
  QZ.compact = function (q, noOpts) {
    const l = q.level || 2;
    if (q.ck === 'sv' || q.ck === 'pv') { const c = { t: q.ck, i: String(q.id), l }; if (!noOpts) c.o = q._opts; return c; }
    const c = { t: q.ck, k: q.bk, a: q.answer, l }; if (!noOpts && q.ck === 'br') c.o = q._opts; return c;
  };
  function itemOf(k, a) {
    if (k === 'p' || !k) return items().find(x => x.answer === a) || null;
    if (k === 'n') return /^[0-9]{1,4}$/.test(a) && (a.length === 1 || a[0] !== '0') ? numItem(a) : null;
    return wordItem(a, k);
  }
  QZ.restore = function (c) {
    if (!c || typeof c !== 'object') return null;
    const level = [1, 2, 3].includes(c.l) ? c.l : 2;
    if (c.t === 'sv' || c.t === 'pv') {
      const w = BY_ID.get(String(c.i)); if (!w || !eligible(w)) return null;
      if (c.t === 'sv') { const ok = Array.isArray(c.o) && c.o.length === 4 && c.o.includes(w.w) && new Set(c.o).size === 4; return makeSignVideoQ(w, level, ok ? c.o : null); }
      const ok = Array.isArray(c.o) && c.o.length === 4 && c.o.includes(w.id) && new Set(c.o).size === 4 && c.o.every(id => BY_ID.has(id) && eligible(BY_ID.get(id)));
      return makePickVideoQ(w, level, ok ? c.o : null);
    }
    if (c.t === 'br' || c.t === 'bu') {
      const it = itemOf(c.k, c.a); if (!it) return null;
      if (c.t === 'bu') return writeQ(it, level);
      const os = Array.isArray(c.o) && c.o.length === 4 && c.o.includes(it.answer) && new Set(c.o).size === 4 ? c.o.map(a => itemOf(c.k, a)) : null;
      if (os && os.every(Boolean)) return readQ(it, level, os.filter(x => x.answer !== it.answer), c.o);
      return readQ(it, level);
    }
    return null;
  };
  // 저장된 틀린 문제가 지금도 퀴즈로 낼 수 있는 것인지(문제를 새로 만들지 않고 빠르게 확인)
  QZ.valid = c => {
    if (!c || typeof c !== 'object') return false;
    if (c.t === 'sv' || c.t === 'pv') { const w = BY_ID.get(String(c.i)); return !!w && eligible(w); }
    if (c.t === 'br' || c.t === 'bu') return typeof c.a === 'string' && !!itemOf(c.k, c.a);
    return false;
  };
  QZ.wrongKey = c => c.t + ':' + (c.t === 'sv' || c.t === 'pv' ? '' : (c.k || 'p')) + ':' + (c.i != null ? c.i : c.a);
  root.QZ = QZ;
  if (typeof module !== 'undefined' && module.exports) module.exports = QZ;
})(typeof self !== 'undefined' ? self : this);
