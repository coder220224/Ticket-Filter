// 在页面加载的最早阶段执行
(function() {
  // 判断当前网站类型
  const isIbon = window.location.hostname.includes('ibon.com.tw');
  const isTixcraft = window.location.href.includes('tixcraft.com/ticket/area/') || window.location.hostname.includes('tixcraftweb-pcox.onrender.com');
  const isKktix = window.location.hostname.includes('kktix.com');
  const isCityline = window.location.hostname.includes('cityline.com');
  const isEra = window.location.hostname.includes('ticket.com.tw');
  const isFami = window.location.hostname.includes('fami.life');
  const isWdragons = window.location.hostname.includes('tix.wdragons.com');
  const isCtbcsports = window.location.hostname.includes('tix.ctbcsports.com');
  const isFubonbraves = window.location.hostname.includes('tix.fubonbraves.com');
  const isKham = window.location.hostname.includes('kham.com.tw');
  const isJKFace = window.location.hostname.includes('jkface.net');
  
  // 仅在适用的网站上应用筛选
  if (!isIbon && !isTixcraft && !isKktix && !isCityline && !isEra && !isFami && !isWdragons && !isCtbcsports && !isFubonbraves && !isKham && !isJKFace) return;

  // 特別處理 ibon 網站
  if (isIbon) {
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-ibon';
    styleElement.textContent = `
      /* ibon 網站 - 使用不透明度和顯示過渡效果 */
      body {
        opacity: 0.01 !important;
        transition: opacity 0.3s ease-out;
      }
      body.filter-ready {
        opacity: 1 !important;
      }
    `;
    document.documentElement.appendChild(styleElement);

    // 監聽過濾完成的消息
    window.addEventListener('message', function(event) {
      if (event.data.type === 'FILTER_APPLIED') {
        document.body.classList.add('filter-ready');
      }
    });

    // 安全機制：確保不會永久隱藏
    setTimeout(() => {
      document.body.classList.add('filter-ready');
    }, 800);

    return; // 對 ibon 網站使用專門的處理，不執行後續代碼
  }

  // 为不同网站使用不同的隐藏方式
  if (isTixcraft) {
    // 拓元网站 - 使用visibility隐藏
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style';
    styleElement.textContent = `
      /* 拓元网站 */
      .area-list li, 
      .zone-label[data-id] {
        visibility: hidden !important;
      }
    `;
    document.documentElement.appendChild(styleElement);
  } else if (isKktix) {
    // KKTIX网站 - 使用较轻量的透明度处理，避免页面空白
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-kktix';
    styleElement.textContent = `
      /* KKTIX网站 - 只减少不透明度而不是完全隐藏 */
      .ticket-unit {
        opacity: 0.01;
        transition: opacity 0.3s ease-in;
      }
    `;
    document.documentElement.appendChild(styleElement);
    
    // 设置一个较短的超时，确保KKTIX可以快速显示
    setTimeout(() => {
      // 如果筛选还没完成，先显示所有元素
      if (!window.ticketFilterComplete) {
        document.querySelectorAll('.ticket-unit').forEach(el => {
          el.style.opacity = '1';
        });
      }
    }, 800); // 800ms后如果筛选未完成就显示
  } else if (isCityline) {
    // Cityline网站 - 使用更快速的处理方式
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-cityline';
    styleElement.textContent = `
      /* Cityline网站 - 使用更高效的隐藏方式并添加过渡效果 */
      .price-box1, .form-check {
        visibility: hidden !important;
        opacity: 0 !important;
        transition: opacity 0.15s ease-out !important;
      }
      
      /* 隐藏票价区域，确保用户在筛选完成前看不到 */
      .price-box1 > div.price {
        visibility: hidden !important;
      }
      
      /* 应用更快的过渡效果，在筛选完成后显示 */
      .price-box1.filter-ready, .form-check.filter-ready {
        visibility: visible !important;
        opacity: 1 !important;
        transition: opacity 0.15s ease-out !important;
      }
    `;
    document.documentElement.appendChild(styleElement);
    
    // 创建一个变量记录筛选是否已经开始
    window.citylineFilterStarted = false;
    
    // 通知 content.js 脚本立即开始筛选，不要等待
    setTimeout(() => {
      window.postMessage({ type: 'CITYLINE_READY_FOR_FILTER' }, '*');
    }, 10);
    
    // 立即运行 MutationObserver 以捕获任何动态添加的票券元素
    const citylineObserver = new MutationObserver((mutations) => {
      // 如果筛选已经完成，不进行处理
      if (window.ticketFilterComplete) return;
      
      // 筛选已经开始但尚未完成
      if (window.citylineFilterStarted) {
        let ticketElementsFound = false;
        
        // 仅处理新添加的节点
        for (const mutation of mutations) {
          if (mutation.addedNodes && mutation.addedNodes.length) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) { // 元素节点
                const ticketElements = node.querySelectorAll ? 
                  node.querySelectorAll('.price-box1, .form-check') : [];
                
                if (ticketElements.length > 0) {
                  ticketElementsFound = true;
                  // 这里不做任何处理，保持其隐藏状态
                }
                
                // 如果节点本身就是票券元素
                if (node.matches && (node.matches('.price-box1') || node.matches('.form-check'))) {
                  ticketElementsFound = true;
                }
              }
            }
          }
        }
        
        // 如果找到票券元素，通知 content.js 有新的票券要处理
        if (ticketElementsFound) {
          window.postMessage({ type: 'NEW_TICKETS_FOUND' }, '*');
        }
      } else {
        // 筛选尚未开始，但看到了票券元素，通知 content.js 立即开始筛选
        const ticketElements = document.querySelectorAll('.price-box1, .form-check');
        if (ticketElements.length > 0) {
          window.citylineFilterStarted = true;
          window.postMessage({ type: 'CITYLINE_READY_FOR_FILTER' }, '*');
        }
      }
    });
    
    // 使用更高效的配置，只观察必要的变化
    citylineObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
    
    // 设置一个较短的超时，确保Cityline可以更快地显示
    setTimeout(() => {
      // 如果筛选还没完成，但处理已经开始，给予更多时间
      if (window.citylineFilterStarted && !window.ticketFilterComplete) {
        // 再等待一段时间，因为筛选已经开始
        return;
      }
      
      // 如果筛选还没完成且未开始，为避免永久隐藏，显示所有元素
      if (!window.ticketFilterComplete) {
        document.querySelectorAll('.price-box1, .form-check').forEach(el => {
          el.classList.add('filter-ready');
        });
      }
    }, 800); // 800ms后检查状态
    
    // 设置最终超时作为安全机制
    setTimeout(() => {
      if (!window.ticketFilterComplete) {
        document.querySelectorAll('.price-box1, .form-check').forEach(el => {
          el.classList.add('filter-ready');
        });
        // 断开观察者以提高性能
        citylineObserver.disconnect();
      }
    }, 1500); // 1.5秒后如果筛选未完成就显示
  } else if (isEra) {
    // 年代售票网站 - 使用visibility隐藏
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-era';
    styleElement.textContent = `
      /* 年代售票网站 */
      .area-list li {
        visibility: hidden !important;
      }
      .area-list li.filter-ready {
        visibility: visible !important;
        transition: opacity 0.2s ease-out;
      }
    `;
    document.documentElement.appendChild(styleElement);
  } else if (isFami || isWdragons || isCtbcsports || isFubonbraves) {
    // Fami Life 网站及相关网站 - 使用visibility和opacity结合的方式
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-fami';
    styleElement.textContent = `
      /* Fami Life 网站及相关网站 - 初始隐藏所有票券 */
      .f1 .saleTr {
        visibility: hidden !important;
        opacity: 0 !important;
        transition: visibility 0s, opacity 0.2s ease-out !important;
      }
      
      /* 当筛选完成后显示 */
      .f1 .saleTr.filter-ready {
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* 确保被筛选隐藏的票券保持隐藏 */
      .f1 .saleTr.filter-ready[style*="display: none"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.documentElement.appendChild(styleElement);
  } else if (isKham) {
    // 寬宏售票网站 - 使用visibility和opacity结合的方式
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-kham';
    styleElement.textContent = `
      /* 寬宏售票网站 - 初始隐藏所有票券 */
      tr.status_tr {
        visibility: hidden !important;
        opacity: 0 !important;
        transition: visibility 0s, opacity 0.2s ease-out !important;
      }
      
      /* 当筛选完成后显示 */
      tr.status_tr.filter-ready {
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* 确保被筛选隐藏的票券保持隐藏 */
      tr.status_tr.filter-ready[style*="display: none"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.documentElement.appendChild(styleElement);
  } else if (isJKFace) {
    // JKFace网站 - 使用visibility和opacity结合的方式
    const styleElement = document.createElement('style');
    styleElement.id = 'ticket-filter-early-style-jkface';
    styleElement.textContent = `
      /* JKFace网站 - 初始隐藏所有票券 */
      body:not(.extension-disabled) section.mx-3 {
        visibility: hidden !important;
        opacity: 0 !important;
        transition: visibility 0s, opacity 0.2s ease-out !important;
      }
      
      /* 当筛选完成后显示 */
      body:not(.extension-disabled) section.mx-3.filter-ready {
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* 确保被筛选隐藏的票券保持隐藏 */
      body:not(.extension-disabled) section.mx-3.filter-ready[style*="display: none"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      /* 停用時顯示所有票券 */
      body.extension-disabled section.mx-3 {
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    document.documentElement.appendChild(styleElement);

    // 監聽擴充功能啟用狀態變化
    chrome.storage.onChanged.addListener(function(changes) {
      if (changes.extensionEnabled) {
        if (changes.extensionEnabled.newValue === false) {
          document.body.classList.add('extension-disabled');
          // 移除所有篩選相關的 class
          document.querySelectorAll('section.mx-3').forEach(section => {
            section.classList.remove('filter-ready');
            section.style.removeProperty('display');
          });
        } else {
          document.body.classList.remove('extension-disabled');
        }
      }
    });

    // 初始化時檢查擴充功能狀態
    chrome.storage.local.get(['extensionEnabled'], function(result) {
      if (result.extensionEnabled === false) {
        document.body.classList.add('extension-disabled');
      }
    });

    // 监听日期按钮点击和动态内容更新
    const jkfaceObserver = new MutationObserver((mutations) => {
      // 檢查擴充功能是否已停用
      if (document.body.classList.contains('extension-disabled')) {
        return;
      }

      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && // 元素节点
                node.matches && // 确保有matches方法
                node.matches('section.mx-3')) {
              // 确保新添加的section保持隐藏状态
              node.style.visibility = 'hidden';
              node.style.opacity = '0';
              node.classList.remove('filter-ready');
            }
          });
        }
      }
    });

    // 观察整个文档的变化
    jkfaceObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // 设置一个较短的超时，确保不会永久隱藏
    setTimeout(() => {
      if (!window.ticketFilterComplete && !document.body.classList.contains('extension-disabled')) {
        document.querySelectorAll('section.mx-3').forEach(el => {
          if (el.style.display !== 'none') {
            el.classList.add('filter-ready');
          }
        });
      }
    }, 1500);
  }
  
  // 记录是否已收到筛选完成消息
  let filterApplied = false;
  
  // Shadow DOM处理相关变量
  let shadowObserver = null;
  const shadowStyleCache = new Set(); // 缓存所有添加的style元素
  
  // 处理Shadow DOM的函数 - 为ibon网站
  function handleIbonShadowDOM() {
    // 尝试向shadowRoot中注入样式的函数
    function injectStyleToShadowRoot(shadowRoot) {
      if (!shadowRoot) return;
      
      // 避免重复注入
      if (shadowRoot.querySelector('#ticket-filter-shadow-style')) return;
      
      try {
        const shadowStyle = document.createElement('style');
        shadowStyle.id = 'ticket-filter-shadow-style';
        shadowStyle.textContent = `
          /* ibon网站 - 仅在筛选未完成前隐藏 */
          tr[id^="B"] {
            opacity: 0;
            transition: opacity 0.2s;
          }
        `;
        shadowRoot.appendChild(shadowStyle);
        shadowStyleCache.add(shadowRoot); // 记录已注入样式的shadowRoot
      } catch (err) {
        // 静默错误
      }
    }
    
    // 递归处理所有可能包含shadowRoot的元素
    function checkShadowRoots(element) {
      if (!element) return;
      
      // 处理当前元素的shadowRoot
      if (element.shadowRoot) {
        injectStyleToShadowRoot(element.shadowRoot);
      }
      
      // 递归处理子元素
      const children = element.children;
      if (children && children.length) {
        for (let i = 0; i < children.length; i++) {
          checkShadowRoots(children[i]);
        }
      }
    }
    
    // 初始处理
    checkShadowRoots(document);
    
    // 监听DOM变化以处理动态添加的元素
    shadowObserver = new MutationObserver((mutations) => {
      if (filterApplied) {
        shadowObserver.disconnect();
        return;
      }
      
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // 元素节点
              checkShadowRoots(node);
            }
          }
        }
      }
    });
    
    shadowObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  
  // 显示所有元素的函数
  function showAllElements() {
    filterApplied = true;
    // 告诉window对象筛选已完成
    window.ticketFilterComplete = true;
    
    // 针对不同网站处理样式
    if (isTixcraft) {
      const earlyStyle = document.getElementById('ticket-filter-early-style');
      if (earlyStyle) {
        earlyStyle.remove();
      }
    } else if (isKktix) {
      // 对于KKTIX，修改样式使元素显示出来，而不是移除
      const kktixStyle = document.getElementById('ticket-filter-early-style-kktix');
      if (kktixStyle) {
        kktixStyle.textContent = `
          .ticket-unit {
            opacity: 1 !important;
            transition: opacity 0.2s ease-out;
          }
        `;
      }
      
      // 直接修改所有票券元素的样式
      document.querySelectorAll('.ticket-unit').forEach(el => {
        el.style.opacity = '1';
      });
    } else if (isCityline) {
      // 对于Cityline，使用class切换来显示元素
      document.querySelectorAll('.price-box1, .form-check').forEach(el => {
        el.classList.add('filter-ready');
      });
      
      // 确保所有需要显示的元素都被正确显示（使用更短的延迟）
      setTimeout(() => {
        // 获取当前所有应该显示的元素（不隐藏的）
        document.querySelectorAll('.form-check').forEach(el => {
          if (el.style.display !== 'none') {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
          }
        });
      }, 10); // 更短的延迟确保 DOM 快速更新
    } else if (isEra) {
      // 对于年代售票，使用class切换来显示元素
      document.querySelectorAll('.area-list li').forEach(el => {
        el.classList.add('filter-ready');
      });
    } else if (isFami || isWdragons || isCtbcsports || isFubonbraves) {
      // 对于 Fami Life 及相关网站，使用 class 切换来显示元素
      document.querySelectorAll('.saleTr').forEach(el => {
        if (el.style.display !== 'none') {
          el.classList.add('filter-ready');
        }
      });
    } else if (isKham) {
      // 对于寬宏售票，使用 class 切换来显示元素
      document.querySelectorAll('.status_tr').forEach(el => {
        if (el.style.display !== 'none') {
          el.classList.add('filter-ready');
        }
      });
    } else if (isJKFace) {
      // 对于 JKFace，使用 class 切换来显示元素
      document.querySelectorAll('section.mx-3').forEach(el => {
        if (el.style.display !== 'none') {
          el.classList.add('filter-ready');
        }
      });
      
      // 如果有观察者，在筛选完成后断开连接
      const jkfaceObserver = document.querySelector('#ticket-filter-early-style-jkface')?.jkfaceObserver;
      if (jkfaceObserver) {
        jkfaceObserver.disconnect();
      }
    }
    
    // 处理ibon的Shadow DOM
    if (isIbon) {
      // 停止观察者
      if (shadowObserver) {
        shadowObserver.disconnect();
      }
      
      // 从Shadow DOM中移除样式，或者将所有tr设为可见
      shadowStyleCache.forEach(shadowRoot => {
        try {
          const style = shadowRoot.querySelector('#ticket-filter-shadow-style');
          if (style) {
            // 修改样式使元素显示，而不是直接移除
            style.textContent = `
              tr[id^="B"] {
                opacity: 1 !important;
                transition: opacity 0.2s;
              }
            `;
          }
        } catch (err) {
          // 静默错误
        }
      });
      
      // 额外措施：通过contentWindow直接执行脚本使票券可见
      try {
        const showAllRows = `
          function makeAllRowsVisible(root) {
            if (root.shadowRoot) {
              const rows = root.shadowRoot.querySelectorAll('tr[id^="B"]');
              rows.forEach(row => {
                row.style.removeProperty('display');
                row.style.opacity = '1';
                row.style.visibility = 'visible';
              });
            }
            
            if (root.children) {
              Array.from(root.children).forEach(child => {
                makeAllRowsVisible(child);
              });
            }
          }
          
          makeAllRowsVisible(document.documentElement);
        `;
        
        const scriptTag = document.createElement('script');
        scriptTag.textContent = showAllRows;
        document.documentElement.appendChild(scriptTag);
        document.documentElement.removeChild(scriptTag);
      } catch (e) {
        // 静默错误
      }
    }
  }
  
  // 如果是ibon网站，启用Shadow DOM处理
  if (isIbon) {
    // 延迟一点点再执行，等待iframe和shadowDOM创建
    setTimeout(() => {
      handleIbonShadowDOM();
    }, 10);
  }
  
  // 监听content.js加载完成的消息
  window.addEventListener('message', function(event) {
    // 筛选应用完成
    if (event.data && event.data.type === 'FILTER_APPLIED') {
      showAllElements();
    }
    
    // content.js已加载但尚未完成筛选，延长超时时间
    if (event.data && event.data.type === 'CONTENT_JS_LOADED' && !filterApplied) {
      // Cityline网站的特殊处理，主动通知可以开始筛选
      if (isCityline) {
        setTimeout(() => {
          window.postMessage({ type: 'CITYLINE_READY_FOR_FILTER' }, '*');
        }, 10);
      }
      
      // 设置更长的超时时间
      setTimeout(() => {
        if (!filterApplied) {  // 如果还没有应用过筛选
          showAllElements();
        }
      }, 2000); // 2秒后如果筛选未完成就显示
    }
  });
  
  // 设置安全超时，防止永久隐藏
  setTimeout(() => {
    if (!filterApplied) {
      showAllElements();
    }
  }, 1500); // 更短的超时时间，确保元素不会长时间隐藏
})(); 