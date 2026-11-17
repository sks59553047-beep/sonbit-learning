// 오류 자동 보고: 사용자 화면에서 오류가 나면 내용만 /api/error 로 보낸다 → Cloudflare 가 GitHub 이슈로 올린다(functions/api/error.js).
// 보내는 것: 오류 문장, 어느 파일 몇째 줄, 어느 화면(#home 등), 시각, 사이트 버전. 이름·단어장·기록 같은 개인정보는 보내지 않는다.
// 실제 주소(sonbit.pages.dev)에서만 보낸다(내 컴퓨터 시험·미리보기 주소는 보내지 않음). 한 화면에서 많아야 3건, 같은 오류는 한 번만.
(function () {
  'use strict';
  if (location.hostname !== 'sonbit.pages.dev' || !navigator.sendBeacon) return;
  var sent = {}, count = 0;
  var NOISE = /^Script error\.?$|ResizeObserver loop|Non-Error promise rejection captured|AbortError|The play\(\) request was interrupted|NotAllowedError/i;
  function report(message, stack, where) {
    message = String(message || '').slice(0, 300);
    if (!message || NOISE.test(message) || /extension:\/\//.test(String(stack || '') + where)) return;
    var key = message + '|' + where;
    if (sent[key] || count >= 3) return;
    sent[key] = 1; count++;
    var body = JSON.stringify({
      message: message,
      stack: String(stack || '').slice(0, 1500),
      where: String(where || '').slice(0, 120),
      view: (location.hash || '#home').slice(1, 30),
      version: (document.querySelector('meta[name="sonbit-version"]') || {}).content || '',
      time: new Date().toISOString()
    });
    try { navigator.sendBeacon('/api/error', new Blob([body], { type: 'application/json' })); } catch (e) { /* 보고가 실패해도 사이트는 그대로 */ }
  }
  window.addEventListener('error', function (e) {
    if (!e || (!e.message && !e.error)) return;   // 그림·영상을 못 불러온 것은 여기로 오지 않는다(사이트가 따로 안내)
    report(e.message || (e.error && e.error.message), e.error && e.error.stack, (String(e.filename || '').split('/').pop() || '?') + ':' + (e.lineno || 0));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    report(r && r.message ? r.message : String(r), r && r.stack, 'promise');
  });
})();
