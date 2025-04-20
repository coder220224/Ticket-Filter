// 等待DOM載入完成
function waitForElement(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// 通知早期加载脚本，content.js已加载
window.addEventListener('DOMContentLoaded', () => {
  window.postMessage({ type: 'CONTENT_JS_LOADED' }, '*');
  // 尽早执行筛选
  setTimeout(() => {
    if (getCurrentSite()) {
      loadSettings();
      filterTickets();
    }
  }, 0);
});

// 判斷當前網站
function getCurrentSite() {
  const url = window.location.href;
  if (url.includes('tixcraft.com')) {
    return 'tixcraft';
  } else if (url.includes('kktix.com')) {
    return 'kktix';
  } else if (url.includes('ibon.com.tw')) {
    return 'ibon';
  } else if (url.includes('cityline.com')) {
    return 'cityline';
  }
  return null;
}

// 數字轉換函數
function convertNumber(input) {
  const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const arabicNums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  
  // 移除所有空格
  input = input.replace(/\s+/g, '');
  
  // 生成所有可能的版本
  let versions = new Set([input]);
  
  // 找出所有數字和中文數字的位置
  let matches = [];
  // 匹配阿拉伯數字
  input.replace(/\d+/g, (match, offset) => {
    matches.push({
      type: 'arabic',
      value: match,
      offset: offset,
      length: match.length
    });
  });
  // 匹配中文數字
  for (let i = 0; i < chineseNums.length; i++) {
    let pos = input.indexOf(chineseNums[i]);
    while (pos !== -1) {
      matches.push({
        type: 'chinese',
        value: chineseNums[i],
        offset: pos,
        length: 1,
        arabic: arabicNums[i]
      });
      pos = input.indexOf(chineseNums[i], pos + 1);
    }
  }
  
  // 按位置排序
  matches.sort((a, b) => a.offset - b.offset);
  
  // 生成替換版本
  if (matches.length > 0) {
    // 原始文本轉換
    let converted = input;
    for (let match of matches) {
      if (match.type === 'arabic') {
        // 將阿拉伯數字轉為中文數字
        const digits = match.value.split('');
        const chinese = digits.map(d => chineseNums[parseInt(d)]).join('');
        converted = converted.slice(0, match.offset) + chinese + 
                   converted.slice(match.offset + match.length);
      } else {
        // 將中文數字轉為阿拉伯數字
        converted = converted.slice(0, match.offset) + match.arabic + 
                   converted.slice(match.offset + match.length);
      }
    }
    versions.add(converted);
  }
  
  return Array.from(versions);
}

// 檢查文本是否包含關鍵字（考慮數字轉換）
function textIncludesKeyword(text, keyword) {
  // 移除所有空格並轉換為小寫再比較
  const cleanText = text.replace(/\s+/g, '').toLowerCase();
  const cleanKeyword = keyword.replace(/\s+/g, '').toLowerCase();
  
  // 獲取文本的所有可能版本
  const textVersions = convertNumber(cleanText);
  const keywordVersions = convertNumber(cleanKeyword);
  
  // 交叉比對所有版本
  return keywordVersions.some(kw => 
    textVersions.some(txt => txt.includes(kw))
  );
}

let settings = {
  keywords: [],
  hideSoldOut: false,  // 默認顯示已售完票券（不隱藏）
  isProcessing: false,
  showAllPrices: true  // 用於KKTIX
};

// 從storage載入設定
function loadSettings() {
  const site = getCurrentSite();
  
  if (site === 'tixcraft') {
    chrome.storage.local.get(['keywords', 'hideSoldOut'], (result) => {
      settings = { ...settings, ...result };
      if (document.readyState === 'complete') {
        filterTickets();
        showFilterStatus();
      } else {
        window.addEventListener('load', () => {
          filterTickets();
          showFilterStatus();
        });
      }
    });
  } else if (site === 'kktix') {
    chrome.storage.sync.get(['targetKeywords', 'showAllPrices', 'hideSoldOut'], (result) => {
      if (result.targetKeywords) {
        settings.keywords = result.targetKeywords;
      }
      if (result.showAllPrices !== undefined) {
        settings.showAllPrices = result.showAllPrices;
      }
      if (result.hideSoldOut !== undefined) {
        settings.hideSoldOut = result.hideSoldOut;
      }
      if (document.readyState === 'complete') {
        filterTickets();
        showFilterStatus();
      } else {
        window.addEventListener('load', () => {
          filterTickets();
          showFilterStatus();
        });
      }
    });
  } else if (site === 'ibon') {
    chrome.storage.local.get(['ibonKeywords', 'ibonHideSoldOut'], (result) => {
      if (result.ibonKeywords) {
        settings.keywords = result.ibonKeywords;
      }
      if (result.ibonHideSoldOut !== undefined) {
        settings.hideSoldOut = result.ibonHideSoldOut;
      }
      if (document.readyState === 'complete') {
        filterTickets();
        showFilterStatus();
      } else {
        window.addEventListener('load', () => {
          filterTickets();
          showFilterStatus();
        });
      }
    });
  } else if (site === 'cityline') {
    chrome.storage.local.get(['citylineKeywords', 'citylineHideSoldOut'], (result) => {
      if (result.citylineKeywords) {
        settings.keywords = result.citylineKeywords;
      }
      if (result.citylineHideSoldOut !== undefined) {
        settings.hideSoldOut = result.citylineHideSoldOut;
      }
      if (document.readyState === 'complete') {
        filterTickets();
        showFilterStatus();
      } else {
        window.addEventListener('load', () => {
          filterTickets();
          showFilterStatus();
        });
      }
    });
  }
}

// 初始化
loadSettings();

// 確保預設設置被正確設置
chrome.storage.local.get(['showServerTime', 'showFilterStatus'], function(result) {
  // 如果設置尚未初始化，設置預設值
  const updates = {};
  if (result.showServerTime === undefined) {
    updates.showServerTime = true;
  }
  if (result.showFilterStatus === undefined) {
    updates.showFilterStatus = true;
  }
  
  // 如果有需要更新的設置，保存到storage
  if (Object.keys(updates).length > 0) {
    chrome.storage.local.set(updates);
  }
});

// 注入CSS樣式
const style = document.createElement('style');
style.textContent = `
  .ticket-filter-notification {
    position: fixed;
    right: 10px;
    padding: 8px 12px;
    background-color: #2684FF;
    color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif;
  }

  .server-time-display {
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 8px 12px;
    background-color: #2684FF;
    color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif;
  }
`;
document.head.appendChild(style);

// 顯示篩選狀態
function showFilterStatus() {
  chrome.storage.local.get(['showServerTime', 'showFilterStatus', 'extensionEnabled'], function(result) {
    // 如果擴展被停用，移除所有顯示
    if (result.extensionEnabled === false) {
      const existingNotification = document.querySelector('.ticket-filter-notification');
      if (existingNotification) {
        existingNotification.remove();
      }
      const existingTimeDisplay = document.querySelector('.server-time-display');
      if (existingTimeDisplay) {
        existingTimeDisplay.remove();
      }
      return;
    }

    if (result.showFilterStatus === false) {
      const existingNotification = document.querySelector('.ticket-filter-notification');
      if (existingNotification) {
        existingNotification.remove();
      }
      return;
    }

    let notification = document.querySelector('.ticket-filter-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'ticket-filter-notification';
      document.body.appendChild(notification);
    }
    
    if (result.showServerTime) {
      notification.style.top = '50px';  // 在時間顯示下方
    } else {
      notification.style.top = '10px';  // 原本的位置
    }
    
    let statusText = [];
    const site = getCurrentSite();
    
    if (site === 'tixcraft') {
      if (settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
      } else {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'kktix') {
      if (settings.showAllPrices) {
        statusText.push('無篩選條件');
      } else if (settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
      } else {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'ibon') {
      if (settings.keywords && settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
      } else {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'cityline') {
      if (settings.keywords && settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
      } else {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    }
    
    const newText = statusText.join(' | ');
    if (notification.textContent !== newText) {
      notification.textContent = newText;
    }
  });
}

// 顯示所有區域
function showAllAreas() {
  const site = getCurrentSite();
  if (site === 'tixcraft') {
    document.querySelectorAll('.area-list li').forEach(item => {
      item.style.display = '';
    });
    document.querySelectorAll('.zone-label').forEach(label => {
      label.style.display = '';
    });
  } else if (site === 'kktix') {
    document.querySelectorAll('.ticket-unit').forEach(item => {
      item.style.display = '';
    });
  } else if (site === 'ibon') {
    function showAllTickets(element) {
      if (element.shadowRoot) {
        const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
        rows.forEach(row => {
          row.style.removeProperty('display');
          row.classList.remove('hidden-by-extension');
          Array.from(row.children).forEach(cell => {
            cell.style.removeProperty('display');
          });
        });
      }
      Array.from(element.children || []).forEach(showAllTickets);
    }
    showAllTickets(document.documentElement);
  } else if (site === 'cityline') {
    document.querySelectorAll('.form-check').forEach(item => {
      item.style.display = '';
    });
  }
  
  // 通知早期加载脚本，已显示所有票券
  window.postMessage({ type: 'FILTER_APPLIED' }, '*');
}

// 主要篩選功能
async function filterTickets() {
  // 檢查擴展是否被停用
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['extensionEnabled'], resolve);
  });

  if (result.extensionEnabled === false) {
    showAllAreas(); // 如果擴展被停用，顯示所有區域
    return;
  }

  if (settings.isProcessing) return;
  settings.isProcessing = true;

  try {
    const site = getCurrentSite();
    
    if (site === 'tixcraft' && window.location.href.includes('/ticket/area/')) {
      await filterTixcraftTickets();
    } else if (site === 'kktix' && document.querySelector('.ticket-unit')) {
      await filterKKTIXTickets();
    } else if (site === 'ibon') {
      await filterIbonTickets();
    } else if (site === 'cityline' && document.querySelector('.price-box1')) {
      await filterCitylineTickets();
    }
    
    // 通知早期加载脚本，筛选已完成
    window.postMessage({ type: 'FILTER_APPLIED' }, '*');
  } catch (error) {
    console.error('篩選票券時發生錯誤：', error);
    // 即使出錯也要通知移除隱藏樣式
    window.postMessage({ type: 'FILTER_APPLIED' }, '*');
  } finally {
    settings.isProcessing = false;
  }
}

// KKTIX票券篩選
async function filterKKTIXTickets() {
  const ticketRows = document.querySelectorAll('.ticket-unit');
  if (!ticketRows.length) return;

  showAllAreas();

  if (settings.showAllPrices) {
    ticketRows.forEach(row => {
      // 檢查票券是否已售完
      const isSoldOut = row.textContent.includes('已售完');
      
      if (settings.hideSoldOut && isSoldOut) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
    });
    return;
  }

  // 支援AND/OR邏輯的關鍵字處理
  const keywordGroups = settings.keywords.map(keyword => {
    return keyword.split('+').map(k => {
      return k.split(',').map(item => item.trim()).filter(item => item);
    }).filter(group => group.length > 0);
  });

  for (const row of ticketRows) {
    const priceElement = row.querySelector('.ticket-price');
    const nameElement = row.querySelector('.ticket-name');
    
    if (priceElement && nameElement) {
      const price = priceElement.textContent.trim().replace(/[^\d]/g, '');
      const name = nameElement.textContent.trim();
      // 檢查票券是否已售完
      const isSoldOut = row.textContent.includes('已售完');
      
      const shouldShow = keywordGroups.length === 0 || keywordGroups.some(orGroup => 
        orGroup.some(andGroup => {
          return andGroup.every(keyword => {
            const searchTexts = [name.toLowerCase(), price];
            
            if (!isNaN(keyword)) {
              const priceToFind = parseInt(keyword);
              const found = searchTexts.some(text => {
                const prices = (text.match(/\d+/g) || []).map(p => parseInt(p));
                return prices.includes(priceToFind);
              });
              return found;
            } else {
              const found = searchTexts.some(text => textIncludesKeyword(text, keyword));
              return found;
            }
          });
        })
      );

      if (shouldShow && (!isSoldOut || !settings.hideSoldOut)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  }
}

// 拓元票券篩選
async function filterTixcraftTickets() {
  await waitForElement('.zone-label[data-id]');
  
  const areaGroups = document.querySelectorAll('.zone-label[data-id]');
  if (!areaGroups.length) return;

  showAllAreas();

  // 如果沒有關鍵字，則顯示全部（只考慮是否隱藏已售完）
  if (settings.keywords.length === 0) {
    if (settings.hideSoldOut) {
      document.querySelectorAll('.area-list li').forEach(item => {
        const remainingText = item.querySelector('font')?.textContent.trim() || '';
        if (remainingText.includes('已售完')) {
          item.style.display = 'none';
        }
      });
    }
    return;
  }

  // 拓元特有的關鍵字組合處理（支援AND/OR邏輯）
  const keywordGroups = settings.keywords.map(keyword => {
    return keyword.split('+').map(k => {
      return k.split(',').map(item => item.trim()).filter(item => item);
    }).filter(group => group.length > 0);
  });

  areaGroups.forEach(group => {
    const groupId = group.dataset.id;
    const areaList = document.getElementById(groupId);
    if (!areaList) return;

    const items = areaList.querySelectorAll('li');
    let hasVisibleItems = false;

    const groupTitle = group.querySelector('b')?.textContent.trim() || group.textContent.trim();

    items.forEach(item => {
      const areaText = item.textContent.trim();
      const remainingText = item.querySelector('font')?.textContent.trim() || '';
      const isSoldOut = remainingText.includes('已售完');

      const shouldShow = keywordGroups.some(orGroup => 
        orGroup.some(andGroup => {
          return andGroup.every(keyword => {
            const searchTexts = [groupTitle, areaText];
            
            if (!isNaN(keyword)) {
              const priceToFind = parseInt(keyword);
              return searchTexts.some(text => {
                const prices = (text.match(/\d+/g) || []).map(p => parseInt(p));
                return prices.includes(priceToFind);
              });
            } else {
              return searchTexts.some(text => textIncludesKeyword(text, keyword));
            }
          });
        })
      );

      if (shouldShow && (!isSoldOut || !settings.hideSoldOut)) {
        item.style.display = '';
        hasVisibleItems = true;
      } else {
        item.style.display = 'none';
      }
    });

    group.style.display = hasVisibleItems ? '' : 'none';
  });
}

// ibon票券篩選
async function filterIbonTickets() {
  // 遞迴查找所有shadow root並處理
  function processTicketAreas(element) {
    if (element.shadowRoot) {
      // 在shadow root中添加樣式
      let style = element.shadowRoot.querySelector('style.extension-filter-style');
      if (!style) {
        style = document.createElement('style');
        style.className = 'extension-filter-style';
        element.shadowRoot.appendChild(style);
      }
      style.textContent = `
        tr[id^="B"].hidden-by-extension { display: none !important; }
        tr[id^="B"].hidden-by-extension * { display: none !important; }
      `;
      
      // 處理當前shadow root中的票券
      const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
      
      if (rows.length > 0) {
        rows.forEach(row => {
          let shouldShow = true;

          if (settings.keywords && settings.keywords.length > 0) {
            shouldShow = false;
            const areaCell = row.querySelector('td[data-title="票區"]');
            const priceCell = row.querySelector('td[data-title="票價(NT$)"]');
            
            if (areaCell && priceCell) {
              const areaText = areaCell.textContent.trim();
              const priceText = priceCell.textContent.replace(/,/g, '').trim();
              
              // 支援AND/OR邏輯的關鍵字處理
              const keywordGroups = settings.keywords.map(keyword => {
                return keyword.split('+').map(k => {
                  return k.split(',').map(item => item.trim()).filter(item => item);
                }).filter(group => group.length > 0);
              });

              shouldShow = keywordGroups.some(orGroup => 
                orGroup.some(andGroup => {
                  return andGroup.every(keyword => {
                    const searchTexts = [areaText.toLowerCase(), priceText];
                    
                    if (!isNaN(keyword)) {
                      // 數字比對
                      const priceToFind = parseInt(keyword);
                      const found = searchTexts.some(text => {
                        const prices = (text.match(/\d+/g) || []).map(p => parseInt(p));
                        return prices.includes(priceToFind);
                      });
                      return found;
                    } else {
                      // 文字比對（包含數字轉換）
                      const found = searchTexts.some(text => {
                        // 轉換數字並比對
                        const textVersions = convertNumber(text);
                        const keywordVersions = convertNumber(keyword.toLowerCase());
                        return keywordVersions.some(kw => 
                          textVersions.some(txt => txt.includes(kw))
                        );
                      });
                      return found;
                    }
                  });
                })
              );
            }
          }

          // 檢查是否售完
          const isSoldOut = row.textContent.includes('售完');
          if (settings.hideSoldOut && isSoldOut) {
            shouldShow = false;
          }

          if (!shouldShow) {
            row.style.setProperty('display', 'none', 'important');
            row.classList.add('hidden-by-extension');
            Array.from(row.children).forEach(cell => {
              cell.style.setProperty('display', 'none', 'important');
            });
          } else {
            row.style.removeProperty('display');
            row.classList.remove('hidden-by-extension');
            Array.from(row.children).forEach(cell => {
              cell.style.removeProperty('display');
            });
          }
        });
      }

      // 處理iframe
      const iframes = element.shadowRoot.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            processTicketAreas(iframe.contentDocument);
          }
        } catch (e) {
          // console.log('無法訪問iframe');
        }
      });
    }
    
    // 遞迴處理所有子元素
    const children = element.children;
    if (children) {
      Array.from(children).forEach(child => {
        processTicketAreas(child);
      });
    }
  }

  // 開始處理整個文檔
  processTicketAreas(document.documentElement);

  // 設置觀察器以處理動態加載的內容
  const observer = new MutationObserver(() => {
    processTicketAreas(document.documentElement);
  });

  // 監視整個文檔的變化
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // 定期檢查（改為只檢查10次，減少對性能的影響）
  let checkCount = 0;
  const intervalId = setInterval(() => {
    if (checkCount++ < 10) {
      processTicketAreas(document.documentElement);
    } else {
      clearInterval(intervalId);
    }
  }, 200);
}

