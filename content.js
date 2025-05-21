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
    const site = getCurrentSite();
    if (site) {
      loadSettings();
      // 如果是 ibon 的 WEB網站入口頁面，立即執行篩選
      if (site === 'ibon' && window.location.href.includes('WEB網站入口')) {
        filterTickets();
      } else {
        filterTickets();
      }
    }
  }, 0);

  // 特別處理年代售票網站
  if (getCurrentSite() === 'ticket') {
    // 監聽頁面變化
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // 檢查是否有票區列表
          const areaItems = document.querySelectorAll('.area-list li.main');
          if (areaItems.length > 0) {
            filterTickets();
            break; // 找到後立即退出循環
          }
        }
      }
    });

    // 監視整個文檔的變化
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // 定期檢查並重新應用篩選（更頻繁的檢查）
    setInterval(() => {
      const areaItems = document.querySelectorAll('.area-list li.main');
      if (areaItems.length > 0) {
        filterTickets();
      }
    }, 500); // 每500ms檢查一次
  }
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
  } else if (url.includes('ticket.com.tw')) {
    return 'ticket';
  } else if (url.includes('ticketplus.com.tw')) {
    return 'ticketplus';
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
  // 移除所有空格和逗號，並轉換為小寫再比較
  const cleanText = text.replace(/[\s,]+/g, '').toLowerCase();
  
  // 處理 OR 邏輯（用 + 分隔）
  const orParts = keyword.split('+').map(part => part.trim());
  
  // 如果任一 OR 條件符合就返回 true
  return orParts.some(orPart => {
    // 處理 AND 邏輯（用 , 分隔）
    const andParts = orPart.split(',').map(part => part.trim());
    
    // 所有 AND 條件都要符合才返回 true
    return andParts.every(andPart => {
      // 移除關鍵字中的逗號
      andPart = andPart.replace(/,/g, '');
      
      // 獲取文本的所有可能版本（包含數字轉換）
      const textVersions = convertNumber(cleanText);
      const keywordVersions = convertNumber(andPart.toLowerCase());
      
      // 交叉比對所有版本
      return keywordVersions.some(kw => 
        textVersions.some(txt => txt.includes(kw))
      );
    });
  });
}

let settings = {
  keywords: [],
  blacklist: [],  // 新增黑名單設定
  hideSoldOut: false,
  isProcessing: false,
  showAllPrices: true
};

