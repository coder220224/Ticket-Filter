// 立即執行的初始化函數
(function() {
    // 保存原始方法
    Element.prototype._attachShadow = Element.prototype.attachShadow;

    // 重寫 attachShadow 方法
    Element.prototype.attachShadow = function () {
        try {
            return this._attachShadow({ mode: "open" });
        } catch (e) {
            console.warn('Shadow root 轉換失敗:', e);
            return this._attachShadow({ mode: "closed" });
        }
    };

    // 嘗試轉換已存在的 shadow roots
    function convertExistingShadowRoots() {
        try {
            const elements = document.getElementsByTagName('*');
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element.shadowRoot === null) {
                    const shadowRootAttr = element.getAttribute('shadowroot');
                    if (shadowRootAttr === 'closed') {
                        try {
                            element._attachShadow({ mode: 'open' });
                        } catch (e) {
                            // 忽略錯誤，繼續處理下一個元素
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('轉換現有 shadow roots 時發生錯誤:', e);
        }
    }

    // 創建一個 MutationObserver 來監視 DOM 變化
    const observer = new MutationObserver((mutations) => {
        convertExistingShadowRoots();
    });

    // 開始監視整個文檔
    observer.observe(document.documentElement || document.body || document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['shadowroot']
    });

    // 立即執行一次轉換
    convertExistingShadowRoots();

    // 在各種可能的時機點執行轉換
    ['DOMContentLoaded', 'load', 'pageshow'].forEach(event => {
        window.addEventListener(event, convertExistingShadowRoots, true);
    });

    // 監聽頁面可見性變化
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            convertExistingShadowRoots();
        }
    });

    // 監聽 history 變化
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            convertExistingShadowRoots();
        }
    }).observe(document, {subtree: true, childList: true});

    // 定期檢查（較短間隔）
    setInterval(convertExistingShadowRoots, 100);
})(); 