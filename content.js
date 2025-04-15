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
  // 移除所有空格再比較
  const cleanText = text.replace(/\s+/g, '');
  const cleanKeyword = keyword.replace(/\s+/g, '');
  
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
    await waitForElement('.zone-label[data-id]');
    
    const areaGroups = document.querySelectorAll('.zone-label[data-id]');
    if (!areaGroups.length) return;

    showAllAreas();

    // 如果沒有關鍵字，則顯示全部（只考慮是否顯示已售完）
    if (settings.keywords.length === 0) {
      if (!settings.showSoldOut) {
        // 只隱藏已售完的票券
        document.querySelectorAll('.area-list li').forEach(item => {
          const remainingText = item.querySelector('font')?.textContent.trim() || '';
          if (remainingText.includes('已售完')) {
            item.style.display = 'none';
          }
        });
      }
      return;
    }

    // 處理關鍵字組合
    const keywordGroups = settings.keywords.map(keyword => {
      // 處理OR邏輯（加號分隔）
      return keyword.split('+').map(k => {
        // 處理AND邏輯（逗號分隔）
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

        // 檢查是否符合任一組關鍵字組合
        const shouldShow = keywordGroups.some(orGroup => 
          orGroup.some(andGroup => {
            // 檢查AND組合中的所有條件
            return andGroup.every(keyword => {
              // 取得所有可能的搜尋文本
              const searchTexts = [groupTitle, areaText];
              
              if (!isNaN(keyword)) {
                // 價格匹配
                const priceToFind = parseInt(keyword);
                // 從所有文本中提取價格
                return searchTexts.some(text => {
                  const prices = (text.match(/\d+/g) || []).map(p => parseInt(p));
                  return prices.includes(priceToFind);
                });
              } else {
                // 文字匹配 - 考慮數字轉換
                return searchTexts.some(text => textIncludesKeyword(text, keyword));
              }
            });
          })
        );

        if (shouldShow && (!isSoldOut || settings.showSoldOut)) {
          item.style.display = '';
          hasVisibleItems = true;
        } else {
          item.style.display = 'none';
        }
      });

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
