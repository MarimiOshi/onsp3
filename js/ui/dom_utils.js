// js/ui/dom_utils.js

const DOMUtils = {
    /**
     * CSSセレクタに一致する最初の要素を取得する
     * @param {string} selector - CSSセレクタ
     * @param {Element|Document} [parent=document] - 検索の起点となる親要素
     * @returns {Element|null} 見つかった要素、またはnull
     */
    qs: function(selector, parent = document) {
        return parent.querySelector(selector);
    },

    /**
     * CSSセレクタに一致するすべての要素を取得する
     * @param {string} selector - CSSセレクタ
     * @param {Element|Document} [parent=document] - 検索の起点となる親要素
     * @returns {NodeListOf<Element>} 見つかった要素のNodeList
     */
    qsa: function(selector, parent = document) {
        return parent.querySelectorAll(selector);
    },

    /**
     * 新しいDOM要素を作成し、属性と子要素を設定する
     * @param {string} tagName - 作成する要素のタグ名 (例: 'div', 'button')
     * @param {Object} [attributes={}] - 要素に設定する属性 (例: { id: 'myId', class: 'myClass' })
     * @param {Array<Node|string>} [children=[]] - 追加する子要素またはテキストノード
     * @returns {Element} 作成されたDOM要素
     */
    createElement: function(tagName, attributes = {}, children = []) {
        const element = document.createElement(tagName);
        for (const key in attributes) {
            if (key === 'class') { // classはclassNameで設定、またはclassList.addを使用
                if (Array.isArray(attributes[key])) {
                    attributes[key].forEach(cls => element.classList.add(cls));
                } else {
                    element.className = attributes[key];
                }
            } else if (key === 'dataset') { // datasetオブジェクトを処理
                 for (const dataKey in attributes[key]) {
                     element.dataset[dataKey] = attributes[key][dataKey];
                 }
            }
            else {
                element.setAttribute(key, attributes[key]);
            }
        }
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        return element;
    },

    /**
     * 要素にクラスを追加する
     * @param {Element} element - 対象の要素
     * @param {string} className - 追加するクラス名
     */
    addClass: function(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    },

    /**
     * 要素からクラスを削除する
     * @param {Element} element - 対象の要素
     * @param {string} className - 削除するクラス名
     */
    removeClass: function(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    },

    /**
     * 要素のクラスをトグルする
     * @param {Element} element - 対象の要素
     * @param {string} className - トグルするクラス名
     * @param {boolean} [force] - 指定された場合、trueなら追加、falseなら削除
     * @returns {boolean|undefined} クラスが最終的に存在する場合はtrue、そうでない場合はfalse (forceが未指定の場合)
     */
    toggleClass: function(element, className, force) {
        if (element && className) {
            return element.classList.toggle(className, force);
        }
        return undefined;
    },

    /**
     * 要素が指定されたクラスを持っているか確認する
     * @param {Element} element - 対象の要素
     * @param {string} className - 確認するクラス名
     * @returns {boolean} クラスを持っていればtrue、そうでなければfalse
     */
    hasClass: function(element, className) {
        if (element && className) {
            return element.classList.contains(className);
        }
        return false;
    },

    /**
     * イベントリスナーを要素に追加する
     * @param {Element|Window|Document} element - 対象の要素
     * @param {string} eventType - イベントタイプ (例: 'click', 'input')
     * @param {Function} handler - イベントハンドラ関数
     * @param {Object|boolean} [options] - addEventListenerのオプション
     */
    on: function(element, eventType, handler, options) {
        if (element && eventType && typeof handler === 'function') {
            element.addEventListener(eventType, handler, options);
        }
    },

    /**
     * イベントリスナーを要素から削除する
     * @param {Element|Window|Document} element - 対象の要素
     * @param {string} eventType - イベントタイプ
     * @param {Function} handler - 削除するイベントハンドラ関数
     * @param {Object|boolean} [options] - removeEventListenerのオプション
     */
    off: function(element, eventType, handler, options) {
        if (element && eventType && typeof handler === 'function') {
            element.removeEventListener(eventType, handler, options);
        }
    },

    /**
     * 指定された要素の子要素をすべて削除する
     * @param {Element} element - 親要素
     */
    empty: function(element) {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    },

    /**
     * 要素の表示/非表示を切り替える
     * @param {Element} element - 対象の要素
     * @param {boolean} [show] - trueなら表示、falseなら非表示。未指定ならトグル。
     */
    toggleDisplay: function(element, show) {
        if (element) {
            if (typeof show === 'boolean') {
                element.style.display = show ? '' : 'none'; // '' でデフォルトに戻す
            } else {
                element.style.display = element.style.display === 'none' ? '' : 'none';
            }
        }
    },

    /**
     * 要素のテキストコンテントを設定する
     * @param {Element} element - 対象の要素
     * @param {string} text - 設定するテキスト
     */
    setText: function(element, text) {
        if (element) {
            element.textContent = text;
        }
    }
};

// グローバルスコープに公開 (またはモジュールとしてエクスポート)
// window.DOMUtils = DOMUtils;
// export default DOMUtils;