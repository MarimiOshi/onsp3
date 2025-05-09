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
        modalMemberSlidersContainer: null, modalPulseBrightnessSlider: null,
        modalPulseBrightnessValue: null, modalFixedBpmInput: null,
        modalStickerSettingsGroup: null, modalStickerChoiceContainer: null, modalClearAllStickersButton: null,
    },
    state: {
        isActive: false, gameRunning: false, isPaused: false,
        settings: { memberWeights: {}, pulseBrightness: 3, fixedBpm: 120 },
        currentBPM: 120,
        imageIntervalId: null, currentMember: null, currentEROImages: [], currentEROImageIndex: 0,
        metronomeAudioContext: null, metronomeSoundBuffers: [], loadedSoundCount: 0, metronomeTimeoutId: null,
        selectedStickerPath: null, pastedStickers: {},
        memberQuotes: {}, imageTags: {},
        touchStartX: 0, touchEndX: 0, swipeThreshold: 50,
    },
    config: {
        members: [], imageSlideInterval: 5000, soundFilePaths: [],
        stickerImagePaths: [], stickerBaseHue: 0,
        serifCsvPath: 'data/ONSP_セリフ.csv', quoteTagDelimiter: '|',
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
        console.log("Initializing Shikoshiko Mode (vTikTok UI, Layout Fix)...");

        this.elements.section = this.dependencies.domUtils.qs('#shikoshikoModeSection');
        this.elements.openSettingsModalButton = this.dependencies.domUtils.qs('#openShikoshikoSettingsModal');

        this.elements.settingsModal = this.dependencies.domUtils.qs('#shikoshikoSettingsModal');
        this.elements.closeModalButton = this.dependencies.domUtils.qs('#closeShikoshikoSettingsModal');
        this.elements.saveSettingsButton = this.dependencies.domUtils.qs('#saveShikoshikoSettingsButton');
        this.elements.modalMemberSlidersContainer = this.dependencies.domUtils.qs('#modalShikoshikoMemberSliders');
        this.elements.modalPulseBrightnessSlider = this.dependencies.domUtils.qs('#modalPulseBrightnessSlider');
        this.elements.modalPulseBrightnessValue = this.dependencies.domUtils.qs('#modalPulseBrightnessValue');
        this.elements.modalFixedBpmInput = this.dependencies.domUtils.qs('#modalFixedBpmInput');
        this.elements.modalStickerSettingsGroup = this.dependencies.domUtils.qs('#modalStickerSettingsGroup');
        this.elements.modalStickerChoiceContainer = this.dependencies.domUtils.qs('#modalStickerChoiceContainer');
        this.elements.modalClearAllStickersButton = this.dependencies.domUtils.qs('#modalClearAllStickersButton');

        this.elements.gameArea = this.dependencies.domUtils.qs('.shikoshiko-box1'); // gameAreaをBOX1に
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

        if (initialConfig.members) this.config.members = initialConfig.members;
        if (initialConfig.shikoshikoDefaultSettings) {
            const sds = initialConfig.shikoshikoDefaultSettings;
            if (sds.imageSlideInterval !== undefined) this.config.imageSlideInterval = sds.imageSlideInterval;
            if (sds.soundFilePaths) this.config.soundFilePaths = sds.soundFilePaths;
        }
        if (initialConfig.stickerImagePaths) this.config.stickerImagePaths = initialConfig.stickerImagePaths;
        if (initialConfig.STICKER_BASE_COLOR_HEX) {
            const hsl = this.dependencies.utils.hexToHsl(initialConfig.STICKER_BASE_COLOR_HEX);
            if (hsl) this.config.stickerBaseHue = hsl[0];
        }
        if (initialConfig.SERIF_CSV_PATH) this.config.serifCsvPath = initialConfig.SERIF_CSV_PATH;
        if (initialConfig.QUOTE_TAG_DELIMITER) this.config.quoteTagDelimiter = initialConfig.QUOTE_TAG_DELIMITER;

        this.loadSettings();
        this.loadPastedStickers();
        this.loadImageTags();
        this.loadMemberQuotes();

        this.initModalUI();

        this.addEventListeners();
        this.initAudio();
        this.loadSounds();
        this.updateUI();
        this.applyFixedBpm();
        console.log("Shikoshiko Mode Initialized (Layout/Button/Nav Fix).");
    },

    initModalUI: function() {
        if (!this.elements.settingsModal) return;
        if (this.config.members && this.config.members.length > 0 && this.elements.modalMemberSlidersContainer) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#modalShikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights, () => {}
            );
        } else {
            if(this.elements.modalMemberSlidersContainer) this.elements.modalMemberSlidersContainer.innerHTML = "<p>メンバーデータがありません。</p>";
        }
        if (this.elements.modalPulseBrightnessSlider && this.elements.modalPulseBrightnessValue) {
            this.dependencies.uiComponents.initGenericSlider(
                '#modalPulseBrightnessSlider', '#modalPulseBrightnessValue', this.state.settings.pulseBrightness, () => {}
            );
        }
        if (this.config.stickerImagePaths && this.config.stickerImagePaths.length > 0 && this.elements.modalStickerSettingsGroup) {
            if (this.elements.modalStickerSettingsGroup) this.dependencies.domUtils.toggleDisplay(this.elements.modalStickerSettingsGroup, true); // nullチェック追加
            this.dependencies.uiComponents.createStickerChoices(
                '#modalStickerChoiceContainer', this.config.stickerImagePaths,
                (selectedPath) => {
                    if (this.state.gameRunning) { this.deselectSticker(); return; }
                    if (selectedPath === this.state.selectedStickerPath) this.deselectSticker();
                    else this.state.selectedStickerPath = selectedPath;
                    this.updateStickerCursor();
                }
            );
        }
    },

    addEventListeners: function() {
        const du = this.dependencies.domUtils;
        if (this.elements.startButton) du.on(this.elements.startButton, 'click', () => this.startGameOrResume());
        if (this.elements.finishButton) du.on(this.elements.finishButton, 'click', () => this.finishGame());
        if (this.elements.skipButton) du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());
        if (this.elements.weakPointButton) du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());
        if (this.elements.memberImageContainer) {
            du.on(this.elements.memberImageContainer, 'click', (event) => this.handleImageContainerClick(event));
            du.on(this.elements.memberImageContainer, 'touchstart', (event) => this.handleTouchStart(event), { passive: true });
            du.on(this.elements.memberImageContainer, 'touchmove', (event) => this.handleTouchMove(event), { passive: false });
            du.on(this.elements.memberImageContainer, 'touchend', (event) => this.handleTouchEnd(event));
        }
        if (this.elements.openSettingsModalButton) du.on(this.elements.openSettingsModalButton, 'click', () => this.openSettingsModal());
        if (this.elements.closeModalButton) du.on(this.elements.closeModalButton, 'click', () => this.closeSettingsModal());
        if (this.elements.saveSettingsButton) du.on(this.elements.saveSettingsButton, 'click', () => this.saveModalSettings());
        if (this.elements.modalClearAllStickersButton) du.on(this.elements.modalClearAllStickersButton, 'click', () => this.clearAllPastedStickersForCurrentImage());
    },

    openSettingsModal: function() {
        if (!this.elements.settingsModal || !this.dependencies.uiComponents) return;
        if (this.elements.modalMemberSlidersContainer) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#modalShikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights,() => {}
            );
        }
        if (this.elements.modalPulseBrightnessSlider) this.elements.modalPulseBrightnessSlider.value = this.state.settings.pulseBrightness;
        if (this.elements.modalPulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.modalPulseBrightnessValue, String(this.state.settings.pulseBrightness));
        if (this.elements.modalFixedBpmInput) this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;
        this.dependencies.uiComponents.openModal('#shikoshikoSettingsModal');
    },
    closeSettingsModal: function() {
        if (!this.elements.settingsModal || !this.dependencies.uiComponents) return;
        this.dependencies.uiComponents.closeModal('#shikoshikoSettingsModal');
        this.deselectSticker();
    },
    saveModalSettings: function() {
        if (this.elements.modalMemberSlidersContainer) {
            this.dependencies.domUtils.qsa('input[type="range"]', this.elements.modalMemberSlidersContainer).forEach(slider => {
                if (slider.dataset.memberName) this.state.settings.memberWeights[slider.dataset.memberName] = Number(slider.value);
            });
        }
        if (this.elements.modalPulseBrightnessSlider) this.state.settings.pulseBrightness = Number(this.elements.modalPulseBrightnessSlider.value);
        if (this.elements.modalFixedBpmInput) {
            const newBpm = parseInt(this.elements.modalFixedBpmInput.value, 10);
            if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) this.state.settings.fixedBpm = newBpm;
            else if (this.elements.modalFixedBpmInput) this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;
        }
        this.applyPulseBrightness(); this.applyFixedBpm(); this.saveSettings(); this.closeSettingsModal();
        if (this.state.gameRunning && !this.state.isPaused) { this.updateShikoAnimationSpeed(); this.scheduleMetronomeSound(); }
    },

    loadSettings: function() {
        const loadedSettings = this.dependencies.storage.loadShikoshikoSettings();
        const defaultMemberWeights = {};
        if (this.config.members && Array.isArray(this.config.members)) {
            this.config.members.forEach(member => { if (member && member.name) defaultMemberWeights[member.name] = 3; });
        }
        const configDefaultBpm = (this.config.shikoshikoDefaultSettings && this.config.shikoshikoDefaultSettings.fixedBpm !== undefined)
            ? this.config.shikoshikoDefaultSettings.fixedBpm : 120;
        const defaultBaseSettings = { memberWeights: defaultMemberWeights, pulseBrightness: 3, fixedBpm: configDefaultBpm, };
        this.state.settings = { ...defaultBaseSettings, ...loadedSettings };
        if (loadedSettings && loadedSettings.memberWeights) this.state.settings.memberWeights = { ...defaultMemberWeights, ...loadedSettings.memberWeights };
        else this.state.settings.memberWeights = defaultMemberWeights;
        this.state.settings.fixedBpm = loadedSettings.fixedBpm !== undefined ? loadedSettings.fixedBpm : configDefaultBpm;
        this.state.currentBPM = this.state.settings.fixedBpm;
        this.applyPulseBrightness();
    },
    saveSettings: function() {
        const settingsToSave = { ...this.state.settings };
        this.dependencies.storage.saveShikoshikoSettings(settingsToSave);
    },
    applyPulseBrightness: function() {
        const brightness = this.state.settings.pulseBrightness;
        const factor = 1.0 + (brightness * 0.06);
        document.documentElement.style.setProperty('--pulse-brightness-factor', factor.toFixed(2));
        // モーダル内の値表示も更新 (モーダルが開いているときのみ)
        if (this.elements.modalPulseBrightnessValue && this.elements.settingsModal && this.elements.settingsModal.style.display !== 'none') {
            this.dependencies.domUtils.setText(this.elements.modalPulseBrightnessValue, String(brightness));
        }
    },
    applyFixedBpm: function() {
        this.state.currentBPM = this.state.settings.fixedBpm;
        this.updateShikoAnimationSpeed();
    },

    loadImageTags: function() { this.state.imageTags = this.dependencies.storage.loadImageTags(); },
    loadMemberQuotes: async function() { /* 変更なし (前回全文提供済み) */
        if (!this.config.serifCsvPath) { this.state.memberQuotes = {}; return; }
        try {
            const response = await fetch(this.config.serifCsvPath, { cache: "no-store" });
            if (!response.ok) throw new Error(`Fetch failed for ${this.config.serifCsvPath}: ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line);
            if (lines.length <= 1) { this.state.memberQuotes = {}; return; }
            const quotes = {};
            lines.slice(1).forEach((line, index) => {
                const parts = []; let currentPart = ''; let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"' && (i === 0 || line[i-1] !== '\\')) inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { parts.push(currentPart.trim()); currentPart = ''; }
                    else currentPart += char;
                }
                parts.push(currentPart.trim());
                if (parts.length >= 2) {
                    const memberName = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"');
                    const quoteText = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"');
                    const tagsString = parts.length > 2 ? parts.slice(2).join(',').trim().replace(/^"|"$/g, '') : "";
                    const quoteTags = tagsString ? tagsString.split(this.config.quoteTagDelimiter).map(t => t.trim().replace(/""/g, '"')).filter(t => t) : [];
                    if (!quotes[memberName]) quotes[memberName] = [];
                    quotes[memberName].push({ text: quoteText, tags: quoteTags });
                }
            });
            this.state.memberQuotes = quotes;
            console.log("ShikoshikoMode: Member quotes loaded.");
        } catch (error) { console.error("ShikoshikoMode: Failed to load member quotes:", error); this.state.memberQuotes = {}; }
    },
    displayQuoteAndTags: function() { /* 変更なし (前回全文提供済み) */
        if (!this.state.currentMember || !this.elements.memberQuoteDisplay || !this.elements.imageTagsContainer) return;
        const memberName = this.state.currentMember.name;
        const memberQuotes = this.state.memberQuotes[memberName] || [];
        let selectedQuoteText = "（……）";
        if (memberQuotes.length > 0) {
            const randomQuote = this.dependencies.utils.getRandomElement(memberQuotes);
            if (randomQuote) selectedQuoteText = randomQuote.text;
        }
        this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, selectedQuoteText);
        this.dependencies.domUtils.empty(this.elements.imageTagsContainer);
        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath;
        const tagsForCurrentImage = currentImageRelPath ? (this.state.imageTags[currentImageRelPath] || []) : [];
        if (tagsForCurrentImage.length > 0) {
            tagsForCurrentImage.forEach(tagText => {
                const tagElement = this.dependencies.domUtils.createElement('span', { class: 'image-tag-item' }, [tagText]);
                this.elements.imageTagsContainer.appendChild(tagElement);
            });
            this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, true);
        } else this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
    },

    startGameOrResume: function() { /* 変更なし (前回全文提供済み) */
        if (this.state.gameRunning && this.state.isPaused) this.resumeGame();
        else if (!this.state.gameRunning) this.startGame();
    },
    startGame: function() { /* 変更なし (前回全文提供済み) */
        if (this.state.gameRunning) return; console.log("Shikoshiko game starting..."); this.deselectSticker();
        this.state.gameRunning = true; this.state.isPaused = false; this.currentEROImageIndex = -1;
        this.applyFixedBpm(); this.updateUI(); this.startShikoAnimation(); this.nextEROImage();
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.state.imageIntervalId = setInterval(() => { if (!this.state.isPaused) this.nextEROImage(); }, this.config.imageSlideInterval);
        if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
        else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
    },
    resumeGame: function() { /* 変更なし (前回全文提供済み) */
        if (!this.state.gameRunning || !this.state.isPaused) return; console.log("Resuming shikoshiko game...");
        this.state.isPaused = false; this.updateUI(); this.resumeShikoAnimationAndSound();
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.state.imageIntervalId = setInterval(() => { if (!this.state.isPaused) this.nextEROImage(); }, this.config.imageSlideInterval);
        if (this.state.currentMember) this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
        if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
    },
    finishGame: function() { /* 変更なし (前回全文提供済み) */
        if (!this.state.gameRunning) return; console.log(`Shikoshiko game finished by button.`);
        this.state.gameRunning = false; this.state.isPaused = false;
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); this.stopShikoAnimation(); this.updateUI();
        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(`${this.state.currentMember.name} でフィニッシュしました！`, 'success');
            if (this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
                this.dependencies.counterMode.incrementCount(this.state.currentMember.name);
            }
        } else this.dependencies.uiComponents.showNotification(`フィニッシュしました！`, 'success');
        if(this.elements.weakPointButton) this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false);
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.dependencies.app.applyTheme(null); this.state.currentMember = null; this.clearMemberDisplayAndUpdate();
    },
    selectRandomMember: function() { /* 変更なし (前回全文提供済み) */
        const weightedMembers = [];
        (this.config.members || []).forEach(member => {
            const weight = this.state.settings.memberWeights[member.name] !== undefined ? Number(this.state.settings.memberWeights[member.name]) : 3;
            if (weight > 0 && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) weightedMembers.push({ member, weight });
        });
        if (weightedMembers.length === 0) { console.error("ShikoshikoMode: No weighted members available for selection."); return null; }
        const totalWeight = weightedMembers.reduce((sum, item) => sum + item.weight, 0);
        let selectedMemberData = null;
        if (totalWeight <= 0) selectedMemberData = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        else {
            let randomNum = Math.random() * totalWeight;
            for (const item of weightedMembers) { randomNum -= item.weight; if (randomNum < 0) { selectedMemberData = item.member; break; } }
            if (!selectedMemberData) selectedMemberData = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        }
        return selectedMemberData;
    },
    nextEROImage: function() { /* 変更なし (前回全文提供済み) */
        if (!this.state.gameRunning || this.state.isPaused) return;
        const newMember = this.selectRandomMember();
        if (!newMember) { this.clearMemberDisplayAndUpdate(); this.dependencies.app.applyTheme(null); this.dependencies.uiComponents.showNotification("表示できるメンバーがいません。", "error"); this.finishGame(); return; }
        this.state.currentMember = newMember;
        this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.state.currentEROImages = []; const eroFolder = this.state.currentMember.imageFolders.ero;
        for (let i = 1; i <= eroFolder.imageCount; i++) this.state.currentEROImages.push(`${eroFolder.path}${i}.jpg`);
        if (this.state.currentEROImages.length === 0) { this.skipCurrentImage(); return; }
        this.currentEROImageIndex = this.dependencies.utils.getRandomInt(0, this.state.currentEROImages.length - 1);
        const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
        const memberImageElement = this.elements.memberImage; if (!memberImageElement) return;
        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }
        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => { memberImageElement.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(memberImageElement, 'image-error'); this.displayQuoteAndTags(); };
        memberImageElement.onload = () => { this.dependencies.domUtils.removeClass(memberImageElement, 'image-error'); this.updateWeakPointButtonState(); this.renderPastedStickers(); this.displayQuoteAndTags(); };
        this.updateUI();
    },
    skipCurrentImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.nextEROImage(); },

    updateUI: function() { // ボタン表示ロジック修正
        const du = this.dependencies.domUtils;
        const isGameActive = this.state.gameRunning && !this.state.isPaused;

        if (this.elements.startButton) {
            du.setText(this.elements.startButton, this.state.isPaused ? "再開" : (this.state.gameRunning ? "プレイ中" : "開始"));
            this.elements.startButton.disabled = this.state.gameRunning && !this.state.isPaused;
            // スマホ表示制御はCSSで行うか、より複雑な条件ならJSで
            // HTML側で<button>の初期表示を制御し、JSでは状態に応じて変更するだけに留める方がシンプル
            du.toggleDisplay(this.elements.startButton, !this.state.gameRunning || this.state.isPaused);
        }
        if (this.elements.finishButton) du.toggleDisplay(this.elements.finishButton, isGameActive);
        if (this.elements.skipButton) du.toggleDisplay(this.elements.skipButton, isGameActive);
        if (this.elements.weakPointButton) du.toggleDisplay(this.elements.weakPointButton, !!this.state.currentMember);

        if (this.state.currentMember) {
            if(this.elements.memberImage && this.elements.memberImage.style) this.elements.memberImage.style.borderColor = this.state.currentMember.color || 'var(--default-border-color)';
            if (this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
        } else {
            if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
            if(this.elements.memberImage && this.elements.memberImage.style) { this.elements.memberImage.src = 'images/placeholder.png'; this.elements.memberImage.style.borderColor = 'var(--default-border-color)'; }
            if (this.elements.memberQuoteDisplay) du.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
            if (this.elements.imageTagsContainer) du.toggleDisplay(this.elements.imageTagsContainer, false);
        }
        this.updateWeakPointButtonState();
    },

    updateShikoAnimationSpeed: function() { /* 前回と同様 */ }, startShikoAnimation: function() { /* 前回と同様 */ },
    stopShikoAnimation: function() { /* 前回と同様 */ }, pauseShikoAnimationAndSound: function() { /* 前回と同様 */ },
    resumeShikoAnimationAndSound: function() { /* 前回と同様 */ },
    initAudio: function() { /* 前回と同様 */ }, loadSounds: async function() { /* 前回と同様 */ },
    playMetronomeSound: function() { /* 前回と同様 */ }, scheduleMetronomeSound: function() { /* 前回と同様 */ },
    toggleWeakPoint: function() { /* 前回と同様 */ }, updateWeakPointButtonState: function() { /* 前回と同様 */ },
    loadPastedStickers: function() { /* 前回と同様 */ }, savePastedStickers: function() { /* 前回と同様 */ },
    renderPastedStickers: function() { /* 前回と同様 */ }, handleImageContainerClick: function(event) { /* 前回と同様 */ },
    clearAllPastedStickersForCurrentImage: function() { /* 前回と同様 */ }, updateStickerCursor: function() { /* 前回と同様 */ },
    deselectSticker: function() { /* 前回と同様 */ },

    activate: function() { /* 前回と同様のロジックで、一時停止・再開を考慮 */
        this.state.isActive = true;
        if (this.elements.section) { this.dependencies.domUtils.addClass(this.elements.section, 'active'); this.dependencies.domUtils.toggleDisplay(this.elements.section, true); }
        this.loadSettings(); this.applyFixedBpm(); this.loadPastedStickers(); this.loadImageTags();
        this.loadMemberQuotes().then(() => { // セリフ読み込み完了後にUI更新
            if (this.state.gameRunning && this.state.isPaused) {
                this.resumeGame();
            } else if (!this.state.gameRunning) {
                if (this.state.currentMember && this.elements.memberImage && this.state.currentEROImages.length > 0 && this.currentEROImageIndex >= 0 && this.currentEROImageIndex < this.state.currentEROImages.length) {
                    const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
                    if (imagePath && this.elements.memberImage) {
                         const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
                         if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
                         this.elements.memberImage.src = imagePath;
                    } else this.clearMemberDisplayAndUpdate();
                } else this.clearMemberDisplayAndUpdate();
                this.dependencies.app.applyTheme(null);
                this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
                this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            }
            this.updateUI(); // セリフ読み込み後にもUI更新
        });
        this.deselectSticker();
        console.log("Shikoshiko Mode Activated.");
    },
    deactivate: function() { /* 前回と同様 */
        this.state.isActive = false;
        if (this.state.gameRunning && !this.state.isPaused) {
            this.state.isPaused = true; this.pauseShikoAnimationAndSound();
            if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); this.state.imageIntervalId = null;
            this.updateUI(); console.log("Shikoshiko Mode Paused due to tab change.");
        }
        this.deselectSticker();
        console.log("Shikoshiko Mode Deactivated (or Paused).");
    },
    clearMemberDisplayAndUpdate: function() { /* 前回と同様 */ this.clearMemberDisplay(); this.updateUI(); },
    clearMemberDisplay: function() { /* 前回と同様 */
        if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
        if(this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
        if(this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
        if(this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
        if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
        this.updateWeakPointButtonState(); this.renderPastedStickers();
    },
    setCounterModeDependency: function(counterModeInstance) { /* 前回と同様 */ this.dependencies.counterMode = counterModeInstance; },
    handleTouchStart: function(event) { /* 前回と同様 */
        if (!this.state.gameRunning || this.state.isPaused || event.touches.length === 0) return;
        this.state.touchStartX = event.touches[0].clientX; this.state.touchEndX = event.touches[0].clientX;
    },
    handleTouchMove: function(event) { /* 前回と同様 */
        if (!this.state.gameRunning || this.state.isPaused || event.touches.length === 0) return;
        this.state.touchEndX = event.touches[0].clientX;
        if (Math.abs(this.state.touchStartX - this.state.touchEndX) > 10) event.preventDefault();
    },
    handleTouchEnd: function(event) { /* 前回と同様 */
        if (!this.state.gameRunning || this.state.isPaused) return;
        const touchDiff = this.state.touchStartX - this.state.touchEndX;
        if (Math.abs(touchDiff) > this.state.swipeThreshold) { console.log("Swipe detected - Skip Next"); this.skipCurrentImage(); }
        this.state.touchStartX = 0; this.state.touchEndX = 0;
    },
    handleGlobalKeydown: function(event) { /* 前回と同様 */
        if (!this.state.isActive) return; if (this.state.selectedStickerPath) return;
        if (this.state.gameRunning && !this.state.isPaused) {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); this.skipCurrentImage(); }
        }
    }
};
