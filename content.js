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
  if (url.includes('tixcraft.com') || url.includes('tixcraftweb-pcox.onrender.com')) {
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
  } else if (url.includes('fami.life')) {
    return 'fami';
  } else if (url.includes('jkface.net')) {
    return 'jkface';
  } else if (url.includes('kham.com.tw')) {
    return 'kham';
  } else if (url.includes('tix.wdragons.com')) {
    return 'fami';
  } else if (url.includes('tix.ctbcsports.com')) {
    return 'fami';
  } else if (url.includes('tix.fubonbraves.com')) {
    return 'fami';
  }
  return null;
}

// 判斷是否為 Cloudflare 驗證頁（即使網址未變）
function isCloudflareChallengePage() {
  const doc = document;
  return !!doc.querySelector(
    'script[src*="cdn-cgi/challenge-platform"], iframe[src*="cdn-cgi/challenge-platform"], input[name="cf-turnstile-response"], div#cf-challenge, form#challenge-form'
  );
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

// 添加全角转半角函数
function toHalfWidth(str) {
  return str.replace(/[\uFF01-\uFF5E]/g, function(char) {
    return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
  });
}

// 修改文本匹配函数
function textIncludesKeyword(text, keyword) {
  // 移除所有空格和逗號，並轉換為小寫再比較
  const cleanText = toHalfWidth(text.replace(/[\s,]+/g, '')).toLowerCase();
  
  // 處理 OR 邏輯（用 + 分隔）
  const orParts = keyword.split('+').map(part => part.trim());
  
  // 如果任一 OR 條件符合就返回 true
  return orParts.some(orPart => {
    // 處理 AND 邏輯（用 , 分隔）
    const andParts = orPart.split(',').map(part => part.trim());
    
    // 所有 AND 條件都要符合才返回 true
    return andParts.every(andPart => {
      // 移除關鍵字中的逗號，转换为半角
      andPart = toHalfWidth(andPart.replace(/,/g, '')).toLowerCase();
      
      // 如果是单个字符的搜索，直接进行包含匹配
      if (andPart.length === 1) {
        return cleanText.includes(andPart.toLowerCase());
      }
      
      // 獲取文本的所有可能版本（包含數字轉換）
      const textVersions = convertNumber(cleanText);
      const keywordVersions = convertNumber(andPart);
      
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

// 紀錄 Cloudflare 驗證狀態，方便從驗證返回後立即套用篩選
let __lastCfChallenge = isCloudflareChallengePage();

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
    chrome.storage.local.get(['ticketKeywords', 'ticketBlacklist', 'ticketHideSoldOut'], (result) => {
      if (result.ticketKeywords) {
        settings.keywords = result.ticketKeywords;
      }
      if (result.ticketBlacklist) {
        settings.blacklist = result.ticketBlacklist;
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
  } else if (site === 'fami') {
    chrome.storage.local.get(['famiKeywords', 'famiBlacklist', 'famiHideSoldOut'], (result) => {
      if (result.famiKeywords) {
        settings.keywords = result.famiKeywords;
      }
      if (result.famiBlacklist) {
        settings.blacklist = result.famiBlacklist;
      }
      if (result.famiHideSoldOut !== undefined) {
        settings.hideSoldOut = result.famiHideSoldOut;
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
  } else if (site === 'jkface') {
    chrome.storage.local.get(['jkfaceKeywords', 'jkfaceBlacklist', 'jkfaceHideSoldOut'], (result) => {
      if (result.jkfaceKeywords) {
        settings.keywords = result.jkfaceKeywords;
      }
      if (result.jkfaceBlacklist) {
        settings.blacklist = result.jkfaceBlacklist;
      }
      if (result.jkfaceHideSoldOut !== undefined) {
        settings.hideSoldOut = result.jkfaceHideSoldOut;
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
  } else if (site === 'kham') {
    chrome.storage.local.get(['khamKeywords', 'khamBlacklist', 'khamHideSoldOut'], (result) => {
      if (result.khamKeywords) {
        settings.keywords = result.khamKeywords;
      }
      if (result.khamBlacklist) {
        settings.blacklist = result.khamBlacklist;
      }
      if (result.khamHideSoldOut !== undefined) {
        settings.hideSoldOut = result.khamHideSoldOut;
      }
      
      // 立即应用筛选
      filterKhamTickets();
      showFilterStatus();
      
      // 初始化观察器
      initKhamObserver();
    });
  }
}

// 初始化
loadSettings();

// 设置网站标识
const currentSite = getCurrentSite();
if (currentSite) {
  document.body.setAttribute('data-site', currentSite);
}

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

  /* 寬宏售票平台特定樣式 */
  body[data-site="kham"] .server-time-display {
    min-width: 120px;
    text-align: center;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    -webkit-font-variant-numeric: tabular-nums;
  }

  /* 遠大售票平台平滑過渡效果 */
  .v-expansion-panels.seats-area .v-expansion-panel {
    opacity: 0.1;
    transition: opacity 0.15s ease-out;
  }
  
  .v-expansion-panels.seats-area .v-expansion-panel.filter-processed {
    opacity: 1;
  }

  /* 新版ibon售票网站样式 */
  tr.ng-star-inserted.hidden-by-extension {
    display: none !important;
  }

  /* 确保隐藏的行真的被隐藏 */
  tr.hidden-by-extension,
  tr.hidden-by-extension * {
    display: none !important;
  }

  /* Fami Life 平台初始化隐藏样式 */
  body.fami-loading .saleTr {
    visibility: hidden !important;
    opacity: 0 !important;
    transition: opacity 0.2s ease-in-out !important;
  }

  body.fami-ready .saleTr {
    visibility: visible !important;
    transition: opacity 0.2s ease-in-out !important;
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
        statusText.push('隱藏已售完票券');
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
        statusText.push('隱藏已售完票券');
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
        statusText.push('隱藏已售完票券');
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
        statusText.push('隱藏已售完票券');
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
        statusText.push('隱藏已售完票券');
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
        statusText.push('隱藏已售完票券');
      }
    } else if (site === 'fami') {
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
        statusText.push('隱藏已售完票券');
      }
    } else if (site === 'jkface') {
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
        statusText.push('隱藏已售完票券');
      }
    } else if (site === 'kham') {
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
        statusText.push('隱藏已售完票券');
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
        // 同时支持新旧两种选择器
        const rows = element.shadowRoot.querySelectorAll('tr[id^="B"], tr[_ngcontent-tpp-c65].ng-star-inserted, tr[_ngcontent-hxg-c65].ng-star-inserted, tr[_ngcontent-njn-c65].ng-star-inserted');
        rows.forEach(row => {
          // 移除所有由扩充功能添加的样式和类别
          row.style.removeProperty('display');
          row.classList.remove('hidden-by-extension');
          row.classList.remove('filter-processed');
          Array.from(row.children).forEach(cell => {
            cell.style.removeProperty('display');
          });
        });
        
        // 移除 shadow root 中的过滤样式
        const filterStyle = element.shadowRoot.querySelector('.extension-filter-style');
        if (filterStyle) {
          filterStyle.remove();
        }
      }
      Array.from(element.children || []).forEach(showAllTickets);
    }
    showAllTickets(document.documentElement);
    
    // 强制更新页面状态
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
  } else if (site === 'fami') {
    // 移除所有已应用的样式
    document.querySelectorAll('.saleTr').forEach(row => {
      // 移除所有可能影响显示的样式
      row.style.removeProperty('display');
      row.style.removeProperty('opacity');
      row.style.removeProperty('visibility');
      row.style.removeProperty('transition');
      row.classList.remove('filter-ready');
    });
    
    // 移除可能存在的全局样式
    const earlyStyle = document.getElementById('ticket-filter-early-style-fami');
    if (earlyStyle) {
      earlyStyle.remove();
    }
  } else if (site === 'jkface') {
    // 显示所有票券
    document.querySelectorAll('form').forEach(form => {
      const parentElement = form.closest('.border');
      if (parentElement) {
        parentElement.style.display = '';
      }
    });
  } else if (site === 'kham') {
    // 显示所有票券
    document.querySelectorAll('tr.status_tr').forEach(row => {
      row.style.display = '';
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
    if (site === 'tixcraft' && (window.location.href.includes('/ticket/area/') || window.location.hostname.includes('tixcraftweb-pcox.onrender.com'))) {
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
    } else if (site === 'fami') {
      await filterFamiTickets();
    } else if (site === 'jkface') {
      await filterJKFaceTickets();
    } else if (site === 'kham') {
      await filterKhamTickets();  // 作为一个分支加入通用的 filterTickets 函数
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
      // 获取票区名称并清理多余空格和注释
      const name = nameElement.textContent
        .replace(/<!--[\s\S]*?-->/g, '') // 移除 HTML 注释
        .replace(/\s+/g, '') // 移除所有空格
        .trim();
      
      const text = `${name} ${price}`;
      const isSoldOut = row.textContent.includes('已售完');
      
      // 檢查是否在黑名單中
      const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
        settings.blacklist.some(blacklistItem => {
          const orParts = blacklistItem.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => textIncludesKeyword(text, andPart));
          });
        });
      
      // 檢查是否符合關鍵字
      const matchesKeyword = settings.keywords.length === 0 || 
        settings.keywords.some(keyword => {
          const orParts = keyword.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是单字符，使用更宽松的匹配
              if (andPart.length === 1) {
                return text.toLowerCase().includes(andPart.toLowerCase());
              }
              return textIncludesKeyword(text, andPart);
            });
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
  // 等待任一種格式的區域列表出現
  await Promise.race([
    waitForElement('.zone-label[data-id]'),
    waitForElement('.zone.area-list ul.area-list')
  ]);

  // 先顯示所有區域
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

  // 處理有價格區標題的格式
  const areaGroups = document.querySelectorAll('.zone-label[data-id]');
  if (areaGroups.length > 0) {
    areaGroups.forEach(group => {
      const groupId = group.dataset.id;
      const areaList = document.getElementById(groupId);
      if (!areaList) return;

      const items = areaList.querySelectorAll('li');
      let hasVisibleItems = false;

      const groupTitle = group.querySelector('b')?.textContent.trim() || '';

      items.forEach(item => {
        const areaText = item.textContent.trim();
        const remainingText = item.querySelector('font')?.textContent.trim() || '';
        const isSoldOut = remainingText.includes('已售完');
        const fullText = groupTitle ? `${groupTitle} ${areaText}` : areaText;

        let shouldShow = processTicketItem(fullText, isSoldOut);
        item.style.display = shouldShow ? '' : 'none';
        if (shouldShow) hasVisibleItems = true;
      });

      group.style.display = hasVisibleItems ? '' : 'none';
    });
  } else {
    // 處理沒有價格區標題的格式
    const areaLists = document.querySelectorAll('.zone.area-list ul.area-list');
    areaLists.forEach(list => {
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        const areaText = item.textContent.trim();
        const remainingText = item.querySelector('font')?.textContent.trim() || '';
        const isSoldOut = remainingText.includes('已售完');

        let shouldShow = processTicketItem(areaText, isSoldOut);
        item.style.display = shouldShow ? '' : 'none';
      });
    });
  }
}

// 處理單個票券項目的邏輯
function processTicketItem(text, isSoldOut) {
  // 檢查是否在黑名單中
  const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
    settings.blacklist.some(blacklistItem => {
      const orParts = blacklistItem.split('+').map(part => part.trim());
      return orParts.some(orPart => {
        const andParts = orPart.split(',').map(part => part.trim());
        return andParts.every(andPart => textIncludesKeyword(text, andPart));
      });
    });

  // 檢查是否符合關鍵字
  const matchesKeyword = settings.keywords.length === 0 || 
    settings.keywords.some(keyword => {
      const orParts = keyword.split('+').map(part => part.trim());
      return orParts.some(orPart => {
        const andParts = orPart.split(',').map(part => part.trim());
        return andParts.every(andPart => textIncludesKeyword(text, andPart));
      });
    });

  // 決定是否顯示
  let shouldShow = true;

  if (isBlacklisted) shouldShow = false;
  if (settings.keywords.length > 0 && !matchesKeyword) shouldShow = false;
  if (settings.hideSoldOut && isSoldOut) shouldShow = false;

  return shouldShow;
}

// ibon票券篩選
async function filterIbonTickets() {
  const url = window.location.href;
  const isNewVersion = url.match(/Event\/[A-Z0-9]+\/[A-Z0-9]+/);
  const isOldVersion = url.includes('UTK0201_000.aspx');

  // 调试信息
  console.log('当前URL:', url);
  console.log('是否新版:', isNewVersion);
  console.log('是否旧版:', isOldVersion);
  console.log('当前设置:', settings);

  if (isNewVersion) {
    // 新版 ibon 处理逻辑
    async function handleNewVersion() {
      // 确保页面处于加载状态
      document.body.classList.add('ibon-loading');

      // 等待表格加载
      const table = await waitForElement('table.table');
      if (!table) {
        console.log('未找到表格');
        return;
      }

      // 等待行加载完成
      await new Promise(resolve => {
        const checkRows = () => {
          const rows = table.querySelectorAll('tbody > tr.ng-star-inserted');
          if (rows.length > 0) {
            resolve();
          } else {
            setTimeout(checkRows, 50);
          }
        };
        checkRows();
      });

      // 获取所有行
      const rows = Array.from(table.querySelectorAll('tbody > tr.ng-star-inserted'));
      console.log('找到有效行数:', rows.length);

      // 先重置所有行的状态
      rows.forEach(row => {
        row.style.removeProperty('display');
        row.classList.remove('hidden-by-extension');
      });

      // 处理筛选
      if (settings.keywords.length > 0 || 
          (settings.blacklist && settings.blacklist.length > 0) || 
          settings.hideSoldOut) {
        
        rows.forEach((row, index) => {
          const areaCell = row.querySelector('td[data-title="票區"]') || row.cells[0];
          const priceCell = row.querySelector('td[data-title="票價(NT$)"]') || row.cells[1];
          const statusCell = row.querySelector('td[data-title="空位"]') || row.cells[2];

          if (areaCell && priceCell && statusCell) {
            const areaText = areaCell.textContent.trim();
            const priceText = priceCell.textContent.replace(/,/g, '').trim();
            const statusText = statusCell.textContent.trim();
            const fullText = `${areaText} ${priceText}`;

            // 检查售完状态
            const isSoldOut = row.classList.contains('disabled') || 
                            statusText.includes('已售完') || 
                            statusText.includes('0');

            // 检查是否在黑名单中
            const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
              settings.blacklist.some(blacklistItem => {
                const orParts = blacklistItem.split('+').map(part => part.trim());
                return orParts.some(orPart => {
                  const andParts = orPart.split(',').map(part => part.trim());
                  return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
                });
              });

            // 检查是否匹配关键字
            const matchesKeyword = settings.keywords.length === 0 || 
              settings.keywords.some(keyword => {
                const orParts = keyword.split('+').map(part => part.trim());
                return orParts.some(orPart => {
                  const andParts = orPart.split(',').map(part => part.trim());
                  return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
                });
              });

            if (isBlacklisted || 
                (settings.keywords.length > 0 && !matchesKeyword) || 
                (settings.hideSoldOut && isSoldOut)) {
              row.style.setProperty('display', 'none', 'important');
              row.classList.add('hidden-by-extension');
            }
          }
        });
      }

      // 完成处理后移除加载状态
      requestAnimationFrame(() => {
        document.body.classList.remove('ibon-loading');
      });
    }

    // 在 DOMContentLoaded 时立即执行一次
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleNewVersion);
    } else {
      handleNewVersion();
    }

    // 设置防抖定时器
    let debounceTimer;
    
    // 设置观察器以处理动态加载的内容
    const observer = new MutationObserver(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(handleNewVersion, 250);
    });

    // 观察整个文档的变化
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'disabled']
    });

    return;
  }
  
  if (isOldVersion) {
    // 旧版 ibon 处理逻辑
    function processTicketAreas(element) {
      if (element.shadowRoot) {
        const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
        if (rows.length > 0) {
          // 先隐藏所有行
          rows.forEach(row => {
            row.style.setProperty('display', 'none', 'important');
          });
          processOldVersionRows(rows);
        }
      }
      Array.from(element.children || []).forEach(processTicketAreas);
    }

    processTicketAreas(document.documentElement);
  }

  // 旧版 ibon 的行处理函数
  function processOldVersionRows(rows) {
    rows.forEach(row => {
      const areaCell = row.cells[1];
      const priceCell = row.cells[2];
      const statusCell = row.cells[3];
      
      if (areaCell && priceCell) {
        const areaText = areaCell.textContent.trim();
        const priceText = priceCell.textContent.replace(/,/g, '').trim();
        const fullText = `${areaText} ${priceText}`;
        
        // 检查售完状态
        const isSoldOut = row.classList.contains('disabled') || 
                         (statusCell && statusCell.textContent.includes('已售完'));

        // 检查是否在黑名单中
        const isBlacklisted = settings.blacklist && settings.blacklist.length > 0 && 
          settings.blacklist.some(blacklistItem => {
            const orParts = blacklistItem.split('+').map(part => part.trim());
            return orParts.some(orPart => {
              const andParts = orPart.split(',').map(part => part.trim());
              return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
            });
          });
        
        // 检查是否符合关键字
        const matchesKeyword = settings.keywords.length === 0 || 
          settings.keywords.some(keyword => {
            const orParts = keyword.split('+').map(part => part.trim());
            return orParts.some(orPart => {
              const andParts = orPart.split(',').map(part => part.trim());
              return andParts.every(andPart => textIncludesKeyword(fullText, andPart));
            });
          });

        // 决定是否显示
        let shouldShow = true;

        if (isBlacklisted) shouldShow = false;
        if (settings.keywords.length > 0 && !matchesKeyword) shouldShow = false;
        if (settings.hideSoldOut && isSoldOut) shouldShow = false;

        // 应用显示/隐藏状态
        if (shouldShow) {
          row.style.removeProperty('display');
        } else {
          row.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }
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
        // 包含無 main 的灰字 Sold out 票區，僅抓有 id 的實際票區列
        const areaItems = document.querySelectorAll('.area-list li[id]');
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

  // 包含灰字 Sold out，排除說明文字（說明列通常沒有 id）
  const areaItems = document.querySelectorAll('.area-list li[id]');
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

  // 先移除空白/空字串的關鍵字，避免刪除條件後殘留空值
  const normalizedKeywords = (settings.keywords || [])
    .map(k => (k || '').trim())
    .filter(k => k.length > 0);

  const normalizedBlacklist = (settings.blacklist || [])
    .map(k => (k || '').trim())
    .filter(k => k.length > 0);

  // 如果沒有有效關鍵字，則只處理黑名單與是否隱藏已售完
  if (normalizedKeywords.length === 0) {
    areaItems.forEach(item => {
      const areaText = item.querySelector('font[color="#333"]')?.textContent?.trim() ||
                       item.querySelector('font[color="#AAAAAA"]')?.textContent?.trim() ||
                       item.textContent?.trim() || '';
      const statusText = item.querySelector('font[color="#FF0000"]')?.textContent?.trim() || '';
      const badgeText = item.querySelector('.badge')?.textContent?.trim() || '';

      const statusLower = `${statusText} ${badgeText}`.toLowerCase();
      const remainMatch = statusLower.match(/餘位\s*(\d+)/);
      const badgeRemainMatch = statusLower.match(/剩位\s*(\d+)/);
      const remainNum = remainMatch ? parseInt(remainMatch[1], 10) :
                        badgeRemainMatch ? parseInt(badgeRemainMatch[1], 10) : null;

      const areaLower = areaText.toLowerCase();
      const isSoldOut =
        statusLower.includes('sold out') ||
        statusLower.includes('已售完') ||
        statusLower.includes('售完') ||
        areaLower.includes('sold out') ||
        areaLower.includes('已售完') ||
        areaLower.includes('售完') ||
        (remainNum !== null && remainNum === 0);

      // 黑名單判斷（支援 AND/OR），數字則比對票價數字
      const prices = (areaText.match(/\d+/g) || []).map(p => parseInt(p, 10));
      const isBlacklisted = normalizedBlacklist.some(blk => {
        const orParts = blk.split('+').map(part => part.trim()).filter(Boolean);
        return orParts.some(orPart => {
          const andParts = orPart.split(',').map(part => part.trim()).filter(Boolean);
          return andParts.every(andPart => {
            const clean = andPart.replace(/,/g, '');
            if (!isNaN(clean) && clean !== '') {
              return prices.includes(parseInt(clean, 10));
            }
            return textIncludesKeyword(areaText, andPart);
          });
        });
      });

      let shouldShow = true;
      if (isBlacklisted) shouldShow = false;
      if (settings.hideSoldOut && isSoldOut) shouldShow = false;
      setDisplayStyle(item, shouldShow);
    });
    return;
  }

  // 支援AND/OR邏輯的關鍵字處理
  const keywordGroups = normalizedKeywords.map(keyword => {
    return keyword.split('+').map(k => {
      return k.split(',').map(item => item.trim()).filter(item => item);
    }).filter(group => group.length > 0);
  });

  const blacklistGroups = normalizedBlacklist.map(keyword => {
    return keyword.split('+').map(k => {
      return k.split(',').map(item => item.trim()).filter(item => item);
    }).filter(group => group.length > 0);
  });

  areaItems.forEach(item => {
    // 票區名稱：優先取黑字，否則用整段文字
    const areaText = item.querySelector('font[color="#333"]')?.textContent?.trim() ||
                     item.querySelector('font[color="#AAAAAA"]')?.textContent?.trim() ||
                     item.textContent?.trim() || '';
    const statusText = item.querySelector('font[color="#FF0000"]')?.textContent?.trim() || '';
    const badgeText = item.querySelector('.badge')?.textContent?.trim() || '';

    const statusLower = `${statusText} ${badgeText}`.toLowerCase();
    const remainMatch = statusLower.match(/餘位\s*(\d+)/);
    const remainNum = remainMatch ? parseInt(remainMatch[1], 10) : null;

    const areaLower = areaText.toLowerCase();

    const prices = (areaText.match(/\d+/g) || []).map(p => parseInt(p, 10));

    // 售完判斷：明確含 Sold out/已售完/售完（名稱或狀態都檢查），或餘位=0；單純「餘位XX」「剩位」視為可售
    const isSoldOut =
      statusLower.includes('sold out') ||
      statusLower.includes('已售完') ||
      statusLower.includes('售完') ||
      areaLower.includes('sold out') ||
      areaLower.includes('已售完') ||
      areaLower.includes('售完') ||
      (remainNum !== null && remainNum === 0);

    const isBlacklisted = blacklistGroups.some(orGroup => 
      orGroup.some(andGroup => {
        return andGroup.every(keyword => {
          const clean = keyword.replace(/,/g, '');
          if (!isNaN(clean) && clean !== '') {
            return prices.includes(parseInt(clean, 10));
          }
          return textIncludesKeyword(areaText, keyword);
        });
      })
    );

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
    ) && !isBlacklisted;

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

// Fami Life 票券篩選
async function filterFamiTickets() {
  // 等待票券列表加載
  await waitForElement('.saleTr');
  
  const ticketRows = document.querySelectorAll('.saleTr');
  if (!ticketRows.length) return;

  // 处理过滤逻辑
  ticketRows.forEach(row => {
    const areaCell = row.querySelector('[data-title="票區："]');
    const priceCell = row.querySelector('.textPrice');
    const statusCell = row.querySelector('#SEAT');
    
    if (areaCell && priceCell) {
      const areaText = areaCell.textContent.trim();
      const priceText = priceCell.textContent.trim();
      const fullText = `${areaText} ${priceText}`;
      const isSoldOut = statusCell && statusCell.textContent.trim().includes('售完');

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

      // 应用显示/隐藏状态
      if (!shouldShow) {
        row.style.setProperty('display', 'none', 'important');
      } else {
        row.style.removeProperty('display');
      }
    }
  });

  // 通知 earlyLoader 筛选已完成
  window.postMessage({ type: 'FILTER_APPLIED' }, '*');
}

// 在页面加载时初始化 Fami Life 平台
if (getCurrentSite() === 'fami') {
  // 在 DOMContentLoaded 时执行初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      filterFamiTickets();
    });
  } else {
    filterFamiTickets();
  }
  
  // 监听消息以处理动态加载的内容
  window.addEventListener('message', function(event) {
    if (event.data.type === 'NEW_TICKETS_FOUND') {
      filterFamiTickets();
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

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // 处理快捷键触发的扩展状态变化
    if (request.type === 'EXTENSION_STATE_CHANGED') {
      const enabled = request.enabled;
      const site = getCurrentSite();
      
      // 更新UI状态
      if (enabled) {
        // 重新应用过滤器
        filterTickets();
        showFilterStatus();
        showServerTime();
      } else {
        // 显示所有区域
        showAllAreas();
        // 移除状态显示
        const notification = document.querySelector('.ticket-filter-notification');
        const timeDisplay = document.querySelector('.server-time-display');
        if (notification) notification.remove();
        if (timeDisplay) timeDisplay.remove();

        // 特别处理 Fami Life 平台
        if (site === 'fami') {
          // 移除所有已应用的样式
          document.querySelectorAll('.saleTr').forEach(row => {
            row.style.removeProperty('display');
            row.style.removeProperty('opacity');
            row.style.removeProperty('visibility');
            row.style.removeProperty('transition');
            row.classList.remove('filter-ready');
          });
        }
      }
      
      return true;
    }
    
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
        settings.blacklist = request.settings.blacklist || [];
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

    // 在 ibon 票券頁面時觸發重整
    if (site === 'ibon' && (
      location.href.includes('UTK0201_000.aspx') || 
      location.href.match(/Event\/[A-Z0-9]+\/[A-Z0-9]+/)
    )) {
      console.log("ibon票券頁面，跳過重整，直接套用篩選");
      setTimeout(() => {
        filterTickets();
        showFilterStatus();
      }, 50);
    }

    // 處理 Fami Life 的消息
    if (site === 'fami') {
      if (request.type === 'UPDATE_FAMI_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.blacklist = request.settings.blacklist || [];
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }

    // JKFace票券篩選
    if (site === 'jkface') {
      if (request.type === 'UPDATE_JKFACE_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.blacklist = request.settings.blacklist || [];
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }

    // 在 chrome.runtime.onMessage.addListener 中添加对寬宏售票的处理
    if (site === 'kham') {
      if (request.type === 'UPDATE_KHAM_SETTINGS') {
        settings.keywords = request.settings.keywords || [];
        settings.blacklist = request.settings.blacklist || [];
        settings.hideSoldOut = request.settings.hideSoldOut || false;
        
        // 改用通用的 filterTickets
        filterTickets();
        showFilterStatus();
        sendResponse({ success: true });
      }
    }
  } catch (error) {
    console.error('處理訊息時發生錯誤：', error);
    sendResponse({ success: false, error: error.message });
  }
  return true;
});

// 初始執行
const site = getCurrentSite();
if (site === 'tixcraft' || site === 'kktix' || site === 'ibon' || site === 'cityline' || 
    site === 'ticket' || site === 'ticketplus' || site === 'fami' || site === 'jkface' || site === 'kham') {  // 添加 kham
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

  // 若目前是 Cloudflare 驗證頁，暫停所有篩選；從驗證返回時立即套用
  const nowCf = isCloudflareChallengePage();
  if (nowCf) {
    __lastCfChallenge = true;
    return;
  }
  if (__lastCfChallenge && !nowCf) {
    __lastCfChallenge = false;
    filterTickets();
    showFilterStatus();
    return;
  }

  // 使用不同的計時器處理篩選和狀態顯示
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer);
  }
  if (statusDebounceTimer) {
    clearTimeout(statusDebounceTimer);
  }

  // 根據網站定義不同的延遲時間
  const debounceTime = getDebounceTime();

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
    } else if (site === 'fami') {
      filterTickets();
    } else if (site === 'jkface') {
      filterTickets();
    } else if (site === 'kham') {  
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
  if (site) {
    // 设置网站标识
    document.body.setAttribute('data-site', site);
    
    if (site === 'ibon') {
      // 同时支持新旧两种URL格式
      if (location.href.includes('UTK0201_000.aspx') || 
          location.href.match(/Event\/[A-Z0-9]+\/[A-Z0-9]+/)) {
        chrome.storage.local.get(['ibonKeywords', 'ibonBlacklist', 'ibonHideSoldOut'], (result) => {
          settings.keywords = result.ibonKeywords || [];
          settings.blacklist = result.ibonBlacklist || [];
          settings.hideSoldOut = result.ibonHideSoldOut || false;
          filterTickets();
          showFilterStatus();
        });
      }
    }
  }
});

// 根據網站定義不同的延遲時間
function getDebounceTime() {
  const site = getCurrentSite();
  switch(site) {
    case 'ibon':
      return 250; // ibon 網站需要較長的延遲
    case 'ticketplus':
      return 50;  // 遠大售票也需要稍長延遲
    default:
      return 50;   // 其他網站使用短延遲
  }
}

function isIbonTicketPage(url) {
  return url.includes('ibon.com.tw/application/UTK0201_000.aspx') || 
         url.includes('ibon.com.tw/Event/');  // 简化匹配规则
}

// 在页面加载最开始就注入样式
const earlyStyle = document.createElement('style');
earlyStyle.textContent = `
  /* 新版ibon售票网站初始化样式 */
  body.ibon-loading table.table,
  body.ibon-loading tr.ng-star-inserted {
    display: none !important;
  }

  tr.ng-star-inserted.hidden-by-extension {
    display: none !important;
  }
`;
document.head.appendChild(earlyStyle);

// 尽早执行初始化隐藏
function initializeIbonHiding() {
  if (window.location.href.match(/ibon\.com\.tw\/Event\/[A-Z0-9]+\/[A-Z0-9]+/)) {
    document.body.classList.add('ibon-loading');
  }
}

// 在最早可能的时机执行隐藏
initializeIbonHiding();
document.addEventListener('DOMContentLoaded', initializeIbonHiding);

// 确保在动态加载的表格上也应用隐藏
const earlyObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeName === 'TABLE' && node.classList.contains('table')) {
          node.classList.add('ibon-early-hide');
        }
      });
    }
  }
});

earlyObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// JKFace票券篩選
async function filterJKFaceTickets() {
  // 检查是否在活动详情页面
  const isEventPage = window.location.href.includes('/events/');
  
  if (isEventPage) {
    // 处理活动详情页面的场次列表
    const eventSections = document.querySelectorAll('section.mx-3');
    if (!eventSections.length) return;

    eventSections.forEach(section => {
      // 获取完整的场次信息，包括日期、时间和表演者名字
      const timeAndPerformerText = section.querySelector('span[class*="text-"][class*="leading-"]')?.textContent.trim() || '';
      const statusButton = section.querySelector('button[disabled]');
      const isSoldOut = statusButton && (
        statusButton.textContent.includes('已售完') || 
        statusButton.textContent.includes('售完') ||
        statusButton.textContent.includes('全數售罄') ||
        statusButton.textContent.includes('尚未開始')
      );

      let shouldHide = false;

      // 检查关键字匹配
      if (settings.keywords && settings.keywords.length > 0) {
        const matchesKeyword = settings.keywords.some(keyword => {
          // 处理数字关键字 - 移除逗号后比较
          const cleanKeyword = keyword.replace(/,/g, '');
          if (!isNaN(cleanKeyword)) {
            // 如果是数字，尝试匹配时间
            return timeAndPerformerText.includes(cleanKeyword);
          }
          
          // 非数字关键字进行 OR/AND 处理
          const orParts = keyword.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是单个字符，使用简单包含匹配
              if (andPart.length === 1) {
                return timeAndPerformerText.toLowerCase().includes(andPart.toLowerCase());
              }
              return textIncludesKeyword(timeAndPerformerText, andPart);
            });
          });
        });
        
        if (!matchesKeyword) shouldHide = true;
      }

      // 检查黑名单匹配
      if (settings.blacklist && settings.blacklist.length > 0) {
        const isBlacklisted = settings.blacklist.some(blacklistItem => {
          // 处理数字黑名单 - 移除逗号后比较
          const cleanBlacklistItem = blacklistItem.replace(/,/g, '');
          if (!isNaN(cleanBlacklistItem)) {
            return timeAndPerformerText.includes(cleanBlacklistItem);
          }
          
          const orParts = blacklistItem.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是单个字符，使用简单包含匹配
              if (andPart.length === 1) {
                return timeAndPerformerText.toLowerCase().includes(andPart.toLowerCase());
              }
              return textIncludesKeyword(timeAndPerformerText, andPart);
            });
          });
        });
        if (isBlacklisted) shouldHide = true;
      }

      // 检查是否隐藏已售完
      if (settings.hideSoldOut && isSoldOut) {
        shouldHide = true;
      }

      // 设置显示状态，保持原有的HTML结构
      if (shouldHide) {
        section.style.setProperty('display', 'none', 'important');
      } else {
        section.style.removeProperty('display');
      }
    });
  } else {
    // 原有的票券列表页面处理逻辑
    const ticketForms = document.querySelectorAll('form');
    if (!ticketForms.length) return;

    ticketForms.forEach(form => {
      const ticketNameElement = form.querySelector('.font-medium span');
      const ticketName = ticketNameElement ? ticketNameElement.textContent.trim() : '';
      
      // 更精确地获取价格元素
      const priceElement = form.querySelector('.opacity-80 span.mx-2');
      let priceText = '';
      if (priceElement) {
        // 移除 TWD$ 前缀，移除逗号，移除所有空格
        priceText = priceElement.textContent
          .replace('TWD$', '')
          .replace(/,/g, '')
          .replace(/\s+/g, '')
          .trim();
      }
      
      const fullText = `${ticketName} ${priceText}`;
      
      // 检查售完状态 - 先找到最后一个按钮
      const buttons = form.querySelectorAll('button');
      const lastButton = buttons[buttons.length - 1];
      const isSoldOut = lastButton && (
        lastButton.textContent.includes('已售完') || 
        lastButton.textContent.includes('售完') ||
        lastButton.textContent.includes('全數售罄') ||
        lastButton.textContent.includes('尚未開始')
      );

      let shouldHide = false;

      // 檢查關鍵字 - 支持 AND/OR 逻辑
      if (settings.keywords && settings.keywords.length > 0) {
        const matchesKeyword = settings.keywords.some(keyword => {
          // 处理数字关键字 - 移除逗号后比较
          const cleanKeyword = keyword.replace(/,/g, '');
          if (!isNaN(cleanKeyword)) {
            const isMatch = priceText === cleanKeyword;
            console.log('数字比较:', {
              keyword: keyword,
              cleanKeyword: cleanKeyword,
              priceText: priceText,
              isMatch: isMatch
            });
            return isMatch;
          }
          
          // 非数字关键字才进行 OR/AND 处理
          const orParts = keyword.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是数字，移除逗号后比较
              const cleanAndPart = andPart.replace(/,/g, '');
              if (!isNaN(cleanAndPart)) {
                return priceText === cleanAndPart;
              }
              return textIncludesKeyword(fullText, andPart);
            });
          });
        });
        
        if (!matchesKeyword) shouldHide = true;
      }

      // 檢查黑名單 - 支持 AND/OR 逻辑
      if (settings.blacklist && settings.blacklist.length > 0) {
        const isBlacklisted = settings.blacklist.some(blacklistItem => {
          // 处理数字黑名单 - 移除逗号后比较
          const cleanBlacklistItem = blacklistItem.replace(/,/g, '');
          if (!isNaN(cleanBlacklistItem)) {
            return priceText === cleanBlacklistItem;
          }
          
          const orParts = blacklistItem.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是数字，移除逗号后比较
              const cleanAndPart = andPart.replace(/,/g, '');
              if (!isNaN(cleanAndPart)) {
                return priceText === cleanAndPart;
              }
              return textIncludesKeyword(fullText, andPart);
            });
          });
        });
        if (isBlacklisted) shouldHide = true;
      }

      // 檢查是否要隱藏已售完
      if (settings.hideSoldOut && isSoldOut) {
        shouldHide = true;
      }

      // 設置顯示狀態
      const parentElement = form.closest('.border');
      if (parentElement) {
        if (shouldHide) {
          parentElement.style.display = 'none';
        } else {
          parentElement.style.display = '';
        }
      }
    });
  }
}

