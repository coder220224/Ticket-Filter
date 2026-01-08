// 極簡版：限定網域；先確認不是 Cloudflare challenge，再覆寫
(function() {
  const host = location.hostname;
  const allowed = /(?:tixcraft\.com|kktix\.com|kktix\.cc|ibon\.com\.tw|cityline\.com|ticket\.com\.tw|ticketplus\.com\.tw|fami\.life|tix\.wdragons\.com|tix\.ctbcsports\.com|tix\.fubonbraves\.com|jkface\.net|kham\.com\.tw|tixcraftweb-pcox\.onrender\.com)$/i;
  if (!allowed.test(host)) return;

  function isCfChallenge() {
    const doc = document;
    const html = doc.documentElement ? doc.documentElement.innerHTML : '';
    let reason = '';

    if (/cdn-cgi\/challenge-platform/.test(html)) {
      reason = 'regex: cdn-cgi/challenge-platform';
    } else if (/cf-challenge/.test(html)) {
      reason = 'regex: cf-challenge';
    } else if (/cf-\w*token/.test(html)) {
      reason = 'regex: cf-token';
    }

    if (!reason) {
      const node = doc.querySelector('script[src*="cdn-cgi/challenge-platform"], iframe[src*="cdn-cgi/challenge-platform"], input[name="cf-turnstile-response"]');
      if (node) {
        reason = 'dom: ' + (node.tagName || 'node');
      }
    }

    window.__cfChallengeReason = reason || null;
    if (window.__shadowPatchDebug && reason) {
      try { console.log('[shadow-patch] isCfChallenge hit', reason); } catch (_) {}
    }

    return !!reason;
  }

  function start() {
    const debugKey = '__shadowPatchDebug';
    const hitKey = '__shadowPatchHit';
    const log = (...args) => {
      if (window[debugKey]) {
        try { console.log('[shadow-patch]', ...args); } catch (_) {}
      }
    };

    const cf = isCfChallenge();
    window.__shadowPatchSeen = true; // 標記有執行過 start()
    log('start()', { cf, reason: window.__cfChallengeReason || null, patched: !!window.__shadowOpenPatched, href: location.href });
    if (window.__shadowOpenPatched) return; // 若前置腳本已處理就略過
    window.__shadowOpenPatched = true;

    log('patching attachShadow on', location.href, 'at', performance.now().toFixed(1), 'ms');

    const original = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const now = performance.now();
      if (!window[hitKey]) {
        window[hitKey] = { count: 0 };
      }
      const counter = window[hitKey];
      counter.count += 1;
      const stack = (new Error()).stack || '';
      const isCfStack = /cdn-cgi\/challenge-platform|cf-challenge|turnstile/i.test(stack);

      if (counter.count <= 5) {
        log('attachShadow called', {
          mode: init && init.mode,
          now: now.toFixed(1),
          cfStack: isCfStack
        });
      }

      // 若呼叫來自 Cloudflare/Turnstile，維持原本 mode，避免破壞驗證元件
      if (isCfStack) {
        return original.call(this, init);
      }

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

  function recheckUntilPatched() {
    // 持續偵測 Cloudflare/Turnstile 結束後再次嘗試 patch，直到成功為止
    const timer = setInterval(() => {
      if (window.__shadowOpenPatched) {
        clearInterval(timer);
        return;
      }
      if (!isCfChallenge()) {
        start();
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      start();
      recheckUntilPatched();
    }, { once: true });
  } else {
    start();
    recheckUntilPatched();
  }
})(); 