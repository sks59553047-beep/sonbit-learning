// 손빛 배움터 시험을 한 번에 돌린다.
//   node tests/run-all.mjs           내 컴퓨터 파일로 전부(15분 안팎)
//   node tests/run-all.mjs --quick   오래 걸리는 시험(종합·기능 전체·좁은 화면 등)을 빼고(5분 안팎)
//   node tests/run-all.mjs --live    실제 주소(https://sonbit.pages.dev)를 대상으로(올린 뒤 확인용)
// 시험용 정적 서버(127.0.0.1:8765)와 화면 없는 크롬(디버그 포트 9333)을 알아서 켜고, 끝나면 끈다.
// 크롬 위치가 다르면 CHROME 환경 변수로 알려 준다. 설치할 부품은 없다(Node 22 이상).
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'out');                       // 시험이 만드는 그림·임시 파일(git 제외)
const args = process.argv.slice(2);
const QUICK = args.includes('--quick'), LIVE = args.includes('--live');
const BASE = LIVE ? 'https://sonbit.pages.dev/' : 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
fs.mkdirSync(OUT, { recursive: true });

// [이름, 파일, 인자, 브라우저 필요, 오래 걸림, 통과 조건(출력에 이 글이 있어야)]
// 통과 조건이 없으면 「FAIL 로 시작하는 줄이 없고 종료 코드가 0」이면 통과로 본다.
const TESTS = [
  ['점자 규정 예시 283개(한글 227·영어 56) + 범위 밖 영어 5개', '../braille-tests/run-all.mjs', [], false, false, /불일치 0/],
  ['퀴즈 문제 시뮬레이션(정답 둘·보기 겹침·난이도 배분)', 'quiz-sim.mjs', [], false, false, /모든 점검 통과/],
  ['색 대비(밝은·어두운 화면)', 'contrast.mjs', [], false, false, /기준 미달 0 건/],
  ['의견 게시판 욕설 거르기(막을 말·통과시킬 멀쩡한 말)', 'board-words.mjs', [], false],
  ['학습 화면(소개 카드·기초 영상·로드맵·기록·접힌 출처, 글 줄임)', 'home-layout.mjs', [BASE], true],
  ['첫 화면과 기본 흐름', 'smoke.mjs', [BASE, 'mobile'], true],
  ['교육 영상 두 자리 배치·10편 열림', 'video-placement.mjs', [BASE, 'mobile'], true],
  ['다른 AI 검토 1차 보완(퀴즈 전환·복습 표시·점자 칸 수·복사 안내)', 'review1-fixes.mjs', [BASE, 'mobile'], true],
  ['다른 AI 검토 2차 보완(저장 실패·대본 순서·백업·범위 이름)', 'review2-fixes.mjs', [BASE], true],
  ['수어 단어 링크(#sign/번호로 열기·링크 공유·뒤로 가기)', 'sign-link.mjs', [BASE], true],
  ['다른 AI 검토 3차 보완(본문 바로가기·영상 주소 새로 고침·수어 목록 더 보기)', 'review3-fixes.mjs', [BASE], true],
  ['학습 기록 옮기기(내보내기·글로 복사·글로 붙여 넣기·휴대폰 공유)', 'record-transfer.mjs', [BASE], true],
  ['대본 따라가기·이전/다음 단어·시청 완료', 'transcript-nav.mjs', [BASE], true],
  ['실사용 평가 반영(같은 이름 수어·말끝 검색·점자 용어·힌트·처음 난이도)', 'real-use-fixes.mjs', [BASE], true],
  ['실사용 평가 반영 2(영상 고르기·약자 설명·점자 복사·단어장·퀴즈로 돌아가기·큰 글씨 제목·뒤로 가기)', 'real-use-fixes2.mjs', [BASE], true],
  ['실사용 평가 반영 3(크게 보기 영상 조절·0칸 복사·생활 속 점자 뒤로 가기·말끝·전화번호·물다)', 'real-use-fixes3.mjs', [BASE], true],
  ['지피티 평가 반영(공백만 남은 변환 복사 막기·생활 속 점자 돌아올 때 키보드 초점)', 'real-use-fixes4.mjs', [BASE], true],
  ['영어 낱말 점자(약자·규정 예시·못 바꾸는 영어 안내·예시 단추)', 'english-braille.mjs', [BASE], true],
  ['전체 점검 반영(검색 상자 전체 누르기·이름 뜻 줄 44px·붙여넣은 글 정리)', 'real-use-fixes5.mjs', [BASE], true],
  ['생활 속 점자(카드 12개·근거 링크·예시 점자·글자 바꾸기 연결·좁은 화면 버튼)', 'life-braille.mjs', [BASE], true],
  ['키보드만으로 퀴즈 풀기', 'keyboard.mjs', [BASE, 'desktop'], true],
  ['영상을 못 불러올 때 안내', 'video-fail.mjs', [BASE], true],
  ['예전 방식 기록 정리', 'migrate.mjs', [BASE], true],
  ['점자 연습 패드 두 칸', 'pad-two.mjs', [BASE, 'mobile'], true],
  ['퀴즈 해설 연습 버튼(세 칸 이상은 글자 바꾸기로)', 'quiz-practice-link.mjs', [BASE], true],
  ['안 보이는 영상 멈춤·변환 200자', 'hidden-video.mjs', [BASE], true],
  ['수어 표기 기호 그림이 안 나옴', 'no-notation.mjs', [BASE], true, true],
  ['기능 전체(단어장·검색·퀴즈·기록 내보내기/가져오기)', 'features.mjs', [BASE], true, true],
  ['종합(퀴즈 종류×난이도×범위 19가지 완주 등)', 'qa.mjs', [BASE, 'mobile'], true, true],
  ...(LIVE ? [['실제 주소 파일이 내 컴퓨터 파일과 같음', 'verify-live.mjs', [], false]]
    : [['좁은 화면(320~390px)·큰 글자에서 넘침 없음', 'overflow.mjs', [], true, true], ['두 칸 패드가 좁은 화면에 들어감', 'pad-two-fit.mjs', [], true],
       // 게시판은 내 컴퓨터의 시험용 저장소(SQLite)에만 글을 쓴다. 실제 주소 시험(--live)에서는 진짜 게시판에 글이 올라가므로 돌리지 않는다.
       ['의견 게시판 저장소 바꾸기(첫 판 → 일반 게시판 구조, 있던 글 보존)', 'board-migrate.mjs', [], false],
       ['의견 게시판 서버(글·댓글·본인 수정/삭제·조회수·신고·관리자·쪽 번호·검색)', 'board-api.mjs', [BASE], false],
       ['의견 게시판 화면 — 휴대폰(목록·글쓰기·댓글·수정·삭제·신고·관리 화면)', 'board-ui.mjs', [BASE, 'mobile'], true],
       ['의견 게시판 화면 — 컴퓨터(표 목록)', 'board-ui.mjs', [BASE, 'desktop'], true, true]])
].filter(t => !(QUICK && t[4]));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const up = async url => { try { return (await fetch(url)).ok; } catch { return false; } };
async function waitUp(url, what) { for (let i = 0; i < 60; i++) { if (await up(url)) return; await sleep(500); } throw new Error(what + '이(가) 켜지지 않았어요: ' + url); }

