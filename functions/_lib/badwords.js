// 의견 게시판 욕설 거르기(2026-11-19 작업자님 요청).
// 글·제목·댓글·닉네임에 욕설이 있으면 올리지 않고 「고운 말로 바꿔 주세요」라고 알려 준다.
// 단어 목록 방식이라 완벽하지 않다. 멀쩡한 말이 걸리지 않게 일부러 좁게 잡았고, 빠져나간 것은 신고(3건 자동 숨김)와 관리 화면으로 처리한다.
//  - 「새끼」(새끼손가락·강아지 새끼), 「꺼져」(불이 꺼져), 「닥쳐」(닥쳐오는), 「보지」(보지 못했다), 「졸라」(엄마를 졸라서),
//    「염병」(전염병), 「시바」(시바견), 「십팔」(18) 처럼 다른 뜻으로 흔히 쓰는 말은 넣지 않았다.
//  - 「벙어리」「귀머거리」 같은 농인 비하 말은 「이렇게 부르면 안 돼요」 같은 배움 글에도 쓰여서 막지 않는다(신고로 처리).
// 시험: tests/board-words.mjs(막아야 할 말·통과해야 할 말 목록)

const WORDS = [
  // 씨발 무리
  '씨발', '씨빨', '씨팔', '씨바', '씨벌', '씨펄', '씨부랄', '씨부럴', '씨이발', '시발', '시빨', '시펄', '시이발', '쓰발', '쓰벌', '싀발', 'ㅅ발', 'ㅆ발', '썅',
  '씹새', '씹년', '씹할', '씹창', '씹팔', '씹선비', '씹덕',          // 「씹」 하나만으로는 막지 않음(껌 씹지 마)
  // 병신 무리
  '병신', '븅신', '빙신', '병싄', '병쉰', '븅딱', 'ㅂ신',
  // 개새끼 무리(「새끼」 하나만으로는 막지 않음)
  '개새끼', '개새기', '개색기', '개색히', '개색끼', '개세끼', '개섀끼', '개쌔끼', '개쎄끼', '개새꺄', '개쉐이',
  // 그 밖의 욕
  '좆', '존나', '존내', '지랄', '미친놈', '미친년', '미친새끼', '미친뇬', '쌍년', '썅년', '창녀',
  // 부모 욕
  '니애미', '니애비', '느금', '니미럴', '니기미', '엠창', '애미없', '애비없',
  // 혐오 표현
  '장애충', '틀딱', '맘충', '한남충', '김치녀', '급식충', '짱깨', '쪽바리', '쪽발이',
  // 영어
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'nigger', 'nigga'
];
// 욕설이 들어 있지만 다른 뜻인 낱말(먼저 지우고 검사한다)
const ALLOW = ['시발점', '시발역', '시발택시', '시발차', '질병신', '투병신'];
// 「9시발 기차」(9시에 떠나는)처럼 숫자 바로 뒤의 「시발」은 시각이라 숫자를 지우기 전에 뺀다
const TIME_RE = /\d\s*시\s*발/g;
// 자음만 쓴 줄임말은 다른 뜻이 없는 「ㅅㅂ」「ㅆㅂ」만, 붙여 쓴 것만 본다.
// 「ㅄ」「ㅂㅅ」는 점자 겹받침 공부(「없다」의 ㅄ 받침)에 쓰여서 막지 않는다. 띄어 쓴 「ㅂ, ㅅ 지문자」도 배움 글이라 통과.
const JAMO = /ㅅㅂ|ㅆㅂ/;

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORD_RE = new RegExp(WORDS.map(esc).join('|'), 'u');
const ALLOW_RE = new RegExp(ALLOW.map(esc).join('|'), 'gu');
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };

// 숫자·기호를 끼워 넣거나(시1발, 씨.발) 한 글자씩 띄어 쓴 것(씨 발, f u c k)을 붙여서 본다.
// 두 글자 이상인 낱말 사이의 띄어쓰기는 그대로 둔다(「다시 발견」「그 병 신청」이 걸리지 않게).
function squash(s) {
  const toks = s.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of toks) {
    if ([...t].length === 1 && out.length && out[out.length - 1].single) out[out.length - 1].t += t;
    else out.push({ t, single: [...t].length === 1 });
  }
  return out.map(o => o.t).join(' ');
}
const mask = w => { const c = [...w]; return c[0] + '*'.repeat(Math.max(1, c.length - 1)); };

// 욕설이 있으면 가린 모양(「씨*」)을, 없으면 '' 를 돌려준다
export function badWord(raw) {
  const base = String(raw == null ? '' : raw).normalize('NFC')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))   // 전각 글자(ｆｕｃｋ) → 보통 글자
    .toLowerCase();
  const j = base.match(JAMO);
  if (j) return mask(j[0]);
  const s = base.replace(TIME_RE, ' ');
  for (const v of [squash(s), squash(s.replace(/[013457@$!]/g, c => LEET[c]))]) {
    const m = v.replace(ALLOW_RE, ' ').match(WORD_RE);
    if (m) return mask(m[0]);
  }
  return '';
}
