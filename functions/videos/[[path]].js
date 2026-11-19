// 교육 영상(/videos/*)을 「원하는 부분만」(HTTP Range) 보내 준다.
// Cloudflare Pages 는 이 사이트 파일을 늘 통째로(200) 보내서, 크롬 재생 바로 원하는 시간으로 옮길 수 없었다(2026-11-20 작업자님 제보).
// 파일은 2MB 안팎이라 한 번 읽어 필요한 부분만 잘라 206 으로 돌려준다. 영상이 아닌 파일(.jpg·.vtt)은 그대로 둔다.
export async function onRequestGet({ request, next }) {
  const res = await next();
  if (res.status !== 200 || !/\.mp4$/i.test(new URL(request.url).pathname)) return res;
  const headers = new Headers(res.headers);
  headers.set('Accept-Ranges', 'bytes');
  const range = request.headers.get('Range');
  if (!range) return new Response(res.body, { status: 200, headers });
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || (m[1] === '' && m[2] === '')) { headers.set('Content-Length', String(size)); return new Response(buf, { status: 200, headers }); }
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }           // 끝에서부터 n 바이트
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) { headers.set('Content-Range', `bytes */${size}`); headers.delete('Content-Length'); return new Response(null, { status: 416, headers }); }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(buf.slice(start, end + 1), { status: 206, headers });
}