const started = [];
async function startServices() {
  if (!LIVE && !(await up('http://127.0.0.1:8765/index.html'))) {
    started.push(spawn(process.execPath, [path.join(HERE, 'lib/serve.mjs'), REPO, '8765'], { stdio: 'ignore' }));
    await waitUp('http://127.0.0.1:8765/index.html', '시험용 서버');
  }
  if (!(await up('http://127.0.0.1:9333/json/version'))) {
    const dir = path.join(os.tmpdir(), 'sonbit-test-chrome');
    started.push(spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + dir, 'about:blank'], { stdio: 'ignore' }));
    await waitUp('http://127.0.0.1:9333/json/version', '시험용 크롬');
  }
}
function stopServices() {
  for (const p of started) {
    try { if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); else p.kill('SIGKILL'); } catch { /* 이미 꺼짐 */ }
  }
}
function run(file, argv) {
  return new Promise(res => {
    const p = spawn(process.execPath, [path.join(HERE, file), ...argv], { cwd: OUT });
    let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    const t = setTimeout(() => { p.kill(); out += '\nFAIL 시간 초과(10분)'; }, 10 * 60 * 1000);
    p.on('close', code => { clearTimeout(t); res({ code, out }); });
  });
}

const needBrowser = TESTS.some(t => t[3]);
console.log(`손빛 배움터 시험 ${TESTS.length}개 · 대상 ${LIVE ? '실제 주소' : '내 컴퓨터 파일'}${QUICK ? ' · 빠른 시험' : ''}\n`);
let failed = 0; const t0 = Date.now();
try {
  if (needBrowser) await startServices();
  for (const [name, file, argv, , , re] of TESTS) {
    const s = Date.now(); const { code, out } = await run(file, argv);
    const fails = out.split('\n').filter(l => /^FAIL/.test(l));
    const ok = code === 0 && !fails.length && (!re || re.test(out));
    if (!ok) failed++;
    console.log(`${ok ? '통과' : '실패'}  ${name}  (${Math.round((Date.now() - s) / 1000)}초)`);
    if (!ok) { (fails.length ? fails : out.trim().split('\n').slice(-5)).slice(0, 8).forEach(l => console.log('      ' + l.slice(0, 200))); }
  }
} catch (e) { failed++; console.log('실패  시험 준비: ' + e.message); }
finally { stopServices(); }
console.log(`\n${failed ? '실패 ' + failed + '개' : '모두 통과'} · ${Math.round((Date.now() - t0) / 1000)}초`);
process.exit(failed ? 1 : 0);
