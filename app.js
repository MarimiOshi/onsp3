// app.js

const App = {
    elements: {
        // tabNavigation: null, // タブナビは廃止
        // tabButtons: [],      // タブナビは廃止
        modeSections: [],    // 現在はしこしこモードのみ
        appContainer: null,
        settingsModal: null, // 設定モーダル本体
        openSettingsModalButton: null, // 設定モーダルを開くボタン (しこしこモード側)
        closeSettingsModalButton: null, // モーダルを閉じるボタン
        saveSettingsButton: null, // モーダル内の保存ボタン
        // モーダル内の各設定項目への参照は card_ui.js または settings_modal.js (今回は card_ui) が持つ
    },
    state: {
        // activeTab: '#shikoshikoModeSection', // シングルモードなので不要
        currentThemeColor: null,
        config: {}, // config.js の内容
        settings: { // アプリ全体の設定 (localStorageから読み込む)
            memberWeights: {}, // 例: {'マコ': 5, ...}
            // 他のグローバル設定があればここに追加
        },
    },
    modules: {
        cardUI: null,
        dataHandler: null,
        // feverMode: null, // card_ui.js に統合
        // settingsModal: null, // card_ui.js と app.js で処理
    },
    // 汎用ユーティリティをここに統合 (元 utils.js)
    Utils: {
        getRandomElement: function(array) { if (!array || array.length === 0) return null; return array[Math.floor(Math.random() * array.length)]; },
        getRandomInt: function(min, max) { min = Math.ceil(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min; },
        hexToHsl: function(hex) { /* ... (前回のUtilsからコピー) ... */
            if (!hex || typeof hex !== 'string') return null; let r = 0, g = 0, b = 0;
            const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, (m, r1, g1, b1) => r1 + r1 + g1 + g1 + b1 + b1);
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return null; r = parseInt(result[1], 16); g = parseInt(result[2], 16); b = parseInt(result[3], 16);
            r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2; if (max === min) { h = s = 0; }
            else { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
                if (h) h /= 6; else h = 0;
            } return [h * 360, s * 100, l * 100];
        },
        hslToRgb: function(h, s, l) { /* ... (前回のUtilsからコピー) ... */
            s /= 100; l /= 100; const k = n => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
            const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
            return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
        },
        hslToCssString: function(h,s,l){ return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;},
    },
    DOMUtils: { /* ... (前回のDOMUtilsの全内容をここにコピー) ... */
        qs: function(selector, parent = document) { return parent.querySelector(selector); },
        qsa: function(selector, parent = document) { return parent.querySelectorAll(selector); },
        createElement: function(tagName, attributes = {}, children = []) {
            const element = document.createElement(tagName);
            for (const key in attributes) {
                if (key === 'class') {
                    if (Array.isArray(attributes[key])) attributes[key].forEach(cls => element.classList.add(cls));
                    else element.className = attributes[key];
                } else if (key === 'dataset') {
                     for (const dataKey in attributes[key]) element.dataset[dataKey] = attributes[key][dataKey];
                } else element.setAttribute(key, attributes[key]);
            }
            children.forEach(child => {
                if (typeof child === 'string') element.appendChild(document.createTextNode(child));
                else if (child instanceof Node) element.appendChild(child);
            });
            return element;
        },
        addClass: function(element, className) { if (element && className) element.classList.add(className); },
        removeClass: function(element, className) { if (element && className) element.classList.remove(className); },
        toggleClass: function(element, className, force) { if (element && className) return element.classList.toggle(className, force); return undefined; },
        hasClass: function(element, className) { if (element && className) return element.classList.contains(className); return false; },
        on: function(element, eventType, handler, options) { if (element && eventType && typeof handler === 'function') element.addEventListener(eventType, handler, options); },
        off: function(element, eventType, handler, options) { if (element && eventType && typeof handler === 'function') element.removeEventListener(eventType, handler, options); },
        empty: function(element) { if (element) while (element.firstChild) element.removeChild(element.firstChild); },
        toggleDisplay: function(element, show) { if (element) { if (typeof show === 'boolean') element.style.display = show ? '' : 'none'; else element.style.display = element.style.display === 'none' ? '' : 'none';}},
        setText: function(element, text) { if (element) element.textContent = text; }
    },
    StorageService: { /* ... (前回のStorageServiceの全内容をここにコピー) ... */
        COUNTER_KEY: 'onspTinderAppCounter_v1', // カウンターは廃止だがキーは残す
        WEAK_POINTS_KEY: config.STORAGE_KEYS.weakPoints,
        SHIKOSHIKO_SETTINGS_KEY: config.STORAGE_KEYS.settings, // 設定キー名変更
        TAG_STORAGE_KEY: 'onspTinderAppImageTags_v1', // タグのキー
        LIKED_IMAGES_KEY: config.STORAGE_KEYS.likedImages, // 高評価画像用キー
        isLocalStorageAvailable: function() { try { const k='__t'; localStorage.setItem(k,k); localStorage.removeItem(k); return true; } catch(e){return false;} },
        save: function(k,v){ if(!this.isLocalStorageAvailable())return; try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.error(`LS Save Err (${k}):`,e);} },
        load: function(k,d=null){ if(!this.isLocalStorageAvailable())return d; try{const i=localStorage.getItem(k);return i?JSON.parse(i):d;}catch(e){console.error(`LS Load Err (${k}):`,e);return d;} },
        remove: function(k){ if(!this.isLocalStorageAvailable())return; try{localStorage.removeItem(k);}catch(e){console.error(`LS Remove Err (${k}):`,e);}},
        saveAppSettings: function(s){this.save(this.SHIKOSHIKO_SETTINGS_KEY,s);},
        loadAppSettings: function(){const d={memberWeights:{}}; (config.members||[]).forEach(m=>d.memberWeights[m.name]=3); return this.load(this.SHIKOSHIKO_SETTINGS_KEY,d);},
        saveLikedImages: function(arr){this.save(this.LIKED_IMAGES_KEY,arr);},
        loadLikedImages: function(){return this.load(this.LIKED_IMAGES_KEY,[]);},
        saveWeakPoints: function(s){this.save(this.WEAK_POINTS_KEY, Array.from(s));},
        loadWeakPoints: function(){return new Set(this.load(this.WEAK_POINTS_KEY,[]));},
        saveImageTags: function(t){this.save(this.TAG_STORAGE_KEY,t);},
        loadImageTags: function(){return this.load(this.TAG_STORAGE_KEY,{});}
    },


    async init() {
        if (typeof config === 'undefined') {
            console.error("CRITICAL: 'config' object is NOT defined. Check config.js.");
            alert("CRITICAL ERROR: config.js is not loaded. App cannot start.");
            this.state.config = { members: [], cardSwipeSettings: {}, DATA_FILES: {}, STORAGE_KEYS: {} }; // 最低限のフォールバック
        } else {
            this.state.config = config;
        }
        console.log("ONSP App Initializing (Simplified, Tinder-like)...");

        // グローバルユーティリティを dependencies にも設定 (各モジュールから this.dependencies.utils 等で参照できるように)
        this.dependencies = {
            utils: this.Utils,
            domUtils: this.DOMUtils,
            storage: this.StorageService,
            app: this // 自分自身への参照
        };
        // 他のグローバルオブジェクトも同様に
        window.Utils = this.Utils;
        window.DOMUtils = this.DOMUtils;
        window.StorageService = this.StorageService;


        this.elements.appContainer = this.DOMUtils.qs('body');
        this.elements.settingsModal = this.DOMUtils.qs('#settingsModal');
        this.elements.openSettingsModalButton = this.DOMUtils.qs('#openSettingsModal');
        this.elements.closeSettingsModalButton = this.DOMUtils.qs('#closeSettingsModal');
        this.elements.saveSettingsButton = this.DOMUtils.qs('#saveSettingsButton');
        // モードセクションは一つだけなので、直接参照
        this.elements.shikoshikoModeSection = this.DOMUtils.qs('#shikoshikoModeSection');


        // DataHandler の初期化 (await を使用)
        if (typeof DataHandler !== 'undefined' && typeof DataHandler.init === 'function') {
            this.modules.dataHandler = await DataHandler.init(this.state.config);
            // DataHandler のインスタンスを CardUI に渡せるようにする
        } else {
            this.logDependencyError("DataHandler");
            // DataHandler がないと動作しないので、エラー処理
            alert("DataHandlerの読み込みに失敗しました。");
            return;
        }

        // CardUI の初期化 (await を使用するなら DataHandler の後)
        if (typeof CardUI !== 'undefined' && typeof CardUI.init === 'function') {
            // CardUIにDataHandlerとApp自身(通知やテーマ変更用)を渡す
            this.modules.cardUI = await CardUI.init(this.state.config, this.modules.dataHandler, this);
        } else {
            this.logDependencyError("CardUI");
            alert("CardUIの読み込みに失敗しました。");
            return;
        }

        this.loadAppSettings(); // アプリ設定（メンバー出現率など）をロード
        this.setupSettingsModal();
        this.addGlobalEventListeners();

        // 初期表示 (しこしこモードをアクティブに)
        if (this.elements.shikoshikoModeSection) {
            this.DOMUtils.addClass(this.elements.shikoshikoModeSection, 'active');
            this.DOMUtils.toggleDisplay(this.elements.shikoshikoModeSection, true);
        }
        if(this.modules.cardUI && typeof this.modules.cardUI.activate === 'function'){
            this.modules.cardUI.activate(); // CardUIにアクティブ化を通知
        }


        console.log("ONSP App Initialized Successfully (Simplified, Tinder-like).");
    },

    logDependencyError: function(dependencyName) {
        console.error(`${dependencyName} not loaded or defined! App might not work correctly.`);
        return null;
    },

    setupSettingsModal: function() {
        if (!this.elements.settingsModal || !this.elements.openSettingsModalButton || !this.elements.closeSettingsModalButton || !this.elements.saveSettingsButton) {
            console.warn("Settings modal elements not all found, modal setup skipped.");
            return;
        }
        this.DOMUtils.on(this.elements.openSettingsModalButton, 'click', () => this.openSettingsModal());
        this.DOMUtils.on(this.elements.closeSettingsModalButton, 'click', () => this.closeSettingsModal());
        this.DOMUtils.on(this.elements.saveSettingsButton, 'click', () => this.saveSettingsFromModal());
        this.DOMUtils.on(window, 'click', (event) => {
            if (event.target === this.elements.settingsModal) this.closeSettingsModal();
        });
        this.DOMUtils.on(window, 'keydown', (event) => {
            if (event.key === 'Escape' && this.elements.settingsModal.style.display !== 'none') this.closeSettingsModal();
        });
    },

    openSettingsModal: function() {
        if (!this.elements.settingsModal) return;
        // モーダル内のUIに現在の設定値を反映
        const memberSlidersContainer = this.DOMUtils.qs('#modalMemberSliders', this.elements.settingsModal);
        if (this.state.config.members && this.state.config.members.length > 0 && memberSlidersContainer) {
            // UIComponents が app.js にないので、直接DOM操作するか、card_ui.js に移管
            // ここでは card_ui.js にモーダルUI更新メソッドがあると仮定
            if (this.modules.cardUI && typeof this.modules.cardUI.populateSettingsModal === 'function') {
                this.modules.cardUI.populateSettingsModal(this.state.settings.memberWeights);
            }
        }
        this.DOMUtils.toggleDisplay(this.elements.settingsModal, true);
        this.elements.settingsModal.style.opacity = "0"; // transition用
        requestAnimationFrame(() => this.elements.settingsModal.style.opacity = "1");
        document.body.style.overflow = 'hidden';
    },

    closeSettingsModal: function() {
        if (!this.elements.settingsModal) return;
        this.elements.settingsModal.style.opacity = "0";
        setTimeout(() => this.DOMUtils.toggleDisplay(this.elements.settingsModal, false), 300);
        document.body.style.overflow = '';
    },

    saveSettingsFromModal: function() {
        console.log("Saving settings from modal...");
        const newWeights = {};
        const memberSlidersContainer = this.DOMUtils.qs('#modalMemberSliders', this.elements.settingsModal);
        if (memberSlidersContainer) {
            this.DOMUtils.qsa('input[type="range"]', memberSlidersContainer).forEach(slider => {
                if (slider.dataset.memberName) {
                    newWeights[slider.dataset.memberName] = Number(slider.value);
                }
            });
        }
        this.state.settings.memberWeights = newWeights;
        this.StorageService.saveAppSettings(this.state.settings); // StorageServiceを使って保存
        console.log("Settings saved:", this.state.settings);
        this.closeSettingsModal();
        // 設定変更をcardUIに通知してカード再生成などを行う
        if (this.modules.cardUI && typeof this.modules.cardUI.handleSettingsChange === 'function') {
            this.modules.cardUI.handleSettingsChange();
        }
    },

    loadAppSettings: function() {
        const loadedSettings = this.StorageService.loadAppSettings(); // StorageServiceからロード
        // デフォルトのメンバーウェイトをconfigから生成
        const defaultMemberWeights = {};
        (this.state.config.members || []).forEach(member => {
            if (member.name) defaultMemberWeights[member.name] = 3; // デフォルトウェイト
        });
        // ロードした設定とデフォルトをマージ
        this.state.settings.memberWeights = { ...defaultMemberWeights, ...(loadedSettings.memberWeights || {}) };
        console.log("App settings loaded/initialized:", this.state.settings);
    },

    getCurrentSettings: function() { // card_ui.js から設定値を取得するために使用
        return { ...this.state.settings };
    },

    addGlobalEventListeners: function() {
        // グローバルキーダウンイベントは card_ui.js が持つ想定
        // もしapp全体で処理したい場合はここに記述
    },

    applyCardOuterTheme: function(hexColor) { // カードUIモジュールから呼ばれる
        this.state.currentThemeColor = hexColor;
        // カード"外"の背景色（現状は global-bg-color で黒固定）を変更する場合など
        // フィーバーゲージの色などもここで連動させる
        const feverGaugeBar = this.DOMUtils.qs('#feverGaugeBarVertical'); // card_ui.js から移設
        if (feverGaugeBar) {
            feverGaugeBar.style.backgroundColor = hexColor || 'var(--member-accent-color)';
        }
        // ボディの背景や、他のUI要素の色を次のカードのメンバーカラーに連動させる場合
        if (hexColor) {
            // document.body.style.backgroundColor = Utils.adjustBrightness(hexColor, 0.1); // 例: 少し暗くする
        } else {
            // document.body.style.backgroundColor = 'var(--global-bg-color)';
        }
    },

    notifyWeakPointChange: function(relativePath, isNowWeak) {
        // 弱点変更の通知を DataHandler に中継
        if (this.modules.dataHandler && typeof this.modules.dataHandler.updateWeakPointStatus === 'function') {
            // DataHandler側にそのようなメソッドがあれば
            // this.modules.dataHandler.updateWeakPointStatus(relativePath, isNowWeak);
        }
        // CardUIにも通知して、表示中のカードの弱点アイコンを更新する必要があれば
        if (this.modules.cardUI && typeof this.modules.cardUI.updateWeakPointIconOnCurrentCard === 'function') {
            this.modules.cardUI.updateWeakPointIconOnCurrentCard(relativePath, isNowWeak);
        }
    },

    // UIComponents.showNotification を App から呼び出せるようにラップ
    showNotification: function(message, type = 'info', duration = 3000) {
        // UIComponentsがapp.jsに統合されたので直接呼ぶか、ヘルパーとして残す
        const existingNotification = this.DOMUtils.qs('.app-notification');
        if (existingNotification) existingNotification.remove();
        const notificationBar = this.DOMUtils.createElement('div', { class: `app-notification notification-${type}`, role: 'alert' }, [message]);
        notificationBar.style.top = '15px'; notificationBar.style.bottom = 'auto';
        notificationBar.style.left = '50%'; notificationBar.style.transform = 'translateX(-50%)';
        document.body.appendChild(notificationBar);
        setTimeout(() => {
            notificationBar.style.opacity = '0';
            setTimeout(() => { if (notificationBar.parentNode) notificationBar.parentNode.removeChild(notificationBar); }, 500);
        }, duration);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
