// js/modes/shikoshiko.js

const ShikoshikoMode = {
    elements: {
        section: null,
        openSettingsModalButton: null,
        gameArea: null,
        memberProfileIcon: null,
        weakPointButton: null,
        memberImageContainer: null, memberImage: null,
        imageTagsContainer: null, memberQuoteDisplay: null,
        shikoAnimationContainer: null, saoImage: null, shikoshikoAnimationImage: null,
        controlsArea: null, startButton: null, finishButton: null, skipButton: null,

        settingsModal: null, closeModalButton: null, saveSettingsButton: null,
        modalMemberSlidersContainer: null,
        // modalPulseBrightnessSlider: null, modalPulseBrightnessValue: null, // 廃止
        modalFixedBpmInput: null,
        modalAutoSkipToggle: null,        // 新規追加
        modalWeakPointOnlyToggle: null, // 新規追加
    },
    state: {
        isActive: false,
        gameRunning: true,
        isPaused: false,
        settings: {
            memberWeights: {},
            // pulseBrightness: 3, // 廃止
            fixedBpm: 120,
            autoSkipEnabled: true,     // 新規追加: 自動スキップON/OFF (デフォルトON)
            weakPointOnlyEnabled: false, // 新規追加: 弱点画像のみ (デフォルトOFF)
        },
        currentBPM: 120,
        imageIntervalId: null,
        currentMember: null,
        currentEROImages: [],       // 現在の表示対象ERO画像リスト
        allMemberEROImages: {},   // 全メンバーの全ERO画像リストをキャッシュ { memberName: [path1, path2,...] }
        currentEROImageIndex: 0,
        metronomeAudioContext: null,
        metronomeSoundBuffers: [],
        loadedSoundCount: 0,
        metronomeTimeoutId: null,
        // selectedStickerPath: null, // ステッカー廃止
        // pastedStickers: {},      // ステッカー廃止
        memberQuotes: {},
        imageTags: {},
        touchStartX: 0, touchEndX: 0, swipeThreshold: 50,
    },
    config: {
        members: [],
        imageSlideInterval: 5000,
        soundFilePaths: [],
        // stickerImagePaths: [], // ステッカー廃止
        // stickerBaseHue: 0,     // ステッカー廃止
        serifCsvPath: 'data/ONSP_セリフ.csv',
        quoteTagDelimiter: '|',
    },
    dependencies: {
        app: null, storage: null, utils: null, domUtils: null, uiComponents: null, counterMode: null,
    },

    init: function(appInstance, initialConfig) {
        this.dependencies.app = appInstance;
        this.dependencies.storage = StorageService;
        this.dependencies.utils = Utils;
        this.dependencies.domUtils = DOMUtils;
        this.dependencies.uiComponents = UIComponents;
        console.log("Initializing Shikoshiko Mode (New Options, No Start/End)...");

        this.elements.section = this.dependencies.domUtils.qs('#shikoshikoModeSection');
        this.elements.openSettingsModalButton = this.dependencies.domUtils.qs('#openShikoshikoSettingsModal');
        this.elements.settingsModal = this.dependencies.domUtils.qs('#shikoshikoSettingsModal');
        this.elements.closeModalButton = this.dependencies.domUtils.qs('#closeShikoshikoSettingsModal');
        this.elements.saveSettingsButton = this.dependencies.domUtils.qs('#saveShikoshikoSettingsButton');
        this.elements.modalMemberSlidersContainer = this.dependencies.domUtils.qs('#modalShikoshikoMemberSliders');
        this.elements.modalFixedBpmInput = this.dependencies.domUtils.qs('#modalFixedBpmInput');
        this.elements.modalAutoSkipToggle = this.dependencies.domUtils.qs('#modalAutoSkipToggle');
        this.elements.modalWeakPointOnlyToggle = this.dependencies.domUtils.qs('#modalWeakPointOnlyToggle');

        this.elements.gameArea = this.dependencies.domUtils.qs('.shikoshiko-box1');
        this.elements.memberProfileIcon = this.dependencies.domUtils.qs('#shikoshikoMemberProfileIcon');
        this.elements.weakPointButton = this.dependencies.domUtils.qs('#shikoshikoWeakPointButton');
        this.elements.memberImageContainer = this.dependencies.domUtils.qs('#shikoshikoMemberImageContainer');
        this.elements.memberImage = this.dependencies.domUtils.qs('#shikoshikoMemberImage');
        this.elements.imageTagsContainer = this.dependencies.domUtils.qs('#shikoshikoImageTagsContainer');
        this.elements.memberQuoteDisplay = this.dependencies.domUtils.qs('#shikoshikoMemberQuote');
        this.elements.shikoAnimationContainer = this.dependencies.domUtils.qs('#shikoAnimationContainer');
        this.elements.saoImage = this.dependencies.domUtils.qs('#saoImage');
        this.elements.shikoshikoAnimationImage = this.dependencies.domUtils.qs('#shikoshikoAnimationImage');
        this.elements.controlsArea = this.dependencies.domUtils.qs('#shikoshikoControlsArea');
        this.elements.startButton = this.dependencies.domUtils.qs('#shikoshikoStartButton');
        this.elements.finishButton = this.dependencies.domUtils.qs('#shikoshikoFinishButton');
        this.elements.skipButton = this.dependencies.domUtils.qs('#shikoshikoSkipButton');

        if (initialConfig.members) {
            this.config.members = initialConfig.members;
            this.cacheAllMemberEROImages(); // 全メンバーのERO画像をキャッシュ
        }
        if (initialConfig.shikoshikoDefaultSettings) {
            const sds = initialConfig.shikoshikoDefaultSettings;
            if (sds.imageSlideInterval !== undefined) this.config.imageSlideInterval = sds.imageSlideInterval;
            if (sds.soundFilePaths) this.config.soundFilePaths = sds.soundFilePaths;
        }
        if (initialConfig.SERIF_CSV_PATH) this.config.serifCsvPath = initialConfig.SERIF_CSV_PATH;
        if (initialConfig.QUOTE_TAG_DELIMITER) this.config.quoteTagDelimiter = initialConfig.QUOTE_TAG_DELIMITER;

        this.loadSettings();
        this.loadImageTags();
        this.loadMemberQuotes();

        this.initModalUI();
        this.addEventListeners();
        this.initAudio();
        this.loadSounds();

        this.state.gameRunning = true;
        this.state.isPaused = false;
        this.applyFixedBpm();
        console.log("Shikoshiko Mode Initialized (New Options, Auto-Start).");
    },

    cacheAllMemberEROImages: function() {
        this.state.allMemberEROImages = {};
        (this.config.members || []).forEach(member => {
            if (member && member.name && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                this.state.allMemberEROImages[member.name] = [];
                const eroFolder = member.imageFolders.ero;
                for (let i = 1; i <= eroFolder.imageCount; i++) {
                    const relativePath = `${member.name}/ero/${i}.jpg`;
                    this.state.allMemberEROImages[member.name].push({
                        path: `${eroFolder.path}${i}.jpg`,
                        relativePath: relativePath
                    });
                }
            }
        });
    },

    initModalUI: function() {
        if (!this.elements.settingsModal) return;
        if (this.config.members && this.config.members.length > 0 && this.elements.modalMemberSlidersContainer) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#modalShikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights,() => {}
            );
        } else {
            if(this.elements.modalMemberSlidersContainer) this.elements.modalMemberSlidersContainer.innerHTML = "<p>メンバーデータがありません。</p>";
        }
        // 背景パルスUI削除
    },

    addEventListeners: function() {
        const du = this.dependencies.domUtils;
        if (this.elements.startButton) du.on(this.elements.startButton, 'click', () => this.togglePauseGame());
        if (this.elements.finishButton) du.on(this.elements.finishButton, 'click', () => this.handleFinishClick());
        if (this.elements.skipButton) du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());
        if (this.elements.weakPointButton) du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());
        if (this.elements.memberImageContainer) {
            du.on(this.elements.memberImageContainer, 'touchstart', (event) => this.handleTouchStart(event), { passive: true });
            du.on(this.elements.memberImageContainer, 'touchmove', (event) => this.handleTouchMove(event), { passive: false });
            du.on(this.elements.memberImageContainer, 'touchend', (event) => this.handleTouchEnd(event));
        }
        if (this.elements.openSettingsModalButton) du.on(this.elements.openSettingsModalButton, 'click', () => this.openSettingsModal());
        if (this.elements.closeModalButton) du.on(this.elements.closeModalButton, 'click', () => this.closeSettingsModal());
        if (this.elements.saveSettingsButton) du.on(this.elements.saveSettingsButton, 'click', () => this.saveModalSettings());
    },

    openSettingsModal: function() {
        if (!this.elements.settingsModal || !this.dependencies.uiComponents) return;
        if (this.elements.modalMemberSlidersContainer) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#modalShikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights,() => {}
            );
        }
        if (this.elements.modalFixedBpmInput) this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;
        if (this.elements.modalAutoSkipToggle) this.elements.modalAutoSkipToggle.checked = this.state.settings.autoSkipEnabled;
        if (this.elements.modalWeakPointOnlyToggle) this.elements.modalWeakPointOnlyToggle.checked = this.state.settings.weakPointOnlyEnabled;

        this.dependencies.uiComponents.openModal('#shikoshikoSettingsModal');
    },
    closeSettingsModal: function() {
        if (!this.elements.settingsModal || !this.dependencies.uiComponents) return;
        this.dependencies.uiComponents.closeModal('#shikoshikoSettingsModal');
    },
    saveModalSettings: function() {
        if (this.elements.modalMemberSlidersContainer) {
            this.dependencies.domUtils.qsa('input[type="range"]', this.elements.modalMemberSlidersContainer).forEach(slider => {
                if (slider.dataset.memberName) this.state.settings.memberWeights[slider.dataset.memberName] = Number(slider.value);
            });
        }
        if (this.elements.modalFixedBpmInput) {
            const newBpm = parseInt(this.elements.modalFixedBpmInput.value, 10);
            if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) this.state.settings.fixedBpm = newBpm;
            else if (this.elements.modalFixedBpmInput) this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;
        }
        if (this.elements.modalAutoSkipToggle) this.state.settings.autoSkipEnabled = this.elements.modalAutoSkipToggle.checked;
        if (this.elements.modalWeakPointOnlyToggle) this.state.settings.weakPointOnlyEnabled = this.elements.modalWeakPointOnlyToggle.checked;

        this.applyFixedBpm();
        this.saveSettings();
        this.closeSettingsModal();
        if (this.state.gameRunning && !this.state.isPaused) {
            this.updateShikoAnimationSpeed();
            this.scheduleMetronomeSound();
            this.setupImageInterval(); // 自動スキップ設定を反映してインターバル再設定
        }
    },

    loadSettings: function() {
        const loadedSettings = this.dependencies.storage.loadShikoshikoSettings();
        const defaultMemberWeights = {};
        if (this.config.members && Array.isArray(this.config.members)) {
            this.config.members.forEach(member => { if (member && member.name) defaultMemberWeights[member.name] = 3; });
        }
        const configDefaultBpm = (this.config.shikoshikoDefaultSettings && this.config.shikoshikoDefaultSettings.fixedBpm !== undefined)
            ? this.config.shikoshikoDefaultSettings.fixedBpm : 120;

        const defaultBaseSettings = {
            memberWeights: defaultMemberWeights,
            fixedBpm: configDefaultBpm,
            autoSkipEnabled: true,
            weakPointOnlyEnabled: false,
        };
        this.state.settings = { ...defaultBaseSettings, ...loadedSettings };
        if (loadedSettings && loadedSettings.memberWeights) this.state.settings.memberWeights = { ...defaultMemberWeights, ...loadedSettings.memberWeights };
        else this.state.settings.memberWeights = defaultMemberWeights;
        this.state.settings.fixedBpm = loadedSettings.fixedBpm !== undefined ? loadedSettings.fixedBpm : configDefaultBpm;
        this.state.settings.autoSkipEnabled = loadedSettings.autoSkipEnabled !== undefined ? loadedSettings.autoSkipEnabled : true;
        this.state.settings.weakPointOnlyEnabled = loadedSettings.weakPointOnlyEnabled !== undefined ? loadedSettings.weakPointOnlyEnabled : false;

        this.state.currentBPM = this.state.settings.fixedBpm;
    },
    saveSettings: function() {
        this.dependencies.storage.saveShikoshikoSettings(this.state.settings);
    },
    applyFixedBpm: function() {
        this.state.currentBPM = this.state.settings.fixedBpm;
        this.updateShikoAnimationSpeed();
    },

    loadImageTags: function() { this.state.imageTags = this.dependencies.storage.loadImageTags(); },
    loadMemberQuotes: async function() { /* 変更なし */ },
    displayQuoteAndTags: function() { /* 変更なし */ },

    togglePauseGame: function() { /* 変更なし */ },
    handleFinishClick: function() { /* 変更なし */ },

    selectRandomMember: function() { /* 変更なし */ },

    getAvailableEROImagesForMember: function(member) {
        if (!member || !this.state.allMemberEROImages[member.name]) return [];
        let memberImages = this.state.allMemberEROImages[member.name];

        if (this.state.settings.weakPointOnlyEnabled) {
            const weakPoints = this.dependencies.storage.loadWeakPoints();
            memberImages = memberImages.filter(imgInfo => weakPoints.has(imgInfo.relativePath));
        }
        return memberImages;
    },

    nextEROImage: function() {
        if (!this.state.gameRunning || this.state.isPaused) return;

        const selectedMemberData = this.selectRandomMember(); // まずメンバーを選択
        if (!selectedMemberData) {
            this.clearMemberDisplayAndUpdate();
            this.dependencies.app.applyTheme(null);
            this.dependencies.uiComponents.showNotification("表示できるメンバーがいません。", "error");
            this.togglePauseGame(); // エラーなので一時停止
            return;
        }
        this.state.currentMember = selectedMemberData;
        this.dependencies.app.applyTheme(this.state.currentMember.color);

        // 選択されたメンバーの利用可能なERO画像リストを取得
        this.state.currentEROImages = this.getAvailableEROImagesForMember(this.state.currentMember);

        if (this.state.currentEROImages.length === 0) {
            if (this.state.settings.weakPointOnlyEnabled) {
                this.dependencies.uiComponents.showNotification(`${this.state.currentMember.name} の弱点画像がありません。`, "info");
            } else {
                this.dependencies.uiComponents.showNotification(`${this.state.currentMember.name} のERO画像がありません。`, "info");
            }
            // 次のメンバーを試みるか、一時停止するかなどの処理
            this.clearMemberDisplayAndUpdate(); // とりあえず表示クリア
            this.skipCurrentImage(); // 再帰呼び出しになる可能性があるので注意、または別のメンバー選択ロジックへ
            return;
        }

        this.currentEROImageIndex = this.dependencies.utils.getRandomInt(0, this.state.currentEROImages.length - 1);
        const selectedImageInfo = this.state.currentEROImages[this.currentEROImageIndex];
        const imagePath = selectedImageInfo.path;
        const relativePath = selectedImageInfo.relativePath;

        const memberImageElement = this.elements.memberImage;
        if (!memberImageElement) return;

        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }

        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => { memberImageElement.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(memberImageElement, 'image-error'); this.displayQuoteAndTags(); };
        memberImageElement.onload = () => { this.dependencies.domUtils.removeClass(memberImageElement, 'image-error'); this.updateWeakPointButtonState(); /*this.renderPastedStickers();*/ this.displayQuoteAndTags(); };
        this.updateUI();
    },
    skipCurrentImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.nextEROImage(); },

    updateUI: function() { /* 変更なし */ },
    updateShikoAnimationSpeed: function() { /* 変更なし */ }, startShikoAnimation: function() { /* 変更なし */ },
    stopShikoAnimation: function() { /* 変更なし */ },
    pauseShikoAnimationAndSound: function() { /* 変更なし */ },
    resumeShikoAnimationAndSound: function() { /* 変更なし */ },
    initAudio: function() { /* 変更なし */ }, loadSounds: async function() { /* 変更なし */ },
    playMetronomeSound: function() { /* 変更なし */ }, _actualPlaySound: function() { /* 変更なし */ },
    scheduleMetronomeSound: function() { /* 変更なし */ },
    toggleWeakPoint: function() { /* 変更なし */ }, updateWeakPointButtonState: function() { /* 変更なし */ },
    // ステッカー関連メソッド削除
    // loadPastedStickers, savePastedStickers, renderPastedStickers, handleImageContainerClick,
    // clearAllPastedStickersForCurrentImage, updateStickerCursor, deselectSticker

    setupImageInterval: function() { // 自動スキップのON/OFFに応じてインターバルを設定/クリア
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.state.imageIntervalId = null;

        if (this.state.gameRunning && !this.state.isPaused && this.state.settings.autoSkipEnabled) {
            this.state.imageIntervalId = setInterval(() => {
                if (!this.state.isPaused) this.nextEROImage();
            }, this.config.imageSlideInterval);
        }
    },

    activate: function() {
        this.state.isActive = true;
        if (this.elements.section) { this.dependencies.domUtils.addClass(this.elements.section, 'active'); this.dependencies.domUtils.toggleDisplay(this.elements.section, true); }
        this.loadSettings(); this.applyFixedBpm();
        // this.loadPastedStickers(); // 廃止
        this.loadImageTags();
        this.loadMemberQuotes().then(() => {
            if (this.state.gameRunning && this.state.isPaused) {
                this.state.isPaused = false; // 再開時にisPausedをfalseに戻す
                this.resumeGame();
            } else if (this.state.gameRunning && !this.state.isPaused) {
                if (!this.state.currentMember) this.nextEROImage();
                else this.displayQuoteAndTags();
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval(); // 自動スキップ設定を反映
            }
            this.updateUI();
        });
        if (!this.state.currentMember) this.dependencies.app.applyTheme(null);
        // 背景パルス関連クラス操作削除
        // this.deselectSticker(); // 廃止
        console.log("Shikoshiko Mode Activated (New Options).");
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.state.gameRunning && !this.state.isPaused) {
            this.state.isPaused = true; this.pauseShikoAnimationAndSound();
            if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); this.state.imageIntervalId = null;
            this.updateUI(); console.log("Shikoshiko Mode Paused due to tab change.");
        }
        // this.deselectSticker(); // 廃止
        console.log("Shikoshiko Mode Deactivated (or Paused).");
    },
    clearMemberDisplayAndUpdate: function() { this.clearMemberDisplay(); this.updateUI(); },
    clearMemberDisplay: function() {
        if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
        if(this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
        if(this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
        if(this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
        if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
        this.updateWeakPointButtonState();
        // this.renderPastedStickers(); // 廃止
    },
    setCounterModeDependency: function(counterModeInstance) { this.dependencies.counterMode = counterModeInstance; },
    handleTouchStart: function(event) { /* 変更なし */ }, handleTouchMove: function(event) { /* 変更なし */ },
    handleTouchEnd: function(event) { /* 変更なし */ },
    handleGlobalKeydown: function(event) {
        if (!this.state.isActive) return;
        // if (this.state.selectedStickerPath) return; // 廃止
        if (this.state.gameRunning && !this.state.isPaused) {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); this.skipCurrentImage(); }
        }
    }
};
