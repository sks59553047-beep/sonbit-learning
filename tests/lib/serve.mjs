// 로컬 시험용 정적 서버(영상 Range 요청 지원). 사용: node serve.mjs <폴더> <포트>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const port = +process.argv[3] || 8765;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('404'); }
    const ext = path.extname(f).toLowerCase();
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const s = m[1] ? +m[1] : 0, en = m[2] ? +m[2] : st.size - 1;
      res.writeHead(206, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Content-Range': `bytes ${s}-${en}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': en - s + 1 });
      fs.createReadStream(f, { start: s, end: en }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    }
  });
}).listen(port, '127.0.0.1', () => console.log('serving', root, port));
