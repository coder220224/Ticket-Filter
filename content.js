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

let settings = {
  keywords: [],
  showSoldOut: false
};

// 從storage載入設定
chrome.storage.local.get(['keywords', 'showSoldOut'], (result) => {
  settings = { ...settings, ...result };
  if (document.readyState === 'complete') {
    filterSeats();
    showFilterStatus();
  } else {
    window.addEventListener('load', () => {
      filterSeats();
      showFilterStatus();
    });
  }
});

// 注入CSS樣式
const style = document.createElement('style');
style.textContent = `
  .tixcraft-filter-notification {
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 15px;
    background-color: #2684FF;
    color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif;
  }
`;
document.head.appendChild(style);

// 顯示篩選狀態
function showFilterStatus() {
  const existingNotification = document.querySelector('.tixcraft-filter-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'tixcraft-filter-notification';
  
  let statusText = [];
  if (settings.keywords.length > 0) {
    statusText.push(`關鍵字篩選：${settings.keywords.join('、')}`);
  } else {
    statusText.push('無篩選條件');
  }
  
  notification.textContent = statusText.join(' | ');
  document.body.appendChild(notification);
  
  // 讓通知顯示
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    
    // 3秒後淡出
    setTimeout(() => {
      notification.style.opacity = '0';
      // 完全移除元素
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  });
}

// 監聽來自popup的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.type === 'UPDATE_SETTINGS') {
      settings = request.settings; // 更新全域設定
      filterSeats();
      showFilterStatus();
      sendResponse({ success: true });
    } else if (request.type === 'SHOW_ALL') {
      settings.keywords = [];
      showAllAreas();
      showFilterStatus();
      sendResponse({ success: true });
    }
  } catch (error) {
    console.log('處理訊息時發生錯誤：', error);
    sendResponse({ success: false, error: error.message });
  }
  return true; // 保持訊息通道開啟
});

// 顯示所有區域
function showAllAreas() {
  document.querySelectorAll('.area-list li').forEach(item => {
    item.style.display = '';
  });
  document.querySelectorAll('.zone-label').forEach(label => {
    label.style.display = '';
  });
}

// 主要篩選功能
async function filterSeats() {
  try {
    // 等待區域元素載入
    await waitForElement('.zone-label[data-id]');
    
    const areaGroups = document.querySelectorAll('.zone-label[data-id]');
    if (!areaGroups.length) return;

    // 首先顯示所有區域
    showAllAreas();

    // 如果沒有關鍵字且顯示已售完，則保持全部顯示
    if (settings.keywords.length === 0 && settings.showSoldOut) {
      return;
    }

    // 將關鍵字分為價格和非價格兩類
    const priceKeywords = settings.keywords.filter(k => !isNaN(k)).map(k => parseInt(k));
    const textKeywords = settings.keywords.filter(k => isNaN(k));

    areaGroups.forEach(group => {
      const groupId = group.dataset.id;
      const areaList = document.getElementById(groupId);
      if (!areaList) return;

      const items = areaList.querySelectorAll('li');
      let hasVisibleItems = false;

      items.forEach(item => {
        const areaText = item.textContent.trim();
        const remainingText = item.querySelector('font')?.textContent.trim() || '';
        const isSoldOut = remainingText.includes('已售完');
        
        // 檢查是否符合篩選條件
        let shouldShow = true;

        // 價格篩選 - 符合任一價格即可
        if (priceKeywords.length > 0) {
          const priceMatch = areaText.match(/\d+/g);
          const prices = priceMatch ? priceMatch.map(p => parseInt(p)) : [];
          shouldShow = prices.some(price => priceKeywords.includes(price));
        }

        // 文字篩選 - 必須符合所有文字關鍵字
        if (shouldShow && textKeywords.length > 0) {
          shouldShow = textKeywords.every(keyword => areaText.includes(keyword));
        }

        // 已售完票券篩選
        if (!settings.showSoldOut && isSoldOut) {
          shouldShow = false;
        }

        // 控制顯示/隱藏
        item.style.display = shouldShow ? '' : 'none';
        if (shouldShow) {
          hasVisibleItems = true;
        }
      });

      // 如果該組沒有可見項目，隱藏整個組標題
      group.style.display = hasVisibleItems ? '' : 'none';
    });
  } catch (error) {
    console.error('篩選座位時發生錯誤：', error);
  }
}

// 初始執行
if (window.location.href.includes('tixcraft.com/ticket/area/')) {
  if (document.readyState === 'complete') {
    filterSeats();
    showFilterStatus();
  } else {
    window.addEventListener('load', () => {
      filterSeats();
      showFilterStatus();
    });
  }
}

// 監聽DOM變化
const observer = new MutationObserver(() => {
  if (window.location.href.includes('tixcraft.com/ticket/area/')) {
    filterSeats();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
}); 