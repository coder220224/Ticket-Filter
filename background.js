// 后台脚本 - 负责拦截和修改网络请求

// 全局设置存储
let settings = {
  // 拓元
  tixcraftKeywords: [],
  tixcraftHideSoldOut: false,
  
  // KKTIX
  kktixKeywords: [],
  kktixHideSoldOut: false,
  kktixShowAllPrices: true,
  
  // ibon
  ibonKeywords: [],
  ibonHideSoldOut: false,
  
  // Cityline
  citylineKeywords: [],
  citylineHideSoldOut: false,
  
  // JKFace
  jkfaceKeywords: [],
  jkfaceHideSoldOut: false,
  
  // 寬宏售票
  khamKeywords: [],
  khamBlacklist: [],
  khamHideSoldOut: false,
  
  // 全局设置
  extensionEnabled: true,
  showServerTime: true,
  showFilterStatus: true
};

// Service Worker激活事件
chrome.runtime.onInstalled.addListener(() => {
  loadSettings();
  console.log('搶票柴柴扩展已安装/更新');
});

// 确保在service worker启动时也加载设置
self.onload = () => {
  loadSettings();
};

// 初始化加载设置
function loadSettings() {
  chrome.storage.local.get(null, (result) => {
    if (result.keywords) settings.tixcraftKeywords = result.keywords;
    if (result.hideSoldOut !== undefined) settings.tixcraftHideSoldOut = result.hideSoldOut;
    
    if (result.targetKeywords) settings.kktixKeywords = result.targetKeywords;
    if (result.showAllPrices !== undefined) settings.kktixShowAllPrices = result.showAllPrices;
    if (result.kktixHideSoldOut !== undefined) settings.kktixHideSoldOut = result.kktixHideSoldOut;
    
    if (result.ibonKeywords) settings.ibonKeywords = result.ibonKeywords;
    if (result.ibonHideSoldOut !== undefined) settings.ibonHideSoldOut = result.ibonHideSoldOut;
    
    if (result.citylineKeywords) settings.citylineKeywords = result.citylineKeywords;
    if (result.citylineHideSoldOut !== undefined) settings.citylineHideSoldOut = result.citylineHideSoldOut;
    
    if (result.jkfaceKeywords) settings.jkfaceKeywords = result.jkfaceKeywords;
    if (result.jkfaceHideSoldOut !== undefined) settings.jkfaceHideSoldOut = result.jkfaceHideSoldOut;
    
    if (result.khamKeywords) settings.khamKeywords = result.khamKeywords;
    if (result.khamBlacklist) settings.khamBlacklist = result.khamBlacklist;
    if (result.khamHideSoldOut !== undefined) settings.khamHideSoldOut = result.khamHideSoldOut;
    
    if (result.extensionEnabled !== undefined) settings.extensionEnabled = result.extensionEnabled;
    if (result.showServerTime !== undefined) settings.showServerTime = result.showServerTime;
    if (result.showFilterStatus !== undefined) settings.showFilterStatus = result.showFilterStatus;
  });
}

// 监听设置变更
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    if (key === 'keywords') settings.tixcraftKeywords = changes[key].newValue;
    if (key === 'hideSoldOut') settings.tixcraftHideSoldOut = changes[key].newValue;
    
    if (key === 'targetKeywords') settings.kktixKeywords = changes[key].newValue;
    if (key === 'showAllPrices') settings.kktixShowAllPrices = changes[key].newValue;
    if (key === 'kktixHideSoldOut') settings.kktixHideSoldOut = changes[key].newValue;
    
    if (key === 'ibonKeywords') settings.ibonKeywords = changes[key].newValue;
    if (key === 'ibonHideSoldOut') settings.ibonHideSoldOut = changes[key].newValue;
    
    if (key === 'citylineKeywords') settings.citylineKeywords = changes[key].newValue;
    if (key === 'citylineHideSoldOut') settings.citylineHideSoldOut = changes[key].newValue;
    
    if (key === 'jkfaceKeywords') settings.jkfaceKeywords = changes[key].newValue;
    if (key === 'jkfaceHideSoldOut') settings.jkfaceHideSoldOut = changes[key].newValue;
    
    if (key === 'khamKeywords') settings.khamKeywords = changes[key].newValue;
    if (key === 'khamBlacklist') settings.khamBlacklist = changes[key].newValue;
    if (key === 'khamHideSoldOut') settings.khamHideSoldOut = changes[key].newValue;
    
    if (key === 'extensionEnabled') settings.extensionEnabled = changes[key].newValue;
    if (key === 'showServerTime') settings.showServerTime = changes[key].newValue;
    if (key === 'showFilterStatus') settings.showFilterStatus = changes[key].newValue;
  }
});

