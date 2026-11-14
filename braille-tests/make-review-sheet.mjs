// 점자 전문가 검수용 표 만들기: 규정 예시 + 변환기 결과(유니코드 점자)를 한 줄씩 적는다.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const KB = createRequire(import.meta.url)('../assets/braille-core.js');
const uni = (brf) => KB.brfToDots(brf.replace(/`/g, ' ').replace(/\n/g, ' ')).map(k => k === '' ? ' ' : String.fromCharCode(0x2800 + [...k].reduce((v, n) => v | (1 << (Number(n) - 1)), 0))).join('');
const eng = (text) => KB.convert(text).cells.filter(c => c.kind !== '줄바꿈').map(c => c.dots.length ? String.fromCharCode(0x2800 + c.dots.reduce((v, n) => v | (1 << (n - 1)), 0)) : ' ').join('');
const rows = [['번호', '출처(조항 또는 쪽)', '글자', '규정 본문의 점자', '변환기 결과', '일치', '검수 의견(맞음/틀림/모르겠음)', '고칠 점자(틀릴 때)']];
let n = 0;
const manual = JSON.parse(fs.readFileSync(new URL('./manual-cases.json', import.meta.url), 'utf8'));
const frozen = JSON.parse(fs.readFileSync(new URL('./frozen-cases.json', import.meta.url), 'utf8'));
const add = (src, text, brf) => { const a = uni(brf).replace(/ +/g, ' ').trim(), b = eng(text).replace(/ +/g, ' ').trim(); rows.push([++n, src, text.replace(/\n/g, '⏎'), a, b, a.replace(/ /g, '') === b.replace(/ /g, '') ? '일치' : '다름', '', '']); };
for (const c of manual) add(c.ref, c.text, c.brf);
for (const c of frozen) add('규정 PDF ' + (c.p - 6) + '쪽', c.text, c.brf);
const csv = '\uFEFF' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
fs.writeFileSync(new URL('./점자_검수용_예시표.csv', import.meta.url), csv);
console.log('행', rows.length - 1, '| 다름', rows.filter(r => r[5] === '다름').length);