// Cityline票券篩選
async function filterCitylineTickets() {
  const ticketItems = document.querySelectorAll('.form-check');
  if (!ticketItems.length) return;

  // 標記所有票券元素為"準備好被篩選"
  document.querySelectorAll('.price-box1, .form-check').forEach(el => {
    el.classList.add('filter-ready');
  });

  // 如果沒有關鍵字且不隱藏已售完，則全部顯示
  if (settings.keywords.length === 0 && !settings.hideSoldOut) {
    // 確保所有票券都可見
    ticketItems.forEach(item => {
      item.style.display = '';
      item.style.visibility = 'visible';
      item.style.opacity = '1';
    });
    return;
  }

  // 支援AND/OR邏輯的關鍵字處理
  const keywordGroups = settings.keywords.map(keyword => {
    return keyword.split('+').map(k => {
      return k.split(',').map(item => item.trim()).filter(item => item);
    }).filter(group => group.length > 0);
  });

  for (const item of ticketItems) {
    // 獲取票券資訊
    const priceText = item.querySelector('.price-num')?.textContent.trim() || '';
    const degreeText = item.querySelector('.price-degree')?.textContent.trim() || '';
    const isSoldOut = item.textContent.includes('售罄') || item.querySelector('input[data-disabled="true"]') !== null;
    
    // 先檢查是否隱藏已售完
    if (settings.hideSoldOut && isSoldOut) {
      item.style.display = 'none';
      continue;
    }
    
    // 如果沒有關鍵字，則顯示全部
    if (settings.keywords.length === 0) {
      item.style.display = '';
      continue;
    }
    
    // 提取價格數字
    const priceMatch = priceText.match(/\d+/g);
    const price = priceMatch ? priceMatch.join('') : '';
    
    // 合併文字內容用於匹配
    const fullText = `${degreeText} ${priceText}`;
    
    // 檢查是否符合關鍵字
    const shouldShow = keywordGroups.some(orGroup => 
      orGroup.some(andGroup => {
        return andGroup.every(keyword => {
          const searchTexts = [fullText.toLowerCase(), price];
          
          if (!isNaN(keyword)) {
            // 數字比對
            const priceToFind = parseInt(keyword);
            const found = searchTexts.some(text => {
              const prices = (text.match(/\d+/g) || []).map(p => parseInt(p));
              return prices.includes(priceToFind);
            });
            return found;
          } else {
            // 文字比對
            return searchTexts.some(text => textIncludesKeyword(text, keyword));
          }
        });
      })
    );
    
    // 設置顯示或隱藏
    if (shouldShow) {
      item.style.display = '';
      item.style.visibility = 'visible';
      item.style.opacity = '1';
    } else {
      item.style.display = 'none';
    }
  }
  
  // 通知頁面篩選已完成
  window.ticketFilterComplete = true;
}

