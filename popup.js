document.addEventListener('DOMContentLoaded', () => {
  const areaFilter = document.getElementById('areaFilter');
  const keywordsContainer = document.getElementById('keywordsContainer');
  const showSoldOut = document.getElementById('showSoldOut');
  const showAll = document.getElementById('showAll');
  const addKeyword = document.getElementById('addKeyword');
  const currentFilter = document.getElementById('currentFilter');
  const filterText = document.getElementById('filterText');

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

  // Load saved settings from storage
  chrome.storage.local.get(['keywords', 'showSoldOut'], (result) => {
    if (result.keywords) {
      keywords = new Set(result.keywords);
      renderKeywords();
      updateFilterLabel();
    }
    if (result.showSoldOut !== undefined) {
      showSoldOut.checked = result.showSoldOut;
    }
  });

  // Update filter label
  function updateFilterLabel() {
    if (keywords.size > 0) {
      currentFilter.style.display = 'inline-block';
      filterText.textContent = Array.from(keywords).join(', ');
    } else {
      currentFilter.style.display = 'none';
    }
  }

  // Render keyword tags
  function renderKeywords() {
    keywordsContainer.innerHTML = '';
    
    if (keywords.size === 0) {
      keywordsContainer.innerHTML = '<span class="no-keywords">尚未設定篩選條件</span>';
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
      chrome.storage.local.set({
        keywords: [],
        showSoldOut: showSoldOut.checked
      }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'SHOW_ALL'
            });
          }
        });
      });
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
    const settings = {
      keywords: Array.from(keywords),
      showSoldOut: showSoldOut.checked
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
  }
}); 
