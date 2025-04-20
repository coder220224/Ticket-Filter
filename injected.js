// 重寫attachShadow方法
Element.prototype._attachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function() {
    return this._attachShadow({ mode: 'open' });
};

// 處理已存在的shadow root
document.querySelectorAll('*').forEach(element => {
    if (element.shadowRoot && element.shadowRoot.mode === 'closed') {
        const shadowRoot = element._attachShadow({ mode: 'open' });
        Array.from(element.shadowRoot.children).forEach(child => {
            shadowRoot.appendChild(child.cloneNode(true));
        });
    }
}); 