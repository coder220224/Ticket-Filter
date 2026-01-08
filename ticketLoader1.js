// 在页面加载最早期介入
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否是座位选择页面
    if (!window.location.href.includes('PERFORMANCE_ID=')) {
        return;
    }

    // 设置页面加载策略
    if (document.documentElement) {
        document.documentElement.setAttribute('pageLoadStrategy', 'eager');
    }

    // 设置性能优化
    const style = document.createElement('style');
    style.textContent = `
        * { 
            transition: none !important; 
            animation: none !important;
        }
        
        /* 隐藏非必要元素 */
        img[src*="banner"], 
        img[src*="ad"],
        iframe:not(.essential-frame),
        script[src*="analytics"],
        script[src*="tracking"],
        script[src*="facebook"],
        script[src*="google-analytics"],
        script[src*="gtm"],
        script[src*="pixel"],
        link[href*="font"],
        .footer,
        .header-banner,
        .ad-container,
        #topAlert,
        .alert-box,
        .emergency,
        .process-wizard,
        .nav-line {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            position: absolute !important;
            pointer-events: none !important;
        }
        
        /* 优化关键元素显示 */
        .area-list,
        .seat-map,
        #box,
        #mapdata,
        #ctl00_ContentPlaceHolder1_IMG_MAP,
        .main {
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            content-visibility: auto !important;
        }

        #box img {
            image-rendering: auto !important;
            object-fit: contain !important;
            visibility: visible !important;
            opacity: 1 !important;
        }

        /* 优化表单元素 */
        input, select, button {
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
    `;
    document.head.appendChild(style);

    // 阻止不必要的资源加载
    const stopLoading = () => {
        try {
            window.stop();
            console.log('已停止页面加载');
            observer.disconnect();
            clearInterval(checkInterval);
        } catch (e) {
            console.log('停止加载时发生错误:', e);
        }
    };

    // 检查并停止加载
    const checkAndStopLoading = () => {
        // 检查关键元素
        const areaList = document.querySelector('.area-list');
        const seatMap = document.querySelector('#box img');
        const mapData = document.querySelector('#mapdata');
        const mainElements = document.querySelectorAll('.main');

        // 快速检查是否有任何关键元素
        if (!areaList && !seatMap && !mapData && mainElements.length === 0) {
            return false;
        }

        // 检查价格信息
        const priceElements = document.querySelectorAll('.area-list font');
        if (priceElements.length >= 4) { // 降低阈值到4个价格区域
            stopLoading();
            return true;
        }

        // 检查座位图是否加载
        if (seatMap && seatMap.complete && seatMap.naturalWidth > 0) {
            stopLoading();
            return true;
        }

        return false;
    };

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'IMG') {
                        node.loading = 'eager';
                        node.fetchPriority = 'high';
                        
                        // 对于座位图特别处理
                        if (node.id === 'ctl00_ContentPlaceHolder1_IMG_MAP') {
                            node.style.visibility = 'visible';
                            node.style.opacity = '1';
                        }
                    }
                    
                    // 自动接受任何弹窗
                    if (node.nodeName === 'DIALOG' || 
                        (node.className && 
                         typeof node.className === 'string' && 
                         node.className.includes('modal'))) {
                        node.remove();
                    }
                });
            }
        }
        
        // 每次DOM变化都检查是否可以停止加载
        checkAndStopLoading();
    });

    // 开始监听
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
    });

    // 更频繁地检查加载状态
    const checkInterval = setInterval(checkAndStopLoading, 50);

    // 设置更短的超时时间
    setTimeout(() => {
        if (!checkAndStopLoading()) {
            stopLoading();
        }
    }, 1000);

    // 拦截和处理所有弹窗
    window.alert = function() { return true; };
    window.confirm = function() { return true; };
    window.onbeforeunload = null;
    window.onunload = null;
});

// 拦截和优化资源加载
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0]?.url || args[0];
    
    // 阻止加载不必要的资源
    if (typeof url === 'string' && (
        url.includes('analytics') ||
        url.includes('tracking') ||
        url.includes('advertisement') ||
        url.includes('banner') ||
        url.includes('.gif') ||
        url.includes('facebook') ||
        url.includes('google') ||
        url.includes('stats') ||
        url.includes('logger') ||
        url.includes('pixel') ||
        url.includes('metrics') ||
        url.includes('collect') ||
        url.includes('notification') ||
        url.includes('gtm') ||
        url.includes('fonts')
    )) {
        return Promise.resolve(new Response('', {status: 200}));
    }
    
    // 为关键请求添加高优先级
    if (typeof url === 'string' && (
        url.includes('map') ||
        url.includes('seat') ||
        url.includes('area')
    )) {
        const options = args[1] || {};
        options.priority = 'high';
        args[1] = options;
    }
    
    return originalFetch.apply(this, args);
};

// 拦截 XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (
        url.includes('analytics') ||
        url.includes('tracking') ||
        url.includes('advertisement') ||
        url.includes('banner') ||
        url.includes('.gif') ||
        url.includes('facebook') ||
        url.includes('google') ||
        url.includes('stats') ||
        url.includes('logger') ||
        url.includes('pixel') ||
        url.includes('metrics') ||
        url.includes('collect') ||
        url.includes('notification') ||
        url.includes('gtm') ||
        url.includes('fonts')
    )) {
        this.abort();
        return;
    }
    return originalOpen.apply(this, [method, url, ...args]);
}; 