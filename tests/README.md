# 손빛 배움터 시험

사이트를 고친 뒤 사이트에 올리기 전에 돌리는 자동 시험입니다. 화면 없는 크롬을 띄워 실제로 버튼을 누르고, 결과를 확인합니다.

## 준비

설치할 것이 없습니다. Node.js 22 이상과 구글 크롬만 있으면 됩니다(크롬 위치가 기본과 다르면 `CHROME` 환경 변수로 알려 주기).

## 돌리기

| 명령 | 하는 일 | 걸리는 시간 |
|---|---|---|
| `node tests/run-all.mjs` | 내 컴퓨터 파일로 전부 | 15분 안팎 |
| `node tests/run-all.mjs --quick` | 오래 걸리는 시험(종합·기능 전체·좁은 화면 등)을 빼고 | 5분 안팎 |
| `node tests/run-all.mjs --live` | 실제 주소(https://sonbit.pages.dev)로, 올린 뒤 확인 | 15분 안팎 |

시험용 서버(127.0.0.1:8765)와 크롬(디버그 포트 9333)은 실행기가 알아서 켜고 끕니다. 시험이 만드는 그림과 임시 파일은 `tests/out/`에 생기고 git에는 올라가지 않습니다.

## 시험 목록

| 파일 | 확인하는 것 |
|---|---|
| `../braille-tests/run-all.mjs` | 「한국 점자 규정」(2024) 예시 227개를 변환 엔진이 똑같이 바꾸는지 |
| `quiz-sim.mjs` | 퀴즈 문제를 수만 개 만들어 정답이 둘이 되거나 보기가 겹치지 않는지, 난이도 배분이 맞는지 |
| `contrast.mjs` | 글자와 바탕의 색 대비(WCAG AA) |
| `smoke.mjs` | 첫 화면, 수어·점자·퀴즈 화면이 오류 없이 뜨는지 |
| `video-placement.mjs` | 교육 영상이 학습 페이지 기초 영상 + 점자 탭 교육 영상 칸 두 자리에만 있고 10편이 모두 열리는지 |
| `review1-fixes.mjs` | 퀴즈 전환 안내, 복습할 문제 표시, 점자 칸 수 표현, 복사 안내 |
| `review2-fixes.mjs` | 저장 실패 안내, 대본 뒤섞임 방지, 기록 백업(풀던 퀴즈 포함), 점자 범위 이름 |
| `keyboard.mjs` | 키보드만으로 퀴즈를 시작·답·다음 문제까지 풀 수 있는지 |
| `video-fail.mjs` | 영상을 못 불러올 때 안내와 「다시 불러오기」 |
| `migrate.mjs` | 예전 방식으로 저장된 기록이 있는 기기에서 오류 없이 정리되는지 |
| `pad-two.mjs` / `pad-two-fit.mjs` | 점자 연습 패드 두 칸 읽기, 좁은 화면에 들어가는지 |
| `quiz-practice-link.mjs` | 점자 퀴즈 해설의 연습 버튼: 한두 칸은 연습 패드, 세 칸 이상은 글자 바꾸기(정답 글자가 들어가고 점자가 정답과 같은지) |
| `hidden-video.mjs` | 다른 화면으로 가면 영상이 멈추는지, 점자 변환 200자 제한 |
| `no-notation.mjs` | 수어 사전에 누리사전 표기 기호 그림이 안 나오는지 |
| `features.mjs` | 단어장, 검색, 퀴즈(연습·도전·이어 풀기·복습), 기록 내보내기·가져오기·지우기 |
| `qa.mjs` | 종합: 퀴즈 종류×난이도×범위 19가지를 끝까지 풀기 등 |
| `overflow.mjs` | 320·360·390px 화면과 큰 글자에서 옆으로 넘치는 곳이 없는지 |
| `error-report-live.mjs` | 실제 사이트에서 일부러 오류를 내면 GitHub 이슈(auto-error)가 생기는지(실제 주소에서만, gh 로그인 필요, 만든 이슈는 스스로 닫음) |
| `verify-live.mjs` | 실제 주소의 파일이 내 컴퓨터 파일과 글자 하나까지 같은지(`--live`에서만) |

`lib/cdp.mjs`는 크롬을 조작하는 도우미, `lib/serve.mjs`는 시험용 정적 서버입니다.

## 오류 자동 보고

사이트(`assets/error-report.js`)가 사용자 화면의 오류를 `/api/error`로 보내면, Cloudflare 함수(`functions/api/error.js`)가 GitHub 이슈(라벨 `auto-error`)로 올립니다. 개인정보는 보내지 않습니다. GitHub 열쇠는 Cloudflare 비밀값 `GITHUB_TOKEN`(이 저장소 이슈 쓰기 권한만)에만 있습니다. 사이트를 올릴 때 `functions` 폴더를 wrangler 를 실행하는 폴더에 함께 두어야 함수가 같이 올라갑니다.

새 오류 확인: `gh issue list --label auto-error`
