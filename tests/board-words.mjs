// 의견 게시판 욕설 거르기 시험: 막아야 할 말은 막고, 비슷하지만 멀쩡한 말은 통과시키는지 본다.
// 사용: node board-words.mjs   (브라우저·서버 필요 없음)
import { badWord } from '../functions/_lib/badwords.js';

const BLOCK = [
  '씨발 진짜', '시1발', '씨.발', '씨~~발', '씨 발 놈아', 'ㅅㅂ 뭐야', 'ㅆㅂ', 'ㅅ발', '시이발',
  '병신같은 사이트', '병 신', '븅신', '개새끼', '개 새 끼', '개색기들', '씹새끼', '존나 어렵네', '좆같네', '지랄하네',
  '미친놈아', '느금마', '니애미', '틀딱', '장애충', '김치녀',
  'FUCK', 'f u c k', 'f.u.c.k', 'sh1t', 'ｆｕｃｋ', 'Bitch',
  '씨발'.normalize('NFD')                                   // 낱자로 풀어 쓴 글자(맥 등)
];
const PASS = [
  '시발점이 어디예요', '수어를 다시 발견했어요', '이 시 발음이 어려워요', '오전 9시발 부산행 기차', '새끼손가락을 펴세요',
  '강아지 새끼가 귀여워요', '우리 개 새끼를 낳았어요', '불이 꺼져 있었어요', '위기가 닥쳐오는 느낌', '아직 보지 못했어요',
  '엄마를 졸라서 배웠어요', '전염병 수어 알려 주세요', '시바견 수어', '십팔 번 문제', '18번 문제', '질병신고 수어',
  '그 병 신청은 어디서 해요', '지문자 ㅁㅂㅅㅇ 순서', 'ㅂ, ㅅ 지문자가 헷갈려요', 'ㅂ ㅅ 모양이 비슷해요', 'ㅄ 받침은 점자로 어떻게 써요', '없다의 ㅂㅅ 받침', '껌 씹지 마세요',
  '미친 듯이 재밌어요', '벙어리 대신 농인이라고 불러요', 'Shiitake', 'class hole', '수어 사전이 정말 도움이 돼요',
  '점자 연습 패드가 좋아요', '개선해 주세요', '시간 발표', '병원에 가요'
];
const wrongBlock = BLOCK.filter(t => !badWord(t));
const wrongPass = PASS.filter(t => badWord(t)).map(t => `${t} → ${badWord(t)}`);
const line = (ok, name, extra) => console.log((ok ? 'OK   ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
line(!wrongBlock.length, `W1 욕설 ${BLOCK.length}가지를 막음(숫자·기호 끼우기, 한 글자씩 띄어 쓰기, 자음 줄임말, 전각 글자, 영어 포함)`, wrongBlock.join(' | '));
line(!wrongPass.length, `W2 비슷하지만 멀쩡한 말 ${PASS.length}가지는 통과(시발점·새끼손가락·꺼져·보지 못했어요·9시발·ㅄ 받침 등)`, wrongPass.join(' | '));
line(badWord('씨발') === '씨*' && badWord('fuck') === 'f***', 'W3 안내에는 찾은 말의 첫 글자만 보여 줌(씨*, f***)', badWord('씨발') + ' ' + badWord('fuck'));
process.exit(wrongBlock.length || wrongPass.length ? 1 : 0);
