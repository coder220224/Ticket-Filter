// 極簡版：限定網域；先確認不是 Cloudflare challenge，再覆寫
(function() {
  const host = location.hostname;
  const allowed = /(?:tixcraft\.com|kktix\.com|kktix\.cc|ibon\.com\.tw|cityline\.com|ticket\.com\.tw|ticketplus\.com\.tw|fami\.life|tix\.wdragons\.com|tix\.ctbcsports\.com|tix\.fubonbraves\.com|jkface\.net|kham\.com\.tw|tixcraftweb-pcox\.onrender\.com)$/i;
  if (!allowed.test(host)) return;

  function isCfChallenge() {
    const doc = document;
    const html = doc.documentElement ? doc.documentElement.innerHTML : '';
    return /cdn-cgi\/challenge-platform|cf-challenge|turnstile|cf-\w*token/.test(html) ||
           !!doc.querySelector('script[src*="cdn-cgi/challenge-platform"], iframe[src*="cdn-cgi/challenge-platform"], input[name="cf-turnstile-response"]');
  }

  function start() {
    if (window.__shadowOpenPatched) return; // 若前置腳本已處理就略過
    if (isCfChallenge()) return; // 驗證頁直接跳過
    window.__shadowOpenPatched = true;

    const original = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const opts = Object.assign({}, init || {}, { mode: 'open' });
      return original.call(this, opts);
    };

    // 單次處理當前 DOM，失敗即放棄；無觀察、無輪詢
    const root = document.documentElement;
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[shadowroot="closed"]').forEach(el => {
      if (!el.shadowRoot) {
        try { el.attachShadow({ mode: 'open' }); } catch (_) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(); 