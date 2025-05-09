// js/utils/helpers.js

const Utils = {
    /**
     * 配列からランダムな要素を1つ選択して返す
     * @param {Array} array - 対象の配列
     * @returns {*} ランダムに選択された要素、または配列が空の場合はnull
     */
    getRandomElement: function(array) {
        if (!array || array.length === 0) {
            return null;
        }
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * 指定された範囲内のランダムな整数を返す (minとmaxを含む)
     * @param {number} min - 最小値
     * @param {number} max - 最大値
     * @returns {number} ランダムな整数
     */
    getRandomInt: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 秒数を mm:ss 形式の文字列にフォーマットする
     * @param {number} totalSeconds - 合計秒数
     * @returns {string} フォーマットされた時間文字列 (例: "01:30")
     */
    formatTime: function(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const paddedMinutes = String(minutes).padStart(2, '0');
        const paddedSeconds = String(seconds).padStart(2, '0');
        return `${paddedMinutes}:${paddedSeconds}`;
    },

    /**
     * HSLカラーをCSSのhsl文字列に変換する
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 彩度 (0-100)
     * @param {number} l - 輝度 (0-100)
     * @returns {string} CSSのhsl文字列 (例: "hsl(120, 100%, 50%)")
     */
    hslToCssString: function(h, s, l) {
        return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
    },

    /**
     * HEXカラーコードをHSL配列に変換する
     * @param {string} hex - HEXカラーコード (例: "#FF0000")
     * @returns {Array<number>|null} [h, s, l] の配列、または無効な入力の場合はnull
     */
    hexToHsl: function(hex) {
        if (!hex || typeof hex !== 'string') return null;
        let r = 0, g = 0, b = 0;
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r1, g1, b1) => r1 + r1 + g1 + g1 + b1 + b1);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;

        r = parseInt(result[1], 16);
        g = parseInt(result[2], 16);
        b = parseInt(result[3], 16);

        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            if (h) h /= 6; else h = 0;
        }
        return [h * 360, s * 100, l * 100];
    },

     /**
     * HSLカラーをRGB配列に変換する
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 彩度 (0-100)
     * @param {number} l - 輝度 (0-100)
     * @returns {Array<number>} [r, g, b] の配列 (各0-255)
     */
    hslToRgb: function(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n =>
            l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [
            Math.round(255 * f(0)),
            Math.round(255 * f(8)),
            Math.round(255 * f(4)),
        ];
    },

    /**
     * 関数を指定した遅延後に実行するデバウンス関数
     * @param {Function} func - 実行する関数
     * @param {number} delay - 遅延時間 (ミリ秒)
     * @returns {Function} デバウンス化された関数
     */
    debounce: function(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    },

    /**
     * HTML文字列をDOM要素に変換する (最初の要素のみ)
     * @param {string} htmlString - HTML文字列
     * @returns {Element|null} 生成されたDOM要素、または失敗した場合はnull
     */
    htmlToElement: function(htmlString) {
        const template = document.createElement('template');
        template.innerHTML = htmlString.trim();
        return template.content.firstChild;
    },

    /**
     * HTML文字列をDOM要素の配列に変換する
     * @param {string} htmlString - HTML文字列
     * @returns {NodeListOf<ChildNode>} 生成されたDOM要素のNodeList
     */
    htmlToElements: function(htmlString) {
        const template = document.createElement('template');
        template.innerHTML = htmlString.trim();
        return template.content.childNodes;
    }
};
