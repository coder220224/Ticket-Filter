# <img src="https://raw.githubusercontent.com/coder220224/ticket-filter/refs/heads/main/images/icon128.png" alt="圖片描述" width="25"/>  搶票柴柴-售票網站篩選器


一個 Chrome 擴充功能，用於在各大售票網站上快速篩選您想要的區域票券。

## ✨ 功能特點

### 多平台支援
- 拓元售票網站 (tixcraft.com)
- KKTIX售票網站 (kktix.com)
- ibon售票網站 (ibon.com.tw)
- cityline售票網站 (cityline.com)

### 篩選功能
- 關鍵字篩選：輸入想要的區域名稱（如：VIP、特A區等），快速找出符合條件的票券
- 價格篩選：輸入價格可以快速找出指定價格的票券
- 已售完票券過濾：可選擇是否顯示已售完的票券
- 一鍵重置：點擊「顯示全部票券」即可恢復原始顯示
- 即時更新：當網頁更新時自動套用篩選條件

### 進階功能
- 顯示伺服器時間：可選擇是否在頁面上顯示當前伺服器時間
- 顯示篩選狀態：可選擇是否在頁面上顯示目前的篩選條件
- 擴充功能開關：可快速開啟/關閉擴充功能

## 🧩 安裝方式
### <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Google_Chrome_Web_Store_icon_2022.svg/884px-Google_Chrome_Web_Store_icon_2022.svg.png" width="25"> Chrome商店(版本1.2.0)
1. 前往 [Chrome商店](https://chromewebstore.google.com/detail/pofndajlpfdonhkefkppngfghocppcck?utm_source=item-share-cb)
2. 加到Chrome
3. 新增擴充功能

### 📥 本地下載(版本1.2.0)
1. [點我下載](https://github.com/coder220224/ticket-filter/releases/download/v1.2.0/ticket-filter-v1.2.0.zip)
2. 解壓縮檔案
3. 開啟 Chrome 瀏覽器，前往 chrome://extensions/
4. 開啟右上角的「開發人員模式」
5. 點擊「載入未封裝項目」
6. 選擇解壓縮後的資料夾

### <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3RaendkWxwbnlsA8UyDPmcDbqIMQETxKYpw&s" width="20"> Google雲端(版本1.2.0)
1. 前往 [Google雲端](https://drive.google.com/drive/folders/1Dy8WWYLlIU--oAYryyK7OyV2Dn-Fm7YK?usp=sharing)
2. 下載ticket_filter資料夾
3. 開啟 Chrome 瀏覽器，前往 chrome://extensions/
4. 開啟右上角的「開發人員模式」
5. 點擊「載入未封裝項目」
6. 選擇資料夾

### <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/tag-16.svg" width="20" /> Github Releases(版本1.2.0)
1. 前往 [Releases](https://github.com/coder220224/ticket-filter/releases) 頁面
2. 下載最新版本的 ZIP 檔案
3. 解壓縮檔案
4. 開啟 Chrome 瀏覽器，前往 chrome://extensions/
5. 開啟右上角的「開發人員模式」
6. 點擊「載入未封裝項目」
7. 選擇解壓縮後的資料夾

## 📱 手機安裝方式
- ios : [點此看YT教學](https://youtube.com/shorts/KQwCQwVKBBY?feature=share)

## 🔧 使用方式

### 基本操作
1. 點擊擴充功能圖示開啟篩選器
2. 在輸入框中輸入想要篩選的區域名稱或價格
3. 按 Enter 或點擊 + 按鈕新增關鍵字
4. 可選擇是否顯示已售完的票券
5. 點擊「顯示全部票券」可重置篩選條件

### 進階篩選語法
- 使用逗號（,）可以篩選同時符合的票券（AND邏輯）
  - 例：`4800,搖滾區` - 尋找 4800 元且在搖滾區的票券
- 使用加號（+）可以篩選任一條件符合的票券（OR邏輯）
  - 例：`4500+3200` - 尋找 4500 元或 3200 元的票券
- 複合條件範例：
  - `4500,A區+3200,B區` - 尋找 (4500元的A區) 或 (3200元的B區) 的票券

 ### 智慧數字轉換
- 支援中文數字和阿拉伯數字互相轉換
  - 輸入「特1區」可以找到「特一區」
  - 輸入「特一區」可以找到「特1區」
- 不用擔心區域名稱使用的是中文數字還是阿拉伯數字

## 🔥 版本更新 (v1.2.0)
### 1. 新增多平台支援
   - 支援 KKTIX、ibon、cityline售票網站
### 2. 新增進階設定面板
   - 可控制時間顯示
   - 可控制篩選狀態顯示
   - 可快速開關擴充功能
### 3. 優化效能
   - 改善篩選速度
   - 減少記憶體使用


## ⚠️ 注意事項

- 本擴充功能僅提供視覺化篩選，不影響實際購票功能
- 建議搭配官方購票系統使用
- 請遵守各售票網站的購票規則

## 🔒 隱私權政策

- 本擴充功能不會收集任何個人資料
- 所有設定均儲存在您的瀏覽器本地端
- 不會向任何第三方傳送資料

## 🏷️ 版本資訊

- 目前版本：1.2.0
- 最後更新：2025/04/20

## 👨‍💻 開發者資訊

如有任何問題或建議，歡迎透過 [GitHub Issues](https://github.com/poning0224/tixcraft-filter/issues) 回報。

或著私訊我的社群帳號[摳得柴柴](https://www.threads.net/@coder22022)。

## 💝 贊助支持
如果你喜歡這個項目並希望支持它，可以考慮通過以下方式贊助：

<a href="https://p.opay.tw/Ha7w9"><img src="https://payment.opay.tw/Content/themes/WebStyle201404/images/allpay.png" alt="歐富寶支付" width="203"></a> <a href="https://mkt.jkopay.com/desktop?url=https%3A%2F%2Fservice.jkopay.com%2Fr%2Ftransfer%3Fj%3DTransfer%253A902576414"><img src="https://i.ibb.co/nNTmRYsQ/logo-modified.png" alt="街口支付" width="110"></a> <a href="https://www.paypal.com/ncp/payment/2WNV2F4R55J7A"><img src="https://i.ibb.co/JRSMqgVC/Paypal-chreckout-logo.png" alt="PayPal" width="155"></a>

每一分支持都對我很有幫助，謝謝！


