// 在最早期重寫 attachShadow
const script = document.createElement('script');
script.textContent = `
    // 立即重寫 attachShadow，不允許 closed 模式
    (function() {
        const originalAttachShadow = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function(init) {
            // 強制使用 open 模式
            return originalAttachShadow.call(this, { mode: 'open' });
        };
        
        // 處理已存在的 shadowRoot
        function processExistingShadowRoots(root) {
            if (!root) return;
            
            if (root instanceof Element) {
                // 如果元素有 closed shadowRoot，嘗試重新創建為 open
                if (root.shadowRoot === null && root.getAttribute('shadowroot') === 'closed') {
                    try {
                        root.attachShadow({ mode: 'open' });
                    } catch(e) {}
                }
            }
            
            // 遞迴處理子元素
            const children = root.children;
            if (children) {
                for (let i = 0; i < children.length; i++) {
                    processExistingShadowRoots(children[i]);
                }
            }
        }

        // 設置 MutationObserver
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            processExistingShadowRoots(node);
                        }
                    });
                }
            }
        });

        // 開始觀察
        observer.observe(document.documentElement || document.body || document, {
            childList: true,
            subtree: true
        });

        // 初始處理
        processExistingShadowRoots(document.documentElement);
        
        // 定期檢查
        setInterval(() => {
            processExistingShadowRoots(document.documentElement);
        }, 100);
    })();
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

// 注入主要處理腳本
const injectedScript = document.createElement('script');
injectedScript.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(injectedScript); 