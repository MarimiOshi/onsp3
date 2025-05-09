// js/app.js

const App = {
    elements: {
        tabNavigation: null,
        tabButtons: [], // しこしこ、カウンターの2つになる
        modeSections: [],
        appContainer: null,
    },
    state: {
        activeTab: '#shikoshikoModeSection', // 初期表示タブ
        currentThemeColor: null,
        config: {}, // config.js の内容を保持
    },
    modules: { // 各モードのインスタンスを保持
        shikoshiko: null,
        counter: null,
        // gallery: null, // ギャラリーモジュール削除
    },

    init: function() {
        if (typeof config === 'undefined') {
            console.error("CRITICAL: 'config' object is NOT defined in the global scope. Check config.js loading and definition.");
            alert("CRITICAL ERROR: config.js is not loaded or defined correctly. Application cannot start.");
            this.state.config = { members: [] }; // フォールバック
        } else {
            // console.log("SUCCESS: 'config' object IS defined globally."); // デバッグ時のみ有効化
            this.state.config = config;
        }
        console.log("ONSP App Initializing (Features Removed)...");

        // 依存関係の解決
        this.Utils = typeof Utils !== 'undefined' ? Utils : this.logDependencyError("Utils");
        this.StorageService = typeof StorageService !== 'undefined' ? StorageService : this.logDependencyError("StorageService");
        this.DOMUtils = typeof DOMUtils !== 'undefined' ? DOMUtils : this.logDependencyError("DOMUtils");
        this.UIComponents = typeof UIComponents !== 'undefined' ? UIComponents : this.logDependencyError("UIComponents");

        this.ShikoshikoMode = typeof ShikoshikoMode !== 'undefined' ? ShikoshikoMode : this.logDependencyError("ShikoshikoMode");
        this.CounterMode = typeof CounterMode !== 'undefined' ? CounterMode : this.logDependencyError("CounterMode");
        // this.GalleryMode = typeof GalleryMode !== 'undefined' ? GalleryMode : this.logDependencyError("GalleryMode"); // 削除

        // DOM要素取得
        this.elements.tabNavigation = this.DOMUtils.qs('#tabNavigation');
        if (this.elements.tabNavigation) {
            this.elements.tabButtons = this.DOMUtils.qsa('.tab-button', this.elements.tabNavigation);
        } else {
            console.error("Global tab navigation ('#tabNavigation') not found.");
            this.elements.tabButtons = [];
        }
        this.elements.modeSections = this.DOMUtils.qsa('.mode-section');
        this.elements.appContainer = this.DOMUtils.qs('body');

        // モジュールの初期化
        if (this.ShikoshikoMode && typeof this.ShikoshikoMode.init === 'function') {
            this.modules.shikoshiko = Object.create(this.ShikoshikoMode);
            this.modules.shikoshiko.init(this, this.state.config);
        }
        if (this.CounterMode && typeof this.CounterMode.init === 'function') {
            this.modules.counter = Object.create(this.CounterMode);
            this.modules.counter.init(this, this.state.config);
        }
        // GalleryModeの初期化は削除

        // モジュール間の依存関係設定
        if (this.modules.shikoshiko && this.modules.counter && typeof this.modules.shikoshiko.setCounterModeDependency === 'function') {
            this.modules.shikoshiko.setCounterModeDependency(this.modules.counter);
        }

        // しこしこモードの設定モーダル初期化
        if (this.UIComponents && this.modules.shikoshiko) {
            this.UIComponents.setupModal(
                '#shikoshikoSettingsModal',
                '#openShikoshikoSettingsModal',
                '#closeShikoshikoSettingsModal',
                () => { // 保存ボタンコールバック
                    if (this.modules.shikoshiko && typeof this.modules.shikoshiko.saveModalSettings === 'function') {
                        this.modules.shikoshiko.saveModalSettings();
                    }
                }
            );
        }

        this.addEventListeners();
        this.switchToTab(this.state.activeTab); // 初期タブ表示

        console.log("ONSP App Initialized Successfully (Features Removed).");
    },

    logDependencyError: function(dependencyName) {
        console.error(`${dependencyName} not loaded or defined! Application might not work correctly.`);
        return null;
    },

    addEventListeners: function() {
        if (this.elements.tabButtons.length === 0) {
            console.warn("No tab buttons found to attach listeners.");
            return;
        }
        this.elements.tabButtons.forEach(button => {
            this.DOMUtils.on(button, 'click', (event) => {
                const targetId = event.currentTarget.dataset.tabTarget;
                if (targetId) {
                    this.switchToTab(targetId);
                } else {
                    console.warn("Clicked tab button has no 'data-tab-target' attribute.", event.currentTarget);
                }
            });
        });

        this.DOMUtils.on(document, 'keydown', (event) => {
            const activeModuleName = this.getModuleNameFromId(this.state.activeTab);
            if (activeModuleName && this.modules[activeModuleName] && typeof this.modules[activeModuleName].handleGlobalKeydown === 'function') {
                let modalVisible = false;
                if (this.modules.shikoshiko && this.modules.shikoshiko.elements.settingsModal) {
                    modalVisible = this.modules.shikoshiko.elements.settingsModal.style.display !== 'none';
                }
                if (!modalVisible || event.key === 'Escape') { // ESCはモーダル側でも処理するが、ここでも考慮
                    this.modules[activeModuleName].handleGlobalKeydown(event);
                }
            }
        });
    },

    switchToTab: function(targetId) {
        if (!targetId || typeof targetId !== 'string' || !targetId.startsWith('#')) {
            console.warn("Invalid targetId for switchToTab:", targetId);
            return;
        }

        const prevModuleName = this.getModuleNameFromId(this.state.activeTab);
        if (this.state.activeTab !== targetId) { // タブが実際に変更される場合のみ実行
            if (prevModuleName && this.modules[prevModuleName] && typeof this.modules[prevModuleName].deactivate === 'function') {
                this.modules[prevModuleName].deactivate();
            }
        }

        this.state.activeTab = targetId;

        this.elements.tabButtons.forEach(button => {
            this.DOMUtils.toggleClass(button, 'active', button.dataset.tabTarget === targetId);
        });

        this.elements.modeSections.forEach(section => {
            this.DOMUtils.toggleDisplay(section, section.id === targetId.substring(1));
        });

        const currentModuleName = this.getModuleNameFromId(targetId);
        if (currentModuleName && this.modules[currentModuleName] && typeof this.modules[currentModuleName].activate === 'function') {
            this.modules[currentModuleName].activate();
        } else {
            console.warn(`Module for tab ${targetId} (module name: ${currentModuleName}) not found or activate function missing.`);
            this.applyTheme(null); // デフォルトテーマに戻す
            if (this.elements.appContainer) {
                this.DOMUtils.removeClass(this.elements.appContainer, 'shikoshiko-active');
                // this.DOMUtils.addClass(this.elements.appContainer, 'no-pulse'); // 背景パルス廃止のため不要
            }
        }
    },

    getModuleNameFromId: function(tabId) {
        if (!tabId || typeof tabId !== 'string' || !tabId.startsWith('#')) return null;
        const baseName = tabId.substring(1).replace(/Section$/, '');
        if (baseName.endsWith('Mode')) {
             return baseName.charAt(0).toLowerCase() + baseName.slice(1, -4);
        }
        return baseName.charAt(0).toLowerCase() + baseName.slice(1);
    },

    applyTheme: function(hexColor) {
        if (!this.Utils || !this.DOMUtils || !this.elements.appContainer) {
            console.warn("Cannot apply theme: Missing dependencies or appContainer element.");
            return;
        }
        const rootStyle = document.documentElement.style;
        this.state.currentThemeColor = hexColor;

        if (hexColor) {
            const hsl = this.Utils.hexToHsl(hexColor);
            if (hsl) {
                const [h, s, l] = hsl;
                const rgb = this.Utils.hslToRgb(h,s,l);
                // しこしこモードのBOX1背景は黒固定になったため、--member-main-bg の役割は限定的
                // セリフエリアなどのコンテンツ背景やアクセントカラーに使用
                const contentBgLightness = Math.min(95, l + (100 - l) * (true ? 0.15 : 0.75)); // 暗い背景上のコンテンツは少し明るく
                const textLightness = Math.max(10, l * (l > 65 ? 0.2 : 0.7));
                const buttonText = (l >= 60 && s > 10 && !(this.state.activeTab === '#shikoshikoModeSection')) ? '#000000' : '#ffffff'; // しこしこ以外は明るい背景想定

                rootStyle.setProperty('--member-accent-color', hexColor);
                rootStyle.setProperty('--member-content-bg', this.Utils.hslToCssString(h, s * 0.40, contentBgLightness));
                rootStyle.setProperty('--member-text-color', this.Utils.hslToCssString(h, s * 1.1, textLightness));
                rootStyle.setProperty('--member-button-text-color', buttonText);
                rootStyle.setProperty('--member-accent-color-rgb', rgb.join(', '));
                // 背景パルス関連のCSS変数設定は削除
            } else {
                console.warn(`Invalid hexColor for theme: ${hexColor}`);
                this.applyTheme(null); // 無効な場合はデフォルトに戻す
                return;
            }
        } else { // デフォルトテーマに戻す
            rootStyle.removeProperty('--member-accent-color');
            rootStyle.removeProperty('--member-content-bg');
            rootStyle.removeProperty('--member-text-color');
            rootStyle.removeProperty('--member-button-text-color');
            rootStyle.removeProperty('--member-accent-color-rgb');
            // 背景パルス関連のCSS変数設定は削除
        }
        // ヘッダータイトルは削除されたので、その更新処理も不要
    },

    notifyWeakPointChange: function(relativePath, isNowWeak) {
        // ギャラリーモードが廃止されたので、ギャラリーへの通知は不要
        if (this.modules.shikoshiko && typeof this.modules.shikoshiko.updateWeakPointButtonState === 'function') {
            // しこしこモードが表示中で、かつ該当画像が表示されていればボタン状態を更新
            if (this.modules.shikoshiko.state.isActive &&
                this.modules.shikoshiko.elements.weakPointButton &&
                this.modules.shikoshiko.elements.weakPointButton.dataset.relpath === relativePath) {
                this.modules.shikoshiko.updateWeakPointButtonState();
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
