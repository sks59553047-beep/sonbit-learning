// 통일영어점자(UEB) 2급(약자 점자) — 국어 문장 속 영어 낱말(소문자·첫 글자만 대문자)을 약자로 적는다.
// 「한국 점자 규정」제28·32항은 로마자를 「통일영어점자 규정」에 따라 적으라고 한다. 이 파일은 그 영어 쪽 규칙을 따로 구현한 것이다.
// 기준: 통일영어점자 규칙집(UEB Rulebook) 제10장 약자 — 낱말 약자(wordsign), 짧은 형태(shortform), 묶음 약자(groupsign).
// 시험: braille-tests/ueb-check.mjs (공개 영어 낱말 목록과 공개 점자 변환기(liblouis) 결과를 견주어 일치율을 잰다).
// 사전이 없어서 「앞가지(be·con·dis)」나 「합성어 경계」처럼 낱말 뜻을 알아야 정해지는 곳은 글자 규칙과 예외 목록으로 근사한다.
(function (root) {
  'use strict';
  const LETTER = { a: '⠁', b: '⠃', c: '⠉', d: '⠙', e: '⠑', f: '⠋', g: '⠛', h: '⠓', i: '⠊', j: '⠚', k: '⠅', l: '⠇', m: '⠍', n: '⠝', o: '⠕', p: '⠏', q: '⠟', r: '⠗', s: '⠎', t: '⠞', u: '⠥', v: '⠧', w: '⠺', x: '⠭', y: '⠽', z: '⠵' };
  // 묶음 약자: 낱말 어디에서나(ing 은 낱말 맨 앞 제외)
  const STRONG = { ch: '⠡', gh: '⠣', sh: '⠩', th: '⠹', wh: '⠱', ed: '⠫', er: '⠻', ou: '⠳', ow: '⠪', st: '⠌', ar: '⠜', ing: '⠬', and: '⠯', for: '⠿', of: '⠷', the: '⠮', with: '⠾' };
  const LOWER_ANY = { en: '⠢', in: '⠔' };
  const LOWER_MID = { ea: '⠂', bb: '⠆', cc: '⠒', ff: '⠖', gg: '⠶' };   // 낱말 앞·끝에는 못 씀
  // 끝글자 약자(점 46, 56): 낱말 맨 앞에는 못 씀
  const FINAL = { ound: '⠨⠙', ance: '⠨⠑', sion: '⠨⠝', less: '⠨⠎', ount: '⠨⠞', ence: '⠰⠑', ong: '⠰⠛', ful: '⠰⠇', tion: '⠰⠝', ness: '⠰⠎', ment: '⠰⠞', ity: '⠰⠽' };
  // 첫글자 약자(점 5·45·456 + 글자)
  const INIT = {
    day: '⠐⠙', ever: '⠐⠑', father: '⠐⠋', here: '⠐⠓', know: '⠐⠅', lord: '⠐⠇', mother: '⠐⠍', name: '⠐⠝', one: '⠐⠕', part: '⠐⠏', question: '⠐⠟', right: '⠐⠗', some: '⠐⠎', time: '⠐⠞', under: '⠐⠥', work: '⠐⠺', young: '⠐⠽',
    there: '⠐⠮', character: '⠐⠡', through: '⠐⠹', where: '⠐⠱', ought: '⠐⠳', upon: '⠘⠥', these: '⠘⠮', those: '⠘⠹', whose: '⠘⠱', word: '⠘⠺', cannot: '⠸⠉', had: '⠸⠓', many: '⠸⠍', spirit: '⠸⠎', their: '⠸⠮', world: '⠸⠺'
  };
  const INIT_START_ONLY = new Set(['there']);   // 낱말 맨 앞에서만 쓰는 첫글자 약자
  // 낱말 약자(낱말 전체일 때만): 한 글자로 적는 낱말(알파벳 낱말 약자)과 아래 낱말 약자
  const WHOLE = { but: '⠃', can: '⠉', do: '⠙', every: '⠑', from: '⠋', go: '⠛', have: '⠓', just: '⠚', knowledge: '⠅', like: '⠇', more: '⠍', not: '⠝', people: '⠏', quite: '⠟', rather: '⠗', so: '⠎', that: '⠞', us: '⠥', very: '⠧', will: '⠺', it: '⠭', you: '⠽', as: '⠵',
    child: '⠡', shall: '⠩', this: '⠹', which: '⠱', out: '⠳', still: '⠌', be: '⠆', enough: '⠢', were: '⠶', his: '⠦', in: '⠔', was: '⠴', there: '⠐⠮', and: '⠯', for: '⠿', of: '⠷', the: '⠮', with: '⠾' };
  // 짧은 형태(shortform) 76개 중 점자로 적는 모양
  const SHORT = {
    about: '⠁⠃', above: '⠁⠃⠧', according: '⠁⠉', across: '⠁⠉⠗', after: '⠁⠋', afternoon: '⠁⠋⠝', afterward: '⠁⠋⠺', again: '⠁⠛', against: '⠁⠛⠌', almost: '⠁⠇⠍', already: '⠁⠇⠗', also: '⠁⠇', although: '⠁⠇⠹', altogether: '⠁⠇⠞', always: '⠁⠇⠺',
    because: '⠆⠉', before: '⠆⠋', behind: '⠆⠓', below: '⠆⠇', beneath: '⠆⠝', beside: '⠆⠎', between: '⠆⠞', beyond: '⠆⠽', blind: '⠃⠇', braille: '⠃⠗⠇', children: '⠡⠝',
    conceive: '⠒⠉⠧', conceiving: '⠒⠉⠧⠛', could: '⠉⠙', deceive: '⠙⠉⠧', deceiving: '⠙⠉⠧⠛', declare: '⠙⠉⠇', declaring: '⠙⠉⠇⠛', either: '⠑⠊', first: '⠋⠌', friend: '⠋⠗', good: '⠛⠙', great: '⠛⠗⠞', herself: '⠓⠻⠋', him: '⠓⠍', himself: '⠓⠍⠋',
    immediate: '⠊⠍⠍', little: '⠇⠇', letter: '⠇⠗', much: '⠍⠡', must: '⠍⠌', myself: '⠍⠽⠋', necessary: '⠝⠑⠉', neither: '⠝⠑⠊', oneself: '⠐⠕⠋', ourselves: '⠳⠗⠧⠎', paid: '⠏⠙', perceive: '⠏⠻⠉⠧', perceiving: '⠏⠻⠉⠧⠛', perhaps: '⠏⠻⠓',
    quick: '⠟⠅', receive: '⠗⠉⠧', receiving: '⠗⠉⠧⠛', rejoice: '⠗⠚⠉', rejoicing: '⠗⠚⠉⠛', said: '⠎⠙', should: '⠩⠙', such: '⠎⠡', themselves: '⠮⠍⠧⠎', thyself: '⠹⠽⠋', today: '⠞⠙', together: '⠞⠛⠗', tomorrow: '⠞⠍', tonight: '⠞⠝',
    would: '⠺⠙', its: '⠭⠎', itself: '⠭⠋', your: '⠽⠗', yourself: '⠽⠗⠋', yourselves: '⠽⠗⠧⠎'
  };
  // 짧은 형태 뒤에 붙어도 되는 끝(UEB 10.9): 복수·과거(s, d), 사람(r, rs), 어미(ly, er, est, y, lier, liest)
  const SHORT_SUFFIX = /^(?:s|d|r|rs|ly|er|est|y|lier|liest)$/;
  const dots = ch => { const c = ch.codePointAt(0) - 0x2800, d = []; for (let n = 1; n <= 8; n++) if (c & (1 << (n - 1))) d.push(n); return d; };
  const cellsOf = s => [...s].map(dots);
  // be·con·dis 앞가지(UEB 10.6): 한 음절 앞가지로 읽힐 때만. 낱말 뜻을 모르므로 뒤따르는 글자로 근사하고, 어긋나는 낱말은 PREFIX_EXC 로 바로잡는다
  const PREFIX = { be: '⠆', con: '⠒', dis: '⠲' };
  const PREFIX_RE = {
    be: /^be(?:[bfhjmopqwxz]|c(?=[^hkq])|d[ae]|g(?=[^gs])|in|l[aeiouwy]|n(?:e(?![dft])|[aiu])|r(?:a|e(?=[^n]))|s(?=[^st])|t(?=[^chst]))/,
    con: /^con(?:c(?!h)|est|s[a-z]|[abdfghijlmnopqrtuvwxyz])/,
    dis: /^dis(?:c(?=[a-rt-z])|ho|p(?!i)|[abdefgijlmnoqrstuvwxyz])/
  };
  const PREFIX_EXC = {};   // 낱말 → true(앞가지로 적음) / false(적지 않음): 글자 규칙을 뒤집는 낱말
  const prefixOk = (w, p) => Object.prototype.hasOwnProperty.call(PREFIX_EXC, w) ? PREFIX_EXC[w] : PREFIX_RE[p].test(w);
  // 한 낱말(소문자만)을 약자로 바꾼다. 돌려주는 값: [{ s: 글자, cells: [[점…]…], kind }]
  // 겹치는 약자는 칸이 가장 적게 드는 쪽을 고르고, 칸 수가 같으면 낮은 약자(en·in·ea 따위)를 덜 쓰는 쪽(UEB 10.10)
  const letterLike = new Set([...Object.values(SHORT), ...Object.values(WHOLE)].filter(b => [...b].length > 1).map(b => cellsOf(b).map(d => d.join('')).join('-')));   // 글자만으로 된 약자 모양(cd, fr…)
  const EXC = {};   // 낱말 → 점자(유니코드). 아래 「예외」 표
  const SHORT_NO = { abouts: 1, hims: 1, deceivingly: 1, blindest: 1, blinder: 1, muster: 1, shoulder: 1 };   // 짧은 형태가 아닌 낱말
  // 예외 낱말의 점자를 칸으로 나눈다(글자 대응은 칸마다 알 수 없으므로 첫 칸에 낱말 전체를 붙인다)
  const fromBraille = (w, br) => [...br].map((c, i) => ({ s: i === 0 ? w : '', cells: [dots(c)], kind: '약자(예외)' }));
  // 한국 점자 규정 제32항 붙임: 국어 문장 속에서는 be·enough·his·in·was·were 를 낱말 약자로 쓰지 않고 알파벳과 묶음 약자로 풀어 적는다(opt.lower 가 참이면 영어 문장처럼 낱말 약자를 쓴다)
  const LOWER_WORDSIGN = new Set(['be', 'enough', 'his', 'in', 'was', 'were']);
  // 제37항: 로마자표 바로 뒤의 영어 낱말은 알파벳 낱말 약자(but·can·…)도 쓰지 않고 풀어 적는다(opt.noAlpha)
  const ALPHA_WORDSIGN = new Set('but can do every from go have just knowledge like more not people quite rather so that us very will it you as'.split(' '));
  function word(w, opt, tail) {
    opt = opt || {};
    w = String(w).toLowerCase();
    if (!/^[a-z]+$/.test(w)) return null;
    const one = (s, braille, kind) => [{ s, cells: cellsOf(braille), kind }];
    if (!tail && EXC[w]) return fromBraille(w, EXC[w]);
    if (SHORT[w]) return one(w, SHORT[w], '짧은 형태');
    if (WHOLE[w] && (opt.lower || !LOWER_WORDSIGN.has(w)) && !(opt.noAlpha && ALPHA_WORDSIGN.has(w))) return one(w, WHOLE[w], '낱말 약자');
    if (w.length === 1) return one(w, LETTER[w], '영어');
    for (const b of Object.keys(SHORT)) if (w.length > b.length && w.startsWith(b) && SHORT_SUFFIX.test(w.slice(b.length)) && !SHORT_NO[w]) return [...one(b, SHORT[b], '짧은 형태'), ...word(w.slice(b.length), opt, true)];
    const n = w.length, cand = Array.from({ length: n }, () => []);   // cand[i]: i 에서 시작하는 [글자수, 점자, 종류, 낮은약자인가]
    const add = (i, k, br, kind, low) => { if (w.startsWith(k, i)) cand[i].push([k.length, br, kind, low ? 1 : 0]); };
    for (let i = 0; i < n; i++) {
      cand[i].push([1, LETTER[w[i]], '영어', 0]);
      for (const k of Object.keys(INIT)) if (!(INIT_START_ONLY.has(k) && i > 0)) add(i, k, INIT[k], '첫글자 약자', true);
      if (i > 0) for (const k of Object.keys(FINAL)) add(i, k, FINAL[k], '끝글자 약자');
      for (const k of Object.keys(STRONG)) if (!(k === 'ing' && i === 0)) add(i, k, STRONG[k], '묶음 약자');
      for (const k of Object.keys(LOWER_ANY)) add(i, k, LOWER_ANY[k], '묶음 약자', true);
      if (i > 0) for (const k of Object.keys(LOWER_MID)) if (i + k.length < n) add(i, k, LOWER_MID[k], '묶음 약자', true);
    }
    for (const p of Object.keys(PREFIX)) if (w.startsWith(p) && w.length > p.length && prefixOk(w, p)) cand[0].push([p.length, PREFIX[p], '앞가지 약자', 1]);
    const best = Array(n + 1).fill(null); best[n] = { cells: 0, low: 0 };
    for (let i = n - 1; i >= 0; i--) for (const [len, br, kind, low] of cand[i]) {
      const nx = best[i + len]; if (!nx) continue;
      const cells = nx.cells + [...br].length, lw = nx.low + low;
      if (!best[i] || cells < best[i].cells || (cells === best[i].cells && lw < best[i].low) || (cells === best[i].cells && lw === best[i].low && len > best[i].len)) best[i] = { cells, low: lw, len, br, kind };
    }
    const out = []; for (let i = 0; i < n; i += best[i].len) out.push({ s: w.slice(i, i + best[i].len), cells: cellsOf(best[i].br), kind: best[i].kind });
    if (!tail && !opt.noG1 && out.every(x => x.kind === '영어') && letterLike.has(out.map(x => x.cells.map(d => d.join('')).join('-')).join('-'))) out.unshift({ s: '', cells: [[5, 6]], kind: '1급 점자표' });
    if (!tail && out.length === 1 && out[0].s.length > 1 && /묶음|끝글자/.test(out[0].kind)) return [...w].map(c => ({ s: c, cells: cellsOf(LETTER[c]), kind: '영어' }));   // 낱말 하나가 묶음 약자 하나면(st·ch·ar·en…) 글자로
    return out;
  }
  const toUnicode = (w, opt) => { const r = word(w, opt); return r ? r.map(x => x.cells.map(d => String.fromCodePoint(0x2800 + d.reduce((a, n) => a | (1 << (n - 1)), 0))).join('')).join('') : null; };
  // ---- 예외: 흔한 영어 낱말 1만 개 가운데 글자 규칙과 어긋난 것(합성어·음절 경계) — 공개 점자 변환기 결과 ----
  Object.assign(EXC, {/*EXC-BEGIN*/ newsletter:'⠝⠑⠺⠎⠇⠗', components:'⠉⠕⠍⠏⠕⠝⠢⠞⠎', component:'⠉⠕⠍⠏⠕⠝⠢⠞', multimedia:'⠍⠥⠇⠞⠊⠍⠫⠊⠁', newsletters:'⠝⠑⠺⠎⠇⠗⠎', reverse:'⠗⠑⠧⠻⠎⠑', reaction:'⠗⠑⠁⠉⠰⠝', severe:'⠎⠑⠧⠻⠑', indonesia:'⠔⠙⠕⠝⠑⠎⠊⠁', coupons:'⠉⠳⠏⠕⠝⠎', pioneer:'⠏⠊⠕⠝⠑⠻', southeast:'⠎⠳⠹⠂⠌', northeast:'⠝⠕⠗⠹⠂⠌', coupon:'⠉⠳⠏⠕⠝', friendship:'⠋⠗⠩⠊⠏', microwave:'⠍⠊⠉⠗⠕⠺⠁⠧⠑', reactions:'⠗⠑⠁⠉⠰⠝⠎', shanghai:'⠩⠁⠝⠛⠓⠁⠊', asthma:'⠁⠎⠹⠍⠁', infrared:'⠔⠋⠗⠁⠗⠫', soonest:'⠎⠕⠕⠝⠑⠌', wherever:'⠱⠻⠐⠑', somerset:'⠎⠕⠍⠻⠎⠑⠞', girlfriend:'⠛⠊⠗⠇⠋⠗', prepaid:'⠏⠗⠑⠏⠙', vietnamese:'⠧⠊⠑⠞⠝⠁⠍⠑⠎⠑', opponent:'⠕⠏⠏⠕⠝⠢⠞', basename:'⠃⠁⠎⠢⠁⠍⠑', nowhere:'⠝⠕⠐⠱', unnecessary:'⠥⠝⠝⠑⠉', opponents:'⠕⠏⠏⠕⠝⠢⠞⠎', indonesian:'⠔⠙⠕⠝⠑⠎⠊⠁⠝', thereafter:'⠐⠮⠁⠋' });
  const api = { word, toUnicode, tables: { LETTER, STRONG, LOWER_ANY, LOWER_MID, FINAL, INIT, WHOLE, SHORT }, PREFIX_EXC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UEB = api;
})(typeof window !== 'undefined' ? window : globalThis);