// 從storage載入設定
function loadSettings() {
  const site = getCurrentSite();
  
  if (site === 'tixcraft') {
    chrome.storage.local.get(['keywords', 'blacklist', 'hideSoldOut'], (result) => {
      settings = { 
        ...settings, 
        ...result,
        blacklist: result.blacklist || []
      };
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
    chrome.storage.sync.get(['targetKeywords', 'blacklist', 'showAllPrices', 'hideSoldOut'], (result) => {
      if (result.targetKeywords) {
        settings.keywords = result.targetKeywords;
      }
      if (result.blacklist) {
        settings.blacklist = result.blacklist;
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
    chrome.storage.local.get(['ibonKeywords', 'ibonBlacklist', 'ibonHideSoldOut'], (result) => {
      if (result.ibonKeywords) {
        settings.keywords = result.ibonKeywords;
      }
      if (result.ibonBlacklist) {
        settings.blacklist = result.ibonBlacklist;
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
    chrome.storage.local.get(['citylineKeywords', 'citylineBlacklist', 'citylineHideSoldOut'], (result) => {
      if (result.citylineKeywords) {
        settings.keywords = result.citylineKeywords;
      }
      if (result.citylineBlacklist) {
        settings.blacklist = result.citylineBlacklist;
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
  } else if (site === 'ticket') {
    chrome.storage.local.get(['ticketKeywords', 'ticketHideSoldOut'], (result) => {
      if (result.ticketKeywords) {
        settings.keywords = result.ticketKeywords;
      }
      if (result.ticketHideSoldOut !== undefined) {
        settings.hideSoldOut = result.ticketHideSoldOut;
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
  } else if (site === 'ticketplus') {
    chrome.storage.local.get(['ticketplusKeywords', 'ticketplusBlacklist', 'ticketplusHideSoldOut'], (result) => {
      if (result.ticketplusKeywords) {
        settings.keywords = result.ticketplusKeywords;
      }
      if (result.ticketplusBlacklist) {
        settings.blacklist = result.ticketplusBlacklist;
      }
      if (result.ticketplusHideSoldOut !== undefined) {
        settings.hideSoldOut = result.ticketplusHideSoldOut;
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

  /* 遠大售票平台平滑過渡效果 */
  .v-expansion-panels.seats-area .v-expansion-panel {
    opacity: 0.1;
    transition: opacity 0.15s ease-out;
  }
  
  .v-expansion-panels.seats-area .v-expansion-panel.filter-processed {
    opacity: 1;
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
      let hasFilter = false;
      if (settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
        hasFilter = true;
      }
      if (settings.blacklist && settings.blacklist.length > 0) {
        statusText.push(`黑名單：${settings.blacklist.join('、')}`);
        hasFilter = true;
      }
      if (!hasFilter) {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'kktix') {
      let hasFilter = false;
      if (settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
        hasFilter = true;
      }
      if (settings.blacklist && settings.blacklist.length > 0) {
        statusText.push(`黑名單：${settings.blacklist.join('、')}`);
        hasFilter = true;
      }
      if (!hasFilter) {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'ibon') {
      let hasFilter = false;
      if (settings.keywords && settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
        hasFilter = true;
      }
      if (settings.blacklist && settings.blacklist.length > 0) {
        statusText.push(`黑名單：${settings.blacklist.join('、')}`);
        hasFilter = true;
      }
      if (!hasFilter) {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'cityline') {
      let hasFilter = false;
      if (settings.keywords && settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
        hasFilter = true;
      }
      if (settings.blacklist && settings.blacklist.length > 0) {
        statusText.push(`黑名單：${settings.blacklist.join('、')}`);
        hasFilter = true;
      }
      if (!hasFilter) {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'ticket') {
      let hasFilter = false;
      if (settings.keywords && settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
        hasFilter = true;
      }
      if (settings.blacklist && settings.blacklist.length > 0) {
        statusText.push(`黑名單：${settings.blacklist.join('、')}`);
        hasFilter = true;
      }
      if (!hasFilter) {
        statusText.push('無篩選條件');
      }
      if (settings.hideSoldOut) {
        statusText.push('不顯示已售完票券');
      }
    } else if (site === 'ticketplus') {
      let hasFilter = false;
      if (settings.keywords && settings.keywords.length > 0) {
        statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
        hasFilter = true;
      }
      if (settings.blacklist && settings.blacklist.length > 0) {
        statusText.push(`黑名單：${settings.blacklist.join('、')}`);
        hasFilter = true;
      }
      if (!hasFilter) {
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
          // 移除所有由擴充功能添加的樣式和類別
          row.style.removeProperty('display');
          row.classList.remove('hidden-by-extension');
          row.classList.remove('filter-processed');
          Array.from(row.children).forEach(cell => {
            cell.style.removeProperty('display');
          });
        });
        
        // 移除 shadow root 中的過濾樣式
        const filterStyle = element.shadowRoot.querySelector('.extension-filter-style');
        if (filterStyle) {
          filterStyle.remove();
        }
      }
      Array.from(element.children || []).forEach(showAllTickets);
    }
    showAllTickets(document.documentElement);
    
    // 強制更新頁面狀態
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  } else if (site === 'cityline') {
    document.querySelectorAll('.form-check').forEach(item => {
      item.style.display = '';
    });
  } else if (site === 'ticket') {
    document.querySelectorAll('.area-list li').forEach(item => {
      item.style.display = '';
    });
  } else if (site === 'ticketplus') {
    document.querySelectorAll('.v-expansion-panels.seats-area .v-expansion-panel').forEach(panel => {
      panel.style.display = '';
      panel.classList.add('filter-processed');
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
    showAllAreas();
    return;
  }

  if (settings.isProcessing) return;
  settings.isProcessing = true;

  try {
    const site = getCurrentSite();
    
    // 根據不同網站執行對應的過濾邏輯
    if (site === 'tixcraft' && window.location.href.includes('/ticket/area/')) {
      await filterTixcraftTickets();
    } else if (site === 'kktix' && document.querySelector('.ticket-unit')) {
      await filterKKTIXTickets();
    } else if (site === 'ibon') {
      await filterIbonTickets();
    } else if (site === 'cityline' && document.querySelector('.price-box1')) {
      await filterCitylineTickets();
    } else if (site === 'ticket') {
      await filterTicketComTickets();
    } else if (site === 'ticketplus') {
      await filterTicketPlusTickets();
    }
    
    // 通知早期加載腳本，過濾已完成
    window.postMessage({ type: 'FILTER_APPLIED' }, '*');
  } catch (error) {
    console.error('過濾票券時發生錯誤：', error);
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

  // 如果沒有任何篩選條件，只處理是否隱藏已售完
  if (settings.keywords.length === 0 && (!settings.blacklist || settings.blacklist.length === 0)) {
    ticketRows.forEach(row => {
      const isSoldOut = row.textContent.includes('已售完');
      if (settings.hideSoldOut && isSoldOut) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
    });
    return;
  }

  // 處理每個票券
  ticketRows.forEach(row => {
    const priceElement = row.querySelector('.ticket-price');
    const nameElement = row.querySelector('.ticket-name');
    
    if (priceElement && nameElement) {
      const price = priceElement.textContent.trim();
      const name = nameElement.textContent.trim();
      const text = name + ' ' + price;
      const isSoldOut = row.textContent.includes('已售完');
      
      // 檢查是否在黑名單中
      const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
        settings.blacklist.some(blacklistItem => {
          // 處理 OR 邏輯（用 + 分隔）
          const orParts = blacklistItem.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            // 處理 AND 邏輯（用 , 分隔）
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => textIncludesKeyword(text, andPart));
          });
        });
      
      // 檢查是否符合關鍵字
      const matchesKeyword = settings.keywords.length === 0 || 
        settings.keywords.some(keyword => {
          // 處理 OR 邏輯（用 + 分隔）
          const orParts = keyword.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            // 處理 AND 邏輯（用 , 分隔）
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => textIncludesKeyword(text, andPart));
          });
        });

      // 決定是否顯示
      let shouldShow = true;

      // 如果在黑名單中，不顯示
      if (isBlacklisted) {
        shouldShow = false;
      }

      // 如果有關鍵字且不符合關鍵字，不顯示
      if (settings.keywords.length > 0 && !matchesKeyword) {
        shouldShow = false;
      }

      // 如果設定隱藏已售完且已售完，不顯示
      if (settings.hideSoldOut && isSoldOut) {
        shouldShow = false;
      }

      // 立即應用顯示/隱藏狀態
      row.style.setProperty('display', shouldShow ? '' : 'none', 'important');
    }
  });
}

// 拓元票券篩選
async function filterTixcraftTickets() {
  await waitForElement('.zone-label[data-id]');
  
  const areaGroups = document.querySelectorAll('.zone-label[data-id]');
  if (!areaGroups.length) return;

  showAllAreas();

  // 如果沒有任何篩選條件，只處理是否隱藏已售完
  if (settings.keywords.length === 0 && (!settings.blacklist || settings.blacklist.length === 0)) {
    if (settings.hideSoldOut) {
      document.querySelectorAll('.area-list li').forEach(item => {
        const remainingText = item.querySelector('font')?.textContent.trim() || '';
        if (remainingText.includes('已售完')) {
          item.style.display = 'none';
        } else {
          item.style.display = '';
        }
      });
    }
    return;
  }

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
      const fullText = groupTitle + ' ' + areaText;

      // 檢查是否在黑名單中
      const isBlacklisted = isInBlacklist(fullText, settings.blacklist);
      
      // 檢查是否符合關鍵字
      const matchesKeyword = settings.keywords.length === 0 || settings.keywords.some(keyword => 
        textIncludesKeyword(fullText, keyword)
      );

      // 決定是否顯示
      let shouldShow = true;

      // 如果有黑名單項目且符合黑名單，則不顯示
      if (settings.blacklist && settings.blacklist.length > 0 && isBlacklisted) {
        shouldShow = false;
      }

      // 如果有關鍵字且不符合關鍵字，則不顯示
      if (settings.keywords.length > 0 && !matchesKeyword) {
        shouldShow = false;
      }

      // 如果設定隱藏已售完且已售完，則不顯示
      if (settings.hideSoldOut && isSoldOut) {
        shouldShow = false;
      }

      item.style.display = shouldShow ? '' : 'none';
      if (shouldShow) {
        hasVisibleItems = true;
      }
    });

    group.style.display = hasVisibleItems ? '' : 'none';
  });
}

// ibon票券篩選
async function filterIbonTickets() {
  let observer = null;
  let lastUrl = location.href;

  // 強制重新載入頁面的函數
  function forceReload() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      // 強制清除所有已有的篩選狀態
      function clearFilters(element) {
        if (element.shadowRoot) {
          const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
          rows.forEach(row => {
            row.classList.remove('filter-processed');
            row.classList.remove('hidden-by-extension');
            row.style.removeProperty('display');
          });
        }
        Array.from(element.children || []).forEach(clearFilters);
      }
      clearFilters(document.documentElement);
      
      // 強制重新執行篩選
      setTimeout(() => {
        processTicketAreas(document.documentElement);
      }, 100);
    }
  }

  // 監聽頁面變化
  window.addEventListener('popstate', forceReload);
  window.addEventListener('hashchange', forceReload);
  
  // 使用 MutationObserver 監聽 URL 變化
  const urlObserver = new MutationObserver(() => {
    forceReload();
  });
  
  urlObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // 添加全局樣式來預設隱藏所有票券
  const globalStyle = document.createElement('style');
  globalStyle.textContent = `
    tr[id^="B"] { 
      visibility: hidden !important;
      opacity: 0 !important;
      transition: visibility 0s, opacity 0.1s linear !important;
    }
    tr[id^="B"].filter-processed {
      visibility: visible !important;
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(globalStyle);

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
        tr[id^="B"] { 
          visibility: hidden !important;
          opacity: 0 !important;
          transition: visibility 0s, opacity 0.1s linear !important;
        }
        tr[id^="B"].filter-processed {
          visibility: visible !important;
          opacity: 1 !important;
        }
        tr[id^="B"].hidden-by-extension { 
          display: none !important; 
        }
        tr[id^="B"].hidden-by-extension * { 
          display: none !important; 
        }
      `;
      
      // 處理當前shadow root中的票券
      const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
      
      if (rows.length > 0) {
        rows.forEach(row => {
          const areaCell = row.querySelector('td[data-title="票區"]');
          const priceCell = row.querySelector('td[data-title="票價(NT$)"]');
          
          if (areaCell && priceCell) {
            const areaText = areaCell.textContent.trim();
            const priceText = priceCell.textContent.replace(/,/g, '').trim();
            const fullText = `${areaText} ${priceText}`;
            const isSoldOut = row.textContent.includes('售完');

            // 檢查是否在黑名單中
            const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
              settings.blacklist.some(blacklistItem => {
                const orParts = blacklistItem.split('+').map(part => part.trim());
                return orParts.some(orPart => {
                  const andParts = orPart.split(',').map(part => part.trim());
                  return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
                });
              });
            
            // 檢查是否符合關鍵字
            const matchesKeyword = settings.keywords.length === 0 || 
              settings.keywords.some(keyword => {
                const orParts = keyword.split('+').map(part => part.trim());
                return orParts.some(orPart => {
                  const andParts = orPart.split(',').map(part => part.trim());
                  return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
                });
              });

            // 決定是否顯示
            let shouldShow = true;

            if (isBlacklisted) shouldShow = false;
            if (settings.keywords.length > 0 && !matchesKeyword) shouldShow = false;
            if (settings.hideSoldOut && isSoldOut) shouldShow = false;

            // 標記為已處理
            row.classList.add('filter-processed');

            // 應用顯示/隱藏狀態
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
          }
        });
      }
    }
    
    // 遞迴處理所有子元素
    const children = element.children;
    if (children) {
      Array.from(children).forEach(child => {
        processTicketAreas(child);
      });
    }
  }

  // 清理之前的觀察器
  if (observer) {
    observer.disconnect();
  }

  // 開始處理整個文檔
  processTicketAreas(document.documentElement);

  // 設置新的觀察器
  observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    for (const mutation of mutations) {
      // 只在真正需要時處理變化
      if (mutation.type === 'childList' || 
          (mutation.type === 'attributes' && 
           (mutation.attributeName === 'style' || 
            mutation.attributeName === 'class' || 
            mutation.attributeName === 'data-title'))) {
        shouldProcess = true;
        break;
      }
    }
    if (shouldProcess) {
      processTicketAreas(document.documentElement);
    }
  });

  // 監視整個文檔的變化，但更有選擇性地處理
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'data-title']
  });

  // 監聽頁面可見性變化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processTicketAreas(document.documentElement);
    }
  });

  // 定期檢查頁面內容（作為備用方案）
  setInterval(() => {
    const ticketRows = document.querySelector('tr[id^="B"]');
    if (ticketRows) {
      processTicketAreas(document.documentElement);
    }
  }, 1000);
}