// 数字转换函数，供匹配使用
function convertNumber(input) {
  const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const arabicNums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  
  // 移除所有空格
  input = input.replace(/\s+/g, '');
  
  // 生成所有可能的版本
  let versions = new Set([input]);
  
  // 找出所有数字和中文数字的位置
  let matches = [];
  // 匹配阿拉伯数字
  input.replace(/\d+/g, (match, offset) => {
    matches.push({
      type: 'arabic',
      value: match,
      offset: offset,
      length: match.length
    });
    return match;
  });
  // 匹配中文数字
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
  
  // 生成替换版本
  if (matches.length > 0) {
    // 原始文本转换
    let converted = input;
    for (let match of matches) {
      if (match.type === 'arabic') {
        // 将阿拉伯数字转为中文数字
        const digits = match.value.split('');
        const chinese = digits.map(d => chineseNums[parseInt(d)]).join('');
        converted = converted.slice(0, match.offset) + chinese + 
                   converted.slice(match.offset + match.length);
      } else {
        // 将中文数字转为阿拉伯数字
        converted = converted.slice(0, match.offset) + match.arabic + 
                   converted.slice(match.offset + match.length);
      }
    }
    versions.add(converted);
  }
  
  return Array.from(versions);
}

// 检查文本是否包含关键字（考虑数字转换）
function textIncludesKeyword(text, keyword) {
  // 移除所有空格并转换为小写再比较
  const cleanText = text.replace(/\s+/g, '').toLowerCase();
  const cleanKeyword = keyword.replace(/\s+/g, '').toLowerCase();
  
  // 获取文本的所有可能版本
  const textVersions = convertNumber(cleanText);
  const keywordVersions = convertNumber(cleanKeyword);
  
  // 交叉比对所有版本
  return keywordVersions.some(kw => 
    textVersions.some(txt => txt.includes(kw))
  );
}

