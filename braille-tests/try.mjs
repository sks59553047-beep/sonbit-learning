import { createRequire } from 'node:module';
const KB = createRequire(import.meta.url)('../assets/braille-core.js');
const [text, brf] = process.argv.slice(2);
const exp = KB.brfToDots(brf.replace(/`/g, ' ').replace(/⏎/g, ' ')).filter(x => x !== '');
const r = KB.convert(text.replace(/⏎/g, '\n')); const got = r.cells.map(c => c.dots.join('')).filter(x => x !== '');
console.log(exp.join('|') === got.join('|') ? '일치' : '불일치\n 규정 ' + brf + '\n 엔진 ' + KB.toBrf(r.cells).replace(/ +/g, '`') + (r.unsupported.length ? '\n 지원안함 ' + r.unsupported.join('') : ''));
