// Cloudflare Pages Function: POST /api/error
// 사이트(assets/error-report.js)가 보낸 오류를 GitHub 저장소 sonbit-learning 의 이슈(라벨 auto-error)로 올린다.
// - GitHub 열쇠는 Cloudflare 비밀값 GITHUB_TOKEN(이 저장소의 Issues 쓰기 권한만 있는 토큰)에만 둔다. 코드에는 없다.
// - 손빛 사이트에서 온 요청만 받는다(Origin 확인). 크기·글자 수를 제한한다.
// - 같은 오류는 지문(fp)으로 묶는다: 열린 이슈가 이미 있으면 새로 만들지 않고 「또 났어요」 댓글만(이슈당 20개까지).
// - 같은 지문은 하루 한 번만 GitHub 에 다녀온다(Cloudflare 캐시). 그래서 많은 사람이 같은 오류를 만나도 이슈가 쏟아지지 않는다.
const REPO = 'sks59553047-beep/sonbit-learning';
const LABEL = 'auto-error';
const ALLOWED = ['https://sonbit.pages.dev'];

const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n);
async function fingerprint(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
}
function gh(env, path, init) {
  return fetch('https://api.github.com/repos/' + REPO + path, Object.assign({}, init, {
    headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'sonbit-error-reporter', 'Content-Type': 'application/json' }
  }));
}

export async function onRequestPost({ request, env, waitUntil }) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED.includes(origin)) return new Response('forbidden', { status: 403 });
  if (!env.GITHUB_TOKEN) return new Response('not configured', { status: 204 });
  const raw = await request.text();
  if (raw.length > 4000) return new Response('too large', { status: 413 });
  let d; try { d = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  const message = clean(d.message, 300), where = clean(d.where, 120), stack = clean(d.stack, 1500);
  const view = clean(d.view, 30), version = clean(d.version, 40), time = clean(d.time, 40);
  if (!message) return new Response('empty', { status: 400 });
  const ua = clean(request.headers.get('User-Agent'), 200);
  const fp = await fingerprint(message + '|' + where.replace(/:\d+$/, ''));

  // 하루 한 번만: 같은 지문이 캐시에 있으면 GitHub 에 가지 않는다
  const cache = caches.default, ck = new Request('https://sonbit-error.cache/' + fp);
  if (await cache.match(ck)) return new Response('ok (dup)', { status: 202 });
  waitUntil(cache.put(ck, new Response('1', { headers: { 'Cache-Control': 'max-age=86400' } })));

  const work = (async () => {
    const list = await gh(env, `/issues?state=open&labels=${LABEL}&per_page=100`);
    const open = list.ok ? await list.json() : [];
    const found = open.find(i => i.title.includes(`[${fp}]`));
    const facts = `- 화면: #${view}\n- 위치: ${where}\n- 시각(UTC): ${time}\n- 사이트 버전: ${version || '알 수 없음'}\n- 브라우저: ${ua}`;
    if (found) {
      if ((found.comments || 0) < 20) await gh(env, `/issues/${found.number}/comments`, { method: 'POST', body: JSON.stringify({ body: '같은 오류가 또 났어요.\n\n' + facts }) });
      return;
    }
    const body = `사이트가 자동으로 보낸 오류입니다(개인정보 없음).\n\n**오류**\n\`\`\`\n${message}\n\`\`\`\n${facts}\n\n**호출 순서(stack)**\n\`\`\`\n${stack || '(없음)'}\n\`\`\`\n\n고친 뒤에는 이 이슈를 닫아 주세요. 같은 오류가 다시 나면 새 이슈가 열립니다.`;
    await gh(env, '/issues', { method: 'POST', body: JSON.stringify({ title: `[오류 ${fp}] ${message.slice(0, 80)}`, body, labels: [LABEL] }) });
  })();
  waitUntil(work.catch(() => {}));
  return new Response('ok', { status: 202 });
}
export const onRequest = () => new Response('method not allowed', { status: 405 });
