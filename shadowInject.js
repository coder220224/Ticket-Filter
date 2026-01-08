// 極簡版：限定網域；先確認不是 Cloudflare 驗證頁，再決定是否覆寫
(function() {
  const host = location.hostname;
  const allowed = /(?:tixcraft\.com|kktix\.com|kktix\.cc|ibon\.com\.tw|cityline\.com|ticket\.com\.tw|ticketplus\.com\.tw|fami\.life|tix\.wdragons\.com|tix\.ctbcsports\.com|tix\.fubonbraves\.com|jkface\.net|kham\.com\.tw|tixcraftweb-pcox\.onrender\.com)$/i;
  if (!allowed.test(host)) return;

  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // 使用 document 的 unique ID 來追蹤，每次 document 重新載入都會重置
      const docId = document.URL + '|' + performance.now();
      const patchKey = '__shadowOpenPatched_' + docId;
      
      function isCfChallenge() {
        const doc = document;
        const html = doc.documentElement ? doc.documentElement.innerHTML : '';
        const cfPattern = new RegExp('cdn-cgi/challenge-platform|cf-challenge|turnstile|cf-\\\\w+token');
        if (cfPattern.test(html)) return true;
        return !!doc.querySelector('script[src*="cdn-cgi/challenge-platform"], iframe[src*="cdn-cgi/challenge-platform"], input[name="cf-turnstile-response"]');
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
        window.__shadowPatchSeen = true; // 標記已經執行過 start()
        log('start()', { cf, reason: window.__cfChallengeReason || null, patched: !!window[patchKey], href: location.href, docId: docId.substring(0, 50) });
        
        // 如果這個 document 已經 patch 過，就跳過（但每次新 document 都會重新 patch）
        if (window[patchKey]) return;
        window[patchKey] = true;

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
          const isCfStack = new RegExp('cdn-cgi/challenge-platform|cf-challenge|turnstile', 'i').test(stack);

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

        // 單次處理當前 DOM 上的 shadowroot="closed" 節點，失敗即放棄
        const root = document.documentElement;
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('[shadowroot="closed"]').forEach(el => {
          if (!el.shadowRoot) {
            try { el.attachShadow({ mode: 'open' }); } catch (_) {}
          }
        });
      }

      function recheckUntilPatched() {
        // 驗證通過後 DOM 仍在同一頁時，不限次數地嘗試 patch，直到成功
        const timer = setInterval(() => {
          if (window[patchKey]) {
            clearInterval(timer);
            return;
          }
          if (!isCfChallenge()) {
            start();
          }
        }, 500);
      }
      
      // 監聽頁面重新載入（POST 後會觸發），確保新 document 也能 patch
      if (document.readyState === 'loading') {
        // 在 document_start 階段就立即 patch，不要等 DOMContentLoaded
        start();
        document.addEventListener('DOMContentLoaded', () => {
          start();
          recheckUntilPatched();
        }, { once: true });
      } else {
        start();
        recheckUntilPatched();
      }
      
      // 監聽 beforeunload，確保下次載入時會重新 patch
      window.addEventListener('beforeunload', () => {
        // 清理標記，讓下次載入時可以重新 patch
        delete window[patchKey];
      }, { once: true });
      
      // 監聽 URL 變化，處理 SPA 式導航或頁面跳轉
      // 注意：attachShadow 的 patch 是全局的（覆寫 prototype），只需要執行一次
      // 當 URL 改變後，新的 Shadow DOM 建立時會自動使用 patched 的版本
      // 但我們需要重新檢查是否有新的 Shadow DOM 需要處理
      let lastUrl = location.href;
      const checkUrlChange = () => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          // URL 改變了，延遲一點後重新檢查 Shadow DOM
          // attachShadow 的 patch 已經存在，不需要重新 patch
          setTimeout(() => {
            // 重新檢查是否有新的 closed Shadow DOM 需要處理
            const root = document.documentElement;
            if (root && root.querySelectorAll) {
              root.querySelectorAll('[shadowroot="closed"]').forEach(el => {
                if (!el.shadowRoot) {
                  try { el.attachShadow({ mode: 'open' }); } catch (_) {}
                }
              });
            }
            // 重新啟動輪詢檢查
            recheckUntilPatched();
          }, 200);
        }
      };
      
      window.addEventListener('popstate', checkUrlChange);
      // 定期檢查 URL 變化（處理 pushState/replaceState，這些不會觸發 popstate）
      setInterval(checkUrlChange, 500);

    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // 不再注入額外的 injected.js，避免重複覆寫與持續掃描
})();