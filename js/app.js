// js/app.js

const App = {
    elements: {
        tabNavigation: null,
        tabButtons: [],
        modeSections: [],
        appContainer: null,
        headerTitle: null,
    },
    state: {
        activeTab: '#shikoshikoModeSection',
        currentThemeColor: null,
        config: {},
    },
    modules: {
        shikoshiko: null,
        counter: null,
        gallery: null,
    },

    init: function() {
        if (typeof config === 'undefined') {
            console.error("CRITICAL: 'config' object is NOT defined in the global scope. Check config.js loading and definition.");
            alert("CRITICAL ERROR: config.js is not loaded or defined correctly. Application cannot start.");
            this.state.config = { members: [] }; // Fallback
        } else {
            console.log("SUCCESS: 'config' object IS defined globally."); // Content log removed for brevity here, but useful for debugging
            this.state.config = config;
        }

        console.log("ONSP App Initializing...");

        this.Utils = typeof Utils !== 'undefined' ? Utils : this.logDependencyError("Utils");
        this.StorageService = typeof StorageService !== 'undefined' ? StorageService : this.logDependencyError("StorageService");
        this.DOMUtils = typeof DOMUtils !== 'undefined' ? DOMUtils : this.logDependencyError("DOMUtils");
        this.UIComponents = typeof UIComponents !== 'undefined' ? UIComponents : this.logDependencyError("UIComponents");

        this.ShikoshikoMode = typeof ShikoshikoMode !== 'undefined' ? ShikoshikoMode : this.logDependencyError("ShikoshikoMode");
        this.CounterMode = typeof CounterMode !== 'undefined' ? CounterMode : this.logDependencyError("CounterMode");
        this.GalleryMode = typeof GalleryMode !== 'undefined' ? GalleryMode : this.logDependencyError("GalleryMode");

        this.elements.tabNavigation = this.DOMUtils.qs('#tabNavigation');
        if (this.elements.tabNavigation) {
            this.elements.tabButtons = this.DOMUtils.qsa('.tab-button', this.elements.tabNavigation);
        } else {
            console.error("Tab navigation element ('#tabNavigation') not found.");
            this.elements.tabButtons = [];
        }
        this.elements.modeSections = this.DOMUtils.qsa('.mode-section');
        this.elements.appContainer = this.DOMUtils.qs('body');
        this.elements.headerTitle = this.DOMUtils.qs('.app-header h1');

        if (this.ShikoshikoMode && typeof this.ShikoshikoMode.init === 'function') {
            this.modules.shikoshiko = Object.create(this.ShikoshikoMode);
            this.modules.shikoshiko.init(this, this.state.config);
        }
        if (this.CounterMode && typeof this.CounterMode.init === 'function') {
            this.modules.counter = Object.create(this.CounterMode);
            this.modules.counter.init(this, this.state.config);
        }
        if (this.GalleryMode && typeof this.GalleryMode.init === 'function') {
            this.modules.gallery = Object.create(this.GalleryMode);
            this.modules.gallery.init(this, this.state.config);
        }

        if (this.modules.shikoshiko && this.modules.counter && typeof this.modules.shikoshiko.setCounterModeDependency === 'function') {
            this.modules.shikoshiko.setCounterModeDependency(this.modules.counter);
        }

        this.addEventListeners();
        this.switchToTab(this.state.activeTab);

        console.log("ONSP App Initialized Successfully.");
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
                this.modules[activeModuleName].handleGlobalKeydown(event);
            }
        });
    },

    switchToTab: function(targetId) {
        if (!targetId || typeof targetId !== 'string' || !targetId.startsWith('#')) {
            console.warn("Invalid targetId for switchToTab:", targetId);
            return;
        }

        const prevModuleName = this.getModuleNameFromId(this.state.activeTab);
        if (prevModuleName && this.modules[prevModuleName] && typeof this.modules[prevModuleName].deactivate === 'function') {
            this.modules[prevModuleName].deactivate();
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
            this.applyTheme(null);
            if (this.elements.appContainer) {
                this.DOMUtils.removeClass(this.elements.appContainer, 'shikoshiko-active');
                this.DOMUtils.addClass(this.elements.appContainer, 'no-pulse');
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
                const mainBgLightness = Math.min(97, l + (100 - l) * 0.85);
                const contentBgLightness = Math.min(95, l + (100 - l) * 0.75);
                const textLightness = Math.max(10, l * (l > 65 ? 0.2 : 0.4));
                const buttonText = (l >= 60 && s > 10) ? '#000000' : '#ffffff';

                rootStyle.setProperty('--member-accent-color', hexColor);
                rootStyle.setProperty('--member-main-bg', this.Utils.hslToCssString(h, s * 0.25, mainBgLightness));
                rootStyle.setProperty('--member-content-bg', this.Utils.hslToCssString(h, s * 0.40, contentBgLightness));
                rootStyle.setProperty('--member-text-color', this.Utils.hslToCssString(h, s * 1.1, textLightness));
                rootStyle.setProperty('--member-button-text-color', buttonText);
                rootStyle.setProperty('--pulse-hue', h.toFixed(0));
                rootStyle.setProperty('--pulse-sat', s.toFixed(0) + '%');
                rootStyle.setProperty('--pulse-light', Math.min(90, l + 15).toFixed(0) + '%');
                rootStyle.setProperty('--member-accent-color-rgb', rgb.join(', '));
            } else {
                console.warn(`Invalid hexColor for theme: ${hexColor}`);
                this.applyTheme(null);
                return;
            }
        } else {
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

        if (this.elements.headerTitle) {
            this.elements.headerTitle.style.color = hexColor ? 'var(--member-accent-color)' : 'var(--default-accent-color)';
        }
    },

    notifyWeakPointChange: function(relativePath, isNowWeak) {
        if (this.modules.gallery && typeof this.modules.gallery.notifyWeakPointChanged === 'function') {
            this.modules.gallery.notifyWeakPointChanged(relativePath, isNowWeak);
        }
        // 必要であれば他のモードにも通知
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