// Cityline票券篩選
async function filterCitylineTickets() {
  const ticketItems = document.querySelectorAll('.form-check');
  if (!ticketItems.length) return;

  // 標記所有票券元素為"準備好被篩選"
  document.querySelectorAll('.price-box1, .form-check').forEach(el => {
    el.classList.add('filter-ready');
  });

  // 如果沒有任何篩選條件，只處理是否隱藏已售完
  if (settings.keywords.length === 0 && (!settings.blacklist || settings.blacklist.length === 0)) {
    if (settings.hideSoldOut) {
      ticketItems.forEach(item => {
        const isSoldOut = item.textContent.includes('售罄') || 
                         item.querySelector('input[data-disabled="true"]') !== null;
        item.style.display = isSoldOut ? 'none' : '';
        if (!isSoldOut) {
          item.style.visibility = 'visible';
          item.style.opacity = '1';
        }
      });
    } else {
      ticketItems.forEach(item => {
        item.style.display = '';
        item.style.visibility = 'visible';
        item.style.opacity = '1';
      });
    }
    return;
  }

  ticketItems.forEach(item => {
    const priceText = item.querySelector('.price-num')?.textContent.trim() || '';
    const degreeText = item.querySelector('.price-degree')?.textContent.trim() || '';
    const isSoldOut = item.textContent.includes('售罄') || 
                     item.querySelector('input[data-disabled="true"]') !== null;
    
    const fullText = `${degreeText} ${priceText}`;
    
    // 檢查是否在黑名單中
    const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
      settings.blacklist.some(blacklistItem => textIncludesKeyword(fullText, blacklistItem));
    
    // 檢查是否符合關鍵字
    const matchesKeyword = settings.keywords.length === 0 || 
      settings.keywords.some(keyword => textIncludesKeyword(fullText, keyword));

    // 決定是否顯示
    let shouldShow = true;

    // 如果在黑名單中，不顯示
    if (isBlacklisted) {
      shouldShow = false;
    }

    // 如果有關鍵字且不符合關鍵字，不顯示
    if (settings.keywords.length > 0 && !matchesKeyword) {
      shouldShow = false;
    }

    // 如果設定隱藏已售完且已售完，不顯示
    if (settings.hideSoldOut && isSoldOut) {
      shouldShow = false;
    }

    // 立即應用顯示/隱藏狀態
    if (shouldShow) {
      item.style.display = '';
      item.style.visibility = 'visible';
      item.style.opacity = '1';
    } else {
      item.style.display = 'none';
    }
  });
}

