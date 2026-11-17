// 오류 자동 보고 끝까지 확인(실제 주소에서만): 사이트에서 일부러 오류를 내면 GitHub 이슈(auto-error)가 생기는지.
// 사용: node tests/error-report-live.mjs   (크롬 9333 이 켜져 있어야 함. gh 로그인 필요. 만든 시험 이슈는 스스로 닫는다)
import { execFileSync } from 'node:child_process';
import { open, check } from './lib/cdp.mjs';
const REPO = 'sks59553047-beep/sonbit-learning';
const tag = '시험' + Date.now().toString(36);
const c = await open({ w: 390, h: 844 });
await c.fresh('https://sonbit.pages.dev/?er=' + Date.now(), 3000);
await c.ev(`setTimeout(() => { throw new Error('[${tag}] 오류 보고 연결 확인(브라우저) - 저절로 닫힘'); }, 0)`);
await c.sleep(1500);
await c.close();
let issue = null;
for (let i = 0; i < 10 && !issue; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const list = JSON.parse(execFileSync('gh', ['api', `repos/${REPO}/issues?labels=auto-error&state=open&per_page=50`], { encoding: 'utf8' }));
  issue = list.find(x => x.title.includes(tag));
}
check('사이트에서 난 오류가 GitHub 이슈로 올라옴(한글 안 깨짐)', !!issue && issue.title.includes('오류 보고 연결 확인(브라우저)') && /화면: #home/.test(issue.body), issue ? `#${issue.number} ${issue.title}` : '이슈 없음');
if (issue) execFileSync('gh', ['issue', 'close', String(issue.number), '--repo', REPO, '--comment', '자동 시험으로 만든 이슈라 닫습니다.'], { stdio: 'ignore' });
process.exit(issue ? 0 : 1);