// 監聽來自popup的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    const site = getCurrentSite();
    // console.log('收到來自popup的消息:', {
    //   site: site,
    //   request: request
    // });
    
    // 處理拓元的消息
    if (site === 'tixcraft') {
      if (request.type === 'UPDATE_SETTINGS') {
        settings = { ...settings, ...request.settings };
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      } else if (request.type === 'SHOW_ALL') {
        settings.keywords = [];
        settings.hideSoldOut = false;  // 確保設置為false
        showAllAreas();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }
    
    // 處理KKTIX的消息
    if (site === 'kktix') {
      if (request.action === 'updateFilter') {
        settings.keywords = request.keywords || [];
        settings.showAllPrices = false;
        if (request.settings && request.settings.hideSoldOut !== undefined) {
          settings.hideSoldOut = request.settings.hideSoldOut;
        }
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'showAllPrices') {
        settings.keywords = [];
        settings.showAllPrices = true;
        settings.hideSoldOut = false;  // 確保設置為false
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
        return true;
      }
    }

    // 處理ibon的消息
    if (site === 'ibon') {
      if (request.type === 'UPDATE_IBON_SETTINGS') {
        console.log('收到ibon設定更新:', request.settings);
        // 確保使用正確的屬性名稱
        settings.keywords = request.settings.keywords || [];
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        console.log('更新後的settings:', settings);
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }

    // 處理cityline的消息
    if (site === 'cityline') {
      if (request.type === 'UPDATE_CITYLINE_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }
  } catch (error) {
    console.log('處理訊息時發生錯誤：', error);
    sendResponse({ success: false, error: error.message });
  }
  return true;
});

// 初始執行
const site = getCurrentSite();
if (site === 'tixcraft' || site === 'kktix' || site === 'ibon' || site === 'cityline') {
  if (document.readyState === 'complete') {
    showFilterStatus();
    filterTickets();
  } else {
    window.addEventListener('load', () => {
      showFilterStatus();
      filterTickets();
    });
  }
}

// 監聽DOM變化
let filterDebounceTimer = null;
let statusDebounceTimer = null;
const observer = new MutationObserver((mutations) => {
  const site = getCurrentSite();
  if (!site) return;

  // 使用不同的計時器處理篩選和狀態顯示
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer);
  }
  if (statusDebounceTimer) {
    clearTimeout(statusDebounceTimer);
  }

  // 篩選功能的防抖
  filterDebounceTimer = setTimeout(() => {
    if (site === 'tixcraft' && window.location.href.includes('/ticket/area/')) {
      filterTickets();
    } else if (site === 'kktix' && document.querySelector('.ticket-unit')) {
      filterTickets();
    } else if (site === 'ibon') {
      filterTickets();
    } else if (site === 'cityline' && document.querySelector('.price-box1')) {
      filterTickets();
    }
  }, 250);

  // 狀態顯示的防抖，使用較短的延遲
  statusDebounceTimer = setTimeout(() => {
    showFilterStatus();
  }, 100);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class', 'disabled']
});

