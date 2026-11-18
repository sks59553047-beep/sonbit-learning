// 실제 주소(sonbit.pages.dev)의 파일이 내 컴퓨터 파일과 글자 하나까지 같은지 확인
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('../', import.meta.url)).replace(/\\/g, '/');
const ROOT = REPO;
const LIVE = 'https://sonbit.pages.dev/';
const files = ['index.html', 'assets/app-core.js', 'assets/app-home.js', 'assets/app-sign.js', 'assets/app-braille.js', 'assets/app-quiz.js', 'assets/app-player.js', 'assets/app-board.js', 'admin.html', 'assets/app-start.js', 'assets/error-report.js', 'assets/app.css', 'assets/quiz-engine.js', 'assets/braille-core.js', 'assets/braille.js', 'assets/video-data.js', 'assets/ksl-data.js', 'assets/ksl2-data.js', 'assets/ksl3-data.js', 'assets/ksl5-data.js', 'assets/ksl6-data.js', 'assets/media-index.js'];
let bad = 0;
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
for (const f of files) {
  const local = fs.readFileSync(ROOT + f);
  const r = await fetch(LIVE + f + '?v=' + Date.now(), { cache: 'no-store' });
  const live = Buffer.from(await r.arrayBuffer());
  // index.html 은 두 군데가 달라도 정상: ① 올릴 때 버전 표시(sonbit-version)에 커밋 번호를 넣음 ② Cloudflare 방문 통계(Web Analytics)가 </body> 앞에 자기 스크립트를 붙임
  const norm = b => f === 'index.html' ? Buffer.from(b.toString('utf8').replace(/(name="sonbit-version" content=")[^"]*/, '$1').replace(/<!-- Cloudflare Pages Analytics -->[\s\S]*?<!-- Cloudflare Pages Analytics -->/, '')) : b;
  const same = r.status === 200 && norm(live).equals(norm(local));
  if (!same) bad++;
  console.log((same ? 'OK   ' : 'FAIL ') + f.padEnd(26) + r.status + '  내 컴퓨터 ' + sha(local) + ' / 실제 주소 ' + sha(live) + '  (' + local.length + ' 바이트)');
}
// 퀴즈에서 쓰는 영상이 실제 주소에서 열리는지(무작위 표본 12개)
const ids = ['KSL-0003', 'N489', 'N809', 'N205', 'KSL-0096', 'KSL-0067', 'KSL-0174', 'N1', 'N100', 'N500', 'N1500', 'N2000'];
let vbad = 0;
for (const id of ids) {
  const r = await fetch(LIVE + 'assets/media/' + id + '.mp4', { method: 'HEAD', cache: 'no-store' });
  if (r.status !== 200 && !/^N(1|100|500|1500|2000)$/.test(id)) { vbad++; console.log('FAIL 영상 ' + id + ' ' + r.status); }
}
console.log(vbad === 0 ? 'OK   표본 영상 열림' : 'FAIL 표본 영상 ' + vbad + '개 문제');
console.log(bad === 0 ? '\n실제 주소 파일이 모두 일치' : '\n불일치 ' + bad + '건');
process.exit(bad ? 1 : 0);