// 修改寬宏售票的筛选函数
async function filterKhamTickets() {
  // 移除调试信息
  // console.log('当前筛选设置:', settings);

  // 获取所有票券行
  const ticketRows = document.querySelectorAll('tr.status_tr');
  if (!ticketRows.length) return;

  try {
    // 遍历每个票券行
    ticketRows.forEach(row => {
      const areaText = row.querySelector('td[data-title="票區："]')?.textContent?.trim() || '';
      const priceElement = row.querySelector('td[data-title="票價："]');
      const statusText = row.querySelector('td[data-title="空位："]')?.textContent?.trim() || '';
      
      // 处理价格文本 - 移除逗号和空格
      let priceText = '';
      if (priceElement) {
        priceText = priceElement.textContent
          .replace(/,/g, '')
          .replace(/\s+/g, '')
          .trim();
      }
      
      const fullText = `${areaText} ${priceText}`;
      const isSoldOut = statusText === '已售完';

      let shouldHide = false;

      // 检查关键字 - 支持 AND/OR 逻辑
      if (settings.keywords && settings.keywords.length > 0) {
        const matchesKeyword = settings.keywords.some(keyword => {
          // 处理数字关键字 - 移除逗号后比较
          const cleanKeyword = keyword.replace(/,/g, '');
          if (!isNaN(cleanKeyword)) {
            return priceText === cleanKeyword;
          }
          
          // 非数字关键字才进行 OR/AND 处理
          const orParts = keyword.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是数字，移除逗号后比较
              const cleanAndPart = andPart.replace(/,/g, '');
              if (!isNaN(cleanAndPart)) {
                return priceText === cleanAndPart;
              }
              return textIncludesKeyword(fullText, andPart);
            });
          });
        });
        
        if (!matchesKeyword) shouldHide = true;
      }

      // 检查黑名单 - 支持 AND/OR 逻辑
      if (settings.blacklist && settings.blacklist.length > 0) {
        const isBlacklisted = settings.blacklist.some(blacklistItem => {
          // 处理数字黑名单 - 移除逗号后比较
          const cleanBlacklistItem = blacklistItem.replace(/,/g, '');
          if (!isNaN(cleanBlacklistItem)) {
            return priceText === cleanBlacklistItem;
          }
          
          const orParts = blacklistItem.split('+').map(part => part.trim());
          return orParts.some(orPart => {
            const andParts = orPart.split(',').map(part => part.trim());
            return andParts.every(andPart => {
              // 如果是数字，移除逗号后比较
              const cleanAndPart = andPart.replace(/,/g, '');
              if (!isNaN(cleanAndPart)) {
                return priceText === cleanAndPart;
              }
              return textIncludesKeyword(fullText, andPart);
            });
          });
        });
        if (isBlacklisted) shouldHide = true;
      }

      // 检查是否隐藏已售完
      if (settings.hideSoldOut && isSoldOut) {
        shouldHide = true;
      }

      // 设置显示状态
      row.style.display = shouldHide ? 'none' : '';
    });
  } finally {
    // 确保处理完成后重置 isProcessing 状态
    settings.isProcessing = false;
  }
}

// 在 filterKhamTickets 函数后添加
// 监听寬宏售票网站的票券列表变化
function initKhamObserver() {
  const site = getCurrentSite();
  if (site !== 'kham') return;

  // 创建一个观察器实例
  const observer = new MutationObserver((mutations) => {
    // 检查变化是否涉及票券列表
    const hasTicketChanges = mutations.some(mutation => {
      return mutation.target.classList?.contains('status_tr') ||
             mutation.target.querySelector?.('tr.status_tr');
    });

    if (hasTicketChanges) {
      filterKhamTickets();
    }
  });

  // 配置观察选项
  const config = {
    childList: true,    // 观察子节点的添加或删除
    subtree: true,      // 观察所有后代节点
    attributes: true,   // 观察属性变化
    attributeFilter: ['style', 'class'] // 只观察 style 和 class 属性的变化
  };

  // 开始观察票券列表容器
  const ticketContainer = document.querySelector('tbody');
  if (ticketContainer) {
    observer.observe(ticketContainer, config);
  }
}

// 在页面加载完成后初始化观察器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKhamObserver);
} else {
  initKhamObserver();
}