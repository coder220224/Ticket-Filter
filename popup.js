document.addEventListener('DOMContentLoaded', () => {
  const areaFilter = document.getElementById('areaFilter');
  const keywordsContainer = document.getElementById('keywordsContainer');
  const showSoldOut = document.getElementById('showSoldOut');
  const showAll = document.getElementById('showAll');
  const addKeyword = document.getElementById('addKeyword');
  const currentFilter = document.getElementById('currentFilter');
  const filterText = document.getElementById('filterText');
  const showServerTime = document.getElementById('showServerTime');
  const showFilterStatus = document.getElementById('showFilterStatus');
  const extensionSwitch = document.getElementById('extensionEnabled');
  const settingsIcon = document.querySelector('.settings-icon');

  // 控制所有設定項目的啟用/禁用狀態
  function toggleControls(enabled) {
    const controls = [
      areaFilter,
      showSoldOut,
      showAll,
      addKeyword,
      showServerTime,
      showFilterStatus,
      settingsIcon
    ];

    controls.forEach(control => {
      if (control) {
        control.disabled = !enabled;
        if (control === settingsIcon) {
          control.style.opacity = enabled ? '1' : '0.5';
          control.style.pointerEvents = enabled ? 'auto' : 'none';
        }
      }
    });

    // 設定關鍵字容器的樣式
    if (keywordsContainer) {
      keywordsContainer.style.opacity = enabled ? '1' : '0.5';
      keywordsContainer.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    // 設定整個內容區域的樣式
    const contentArea = document.querySelector('.content');
    if (contentArea) {
      const sections = contentArea.querySelectorAll('.filter-section, .time-toggle, .settings-panel');
      sections.forEach(section => {
        section.style.opacity = enabled ? '1' : '0.5';
        section.style.pointerEvents = enabled ? 'auto' : 'none';
      });
    }
  }

  // 載入擴充功能狀態並設定控制項狀態
  chrome.storage.local.get(['extensionEnabled'], function(result) {
    extensionSwitch.checked = result.extensionEnabled !== false;
    toggleControls(result.extensionEnabled !== false);
  });

  // 監聽主開關變化
  extensionSwitch.addEventListener('change', function(e) {
    const enabled = e.target.checked;
    chrome.storage.local.set({ extensionEnabled: enabled });
    toggleControls(enabled);
  });

  // 添加搜尋說明
  const helpText = document.createElement('div');
  helpText.className = 'help-text';
  helpText.innerHTML = `
    <p style="font-size: 12px; color: #666; margin: 4px 0;">
      搜尋格式：3200,A區 (同時符合) 或 4500+3200 (任一符合)
    </p>
  `;
  
  // 將說明插入到輸入框上方
  const exampleText = areaFilter.previousElementSibling;
  if (exampleText) {
    exampleText.parentNode.insertBefore(helpText, exampleText.nextSibling);
  }

  let keywords = new Set();
  let currentSite = null;

  // 檢查當前網站類型
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url;
      if (url.includes('tixcraft.com')) {
        currentSite = 'tixcraft';
        loadTixcraftSettings();
        document.body.setAttribute('data-site', 'tixcraft');
      } else if (url.includes('kktix.com')) {
        currentSite = 'kktix';
        loadKKTIXSettings();
        document.body.setAttribute('data-site', 'kktix');
      } else if (url.includes('ibon.com.tw')) {
        currentSite = 'ibon';
        loadIbonSettings();
        document.body.setAttribute('data-site', 'ibon');
      } else if (url.includes('cityline.com')) {
        currentSite = 'cityline';
        loadCitylineSettings();
        document.body.setAttribute('data-site', 'cityline');
      }
    }
  });

  // 載入拓元設定
  function loadTixcraftSettings() {
    chrome.storage.local.get(['keywords', 'hideSoldOut'], (result) => {
      if (result.keywords) {
        keywords = new Set(result.keywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.hideSoldOut !== undefined) {
        showSoldOut.checked = result.hideSoldOut;
      }
    });
  }

  // 載入KKTIX設定
  function loadKKTIXSettings() {
    chrome.storage.sync.get(['targetKeywords', 'hideSoldOut'], (result) => {
      if (result.targetKeywords) {
        keywords = new Set(result.targetKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.hideSoldOut !== undefined) {
        showSoldOut.checked = result.hideSoldOut;
      }
    });
  }

  // 載入ibon設定
  function loadIbonSettings() {
    chrome.storage.local.get(['ibonKeywords', 'ibonHideSoldOut'], (result) => {
      if (result.ibonKeywords) {
        keywords = new Set(result.ibonKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.ibonHideSoldOut !== undefined) {
        showSoldOut.checked = result.ibonHideSoldOut;
      }
    });
  }

  // 載入Cityline設定
  function loadCitylineSettings() {
    chrome.storage.local.get(['citylineKeywords', 'citylineHideSoldOut'], (result) => {
      if (result.citylineKeywords) {
        keywords = new Set(result.citylineKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.citylineHideSoldOut !== undefined) {
        showSoldOut.checked = result.citylineHideSoldOut;
      }
    });
  }

  // Update filter label
  function updateFilterLabel() {
    if (keywords.size > 0) {
      currentFilter.style.display = 'inline-block';
      filterText.textContent = Array.from(keywords).join('、');
    } else {
      currentFilter.style.display = 'none';
    }
  }

  // Render keyword tags
  function renderKeywords() {
    keywordsContainer.innerHTML = '';
    
    if (keywords.size === 0) {
      keywordsContainer.innerHTML = '<span class="no-keywords">尚未設定篩選條件</span>';
      
      // 如果是ibon網站，直接重置所有行
      if (currentSite === 'ibon') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                function resetAllRows(root) {
                  if (root.shadowRoot) {
                    const rows = root.shadowRoot.querySelectorAll('tr[id^="B"]');
                    rows.forEach(row => {
                      row.style.removeProperty('display');
                      Array.from(row.children).forEach(cell => {
                        cell.style.removeProperty('display');
                      });
                    });
                  }
                  Array.from(root.children).forEach(child => resetAllRows(child));
                }
                resetAllRows(document.documentElement);
              }
            });
          }
        });
      }
      return;
    }

    keywords.forEach(keyword => {
      const tag = document.createElement('div');
      tag.className = 'keyword-tag';
      tag.innerHTML = `
        <span>${keyword}</span>
        <span class="remove" data-keyword="${keyword}">×</span>
      `;
      keywordsContainer.appendChild(tag);
    });

    // Add event listeners for remove buttons
    document.querySelectorAll('.keyword-tag .remove').forEach(removeBtn => {
      removeBtn.addEventListener('click', (e) => {
        const keyword = e.target.dataset.keyword;
        keywords.delete(keyword);
        renderKeywords();
        updateFilterLabel();
        applyFilters();
      });
    });
  }

  // Common function to add keyword
  function addKeywordToFilter() {
    const value = areaFilter.value.trim();
    if (value) {
      keywords.add(value);
      areaFilter.value = '';
      renderKeywords();
      updateFilterLabel();
      applyFilters();
    }
  }

  // Add keyword on Enter
  if (areaFilter) {
    areaFilter.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addKeywordToFilter();
      }
    });
  }

  // Add keyword on button click
  if (addKeyword) {
    addKeyword.addEventListener('click', (e) => {
      e.preventDefault();
      addKeywordToFilter();
    });
  }

  // Show all button click event
  if (showAll) {
    showAll.addEventListener('click', (e) => {
      e.preventDefault();
      keywords.clear();
      renderKeywords();
      updateFilterLabel();
      showSoldOut.checked = false;

      if (currentSite === 'tixcraft') {
        chrome.storage.local.set({
          keywords: [],
          hideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'SHOW_ALL'
              });
            }
          });
        });
      } else if (currentSite === 'kktix') {
        chrome.storage.sync.set({
          targetKeywords: [],
          showAllPrices: true,
          hideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showAllPrices',
                settings: {
                  hideSoldOut: false
                }
              });
            }
          });
        });
      } else if (currentSite === 'ibon') {
        chrome.storage.local.set({
          ibonKeywords: [],
          ibonHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              // 發送消息到content.js
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_IBON_SETTINGS',
                settings: {
                  keywords: [],
                  hideSoldOut: false
                }
              });

              // 直接在頁面中執行重置
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                  console.log('重置所有篩選');
                  // 遞迴處理所有shadow roots
                  function resetAllRows(root) {
                    if (root.shadowRoot) {
                      const rows = root.shadowRoot.querySelectorAll('tr[id^="B"]');
                      rows.forEach(row => {
                        row.style.removeProperty('display');
                        Array.from(row.children).forEach(cell => {
                          cell.style.removeProperty('display');
                        });
                      });
                    }
                    
                    Array.from(root.children).forEach(child => {
                      resetAllRows(child);
                    });
                  }
                  
                  resetAllRows(document.documentElement);
                }
              });
            }
          });
        });
      } else if (currentSite === 'cityline') {
        chrome.storage.local.set({
          citylineKeywords: [],
          citylineHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_CITYLINE_SETTINGS',
                settings: {
                  keywords: [],
                  hideSoldOut: false
                }
              });
            }
          });
        });
      }
    });
  }

  // Show sold out checkbox change event
  if (showSoldOut) {
    showSoldOut.addEventListener('change', () => {
      applyFilters();
    });
  }

  // Apply filters
  function applyFilters() {
    const keywordArray = Array.from(keywords);
    const site = document.body.getAttribute('data-site');

    if (site === 'tixcraft') {
      const settings = {
        keywords: keywordArray,
        hideSoldOut: showSoldOut.checked
      };
      chrome.storage.local.set(settings, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'kktix') {
      const settings = {
        hideSoldOut: showSoldOut.checked
      };
      chrome.storage.sync.set({
        targetKeywords: keywordArray,
        showAllPrices: false,
        hideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateFilter',
              keywords: keywordArray,
              settings: settings
            });
          }
        });
      });
    } else if (site === 'ibon') {
      const settings = {
        keywords: keywordArray,
        hideSoldOut: showSoldOut.checked
      };
      // 儲存設定
      chrome.storage.local.set({
        ibonKeywords: keywordArray,
        ibonHideSoldOut: showSoldOut.checked
      }, () => {
        // 發送設定到content.js
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            // 先發送消息
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_IBON_SETTINGS',
              settings: {
                keywords: keywordArray,
                hideSoldOut: showSoldOut.checked
              }
            });

            // 然後直接在頁面中執行篩選
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: (settings) => {
                console.log('直接執行篩選，設定:', settings);

                // 先重置所有行的顯示狀態
                function resetAllRows(root) {
                  if (root.shadowRoot) {
                    const rows = root.shadowRoot.querySelectorAll('tr[id^="B"]');
                    rows.forEach(row => {
                      row.style.removeProperty('display');
                      Array.from(row.children).forEach(cell => {
                        cell.style.removeProperty('display');
                      });
                    });
                  }
                  Array.from(root.children).forEach(child => resetAllRows(child));
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

                // 檢查文本是否包含關鍵字（考慮數字轉換和大小寫）
                function textIncludesKeyword(text, keyword) {
                  // 移除所有空格並轉換為小寫
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

                // 檢查是否符合關鍵字條件
                function matchesKeywords(areaText, priceText, keywords) {
                  if (!keywords || keywords.length === 0) return true;

                  return keywords.some(keyword => {
                    // 處理AND邏輯（用逗號分隔）
                    const andConditions = keyword.split(',').map(k => k.trim());
                    return andConditions.every(condition => {
                      // 處理OR邏輯（用加號分隔）
                      const orConditions = condition.split('+').map(c => c.trim());
                      return orConditions.some(orCondition => {
                        if (!isNaN(orCondition)) {
                          // 價格比對
                          return textIncludesKeyword(priceText, orCondition);
                        } else {
                          // 區域名稱比對
                          return textIncludesKeyword(areaText, orCondition);
                        }
                      });
                    });
                  });
                }

                // 遞迴處理所有shadow roots
                function processShadowRoots(root) {
                  if (root.shadowRoot) {
                    console.log('處理shadow root中的票券');
                    const rows = root.shadowRoot.querySelectorAll('tr[id^="B"]');
                    console.log('找到票券行數:', rows.length);

                    rows.forEach((row, index) => {
                      const areaCell = row.querySelector('td[data-title="票區"]');
                      const priceCell = row.querySelector('td[data-title="票價(NT$)"]');
                      
                      let shouldShow = true;

                      if (areaCell && priceCell) {
                        const areaText = areaCell.textContent.trim();
                        const priceText = priceCell.textContent.replace(/,/g, '').trim();
                        
                        console.log(`檢查第 ${index + 1} 行:`, {
                          area: areaText,
                          price: priceText,
                          keywords: settings.keywords
                        });

                        shouldShow = matchesKeywords(areaText, priceText, settings.keywords);
                        console.log(`第 ${index + 1} 行符合條件:`, shouldShow);
                      }

                      if (settings.hideSoldOut && row.textContent.includes('售完')) {
                        shouldShow = false;
                        console.log(`第 ${index + 1} 行已售完`);
                      }

                      if (!shouldShow) {
                        console.log(`隱藏第 ${index + 1} 行`);
                        row.style.setProperty('display', 'none', 'important');
                        Array.from(row.children).forEach(cell => {
                          cell.style.setProperty('display', 'none', 'important');
                        });
                      }
                    });
                  }

                  Array.from(root.children).forEach(child => {
                    processShadowRoots(child);
                  });
                }

                // 執行篩選
                console.log('開始執行篩選');
                resetAllRows(document.documentElement);
                processShadowRoots(document.documentElement);
              },
              args: [settings]
            });
          }
        });
      });
    } else if (site === 'cityline') {
      const settings = {
        keywords: keywordArray,
        hideSoldOut: showSoldOut.checked
      };
      
      // 儲存設定
      chrome.storage.local.set({
        citylineKeywords: keywordArray,
        citylineHideSoldOut: showSoldOut.checked
      }, () => {
        // 發送設定到content.js
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_CITYLINE_SETTINGS',
              settings: settings
            });
          }
        });
      });
    }
  }

  // 处理服务器时间显示开关
  showServerTime.addEventListener('change', function(e) {
    chrome.storage.local.set({ showServerTime: e.target.checked });
  });

  // 加载时设置开关状态
  chrome.storage.local.get(['showServerTime'], function(result) {
    // 如果从未设置过，默认为开启
    const serverTimeEnabled = result.showServerTime === undefined ? true : result.showServerTime;
    showServerTime.checked = serverTimeEnabled;
  });

  // 设置面板相关
  const settingsPanel = document.querySelector('.settings-panel');

  // 点击设置图标显示/隐藏设置面板
  settingsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPanel.classList.toggle('show');
  });

  // 点击其他地方关闭设置面板
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsIcon.contains(e.target)) {
      settingsPanel.classList.remove('show');
    }
  });

  // 处理筛选条件显示设置
  showFilterStatus.addEventListener('change', (e) => {
    chrome.storage.local.set({ showFilterStatus: e.target.checked });
  });

  // 加载筛选条件显示设置
  chrome.storage.local.get(['showFilterStatus'], function(result) {
    const showFilterStatus = result.showFilterStatus === undefined ? true : result.showFilterStatus;
    document.getElementById('showFilterStatus').checked = showFilterStatus;
  });

  // 监听设置变化
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
      // 重新显示筛选状态，以更新位置
      showFilterStatus();
    }
    
    // 当筛选条件显示设置改变时，重新显示筛选状态
    if (changes.showFilterStatus !== undefined) {
      if (changes.showFilterStatus.newValue === false) {
        // 如果设置为不显示，移除现有的筛选条件显示
        const existingNotification = document.querySelector('.ticket-filter-notification');
        if (existingNotification) {
          existingNotification.remove();
        }
      } else {
        // 如果设置为显示，重新显示筛选条件
        showFilterStatus();
      }
    }
  });
}); 