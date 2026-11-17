// 손빛 배움터 — 시작: 앞의 파일이 모두 읽힌 뒤 한 번 실행하는 것(예전 기록 정리, 첫 화면 그리기)
// 화면 동작 코드는 assets/app-*.js 7개로 나뉘어 있고 index.html 에서 이 순서로 읽힌다: core → home → sign → braille → quiz → player → start.
// 일곱 파일은 전역 이름을 함께 쓴다(예전에는 app.js 한 파일 안). 파일이 읽히는 동안 바로 실행되는 코드는 앞 파일에 있는 이름만 써야 한다
// (뒤 파일의 함수는 함수 안에서 부르거나 app-start.js 에서 부른다). 이벤트·함수 안에서는 어느 파일의 이름이든 쓸 수 있다.
'use strict';
// 옛 방식으로 저장된 틀린 문제(글 단서 문제 등)는 지금 퀴즈로 다시 만들 수 없다. 시작할 때 한 번 정리하고, 같은 문제가 겹쳐 있으면 하나만 남긴다.
(function migrateWrong() {
  const l = getWrong(); if (!l.length) return;
  const seen = new Set(), keep = [];
  l.forEach(c => { const n = cleanWrongEntry(c); if (n && !seen.has(wrongKey(n))) { seen.add(wrongKey(n)); keep.push(n); } });
  if (JSON.stringify(keep) !== JSON.stringify(l)) store.set('wrong', keep);
})();

// ================= 처음 화면 =================
renderPadCell(); renderPadResult();
showBraillePanel(store.get('bpanel', 'convert'));
renderBraillePanel();
renderSign();
const start = (location.hash || '#home').slice(1);
go(VIEWS.includes(start) ? start : 'home', { push: false });
