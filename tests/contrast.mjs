// app.css 의 색 변수에서 글자·배경 짝의 명암비(WCAG 2.x)를 계산한다. 일반 글자 4.5 이상, 큰 글자·아이콘 3 이상이 기준.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('../', import.meta.url)).replace(/\\/g, '/');
const css = fs.readFileSync(REPO + 'assets/app.css', 'utf8');
const grab = re => { const m = css.match(re); const o = {}; (m[1].match(/--[\w-]+:\s*#[0-9a-fA-F]{3,6}/g) || []).forEach(x => { const [k, v] = x.split(':'); o[k.trim()] = v.trim(); }); return o; };
const light = grab(/:root\{([^}]*)\}/);
const dark = { ...light, ...grab(/:root\[data-theme="dark"\]\{([^}]*)\}/) };
const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const la = lum(rgb(a)), lb = lum(rgb(b)); const [hi, lo] = la > lb ? [la, lb] : [lb, la]; return (hi + 0.05) / (lo + 0.05); };
const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v * (1 - t) + rgb(b)[i] * t).toString(16).padStart(2, '0')).join('');
let bad = 0;
for (const [name, v] of [['밝은 화면', light], ['어두운 화면', dark]]) {
  const isDark = name.startsWith('어');
  const P = (fg, bg, label, min = 4.5) => {
    const a = fg.startsWith('#') ? fg : v[fg], b = bg.startsWith('#') ? bg : v[bg]; const r = ratio(a, b); const ok = r >= min; if (!ok) bad++;
    console.log((ok ? 'OK   ' : 'FAIL ') + name + ' | ' + label.padEnd(34) + r.toFixed(2) + ' (기준 ' + min + ')');
  };
  P('--ink', '--surface', '본문 글자 / 바탕'); P('--ink', '--card', '본문 글자 / 카드'); P('--ink', '--surface2', '본문 글자 / 회색 칸');
  P('--muted', '--surface', '보조 글자 / 바탕'); P('--muted', '--card', '보조 글자 / 카드'); P('--muted', '--surface2', '보조 글자 / 회색 칸');
  P('--teal', '--surface', '청록 글자 / 바탕'); P('--teal', '--card', '청록 글자 / 카드'); P('--teal', '--surface2', '청록 글자 / 회색 칸');
  P('--mint-ink', '--mint', '태그·선택 글자 / 민트');
  P('--ink', '--amber-bg', '퀴즈 전환 안내 글자 / 호박색 칸'); P('--amber', '--amber-bg', '「복습할 문제」 태그 / 호박색 칸');
  P('--ink', '--mint', '정답 보기 글자 / 민트'); P('--ink', '--danger-bg', '오답 보기 글자 / 빨강 칸'); P('--teal', '--mint', '정답 테두리 / 민트(도형)', 3);
  P('--amber', '--amber-bg', '강조 글자 / 호박색 칸'); P('--amber', '--card', '호박 글자 / 카드'); P('--amber', '--surface', '호박 글자 / 바탕');
  P('--danger', '--danger-bg', '오답 글자 / 빨강 칸'); P('--danger', '--card', '빨강 글자 / 카드');
  P(isDark ? '#06201d' : '#ffffff', '--teal', '으뜸 버튼 글자 / 청록');
  P(isDark ? '#0b1020' : '#ffffff', '--navy', '선택된 칩 글자 / 남색');
  P('--surface', '--navy', '알림창 글자 / 남색');
  P(isDark ? '#0b1020' : '#ffffff', '--navy', '점자 켜진 점 숫자 / 남색', 4.5);
  P(isDark ? '#ffffff' : '#ffffff', '#111848', '썸네일 위 글자 / 남색');
  // 첫 화면 큰 상자(고정 남색 그라데이션) 위 글자
  const heroA = isDark ? '#171c46' : '#111848', heroB = isDark ? '#252b66' : '#2b2f80';
  P('#dfe2fb', heroB, '첫 화면 설명 / 밝은 쪽 끝', 4.5); P('#ffffff', heroB, '첫 화면 제목 / 밝은 쪽 끝');
  const chip = mix(heroB, '#ffffff', 0.13); P('#e6e8fc', chip, '통계 칩 글자 / 칩 바탕'); P('#ffffff', mix(heroB, '#ffffff', 0.16), '첫 화면 작은 라벨');
  P('#ffffff', isDark ? '#1b2154' : '#111848', '퀴즈 문제 상자 글자(진한 쪽)'); P('#ffffff', isDark ? '#2a3070' : '#2b2f80', '퀴즈 문제 상자 글자(밝은 쪽)');
  // 비활성(지운 보기)은 의도적으로 흐리게 — 기준에서 제외
  P('--line', '--card', '카드 테두리(큰 도형 기준)', 1.1);
  P('--muted', '--card', '아이콘·꺼진 점 번호 / 카드', 3);
}
console.log('\n기준 미달', bad, '건');
