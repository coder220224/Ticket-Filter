document.addEventListener('DOMContentLoaded', () => {
  const areaFilter = document.getElementById('areaFilter');
  const blacklistFilter = document.getElementById('blacklistFilter');
  const keywordsContainer = document.getElementById('keywordsContainer');
  const blacklistContainer = document.getElementById('blacklistContainer');
  const showSoldOut = document.getElementById('showSoldOut');
  const showAll = document.getElementById('showAll');
  const addKeyword = document.getElementById('addKeyword');
  const addBlacklist = document.getElementById('addBlacklist');
  const currentFilter = document.getElementById('currentFilter');
  const filterText = document.getElementById('filterText');
  const showServerTime = document.getElementById('showServerTime');
  const showFilterStatus = document.getElementById('showFilterStatus');
  const showHelpText = document.getElementById('showHelpText');
  const extensionSwitch = document.getElementById('extensionEnabled');
  const settingsIcon = document.querySelector('.settings-icon');
  const helpTexts = document.querySelectorAll('.help-text');

  // 控制所有設定項目的啟用/禁用狀態
  function toggleControls(enabled) {
    const controls = [
      areaFilter,
      showSoldOut,
      showAll,
      addKeyword,
      showServerTime,
      showFilterStatus,
      showHelpText,
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

  // 載入提示訊息顯示設定
  chrome.storage.local.get(['showHelpText'], function(result) {
    showHelpText.checked = result.showHelpText !== false;
    toggleHelpText(result.showHelpText !== false);
  });

  // 監聽提示訊息顯示設定變化
  showHelpText.addEventListener('change', function(e) {
    const show = e.target.checked;
    chrome.storage.local.set({ showHelpText: show });
    toggleHelpText(show);
  });

  // 切換提示訊息顯示狀態
  function toggleHelpText(show) {
    helpTexts.forEach(text => {
      text.style.display = show ? '' : 'none';
    });
  }

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
  let blacklist = new Set();
  let currentSite = null;

  // 檢查當前網站類型
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url;
      if (url.includes('tixcraft.com') || url.includes('tixcraftweb-pcox.onrender.com')) {
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
      } else if (url.includes('ticket.com.tw')) {
        currentSite = 'ticket';
        loadTicketSettings();
        document.body.setAttribute('data-site', 'ticket');
      } else if (url.includes('ticketplus.com.tw')) {
        currentSite = 'ticketplus';
        loadTicketPlusSettings();
        document.body.setAttribute('data-site', 'ticketplus');
      } else if (url.includes('fami.life')) {
        console.log('检测到 Fami Life 网站，开始加载设置');
        currentSite = 'fami';
        document.body.setAttribute('data-site', 'fami');
      } else if (url.includes('tix.wdragons.com') || url.includes('tix.ctbcsports.com') || url.includes('tix.fubonbraves.com')) {
        console.log('检测到 Fami Life 相关网站，开始加载设置');
        currentSite = 'fami';
        document.body.setAttribute('data-site', 'fami');
        // 确保在设置 data-site 后再加载设置
        chrome.storage.local.get(['famiKeywords', 'famiBlacklist', 'famiHideSoldOut'], (result) => {
          console.log('加载到的设置：', result);
          if (result.famiKeywords) {
            keywords = new Set(result.famiKeywords);
          } else {
            keywords = new Set();
          }
          if (result.famiBlacklist) {
            blacklist = new Set(result.famiBlacklist);
          } else {
            blacklist = new Set();
          }
          showSoldOut.checked = result.famiHideSoldOut || false;
          
          // 确保 UI 更新
          renderKeywords();
          renderBlacklist();
          updateFilterLabel();
        });
      } else if (url.includes('jkface.net')) {
        console.log('检测到 JKFace 网站，开始加载设置');
        currentSite = 'jkface';
        document.body.setAttribute('data-site', 'jkface');
        // 加载 JKFace 设置
        chrome.storage.local.get(['jkfaceKeywords', 'jkfaceBlacklist', 'jkfaceHideSoldOut'], (result) => {
          console.log('加载到的设置：', result);
          if (result.jkfaceKeywords) {
            keywords = new Set(result.jkfaceKeywords);
          } else {
            keywords = new Set();
          }
          if (result.jkfaceBlacklist) {
            blacklist = new Set(result.jkfaceBlacklist);
          } else {
            blacklist = new Set();
          }
          showSoldOut.checked = result.jkfaceHideSoldOut || false;
          
          // 确保 UI 更新
          renderKeywords();
          renderBlacklist();
          updateFilterLabel();
        });
      } else if (url.includes('kham.com.tw')) {
        currentSite = 'kham';
        document.body.setAttribute('data-site', 'kham');
        // 加载 Kham 设置
        chrome.storage.local.get(['khamKeywords', 'khamBlacklist', 'khamHideSoldOut'], (result) => {
          console.log('加载到的设置：', result);
          if (result.khamKeywords) {
            keywords = new Set(result.khamKeywords);
          } else {
            keywords = new Set();
          }
          if (result.khamBlacklist) {
            blacklist = new Set(result.khamBlacklist);
          } else {
            blacklist = new Set();
          }
          showSoldOut.checked = result.khamHideSoldOut || false;
          
          // 确保 UI 更新
          renderKeywords();
          renderBlacklist();
          updateFilterLabel();
        });
      }
    }
  });

  // 載入拓元設定
  function loadTixcraftSettings() {
    chrome.storage.local.get(['keywords', 'blacklist', 'hideSoldOut'], (result) => {
      if (result.keywords) {
        keywords = new Set(result.keywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.blacklist) {
        blacklist = new Set(result.blacklist);
        renderBlacklist();
      }
      if (result.hideSoldOut !== undefined) {
        showSoldOut.checked = result.hideSoldOut;
      }
    });
  }

  // 載入KKTIX設定
  function loadKKTIXSettings() {
    chrome.storage.sync.get(['targetKeywords', 'blacklist', 'hideSoldOut'], (result) => {
      if (result.targetKeywords) {
        keywords = new Set(result.targetKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.blacklist) {
        blacklist = new Set(result.blacklist);
        renderBlacklist();
      }
      if (result.hideSoldOut !== undefined) {
        showSoldOut.checked = result.hideSoldOut;
      }
    });
  }

  // 載入ibon設定
  function loadIbonSettings() {
    chrome.storage.local.get(['ibonKeywords', 'ibonBlacklist', 'ibonHideSoldOut'], (result) => {
      if (result.ibonKeywords) {
        keywords = new Set(result.ibonKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.ibonBlacklist) {
        blacklist = new Set(result.ibonBlacklist);
        renderBlacklist();
      }
      if (result.ibonHideSoldOut !== undefined) {
        showSoldOut.checked = result.ibonHideSoldOut;
      }
    });
  }

  // 載入Cityline設定
  function loadCitylineSettings() {
    chrome.storage.local.get(['citylineKeywords', 'citylineBlacklist', 'citylineHideSoldOut'], (result) => {
      if (result.citylineKeywords) {
        keywords = new Set(result.citylineKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.citylineBlacklist) {
        blacklist = new Set(result.citylineBlacklist);
        renderBlacklist();
      }
      if (result.citylineHideSoldOut !== undefined) {
        showSoldOut.checked = result.citylineHideSoldOut;
      }
    });
  }

  // 載入年代售票設定
  function loadTicketSettings() {
    chrome.storage.local.get(['ticketKeywords', 'ticketBlacklist', 'ticketHideSoldOut'], (result) => {
      if (result.ticketKeywords) {
        keywords = new Set(result.ticketKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.ticketBlacklist) {
        blacklist = new Set(result.ticketBlacklist);
        renderBlacklist();
      }
      if (result.ticketHideSoldOut !== undefined) {
        showSoldOut.checked = result.ticketHideSoldOut;
      }
    });
  }

  // 載入遠大售票平台設定
  function loadTicketPlusSettings() {
    chrome.storage.local.get(['ticketplusKeywords', 'ticketplusBlacklist', 'ticketplusHideSoldOut'], (result) => {
      if (result.ticketplusKeywords) {
        keywords = new Set(result.ticketplusKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.ticketplusBlacklist) {
        blacklist = new Set(result.ticketplusBlacklist);
        renderBlacklist();
      }
      if (result.ticketplusHideSoldOut !== undefined) {
        showSoldOut.checked = result.ticketplusHideSoldOut;
      }
    });
  }

  // 載入 Fami Life 設定
  function loadFamiSettings() {
    chrome.storage.local.get(['famiKeywords', 'famiBlacklist', 'famiHideSoldOut'], (result) => {
      if (result.famiKeywords) {
        keywords = new Set(result.famiKeywords);
        renderKeywords();
        updateFilterLabel();
      }
      if (result.famiBlacklist) {
        blacklist = new Set(result.famiBlacklist);
        renderBlacklist();
      }
      if (result.famiHideSoldOut !== undefined) {
        showSoldOut.checked = result.famiHideSoldOut;
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
      
      // 只在用户主动清除时才隐藏标签
      if (currentFilter) {
        currentFilter.style.display = 'none';
      }
      if (filterText) {
        filterText.textContent = '';
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
        // 只在用户主动删除时应用过滤
        applyFilters();
      });
    });

    // 更新關鍵字顯示標籤
    if (currentFilter && filterText) {
      currentFilter.style.display = 'inline-block';
      filterText.textContent = Array.from(keywords).join('、');
    }
  }

  // Render blacklist tags
  function renderBlacklist() {
    blacklistContainer.innerHTML = '';
    
    if (blacklist.size === 0) {
      blacklistContainer.innerHTML = '<span class="no-keywords">尚未設定黑名單</span>';
      const currentBlacklist = document.getElementById('currentBlacklist');
      if (currentBlacklist) {
        currentBlacklist.style.display = 'none';
      }
      return;
    }

    blacklist.forEach(keyword => {
      const tag = document.createElement('div');
      tag.className = 'keyword-tag';
      tag.innerHTML = `
        <span>${keyword}</span>
        <span class="remove" data-keyword="${keyword}">×</span>
      `;
      blacklistContainer.appendChild(tag);
    });

    // 更新黑名單顯示標籤
    const currentBlacklist = document.getElementById('currentBlacklist');
    const blacklistText = document.getElementById('blacklistText');
    if (currentBlacklist && blacklistText) {
      currentBlacklist.style.display = 'inline-block';
      blacklistText.textContent = Array.from(blacklist).join('、');
    }

    // Add event listeners for remove buttons
    document.querySelectorAll('#blacklistContainer .keyword-tag .remove').forEach(removeBtn => {
      removeBtn.addEventListener('click', (e) => {
        const keyword = e.target.dataset.keyword;
        blacklist.delete(keyword);
        renderBlacklist();
        // 只在用户主动删除时应用过滤
        applyFilters();
      });
    });
  }

  // 自定義警告框函數
  function showCustomAlert(message) {
    return new Promise((resolve) => {
      const overlay = document.querySelector('.alert-overlay');
      const alert = document.querySelector('.custom-alert');
      const content = alert.querySelector('.alert-content');
      const confirmBtn = alert.querySelector('.alert-confirm');
      const cancelBtn = alert.querySelector('.alert-cancel');

      content.textContent = message;
      overlay.style.display = 'block';
      alert.style.display = 'block';

      const handleConfirm = () => {
        overlay.style.display = 'none';
        alert.style.display = 'none';
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        overlay.style.display = 'none';
        alert.style.display = 'none';
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        overlay.removeEventListener('click', handleCancel);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      overlay.addEventListener('click', handleCancel);
    });
  }

  // 修改添加關鍵字的函數
  async function addKeywordToFilter() {
    const value = areaFilter.value.trim();
    if (value) {
      const hasConflict = Array.from(blacklist).some(blacklistItem => {
        if (blacklistItem === value) return true;
        
        // 處理 OR 條件 (+)
        const blacklistOrParts = blacklistItem.split('+').map(p => p.trim());
        const valueOrParts = value.split('+').map(p => p.trim());
        
        // 處理 AND 條件 (,)
        const blacklistAndParts = blacklistOrParts.flatMap(p => p.split(',').map(p => p.trim()));
        const valueAndParts = valueOrParts.flatMap(p => p.split(',').map(p => p.trim()));
        
        return blacklistAndParts.some(bp => valueAndParts.includes(bp));
      });

      if (hasConflict) {
        const shouldAdd = await showCustomAlert('此條件與黑名單中的條件重複或衝突，是否仍要新增？');
        if (!shouldAdd) return;
      }
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

  // 修改添加黑名單的函數
  async function addBlacklistKeyword() {
    const value = blacklistFilter.value.trim();
    if (value) {
      const hasConflict = Array.from(keywords).some(keyword => {
        if (keyword === value) return true;
        
        // 處理 OR 條件 (+)
        const keywordOrParts = keyword.split('+').map(p => p.trim());
        const valueOrParts = value.split('+').map(p => p.trim());
        
        // 處理 AND 條件 (,)
        const keywordAndParts = keywordOrParts.flatMap(p => p.split(',').map(p => p.trim()));
        const valueAndParts = valueOrParts.flatMap(p => p.split(',').map(p => p.trim()));
        
        return keywordAndParts.some(kp => valueAndParts.includes(kp));
      });

      if (hasConflict) {
        const shouldAdd = await showCustomAlert('此條件與關鍵字篩選中的條件重複或衝突，是否仍要新增？');
        if (!shouldAdd) return;
      }
      blacklist.add(value);
      blacklistFilter.value = '';
      renderBlacklist();
      applyFilters();
    }
  }

  // Add blacklist on Enter
  if (blacklistFilter) {
    blacklistFilter.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBlacklistKeyword();
      }
    });
  }

  // Add blacklist on button click
  if (addBlacklist) {
    addBlacklist.addEventListener('click', (e) => {
      e.preventDefault();
      addBlacklistKeyword();
    });
  }

  // Show all button click event
  if (showAll) {
    showAll.addEventListener('click', (e) => {
      e.preventDefault();
      keywords.clear();
      blacklist.clear();
      renderKeywords();
      renderBlacklist();
      showSoldOut.checked = false;

      if (currentSite === 'tixcraft') {
        chrome.storage.local.set({
          keywords: [],
          blacklist: [],
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
        // 先清除所有設定
        chrome.storage.sync.remove(['targetKeywords', 'blacklist', 'showAllPrices', 'hideSoldOut'], () => {
          // 設置新的空值
          chrome.storage.sync.set({
            targetKeywords: [],
            blacklist: [],
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
                }, () => {
                  // 強制重新載入設定
                  loadKKTIXSettings();
                  // 強制更新標籤顯示
                  renderKeywords();
                  renderBlacklist();
                  updateFilterLabel();
                });
              }
            });
          });
        });
      } else if (currentSite === 'ibon') {
        // 先清除 storage
        chrome.storage.local.remove(['ibonKeywords', 'ibonBlacklist', 'ibonHideSoldOut'], () => {
          // 然後設置新的空值
          chrome.storage.local.set({
            ibonKeywords: [],
            ibonBlacklist: [],
            ibonHideSoldOut: false
          }, () => {
            // 發送消息到 content script
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  type: 'UPDATE_IBON_SETTINGS',
                  settings: {
                    keywords: [],
                    blacklist: [],
                    hideSoldOut: false
                  }
                }, () => {
                  // 強制重新載入設定
                  loadIbonSettings();
                });
              }
            });
          });
        });
      } else if (currentSite === 'cityline') {
        chrome.storage.local.set({
          citylineKeywords: [],
          citylineBlacklist: [],
          citylineHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_CITYLINE_SETTINGS',
                settings: {
                  keywords: [],
                  blacklist: [],
                  hideSoldOut: false
                }
              });
            }
          });
        });
      } else if (currentSite === 'ticket') {
        chrome.storage.local.set({
          ticketKeywords: [],
          ticketBlacklist: [],
          ticketHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_TICKET_SETTINGS',
                settings: {
                  keywords: [],
                  blacklist: [],
                  hideSoldOut: false
                }
              });
            }
          });
        });
      } else if (currentSite === 'ticketplus') {
        chrome.storage.local.set({
          ticketplusKeywords: [],
          ticketplusBlacklist: [],
          ticketplusHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_TICKETPLUS_SETTINGS',
                settings: {
                  keywords: [],
                  blacklist: [],
                  hideSoldOut: false
                }
              });
            }
          });
        });
      } else if (currentSite === 'fami' || currentSite === 'wdragons' || currentSite === 'ctbcsports' || currentSite === 'fubonbraves') {
        chrome.storage.local.set({
          famiKeywords: [],
          famiBlacklist: [],
          famiHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_FAMI_SETTINGS',
                settings: {
                  keywords: [],
                  blacklist: [],
                  hideSoldOut: false
                }
              });
            }
          });
        });
      } else if (currentSite === 'jkface') {
        chrome.storage.local.set({
          jkfaceKeywords: [],
          jkfaceBlacklist: [],
          jkfaceHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_JKFACE_SETTINGS',
                settings: {
                  keywords: [],
                  blacklist: [],
                  hideSoldOut: false
                }
              });
            }
          });
        });
      } else if (currentSite === 'kham') {
        chrome.storage.local.set({
          khamKeywords: [],
          khamBlacklist: [],
          khamHideSoldOut: false
        }, () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_KHAM_SETTINGS',
                settings: {
                  keywords: [],
                  blacklist: [],
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
    const blacklistArray = Array.from(blacklist);
    const site = document.body.getAttribute('data-site');

    if (site === 'tixcraft') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      chrome.storage.local.set({
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      }, () => {
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
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      chrome.storage.sync.set({
        targetKeywords: keywordArray,
        blacklist: blacklistArray,
        showAllPrices: false,
        hideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateFilter',
              keywords: keywordArray,
              blacklist: blacklistArray,
              settings: settings
            });
          }
        });
      });
    } else if (site === 'ibon') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      chrome.storage.local.set({
        ibonKeywords: keywordArray,
        ibonBlacklist: blacklistArray,
        ibonHideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_IBON_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'cityline') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      chrome.storage.local.set({
        citylineKeywords: keywordArray,
        citylineBlacklist: blacklistArray,
        citylineHideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_CITYLINE_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'ticket') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      
      // 儲存設定
      chrome.storage.local.set({
        ticketKeywords: keywordArray,
        ticketBlacklist: blacklistArray,
        ticketHideSoldOut: showSoldOut.checked
      }, () => {
        // 發送設定到content.js
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_TICKET_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'ticketplus') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      
      chrome.storage.local.set({
        ticketplusKeywords: keywordArray,
        ticketplusBlacklist: blacklistArray,
        ticketplusHideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_TICKETPLUS_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'fami' || site === 'wdragons' || site === 'ctbcsports' || site === 'fubonbraves') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      
      chrome.storage.local.set({
        famiKeywords: keywordArray,
        famiBlacklist: blacklistArray,
        famiHideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_FAMI_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'jkface') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      
      chrome.storage.local.set({
        jkfaceKeywords: keywordArray,
        jkfaceBlacklist: blacklistArray,
        jkfaceHideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_JKFACE_SETTINGS',
              settings: settings
            });
          }
        });
      });
    } else if (site === 'kham') {
      const settings = {
        keywords: keywordArray,
        blacklist: blacklistArray,
        hideSoldOut: showSoldOut.checked
      };
      
      chrome.storage.local.set({
        khamKeywords: keywordArray,
        khamBlacklist: blacklistArray,
        khamHideSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_KHAM_SETTINGS',
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

  function isIbonTicketPage(url) {
    return url.includes('ibon.com.tw/application/UTK0201_000.aspx') || 
           url.match(/ibon\.com\.tw\/Event\/[A-Z0-9]+\/[A-Z0-9]+/);  // 添加新格式匹配
  }

  // 添加快捷键设置按钮的点击事件
  document.getElementById('openShortcutSettings').addEventListener('click', function() {
    // 使用chrome.tabs.create打开快捷键设置页面
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts'
    });
  });

  // 获取当前快捷键设置
  function updateCurrentShortcut() {
    chrome.commands.getAll(commands => {
      const toggleCommand = commands.find(command => command.name === 'toggle-extension');
      const shortcutSpan = document.getElementById('currentShortcut');
      if (toggleCommand && shortcutSpan) {
        shortcutSpan.textContent = toggleCommand.shortcut || '未設定';
      }
    });
  }

  // 初始化时获取当前快捷键
  updateCurrentShortcut();
  
  // 当popup打开时更新快捷键显示
  chrome.commands.getAll(commands => {
    const toggleCommand = commands.find(command => command.name === 'toggle-extension');
    const shortcutSpan = document.getElementById('currentShortcut');
    if (toggleCommand && shortcutSpan) {
      shortcutSpan.textContent = toggleCommand.shortcut || '未設定';
    }
  });

  // 处理快捷键启用/禁用
  const enableShortcut = document.getElementById('enableShortcut');
  const shortcutInfoContainer = document.getElementById('shortcutInfoContainer');
  const openShortcutSettings = document.getElementById('openShortcutSettings');

  // 加载快捷键启用状态
  chrome.storage.local.get(['shortcutEnabled'], function(result) {
    const enabled = result.shortcutEnabled !== false; // 默认启用
    enableShortcut.checked = enabled;
    updateShortcutUIState(enabled);
  });

  // 更新快捷键UI状态
  function updateShortcutUIState(enabled) {
    if (shortcutInfoContainer) {
      shortcutInfoContainer.style.opacity = enabled ? '1' : '0.5';
      shortcutInfoContainer.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    if (openShortcutSettings) {
      openShortcutSettings.style.opacity = enabled ? '1' : '0.5';
      openShortcutSettings.style.pointerEvents = enabled ? 'auto' : 'none';
    }
  }

  // 监听快捷键启用状态变化
  enableShortcut.addEventListener('change', function(e) {
    const enabled = e.target.checked;
    chrome.storage.local.set({ shortcutEnabled: enabled });
    updateShortcutUIState(enabled);

    // 更新快捷键命令状态
    chrome.commands.getAll(commands => {
      const toggleCommand = commands.find(command => command.name === 'toggle-extension');
      if (toggleCommand) {
        if (!enabled) {
          // 禁用快捷键时，保存当前的快捷键设置
          chrome.storage.local.set({ 
            savedShortcut: toggleCommand.shortcut 
          }, () => {
            // 然后清除快捷键
            chrome.commands.update({
              name: 'toggle-extension',
              shortcut: ''
            });
            document.getElementById('currentShortcut').textContent = '已停用';
          });
        } else {
          // 启用快捷键时，恢复之前保存的快捷键设置
          chrome.storage.local.get(['savedShortcut'], function(result) {
            if (result.savedShortcut) {
              chrome.commands.update({
                name: 'toggle-extension',
                shortcut: result.savedShortcut
              });
              document.getElementById('currentShortcut').textContent = result.savedShortcut;
            } else {
              // 如果没有保存的快捷键，使用默认值
              document.getElementById('currentShortcut').textContent = 'Ctrl+Shift+E';
            }
          });
        }
      }
    });
  });
}); 