// 年代售票網站篩選
async function filterTicketComTickets() {
  // 使用輪詢機制等待票區列表加載
  let retryCount = 0;
  const maxRetries = 20; // 最多等待20次
  const retryInterval = 100; // 每100ms檢查一次，總共最多等待2秒

  async function waitForTicketList() {
    return new Promise((resolve) => {
      const checkElements = () => {
        const areaItems = document.querySelectorAll('.area-list li.main');
        if (areaItems.length > 0) {
          resolve(true);
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkElements, retryInterval);
        } else {
          resolve(false);
        }
      };
      checkElements();
    });
  }

  // 等待票區列表加載
  const isLoaded = await waitForTicketList();
  if (!isLoaded) {
    console.log('票區列表加載超時');
    return;
  }

  const areaItems = document.querySelectorAll('.area-list li.main');
  if (!areaItems.length) return;

  // 使用 setProperty 來確保樣式被正確應用
  function setDisplayStyle(element, show) {
    if (show) {
      element.style.setProperty('display', '', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
    } else {
      element.style.setProperty('display', 'none', 'important');
    }
  }

  // 如果沒有關鍵字，則只處理是否隱藏已售完
  if (settings.keywords.length === 0) {
    if (settings.hideSoldOut) {
      areaItems.forEach(item => {
        const soldOutText = item.querySelector('font[color="#FF0000"]')?.textContent || '';
        const badgeText = item.querySelector('.badge')?.textContent || '';
        setDisplayStyle(item, soldOutText.includes('熱賣中') && !badgeText.includes('剩位'));
      });
    }
    return;
  }

  // 支援AND/OR邏輯的關鍵字處理
  const keywordGroups = settings.keywords.map(keyword => {
    return keyword.split('+').map(k => {
      return k.split(',').map(item => item.trim()).filter(item => item);
    }).filter(group => group.length > 0);
  });

  areaItems.forEach(item => {
    const areaText = item.querySelector('font[color="#333"]')?.textContent || '';
    const statusText = item.querySelector('font[color="#FF0000"]')?.textContent || '';
    const badgeText = item.querySelector('.badge')?.textContent || '';
    const isSoldOut = !statusText.includes('熱賣中') || badgeText.includes('剩位');

    const shouldShow = keywordGroups.some(orGroup => 
      orGroup.some(andGroup => {
        return andGroup.every(keyword => {
          if (!isNaN(keyword)) {
            // 數字比對
            const priceToFind = parseInt(keyword);
            const prices = (areaText.match(/\d+/g) || []).map(p => parseInt(p));
            return prices.includes(priceToFind);
          } else {
            // 文字比對
            return textIncludesKeyword(areaText, keyword);
          }
        });
      })
    );

    setDisplayStyle(item, shouldShow && (!isSoldOut || !settings.hideSoldOut));
  });
}

