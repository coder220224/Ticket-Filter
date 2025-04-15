# <img src="https://raw.githubusercontent.com/coder220224/tixcraft-filter/refs/heads/main/images/icon128.png" alt="圖片描述" width="25"/>  拓元售票篩選器


一個 Chrome 擴充功能，用於在拓元售票網站上快速篩選您想要的區域票券。

## 功能特點

- 關鍵字篩選：輸入想要的區域名稱（如：VIP、特A區等），快速找出符合條件的票券
- 價格篩選：輸入價格可以快速找出指定價格的票券
- 已售完票券過濾：可選擇是否顯示已售完的票券
- 一鍵重置：點擊「顯示全部票券」即可恢復原始顯示
- 即時更新：當網頁更新時自動套用篩選條件

## 安裝方式
### <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Google_Chrome_Web_Store_icon_2022.svg/884px-Google_Chrome_Web_Store_icon_2022.svg.png" width="25"> Chrome商店
1. 前往 [Chrome商店](https://chromewebstore.google.com/detail/pofndajlpfdonhkefkppngfghocppcck?utm_source=item-share-cb)
2. 加到Chrome
3. 新增擴充功能

### <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3RaendkWxwbnlsA8UyDPmcDbqIMQETxKYpw&s" width="20"> Google雲端
1. 前往 [Google雲端](http://bit.ly/41IqDzF)
2. 下載tixcraft_filter資料夾
3. 開啟 Chrome 瀏覽器，前往 chrome://extensions/
4. 開啟右上角的「開發人員模式」
5. 點擊「載入未封裝項目」
6. 選擇資料夾

### <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/tag-16.svg" width="20" /> Github Releases
1. 前往 [Releases](https://github.com/poning0224/tixcraft-filter/releases) 頁面
2. 下載最新版本的 ZIP 檔案
3. 解壓縮檔案
4. 開啟 Chrome 瀏覽器，前往 chrome://extensions/
5. 開啟右上角的「開發人員模式」
6. 點擊「載入未封裝項目」
7. 選擇解壓縮後的資料夾
   
## 使用方式

1. 點擊擴充功能圖示開啟篩選器
2. 在輸入框中輸入想要篩選的區域名稱或價格
3. 按 Enter 或點擊 + 按鈕新增關鍵字
4. 可選擇是否顯示已售完的票券
5. 點擊「顯示全部票券」可重置篩選條件

## 版本更新(1.1.0)

### 1. 新增多重篩選邏輯
- 使用逗號（`,`）可以篩選**同時符合**的票券（AND邏輯）
- 使用加號（`+`）可以篩選**任一條件符合**的票券（OR邏輯）

 #### 使用範例：
- `4500+3200` - 可以找到 4500 元或 3200 元的票
- `3200,A區` - 可以找到 3200 元並且是 A 區的票

### 2. 優化區域名稱搜尋
- 現在可以同時搜尋標題和內容

### 3. 智慧數字轉換
- 支援中文數字和阿拉伯數字互相轉換
- 輸入 `特1區` 可以找到 `特一區`
- 輸入 `特一區` 可以找到 `特1區`
- 不用擔心區域名稱使用的是中文數字還是阿拉伯數字 

## 注意事項

- 本擴充功能僅提供視覺化篩選，不影響實際購票功能
- 建議搭配官方購票系統使用
- 請遵守拓元售票網站的購票規則

## 隱私權政策

- 本擴充功能不會收集任何個人資料
- 所有設定均儲存在您的瀏覽器本地端
- 不會向任何第三方傳送資料

## 版本資訊

- 目前版本：1.1.0
- 最後更新：2025/04/15

## 開發者資訊

如有任何問題或建議，歡迎透過 [GitHub Issues](https://github.com/poning0224/tixcraft-filter/issues) 回報。

或著私訊我的社群帳號[摳得柴柴](https://www.threads.net/@coder22022)。



## 贊助支持
如果你喜歡這個項目並希望支持它，可以考慮通過以下方式贊助：

<a href="https://p.opay.tw/Ha7w9"><img src="https://payment.opay.tw/Content/themes/WebStyle201404/images/allpay.png" alt="歐富寶支付" width="203"></a> <a href="https://mkt.jkopay.com/desktop?url=https%3A%2F%2Fservice.jkopay.com%2Fr%2Ftransfer%3Fj%3DTransfer%253A902576414"><img src="https://i.ibb.co/nNTmRYsQ/logo-modified.png" alt="街口支付" width="110"></a> <a href="https://www.paypal.com/ncp/payment/2WNV2F4R55J7A"><img src="https://i.ibb.co/JRSMqgVC/Paypal-chreckout-logo.png" alt="PayPal" width="155"></a>

每一分支持都對我很有幫助，謝謝！