// 为内容脚本通信设置
// 注册消息处理程序，以便内容脚本可以直接检查元素是否应该被筛选
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!settings.extensionEnabled) {
    sendResponse({ shouldShow: true }); // 如果扩展被禁用，所有元素都显示
    return true;
  }
  
  // 消息类型：检查内容是否符合筛选条件
  if (message.type === 'CHECK_FILTER') {
    const { site, text, price, isSoldOut } = message.data;
    
    // 根据不同网站和条件进行判断
    let siteKeywords = [];
    let siteBlacklist = [];
    let siteHideSoldOut = false;
    
    if (site === 'tixcraft') {
      siteKeywords = settings.tixcraftKeywords;
      siteHideSoldOut = settings.tixcraftHideSoldOut;
    } else if (site === 'kktix') {
      siteKeywords = settings.kktixKeywords;
      siteHideSoldOut = settings.kktixHideSoldOut;
      // 如果设置为显示所有价格，则不筛选
      if (settings.kktixShowAllPrices) {
        sendResponse({ shouldShow: !isSoldOut || !siteHideSoldOut });
        return true;
      }
    } else if (site === 'ibon') {
      siteKeywords = settings.ibonKeywords;
      siteHideSoldOut = settings.ibonHideSoldOut;
    } else if (site === 'cityline') {
      siteKeywords = settings.citylineKeywords;
      siteHideSoldOut = settings.citylineHideSoldOut;
    } else if (site === 'jkface') {
      siteKeywords = settings.jkfaceKeywords;
      siteHideSoldOut = settings.jkfaceHideSoldOut;
    } else if (site === 'kham') {
      siteKeywords = settings.khamKeywords;
      siteBlacklist = settings.khamBlacklist;
      siteHideSoldOut = settings.khamHideSoldOut;
    } else {
      sendResponse({ shouldShow: true }); // 不支持的网站直接显示
      return true;
    }
    
    // 如果设置隐藏已售完，且票券已售完，则隐藏
    if (siteHideSoldOut && isSoldOut) {
      sendResponse({ shouldShow: false });
      return true;
    }
    
    // 如果没有关键字，则显示所有非售罄票券
    if (!siteKeywords.length) {
      sendResponse({ shouldShow: true });
      return true;
    }
    
    // 将关键字组合处理为AND/OR逻辑组
    const keywordGroups = siteKeywords.map(keyword => {
      return keyword.split('+').map(k => {
        return k.split(',').map(item => item.trim()).filter(item => item);
      }).filter(group => group.length > 0);
    });
    
    // 根据关键字判断是否显示
    const searchTexts = [text, price].filter(t => t && typeof t === 'string');
    const shouldShow = keywordGroups.some(orGroup => 
      orGroup.some(andGroup => {
        return andGroup.every(keyword => {
          // 数字匹配
          if (!isNaN(keyword)) {
            const priceToFind = parseInt(keyword);
            return searchTexts.some(text => {
              const prices = (text.match(/\d+/g) || []).map(p => parseInt(p));
              return prices.includes(priceToFind);
            });
          } else {
            // 文本匹配
            return searchTexts.some(text => textIncludesKeyword(text, keyword));
          }
        });
      })
    );
    
    // 检查黑名单
    if (shouldShow && siteBlacklist && siteBlacklist.length > 0) {
      const isBlacklisted = siteBlacklist.some(blacklistItem => {
        return searchTexts.some(text => textIncludesKeyword(text, blacklistItem));
      });
      if (isBlacklisted) {
        sendResponse({ shouldShow: false });
        return true;
      }
    }
    
    sendResponse({ shouldShow });
    return true;
  }
  
  // 消息类型：将设置应用于当前标签
  if (message.type === 'GET_SETTINGS') {
    const { site } = message.data;
    
    if (site === 'tixcraft') {
      sendResponse({
        keywords: settings.tixcraftKeywords,
        hideSoldOut: settings.tixcraftHideSoldOut,
        showServerTime: settings.showServerTime,
        showFilterStatus: settings.showFilterStatus,
        extensionEnabled: settings.extensionEnabled
      });
    } else if (site === 'kktix') {
      sendResponse({
        keywords: settings.kktixKeywords,
        showAllPrices: settings.kktixShowAllPrices,
        hideSoldOut: settings.kktixHideSoldOut,
        showServerTime: settings.showServerTime,
        showFilterStatus: settings.showFilterStatus,
        extensionEnabled: settings.extensionEnabled
      });
    } else if (site === 'ibon') {
      sendResponse({
        keywords: settings.ibonKeywords,
        hideSoldOut: settings.ibonHideSoldOut,
        showServerTime: settings.showServerTime,
        showFilterStatus: settings.showFilterStatus,
        extensionEnabled: settings.extensionEnabled
      });
    } else if (site === 'cityline') {
      sendResponse({
        keywords: settings.citylineKeywords,
        hideSoldOut: settings.citylineHideSoldOut,
        showServerTime: settings.showServerTime,
        showFilterStatus: settings.showFilterStatus,
        extensionEnabled: settings.extensionEnabled
      });
    } else if (site === 'jkface') {
      sendResponse({
        keywords: settings.jkfaceKeywords,
        hideSoldOut: settings.jkfaceHideSoldOut,
        showServerTime: settings.showServerTime,
        showFilterStatus: settings.showFilterStatus,
        extensionEnabled: settings.extensionEnabled
      });
    } else if (site === 'kham') {
      sendResponse({
        keywords: settings.khamKeywords,
        blacklist: settings.khamBlacklist,
        hideSoldOut: settings.khamHideSoldOut,
        showServerTime: settings.showServerTime,
        showFilterStatus: settings.showFilterStatus,
        extensionEnabled: settings.extensionEnabled
      });
    } else {
      sendResponse({});
    }
    return true;
  }
});

// 保持service worker活跃
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    // 断开连接后可以记录日志或执行其他清理工作
    console.log('连接已断开');
  });
});

// 确保service worker不会过早终止
chrome.runtime.onStartup.addListener(() => {
  loadSettings();
  console.log('浏览器启动，搶票柴柴扩展已激活');
});

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  // 检查快捷键是否启用
  chrome.storage.local.get(['shortcutEnabled'], function(result) {
    if (result.shortcutEnabled === false) {
      return; // 如果快捷键被禁用，直接返回
    }

    if (command === 'toggle-extension') {
      chrome.storage.local.get(['extensionEnabled'], function(result) {
        const newState = !result.extensionEnabled;
        chrome.storage.local.set({ extensionEnabled: newState }, function() {
          // 向所有标签页广播状态变化
          chrome.tabs.query({}, function(tabs) {
            tabs.forEach(function(tab) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'EXTENSION_STATE_CHANGED',
                enabled: newState
              });
            });
          });
        });
      });
    }
  });
}); 