// 遠大售票平台票券篩選
async function filterTicketPlusTickets() {
  // 等待票券元素出現
  const waitForTickets = () => {
    return new Promise((resolve) => {
      const check = () => {
        const tickets = document.querySelectorAll('.v-expansion-panels.seats-area .v-expansion-panel');
        if (tickets.length > 0) {
          resolve(tickets);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  };

  const ticketPanels = await waitForTickets();
  
  // 如果沒有任何篩選條件，顯示所有票券
  if (settings.keywords.length === 0 && (!settings.blacklist || settings.blacklist.length === 0)) {
    ticketPanels.forEach(panel => {
      const soldOutText = panel.querySelector('.soldout');
      const remainingText = panel.querySelector('small');
      
      if (settings.hideSoldOut && (soldOutText || (remainingText && remainingText.textContent.includes('剩餘 0')))) {
        panel.style.display = 'none';
      } else {
        panel.style.display = '';
        panel.classList.add('filter-processed');
      }
    });
    return;
  }

  ticketPanels.forEach(panel => {
    const areaText = panel.querySelector('.d-flex.align-center')?.textContent.trim() || '';
    const priceText = panel.querySelector('.text-right.col.col-4')?.textContent.trim() || '';
    const soldOutText = panel.querySelector('.soldout');
    const remainingText = panel.querySelector('small');
    
    const isSoldOut = soldOutText || (remainingText && remainingText.textContent.includes('剩餘 0'));
    const fullText = `${areaText} ${priceText}`;

    // 檢查是否在黑名單中
    const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
      settings.blacklist.some(blacklistItem => {
        const orParts = blacklistItem.split('+').map(part => part.trim());
        return orParts.some(orPart => {
          const andParts = orPart.split(',').map(part => part.trim());
          return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
        });
      });
    
    // 檢查是否符合關鍵字
    const matchesKeyword = settings.keywords.length === 0 || 
      settings.keywords.some(keyword => {
        const orParts = keyword.split('+').map(part => part.trim());
        return orParts.some(orPart => {
          const andParts = orPart.split(',').map(part => part.trim());
          return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
        });
      });

    // 決定是否顯示
    let shouldShow = true;

    if (isBlacklisted) shouldShow = false;
    if (settings.keywords.length > 0 && !matchesKeyword) shouldShow = false;
    if (settings.hideSoldOut && isSoldOut) shouldShow = false;

    // 應用顯示/隱藏狀態
    if (shouldShow) {
      panel.style.display = '';
      panel.classList.add('filter-processed');
    } else {
      panel.style.display = 'none';
      panel.classList.remove('filter-processed');
    }
  });
}

// 新增：檢查文本是否在黑名單中
function isInBlacklist(text, blacklist) {
  if (!blacklist || blacklist.length === 0) return false;
  
  // 將文本轉換為小寫並移除多餘空格，以便比對
  const normalizedText = text.toLowerCase().trim();
  
  // 檢查每個黑名單關鍵字
  return blacklist.some(blacklistItem => {
    // 處理 OR 邏輯（用 + 分隔）
    const orParts = blacklistItem.split('+').map(part => part.trim());
    
    // 如果任一 OR 條件符合就返回 true
    return orParts.some(orPart => {
      // 處理 AND 邏輯（用 , 分隔）
      const andParts = orPart.split(',').map(part => part.trim());
      
      // 所有 AND 條件都要符合才返回 true
      return andParts.every(andPart => {
        if (!andPart) return false; // 空字串不納入比對
        
        // 使用 textIncludesKeyword 進行比對，支援數字轉換
        return textIncludesKeyword(normalizedText, andPart);
      });
    });
  });
}

// 監聽來自popup的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    const site = getCurrentSite();
    
    // 處理拓元的消息
    if (site === 'tixcraft') {
      if (request.type === 'UPDATE_SETTINGS') {
        settings = { ...settings, ...request.settings };
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      } else if (request.type === 'SHOW_ALL') {
        settings.keywords = [];
        settings.blacklist = [];
        settings.hideSoldOut = false;
        
        // 通知 popup 更新標籤
        chrome.runtime.sendMessage({
          type: 'UPDATE_POPUP_LABELS',
          settings: {
            keywords: [],
            blacklist: [],
            hideSoldOut: false
          }
        });
        
        showAllAreas();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }
    
    // 處理KKTIX的消息
    if (site === 'kktix') {
      if (request.action === 'updateFilter') {
        settings.keywords = request.keywords || [];
        settings.blacklist = request.blacklist || [];  // 確保更新黑名單
        settings.showAllPrices = false;
        if (request.settings && request.settings.hideSoldOut !== undefined) {
          settings.hideSoldOut = request.settings.hideSoldOut;
        }
        
        // 立即執行篩選
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'showAllPrices') {
        settings.keywords = [];
        settings.blacklist = [];  // 清空黑名單
        settings.showAllPrices = true;
        settings.hideSoldOut = false;
        
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
        return true;
      }
      if (request.action === 'updateBlacklist') {  // 新增：處理黑名單更新
        settings.blacklist = request.blacklist || [];
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
        // 重置所有設定
        settings = {
          keywords: request.settings.keywords || [],
          blacklist: request.settings.blacklist || [],
          hideSoldOut: request.settings.hideSoldOut || false,
          isProcessing: false
        };
        
        // 清除所有過濾狀態
        showAllAreas();
        
        // 更新顯示狀態
        showFilterStatus();
        
        // 如果有新的篩選條件，則重新應用
        if (settings.keywords.length > 0 || settings.blacklist.length > 0 || settings.hideSoldOut) {
          filterTickets();
        }
        
        sendResponse({ success: true });
        return true;
      }
    }

    // 處理cityline的消息
    if (site === 'cityline') {
      if (request.type === 'UPDATE_CITYLINE_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.blacklist = request.settings.blacklist || [];  // 添加黑名單設定
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }

    // 處理年代售票網站的消息
    if (site === 'ticket') {
      if (request.type === 'UPDATE_TICKET_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }

    // 處理遠大售票平台的消息
    if (site === 'ticketplus') {
      if (request.type === 'UPDATE_TICKETPLUS_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.blacklist = request.settings.blacklist || [];
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
if (site === 'tixcraft' || site === 'kktix' || site === 'ibon' || site === 'cityline' || site === 'ticket' || site === 'ticketplus') {
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

  // 所有網站統一使用50ms的延遲時間
  const debounceTime = 50;

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
    } else if (site === 'ticket') {
      filterTickets();
    } else if (site === 'ticketplus') {
      filterTickets();
    }
  }, debounceTime);

  // 狀態顯示的防抖，使用相同的延遲時間
  statusDebounceTimer = setTimeout(() => {
    showFilterStatus();
  }, debounceTime);
});

// 使用更高效的觀察配置
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class', 'disabled'],
  characterData: false
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
      settings.blacklist = [];  // 確保黑名單也被清空
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

// 设置页面加载策略
document.documentElement.setAttribute('pageLoadStrategy', 'eager');

// 在頁面載入和切換時重新載入設定
document.addEventListener('DOMContentLoaded', () => {
  const site = getCurrentSite();
  if (site === 'ibon') {
    chrome.storage.local.get(['ibonKeywords', 'ibonBlacklist', 'ibonHideSoldOut'], (result) => {
      settings.keywords = result.ibonKeywords || [];
      settings.blacklist = result.ibonBlacklist || [];
      settings.hideSoldOut = result.ibonHideSoldOut || false;
      filterTickets();
      showFilterStatus();
    });
  }
}); 