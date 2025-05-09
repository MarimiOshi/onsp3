// js/app.js

const App = {
    elements: {
        tabNavigation: null,
        tabButtons: [],
        modeSections: [],
        appContainer: null, // body またはメインのラッパー要素
    },
    state: {
        activeTab: '#shikoshikoModeSection', // 初期表示タブ
        currentThemeColor: null,
        config: {}, // config.js の内容を保持
    },
    modules: { // 各モードのインスタンスを保持
        shikoshiko: null,
        counter: null,
        gallery: null,
    },

    init: function() {
        console.log("ONSP App Initializing...");

        // config.js のグローバル変数を取得
        this.state.config = typeof config !== 'undefined' ? config : {};
        // config_secret.js のキーもここでチェック・保持できるが、フロントでの直接利用は非推奨

        // 依存関係の解決 (グローバルに公開されたオブジェクトを直接参照)
        // 本来は import/export を使うか、依存性注入の仕組みを整えるのが望ましい
        this.Utils = typeof Utils !== 'undefined' ? Utils : console.error("Utils not loaded!");
        this.StorageService = typeof StorageService !== 'undefined' ? StorageService : console.error("StorageService not loaded!");
        this.DOMUtils = typeof DOMUtils !== 'undefined' ? DOMUtils : console.error("DOMUtils not loaded!");
        this.UIComponents = typeof UIComponents !== 'undefined' ? UIComponents : console.error("UIComponents not loaded!");

        this.ShikoshikoMode = typeof ShikoshikoMode !== 'undefined' ? ShikoshikoMode : console.error("ShikoshikoMode not loaded!");
        this.CounterMode = typeof CounterMode !== 'undefined' ? CounterMode : console.error("CounterMode not loaded!");
        this.GalleryMode = typeof GalleryMode !== 'undefined' ? GalleryMode : console.error("GalleryMode not loaded!");


        this.elements.tabNavigation = this.DOMUtils.qs('#tabNavigation');
        this.elements.tabButtons = this.DOMUtils.qsa('.tab-button', this.elements.tabNavigation);
        this.elements.modeSections = this.DOMUtils.qsa('.mode-section'); // HTMLの各モードのコンテナセクション
        this.elements.appContainer = this.DOMUtils.qs('body'); // テーマ適用対象

        // モジュールの初期化
        if (this.ShikoshikoMode) {
            this.modules.shikoshiko = Object.create(this.ShikoshikoMode);
            this.modules.shikoshiko.init(this, this.state.config);
        }
        if (this.CounterMode) {
            this.modules.counter = Object.create(this.CounterMode);
            this.modules.counter.init(this, this.state.config);
        }
        if (this.GalleryMode) {
            this.modules.gallery = Object.create(this.GalleryMode);
            this.modules.gallery.init(this, this.state.config);
        }

        // しこしこモードがカウンターモードに依存する場合の設定
        if (this.modules.shikoshiko && this.modules.counter) {
            this.modules.shikoshiko.setCounterModeDependency(this.modules.counter);
        }


        this.addEventListeners();
        this.switchToTab(this.state.activeTab); // 初期タブ表示

        console.log("ONSP App Initialized Successfully.");
    },

    addEventListeners: function() {
        this.elements.tabButtons.forEach(button => {
            this.DOMUtils.on(button, 'click', (event) => {
                const targetId = event.currentTarget.dataset.tabTarget;
                this.switchToTab(targetId);
            });
        });

        // グローバルキーダウンイベントの処理 (特定のモードにディスパッチ)
        this.DOMUtils.on(document, 'keydown', (event) => {
            if (this.state.activeTab === '#shikoshikoModeSection' && this.modules.shikoshiko) {
                this.modules.shikoshiko.handleGlobalKeydown(event);
            }
            // 他のモードでグローバルキーイベントが必要ならここに追加
        });
    },

    switchToTab: function(targetId) {
        if (!targetId) return;

        // 前のアクティブタブのモジュールを非アクティブ化
        if (this.state.activeTab && this.modules[this.getModuleNameFromId(this.state.activeTab)]) {
            this.modules[this.getModuleNameFromId(this.state.activeTab)].deactivate();
        }

        this.state.activeTab = targetId;

        this.elements.tabButtons.forEach(button => {
            this.DOMUtils.toggleClass(button, 'active', button.dataset.tabTarget === targetId);
        });

        this.elements.modeSections.forEach(section => {
            this.DOMUtils.toggleDisplay(section, section.id === targetId.substring(1)); // #を除いたIDと比較
        });

        // 新しいアクティブタブのモジュールをアクティブ化
        if (this.modules[this.getModuleNameFromId(targetId)]) {
            this.modules[this.getModuleNameFromId(targetId)].activate();
        } else {
            // モジュールが存在しない場合 (HTML構造とJSモジュール名が一致しないなど)
            this.applyTheme(null); // デフォルトテーマに戻す
            this.DOMUtils.removeClass(this.elements.appContainer, 'shikoshiko-active');
            this.DOMUtils.addClass(this.elements.appContainer, 'no-pulse');
        }
    },

    /**
     * タブIDから対応するモジュール名を取得するヘルパー
     * (例: '#shikoshikoModeSection' -> 'shikoshiko')
     */
    getModuleNameFromId: function(tabId) {
        if (!tabId || !tabId.startsWith('#') || !tabId.endsWith('Section')) return null;
        const baseName = tabId.substring(1, tabId.length - 'Section'.length);
        // キャメルケースに変換 (shikoshikoMode -> shikoshiko)
        return baseName.charAt(0).toLowerCase() + baseName.slice(1).replace('Mode', '');
    },

    /**
     * アプリケーション全体のテーマカラーを適用する
     * @param {string|null} hexColor - 適用するHEXカラーコード、またはnullでデフォルトに戻す
     */
    applyTheme: function(hexColor) {
        const rootStyle = document.documentElement.style;
        this.state.currentThemeColor = hexColor;

        if (hexColor) {
            const hsl = this.Utils.hexToHsl(hexColor);
            if (hsl) {
                const [h, s, l] = hsl;
                const rgb = this.Utils.hslToRgb(h,s,l);

                // メイン背景、コンテンツ背景、テキスト色などをメンバーカラーに基づいて調整
                // しこしこモードの背景は pulse アニメーションでも使われる
                const mainBgLightness = Math.min(97, l + (100 - l) * 0.85);
                const contentBgLightness = Math.min(95, l + (100 - l) * 0.75);
                const textLightness = Math.max(10, l * (l > 65 ? 0.2 : 0.4)); // 明るい色なら濃い文字、暗い色なら薄い文字
                const buttonText = (l >= 60 && s > 10) ? '#000000' : '#ffffff'; // 背景色に応じてボタン文字色変更

                rootStyle.setProperty('--member-accent-color', hexColor);
                rootStyle.setProperty('--member-main-bg', this.Utils.hslToCssString(h, s * 0.25, mainBgLightness));
                rootStyle.setProperty('--member-content-bg', this.Utils.hslToCssString(h, s * 0.40, contentBgLightness));
                rootStyle.setProperty('--member-text-color', this.Utils.hslToCssString(h, s * 1.1, textLightness));
                rootStyle.setProperty('--member-button-text-color', buttonText);

                // パルスアニメーション用
                rootStyle.setProperty('--pulse-hue', h.toFixed(0));
                rootStyle.setProperty('--pulse-sat', s.toFixed(0) + '%');
                rootStyle.setProperty('--pulse-light', Math.min(90, l + 15).toFixed(0) + '%');
                rootStyle.setProperty('--member-accent-color-rgb', rgb.join(', '));

            }
        } else { // デフォルトテーマに戻す
            rootStyle.removeProperty('--member-accent-color');
            rootStyle.removeProperty('--member-main-bg');
            rootStyle.removeProperty('--member-content-bg');
            rootStyle.removeProperty('--member-text-color');
            rootStyle.removeProperty('--member-button-text-color');
            rootStyle.removeProperty('--pulse-hue');
            rootStyle.removeProperty('--pulse-sat');
            rootStyle.removeProperty('--pulse-light');
            rootStyle.removeProperty('--member-accent-color-rgb');
        }
        // ヘッダーのタイトル色も更新
        const headerTitle = this.DOMUtils.qs('.app-header h1');
        if(headerTitle) headerTitle.style.color = hexColor || 'var(--default-accent-color)';
    },

    /**
     * 弱点情報の変更をギャラリーモードに通知する
     * (しこしこモードから呼び出される)
     */
    notifyWeakPointChange: function(relativePath, isNowWeak) {
        if (this.modules.gallery && typeof this.modules.gallery.notifyWeakPointChanged === 'function') {
            this.modules.gallery.notifyWeakPointChanged(relativePath, isNowWeak);
        }
    }
};

// DOMContentLoadedイベントでアプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});