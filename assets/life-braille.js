// 손빛 배움터 — 「생활 속 점자」(2026-11-21): 주변에서 점자를 볼 수 있는 곳.
// 점자 모양은 사이트의 점자 엔진(「한국 점자 규정」 2024)이 만든 예시다. 2026-11-21: 인터넷에 공개된 실물 사진에서 점을 하나하나 읽어
// 엔진 결과와 점 하나까지 같은 글자에는 real(실물 확인 출처)을 단다. 사진이 흐리거나 비스듬해 확실히 읽히지 않은 것은 표시하지 않는다.
// 사실은 아래 출처에서 확인한 것만 적는다(법령은 원문, 기사는 본문에서 확인). 확인 못 한 내용(예: 엘리베이터 「열림·닫힘」 점자, 우유 팩 홈)은 넣지 않았다.
// kind: law = 법으로 정해짐, guide = 정부 지침·시범 사업, survey = 조사, company = 업체 사례
'use strict';
const LAW_URL = 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9E%A5%EC%95%A0%EC%9D%B8%E3%86%8D%EB%85%B8%EC%9D%B8%E3%86%8D%EC%9E%84%EC%82%B0%EB%B6%80%EB%93%B1%EC%9D%98%ED%8E%B8%EC%9D%98%EC%A6%9D%EC%A7%84%EB%B3%B4%EC%9E%A5%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99';
const LAW_SRC = n => ({ label: `편의증진법 시행규칙 별표 1(${n})`, url: LAW_URL });
// 실물 사진 출처(점을 직접 읽어 확인)
const REAL = {
  elev: { label: '실물 사진: 아시아경제(2021) LG헬로비전 엘리베이터 점자 스티커', url: 'https://www.asiae.co.kr/en/article/2021072708420182161' },
  toilet: { label: '실물 사진: 판매 중인 화장실 점자 표지판(11번가 상품)', url: 'https://www.11st.co.kr/products/9011798381' },
  can: { label: '실물 사진: 캔 뚜껑 점자 인식 논문(한국컴퓨터정보학회, 2022)', url: 'https://www.koreascience.or.kr/article/CFKO202232249557451.pdf' },
};
const LIFE_BRAILLE = [
  { place: '엘리베이터 버튼', kind: 'law', words: [{ w: '1', real: 'elev' }, { w: '2', real: 'elev' }, { w: '3', real: 'elev' }, { w: '개', real: 'elev' }, { w: '폐', real: 'elev' }, { w: '호출', real: 'elev' }, { w: '상', real: 'elev' }, { w: '하', real: 'elev' }],
    say: '버튼에는 층수 등을 점자로 표시해야 해요. 조작반과 비상 통화장치에도 점자를 붙여야 해요. 실제 엘리베이터 점자 스티커에는 열림·닫힘을 「개」·「폐」로, 위·아래 방향을 「상」·「하」로 적은 것도 있어요. 그 스티커에서 지하층 「B1」은 대문자표 없이 적혀 있었는데, 규정은 대문자표(6번 점)를 붙여요.',
    src: [LAW_SRC('9. 장애인용 승강기')] },
  { place: '계단·복도 손잡이', kind: 'law', words: ['2층', '3층', '올라감', '내려감'],
    say: '손잡이 양 끝과 꺾이는 곳에 층수·위치를 알려 주는 점자표지판을 붙여야 해요. 에스컬레이터 손잡이도 마찬가지예요. 실제로는 「내려감」처럼 방향만 적힌 손잡이 점자도 있다는 지적이 있어요.',
    src: [LAW_SRC('7·8·10호(손잡이)'), { label: '뉴시스: 점자, 규격 제각각에 무의미한 내용도(2022)', url: 'https://www.newsis.com/view/NISX20221103_0002072976' }] },
  { place: '화장실 출입구', kind: 'law', words: [{ w: '남자화장실', real: 'toilet' }, { w: '여자화장실', real: 'toilet' }],
    say: '출입구 옆 벽 1.5m 높이에 남자용과 여자용을 구별하는 점자표지판을 붙여야 해요.',
    src: [LAW_SRC('13. 화장실')] },
  { place: '세면대·욕실 수도꼭지', kind: 'law', words: ['냉수', '온수'],
    say: '수도꼭지에는 찬물과 더운물(냉수·온수) 구분을 점자로 표시해야 해요. 샤워실은 「표시할 수 있다」로 되어 있어요.',
    src: [LAW_SRC('13~15호')] },
  { place: '사무실·객실 출입문', kind: 'law', words: ['회의실', '민원실'],
    say: '여러 사람이 이용하는 사무실 등의 출입문 옆 벽 1.5m 높이에 방 이름 점자표지판을 붙여야 해요. 숙박 객실도 같아요.',
    src: [LAW_SRC('6·19호')] },
  { place: '자동판매기·발매기 버튼', kind: 'law', words: ['생수', '1,000원'],
    say: '조작 버튼에는 품목·금액·목적지 등을 점자로 표시해야 해요.',
    src: [LAW_SRC('22호')] },
  { place: '점자안내판·촉지도', kind: 'law', words: [],
    say: '건물의 주요 시설이나 방 배치를 점자, 볼록한 면, 선으로 간단히 나타낸 안내판이에요. 가운데가 바닥에서 1.0~1.2m 높이에 오게 설치해요.',
    src: [LAW_SRC('17호')] },
  { place: '약 상자', kind: 'guide', words: ['눈약'],
    say: '의약품 점자 표시는 식약처 지침이 있어요(2026년 10월 개정). 서울시는 맹학교·시각장애인복지관 근처 약국에서 「눈약」처럼 큰 글자와 점자를 함께 적은 스티커를 붙여 주는 시범 사업을 했어요.',
    src: [{ label: '정책브리핑: 식약처 의약품 점자 지침 개정', url: 'https://www.korea.kr/news/reporterView.do?newsId=148975155' }, { label: '서울시: 약국 점자 스티커 복약 안내', url: 'https://news.seoul.go.kr/welfare/archives/32345' }] },
  { place: '음료 캔 뚜껑', kind: 'company', words: [{ w: '음료', real: 'can' }, '탄산', '맥주'],
    say: '캔 뚜껑에는 대개 「음료」·「탄산」·「맥주」처럼 종류만 적혀 있고, 제품 이름은 없는 경우가 많아요. 조사에서 캔은 89개 중 80개에 점자가 있었지만 페트병은 102개 중 14개뿐이었어요.',
    src: [{ label: '한경비즈니스: 음료수 제품명도 겨우 기재(2022)', url: 'https://magazine.hankyung.com/business/article/202211046690b' }, { label: '쿠키뉴스: 음료·컵라면 점자 표시 조사(2022)', url: 'https://www.kukinews.com/article/view/kuk202209140141' }] },
  { place: '식품 전체(음료·컵라면 등)', kind: 'survey', words: [],
    say: '한국소비자원이 음료·컵라면 등 321개를 살펴보니 점자가 있는 제품은 121개(37.7%)였고, 점자가 있는 78개 가운데 72개(92.3%)는 읽기 좋은 정도가 「중」에 못 미쳤어요. 식품은 점자 표시가 의무가 아니고, 식약처 지침은 제품 이름을 기본으로 적도록 권해요.',
    src: [{ label: '쿠키뉴스: 음료·컵라면 점자 표시 조사(2022)', url: 'https://www.kukinews.com/article/view/kuk202209140141' }, { label: '더나은미래: 식약처 식품 점자 지침', url: 'https://futurechosun.com/archives/66312' }] },
  { place: '신용카드', kind: 'company', words: [],
    say: '카드사에 따라 카드 정보를 점자로 새긴 점자 카드를 만들어 주거나 점자 스티커를 줘요. 모든 상품을 점자 카드로 내주는 곳은 많지 않아요.',
    src: [{ label: '카드고릴라: 점자 신용카드의 현주소', url: 'https://www.card-gorilla.com/contents/detail/705' }] },
  { place: '점자가 있어도 틀린 곳', kind: 'survey', words: [],
    say: '국립국어원 조사(2020)에서 전북 행정복지센터 378곳 가운데 점자를 바르게 설치한 곳은 99곳이었어요. 104곳은 위치나 층 정보가 틀렸고, 175곳은 아예 없었어요.',
    src: [{ label: '전북일보 사설(2021)', url: 'https://www.jjan.kr/article/20210928741036' }] },
];
const LIFE_KIND = { law: '법으로 정해짐', guide: '정부 지침', survey: '조사', company: '업체 사례' };
