// 한글 점자 변환 — braille-ksl-engine(사이/braille-ksl-engine/index.html)의 표·로직을 그대로 가져옴.
// 출처: 점자정보단말기 점자표 기반. 모음 21개 전부(복합모음 11개 포함)는 2026-11-14 두 독립 출처로 교차 검증함:
// Wikipedia "Korean Braille" 모음표 + liblouis 한국어 점자표(tables/ko-chars.cti). ㅒㅙㅞㅟ는 ㅑ·ㅘ·ㅝ·ㅜ 뒤에 ㅐ(1-2-3-5)를 붙인 2칸.
const BRAILLE_CHO = {
  'ㄱ': '4', 'ㄴ': '1-4', 'ㄷ': '2-4', 'ㄹ': '5', 'ㅁ': '1-5',
  'ㅂ': '4-5', 'ㅅ': '6', 'ㅈ': '4-6', 'ㅊ': '5-6',
  'ㅋ': '1-2-4', 'ㅌ': '1-2-5', 'ㅍ': '1-4-5', 'ㅎ': '2-4-5',
  'ㄲ': ['6', '4'], 'ㄸ': ['6', '2-4'], 'ㅃ': ['6', '4-5'], 'ㅆ': ['6', '6'], 'ㅉ': ['6', '4-6']
};
const BRAILLE_JONG = {
  'ㄱ': '1', 'ㄴ': '2-5', 'ㄷ': '3-5', 'ㄹ': '2', 'ㅁ': '2-6',
  'ㅂ': '1-2', 'ㅅ': '3', 'ㅈ': '1-3', 'ㅊ': '2-3',
  'ㅋ': '2-3-5', 'ㅌ': '2-3-6', 'ㅍ': '2-5-6', 'ㅎ': '3-5-6', 'ㅇ': '2-3-5-6'
};
const BRAILLE_JUNG = {
  'ㅏ': '1-2-6', 'ㅑ': '3-4-5', 'ㅓ': '2-3-4', 'ㅕ': '1-5-6',
  'ㅗ': '1-3-6', 'ㅛ': '3-4-6', 'ㅜ': '1-3-4', 'ㅠ': '1-4-6',
  'ㅡ': '2-4-6', 'ㅣ': '1-3-5',
  'ㅐ': '1-2-3-5', 'ㅔ': '1-3-4-5', 'ㅖ': '3-4',
  'ㅘ': '1-2-3-6', 'ㅝ': '1-2-3-4', 'ㅚ': '1-3-4-5-6', 'ㅢ': '2-4-5-6',
  'ㅒ': ['3-4-5', '1-2-3-5'], 'ㅙ': ['1-2-3-6', '1-2-3-5'],
  'ㅞ': ['1-2-3-4', '1-2-3-5'], 'ㅟ': ['1-3-4', '1-2-3-5']
};
const BRAILLE_NUMBER_SIGN = '3-4-5-6';
const BRAILLE_NUMBERS = { '1': '1', '2': '1-2', '3': '1-4', '4': '1-4-5', '5': '1-5', '6': '1-2-4', '7': '1-2-4-5', '8': '1-2-5', '9': '2-4', '0': '2-4-5' };
// 문장 부호 중 한 칸짜리만(규정 제49·61항으로 2026-11-15 다시 확인). 쉼표(5)는 ㄹ 첫소리, 아포스트로피(3)는 ㅅ 받침과 점이 같다. 쌍점·쌍반점·별표 등은 두 칸이라 braille-core.js에서 다룬다.
const BRAILLE_PUNCTUATION = { '.': '2-5-6', '?': '2-3-6', '!': '2-3-5', ',': '5', '-': '3-6', "'": '3' };

function decomposeHangul(char) {
  const code = char.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const offset = code - 0xAC00;
    const jongIndex = offset % 28;
    const jungIndex = ((offset - jongIndex) / 28) % 21;
    const choIndex = (((offset - jongIndex) / 28) - jungIndex) / 21;
    const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    const JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
    const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    return { isHangul: true, cho: CHO[choIndex], jung: JUNG[jungIndex], jong: JONG[jongIndex] };
  }
  return { isHangul: false };
}
function dotsToArr(dots) { return dots ? dots.split('-').map(Number) : []; }
// text → [{dots:[1,4],char:'ㄱ',kind:'초성',verified:true}, ...] (된소리·복합모음은 여러 칸으로 자동 전개)
function textToBrailleCells(text) {
  const cells = []; let numberMode = false;
  const push = (dots, ch, kind, verified) => { const arr = Array.isArray(dots) ? dots : [dots]; arr.forEach(d => cells.push({ dots: dotsToArr(d), char: ch, kind, verified: verified !== false })); };
  for (const char of text) {
    if (/[0-9]/.test(char)) { if (!numberMode) { push(BRAILLE_NUMBER_SIGN, '수표', '기호'); numberMode = true; } push(BRAILLE_NUMBERS[char], char, '숫자'); continue; }
    numberMode = false;
    if (char === ' ') { cells.push({ dots: [], char: '␣', kind: '띄어쓰기', verified: true }); continue; }
    if (BRAILLE_PUNCTUATION[char] !== undefined) { push(BRAILLE_PUNCTUATION[char], char, '부호'); continue; }
    const d = decomposeHangul(char);
    if (!d.isHangul) { cells.push({ dots: [], char: char + '(미지원)', kind: '미지원', verified: false }); continue; }
    if (d.cho !== 'ㅇ') { const c = BRAILLE_CHO[d.cho]; if (c) push(c, d.cho, '초성'); else cells.push({ dots: [], char: d.cho + '(미지원)', kind: '초성', verified: false }); }
    const j = BRAILLE_JUNG[d.jung]; if (j) push(j, d.jung, '중성'); else cells.push({ dots: [], char: d.jung + '(미지원)', kind: '중성', verified: false });
    if (d.jong) { const jo = BRAILLE_JONG[d.jong]; if (jo) push(jo, d.jong, '종성'); else cells.push({ dots: [], char: d.jong + '(미지원)', kind: '종성', verified: false }); }
  }
  return cells;
}
// 초성 자모 목록(연습용 가이드에 순서대로 보여줄 때 사용)
const BRAILLE_CHO_ORDER = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const BRAILLE_JUNG_ORDER = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];
const BRAILLE_JUNG_COMPOUND_ORDER = ['ㅐ', 'ㅔ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅢ', 'ㅒ', 'ㅙ', 'ㅞ', 'ㅟ'];
const BRAILLE_JONG_ORDER = ['ㄱ', 'ㄴ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
// 점 조합 → 글자(역방향, 점자 패드 연습용). 여러 표에서 같은 조합을 찾는다
function dotsKeyToChar(dotsArr) {
  const key = dotsArr.slice().sort((a, b) => a - b).join('-');
  for (const [tbl, kind] of [[BRAILLE_CHO, '초성'], [BRAILLE_JONG, '종성'], [BRAILLE_JUNG, '중성'], [BRAILLE_NUMBERS, '숫자']]) {
    for (const k in tbl) { const v = tbl[k]; if (!Array.isArray(v) && v === key) return { char: k, kind }; }
  }
  if (key === BRAILLE_NUMBER_SIGN) return { char: '수표', kind: '기호' };
  for (const k in BRAILLE_PUNCTUATION) if (BRAILLE_PUNCTUATION[k] === key) return { char: k, kind: '부호' };
  return null;
}