// 處理頁面從背景切回前景時的情況
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    loadSettings();
  }
});

// 顯示時間
function showServerTime() {
  chrome.storage.local.get(['showServerTime', 'extensionEnabled'], function(result) {
    if (result.showServerTime === false || result.extensionEnabled === false) {
      const existingDisplay = document.querySelector('.server-time-display');
      if (existingDisplay) {
        existingDisplay.remove();
      }
      
      // 時間顯示框被移除，更新篩選條件框位置
      const notification = document.querySelector('.ticket-filter-notification');
      if (notification) {
        notification.style.top = '10px';
      }
      
      return;
    }

    let timeDisplay = document.querySelector('.server-time-display');
    if (!timeDisplay) {
      timeDisplay = document.createElement('div');
      timeDisplay.className = 'server-time-display';
      document.body.appendChild(timeDisplay);
      
      // 時間顯示框添加後，更新篩選條件框位置
      const notification = document.querySelector('.ticket-filter-notification');
      if (notification) {
        notification.style.top = '50px';
      }
    }

    // 定時更新顯示本地時間（CST）
    function updateDisplay() {
      const currentTime = new Date();
      timeDisplay.textContent = `本地時間：${currentTime.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}`;
    }

    // 每秒更新一次時間
    const displayInterval = setInterval(updateDisplay, 1000);
    
    // 立即顯示時間
    updateDisplay();

    // 清理函數
    function cleanup() {
      clearInterval(displayInterval);
    }

    // 監聽元素移除
    const observer = new MutationObserver((mutations) => {
      if (!document.contains(timeDisplay)) {
        cleanup();
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// 監聽設置變化
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.showServerTime) {
    if (changes.showServerTime.newValue === false) {
      const existingDisplay = document.querySelector('.server-time-display');
      if (existingDisplay) {
        existingDisplay.remove();
      }
    } else {
      showServerTime();
    }
    // 重新顯示篩選狀態，以更新位置
    showFilterStatus();
  }
  
  // 當篩選條件顯示設置改變時，重新顯示篩選狀態
  if (changes.showFilterStatus !== undefined) {
    if (changes.showFilterStatus.newValue === false) {
      // 如果設置為不顯示，移除現有的篩選條件顯示
      const existingNotification = document.querySelector('.ticket-filter-notification');
      if (existingNotification) {
        existingNotification.remove();
      }
    } else {
      // 如果設置為顯示，重新顯示篩選條件
      showFilterStatus();
    }
  }

  // 監聽擴展啟用狀態的變化
  if (changes.extensionEnabled !== undefined) {
    const site = getCurrentSite();
    if (!site) return;

    if (changes.extensionEnabled.newValue === false) {
      // 擴展被停用
      // 1. 移除所有顯示
      const notification = document.querySelector('.ticket-filter-notification');
      const timeDisplay = document.querySelector('.server-time-display');
      if (notification) notification.remove();
      if (timeDisplay) timeDisplay.remove();

      // 2. 重置所有設定
      settings.keywords = [];
      settings.hideSoldOut = false;
      settings.showAllPrices = true;
      settings.isProcessing = false;

      // 3. 強制顯示所有區域
      showAllAreas();

      // 4. 對於 ibon 網站，額外處理
      if (site === 'ibon') {
        // 移除所有由擴充功能添加的樣式
        function removeStyles(element) {
          if (element.shadowRoot) {
            const styles = element.shadowRoot.querySelectorAll('style.extension-filter-style');
            styles.forEach(style => style.remove());
            
            // 清除所有票券的隱藏狀態
            const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
            rows.forEach(row => {
              row.style.removeProperty('display');
              row.classList.remove('hidden-by-extension');
              Array.from(row.children).forEach(cell => {
                cell.style.removeProperty('display');
              });
            });
          }
          Array.from(element.children || []).forEach(removeStyles);
        }
        removeStyles(document.documentElement);

        // 立即重新執行篩選（這會顯示所有票券）
        filterTickets();
      }
    } else {
      // 擴展被啟用，重新初始化所有功能
      loadSettings();
      showServerTime();
      showFilterStatus();
      filterTickets();
    }
  }
});

// 在頁面加載完成後顯示時間（只保留这一个初始化点）
if (document.readyState === 'complete') {
  showServerTime();
} else {
  window.addEventListener('load', showServerTime);
} 