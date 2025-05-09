// js/modes/shikoshiko.js

const ShikoshikoMode = {
    elements: {
        section: null,
        settingsToggle: null, settingsContent: null, memberSlidersContainer: null,
        pulseBrightnessSlider: null, pulseBrightnessValue: null, fixedBpmInput: null,
        stickerSettingsGroup: null, stickerChoiceContainer: null, clearAllStickersButton: null,
        gameArea: null, memberNameDisplay: null, weakPointButton: null,
        memberImageContainer: null, memberImage: null,
        imageTagsContainer: null, memberQuoteDisplay: null,
        shikoAnimationContainer: null, saoImage: null, shikoshikoAnimationImage: null,
        controlsArea: null, startButton: null, finishButton: null, skipButton: null,
    },
    state: {
        isActive: false, gameRunning: false,
        settings: { memberWeights: {}, pulseBrightness: 3, fixedBpm: 120 },
        currentBPM: 120,
        imageIntervalId: null, currentMember: null, currentEROImages: [], currentEROImageIndex: 0,
        metronomeAudioContext: null, metronomeSoundBuffers: [], loadedSoundCount: 0, metronomeTimeoutId: null,
        selectedStickerPath: null, pastedStickers: {}, // { imageRelPath: [{stickerSrc, x, y, rotation, scale, filter}, ...] }
        memberQuotes: {}, // { 'メンバー名': [{text: 'セリフ', tags: ['タグA']}] }
        imageTags: {},    // { 'メンバー名/ero/1.jpg': ['タグX', 'タグY'] }
    },
    config: {
        members: [], imageSlideInterval: 5000, soundFilePaths: [],
        stickerImagePaths: [], stickerBaseHue: 0,
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
        console.log("Initializing Shikoshiko Mode...");

        this.elements.section = this.dependencies.domUtils.qs('#shikoshikoModeSection');
        this.elements.settingsToggle = this.dependencies.domUtils.qs('#shikoshikoSettingsToggle');
        this.elements.settingsContent = this.dependencies.domUtils.qs('#shikoshikoSettingsContent');
        this.elements.memberSlidersContainer = this.dependencies.domUtils.qs('#shikoshikoMemberSliders');
        this.elements.pulseBrightnessSlider = this.dependencies.domUtils.qs('#pulseBrightnessSlider');
        this.elements.pulseBrightnessValue = this.dependencies.domUtils.qs('#pulseBrightnessValue');
        this.elements.fixedBpmInput = this.dependencies.domUtils.qs('#fixedBpmInput');
        this.elements.stickerSettingsGroup = this.dependencies.domUtils.qs('#shikoshikoStickerSettingsGroup');
        this.elements.stickerChoiceContainer = this.dependencies.domUtils.qs('#shikoshikoStickerChoiceContainer');
        this.elements.clearAllStickersButton = this.dependencies.domUtils.qs('#shikoshikoClearAllStickersButton');
        this.elements.gameArea = this.dependencies.domUtils.qs('#shikoshikoGameArea');
        this.elements.memberNameDisplay = this.dependencies.domUtils.qs('#shikoshikoMemberName');
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
        this.loadPastedStickers(); // ★★★ 呼び出し箇所確認 ★★★
        this.loadImageTags();
        this.loadMemberQuotes(); // この時点では非同期なので完了を待たない

        this.dependencies.uiComponents.initAccordion('#shikoshikoSettingsToggle', '#shikoshikoSettingsContent');
        if (this.config.members && this.config.members.length > 0) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#shikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights,
                (memberName, newValue) => { this.state.settings.memberWeights[memberName] = newValue; this.saveSettings(); }
            );
        } else {
            if(this.elements.memberSlidersContainer) this.elements.memberSlidersContainer.innerHTML = "<p>メンバーデータがありません。</p>";
        }
        this.dependencies.uiComponents.initGenericSlider(
            '#pulseBrightnessSlider', '#pulseBrightnessValue',
            (newValue) => { this.state.settings.pulseBrightness = newValue; this.applyPulseBrightness(); this.saveSettings(); }
        );
        if (this.config.stickerImagePaths && this.config.stickerImagePaths.length > 0) {
            if (this.elements.stickerSettingsGroup) this.dependencies.domUtils.toggleDisplay(this.elements.stickerSettingsGroup, true);
            this.dependencies.uiComponents.createStickerChoices(
                '#shikoshikoStickerChoiceContainer', this.config.stickerImagePaths,
                (selectedPath) => {
                    if (this.state.gameRunning) { this.deselectSticker(); return; }
                    if (selectedPath === this.state.selectedStickerPath) this.deselectSticker();
                    else this.state.selectedStickerPath = selectedPath;
                    this.updateStickerCursor();
                }
            );
        }

        this.addEventListeners();
        this.initAudio(); // AudioContextの初期化
        this.loadSounds();  // 非同期でサウンド読み込み開始
        this.updateUI();
        this.applyFixedBpm();
        console.log("Shikoshiko Mode Initialized.");
    },

    addEventListeners: function() {
        const du = this.dependencies.domUtils;
        if (this.elements.startButton) du.on(this.elements.startButton, 'click', () => this.startGame());
        if (this.elements.finishButton) du.on(this.elements.finishButton, 'click', () => this.finishGame());
        if (this.elements.skipButton) du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());
        if (this.elements.fixedBpmInput) du.on(this.elements.fixedBpmInput, 'change', () => this.handleBpmChange());
        if (this.elements.weakPointButton) du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());
        if (this.elements.memberImageContainer) du.on(this.elements.memberImageContainer, 'click', (event) => this.handleImageContainerClick(event));
        if (this.elements.clearAllStickersButton) du.on(this.elements.clearAllStickersButton, 'click', () => this.clearAllPastedStickersForCurrentImage());
    },

    loadSettings: function() {
        const loadedSettings = this.dependencies.storage.loadShikoshikoSettings();
        const defaultMemberWeights = {};
        if (this.config.members && Array.isArray(this.config.members)) {
            this.config.members.forEach(member => {
                if (member && member.name) defaultMemberWeights[member.name] = 3;
            });
        }
        const configDefaultBpm = (this.config.shikoshikoDefaultSettings && this.config.shikoshikoDefaultSettings.fixedBpm !== undefined)
            ? this.config.shikoshikoDefaultSettings.fixedBpm
            : 120;

        const defaultBaseSettings = {
            memberWeights: defaultMemberWeights,
            pulseBrightness: 3,
            fixedBpm: configDefaultBpm,
        };
        this.state.settings = { ...defaultBaseSettings, ...loadedSettings };
        if (loadedSettings && loadedSettings.memberWeights) {
             this.state.settings.memberWeights = { ...defaultMemberWeights, ...loadedSettings.memberWeights };
        } else {
             this.state.settings.memberWeights = defaultMemberWeights;
        }
        this.state.settings.fixedBpm = loadedSettings.fixedBpm !== undefined ? loadedSettings.fixedBpm : configDefaultBpm;
        this.state.currentBPM = this.state.settings.fixedBpm;

        if (this.elements.pulseBrightnessSlider) this.elements.pulseBrightnessSlider.value = this.state.settings.pulseBrightness;
        if (this.elements.fixedBpmInput) this.elements.fixedBpmInput.value = this.state.settings.fixedBpm;
        this.applyPulseBrightness();
    },
    saveSettings: function() {
        const settingsToSave = { ...this.state.settings };
        this.dependencies.storage.saveShikoshikoSettings(settingsToSave);
    },
    applyPulseBrightness: function() {
        if(!this.elements.pulseBrightnessValue) return;
        const brightness = this.state.settings.pulseBrightness;
        const factor = 1.0 + (brightness * 0.06);
        document.documentElement.style.setProperty('--pulse-brightness-factor', factor.toFixed(2));
        this.dependencies.domUtils.setText(this.elements.pulseBrightnessValue, String(brightness));
    },
    handleBpmChange: function() {
        if(!this.elements.fixedBpmInput) return;
        const newBpm = parseInt(this.elements.fixedBpmInput.value, 10);
        if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) {
            this.state.settings.fixedBpm = newBpm;
            this.state.currentBPM = newBpm;
            this.saveSettings();
            if (this.state.gameRunning) {
                this.updateShikoAnimationSpeed();
                this.scheduleMetronomeSound();
            }
        } else {
            this.elements.fixedBpmInput.value = this.state.settings.fixedBpm;
        }
    },
    applyFixedBpm: function() {
        this.state.currentBPM = this.state.settings.fixedBpm;
        this.updateShikoAnimationSpeed();
    },

    loadImageTags: function() {
        this.state.imageTags = this.dependencies.storage.loadImageTags();
    },
    loadMemberQuotes: async function() {
        if (!this.config.serifCsvPath) {
            console.warn("ShikoshikoMode: Serif CSV path not configured.");
            this.state.memberQuotes = {}; return;
        }
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
                } else console.warn(`Skipping malformed CSV line ${index + 2}: ${line}`);
            });
            this.state.memberQuotes = quotes;
            console.log("ShikoshikoMode: Member quotes loaded.", Object.keys(this.state.memberQuotes).length > 0 ? "Some quotes found." : "No quotes parsed.");
        } catch (error) {
            console.error("ShikoshikoMode: Failed to load member quotes:", error);
            this.state.memberQuotes = {};
        }
    },
    displayQuoteAndTags: function() {
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
        } else {
            this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
        }
    },

    startGame: function() {
        if (this.state.gameRunning) return;
        console.log("Shikoshiko game starting...");
        this.deselectSticker();
        this.selectRandomMember();
        if (!this.state.currentMember) {
            alert("表示できるメンバーがいません。出現率と各メンバーのERO画像数を確認してください。");
            return;
        }
        this.state.gameRunning = true;
        this.currentEROImageIndex = -1;
        this.applyFixedBpm();
        this.updateUI(); // UIを「プレイ中」状態に
        this.startShikoAnimation();
        this.nextEROImage();
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.state.imageIntervalId = setInterval(() => this.nextEROImage(), this.config.imageSlideInterval);
        this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
        if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
        else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.renderPastedStickers();
    },

    finishGame: function() {
        if (!this.state.gameRunning) return;
        console.log(`Shikoshiko game finished by button.`);
        this.state.gameRunning = false;
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.stopShikoAnimation();
        this.updateUI(); // UIを「待機中」状態に
        if (this.elements.memberNameDisplay) this.dependencies.domUtils.setText(this.elements.memberNameDisplay, this.state.currentMember ? `${this.state.currentMember.name} でフィニッシュ！` : "フィニッシュ！");
        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(`${this.state.currentMember.name} でフィニッシュしました！`, 'success');
            if (this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
                this.dependencies.counterMode.incrementCount(this.state.currentMember.name);
            }
        }
        if(this.elements.weakPointButton) this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false);
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.dependencies.app.applyTheme(null);
    },

    selectRandomMember: function() {
        const weightedMembers = [];
        (this.config.members || []).forEach(member => {
            const weight = this.state.settings.memberWeights[member.name] !== undefined
                ? Number(this.state.settings.memberWeights[member.name]) : 3;
            if (weight > 0 && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                weightedMembers.push({ member, weight });
            }
        });
        if (weightedMembers.length === 0) { this.state.currentMember = null; console.error("ShikoshikoMode: No weighted members available for selection."); return; }
        const totalWeight = weightedMembers.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeight <= 0) this.state.currentMember = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        else {
            let randomNum = Math.random() * totalWeight; let foundMember = null;
            for (const item of weightedMembers) { randomNum -= item.weight; if (randomNum < 0) { foundMember = item.member; break; } }
            this.state.currentMember = foundMember || this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        }
        console.log("Selected member:", this.state.currentMember ? this.state.currentMember.name : "None");
        this.state.currentEROImages = [];
        if (this.state.currentMember) {
            const eroFolder = this.state.currentMember.imageFolders.ero;
            for (let i = 1; i <= eroFolder.imageCount; i++) this.state.currentEROImages.push(`${eroFolder.path}${i}.jpg`);
        }
    },

    nextEROImage: function() {
        if (!this.state.currentMember || this.state.currentEROImages.length === 0) {
            if (this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
            if (this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "（メンバーを選択してください）");
            if (this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
            if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
            return;
        }
        this.currentEROImageIndex = (this.currentEROImageIndex + 1) % this.state.currentEROImages.length;
        const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
        const memberImageElement = this.elements.memberImage;
        if (!memberImageElement) return;
        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => {
            console.error(`Failed to load image: ${imagePath}`);
            memberImageElement.src = 'images/placeholder.png';
            this.dependencies.domUtils.addClass(memberImageElement, 'image-error');
            this.displayQuoteAndTags(); // エラーでも表示試行
        };
        memberImageElement.onload = () => {
            this.dependencies.domUtils.removeClass(memberImageElement, 'image-error');
            this.updateWeakPointButtonState();
            this.renderPastedStickers();
            this.displayQuoteAndTags();
        };
    },

    skipCurrentImage: function() { if (!this.state.gameRunning) return; this.nextEROImage(); },

    updateUI: function() {
        const du = this.dependencies.domUtils;
        if(this.elements.startButton) {
            du.setText(this.elements.startButton, this.state.gameRunning ? "プレイ中" : "開始");
            this.elements.startButton.disabled = this.state.gameRunning;
            if (window.innerWidth <= 768) du.toggleDisplay(this.elements.startButton, !this.state.gameRunning);
            else du.toggleDisplay(this.elements.startButton, true);
        }
        if(this.elements.finishButton) du.toggleDisplay(this.elements.finishButton, this.state.gameRunning);
        if(this.elements.skipButton) du.toggleDisplay(this.elements.skipButton, this.state.gameRunning);
        if(this.elements.weakPointButton) du.toggleDisplay(this.elements.weakPointButton, !!this.state.currentMember);

        if (this.state.currentMember) {
            if(this.elements.memberNameDisplay) du.setText(this.elements.memberNameDisplay, this.state.currentMember.name);
            if(this.elements.memberImage) this.elements.memberImage.style.borderColor = this.state.currentMember.color || 'var(--default-border-color)';
        } else {
            if(this.elements.memberNameDisplay) du.setText(this.elements.memberNameDisplay, "メンバー名");
            if(this.elements.memberImage) { this.elements.memberImage.src = 'images/placeholder.png'; this.elements.memberImage.style.borderColor = 'var(--default-border-color)'; }
            if (this.elements.memberQuoteDisplay) du.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
            if (this.elements.imageTagsContainer) du.toggleDisplay(this.elements.imageTagsContainer, false);
        }
        this.updateWeakPointButtonState();
    },

    updateShikoAnimationSpeed: function() {
        if (this.state.currentBPM <= 0) { this.stopShikoAnimation(); return; }
        const animationDurationMs = (60 / this.state.currentBPM) * 1000;
        document.documentElement.style.setProperty('--shiko-animation-duration', `${animationDurationMs.toFixed(0)}ms`);
    },
    startShikoAnimation: function() {
        if (!this.elements.shikoshikoAnimationImage) return;
        this.updateShikoAnimationSpeed();
        this.dependencies.domUtils.addClass(this.elements.shikoshikoAnimationImage, 'play');
        this.scheduleMetronomeSound();
    },
    stopShikoAnimation: function() {
        if (!this.elements.shikoshikoAnimationImage) return;
        this.dependencies.domUtils.removeClass(this.elements.shikoshikoAnimationImage, 'play');
        if (this.state.metronomeTimeoutId) { clearTimeout(this.state.metronomeTimeoutId); this.state.metronomeTimeoutId = null; }
    },
    initAudio: function() {
        if (!this.state.metronomeAudioContext && (window.AudioContext || window.webkitAudioContext)) {
            try { this.state.metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { console.error("Failed to create AudioContext:", e); }
        }
    },
    loadSounds: async function() {
        if (!this.state.metronomeAudioContext || !this.config.soundFilePaths || this.config.soundFilePaths.length === 0) {
            console.warn("AudioContext not available or no sound files configured to load."); return;
        }
        this.state.loadedSoundCount = 0; this.state.metronomeSoundBuffers = [];
        // console.log("Loading sounds from paths:", this.config.soundFilePaths);
        for (const path of this.config.soundFilePaths) {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${path}`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.state.metronomeAudioContext.decodeAudioData(arrayBuffer);
                this.state.metronomeSoundBuffers.push(audioBuffer); this.state.loadedSoundCount++;
            } catch (error) { console.error(`Failed to load or decode sound: ${path}`, error); }
        }
        if (this.state.loadedSoundCount > 0) console.log(`${this.state.loadedSoundCount} metronome sounds loaded.`);
        else console.warn("No metronome sounds could be loaded. Check paths and file integrity.");
    },
    playMetronomeSound: function() {
        if (!this.state.metronomeAudioContext || this.state.metronomeSoundBuffers.length === 0 || !this.state.gameRunning) return;
        if (this.state.metronomeAudioContext.state === 'suspended') { this.state.metronomeAudioContext.resume().catch(e => console.error("Error resuming AudioContext:", e)); }
        if (this.state.metronomeAudioContext.state !== 'running') return;
        const randomBuffer = this.dependencies.utils.getRandomElement(this.state.metronomeSoundBuffers);
        if (randomBuffer) {
            try {
                const source = this.state.metronomeAudioContext.createBufferSource();
                source.buffer = randomBuffer; source.connect(this.state.metronomeAudioContext.destination); source.start();
            } catch (e) { console.error("Error playing metronome sound:", e); }
        }
    },
    scheduleMetronomeSound: function() {
        if (this.state.metronomeTimeoutId) clearTimeout(this.state.metronomeTimeoutId);
        if (!this.state.gameRunning || this.state.currentBPM <= 0 || this.state.metronomeSoundBuffers.length === 0) return;
        this.playMetronomeSound();
        const intervalMs = (60 / this.state.currentBPM) * 1000;
        this.state.metronomeTimeoutId = setTimeout(() => { this.scheduleMetronomeSound(); }, intervalMs);
    },

    toggleWeakPoint: function() {
        if (!this.elements.weakPointButton) return; const relPath = this.elements.weakPointButton.dataset.relpath; if (!relPath) return;
        const weakPoints = this.dependencies.storage.loadWeakPoints();
        if (weakPoints.has(relPath)) weakPoints.delete(relPath); else weakPoints.add(relPath);
        this.dependencies.storage.saveWeakPoints(weakPoints); this.updateWeakPointButtonState();
        if (this.dependencies.app && typeof this.dependencies.app.notifyWeakPointChange === 'function') {
             this.dependencies.app.notifyWeakPointChange(relPath, weakPoints.has(relPath));
        }
    },
    updateWeakPointButtonState: function() {
        if (!this.elements.weakPointButton) return; const relPath = this.elements.weakPointButton.dataset.relpath;
        // ゲーム中でなくても、画像が表示されていれば（relPathがあれば）ボタン表示
        if (!relPath) { this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false); return; }
        this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, true);
        const weakPoints = this.dependencies.storage.loadWeakPoints(); const isWeak = weakPoints.has(relPath);
        this.dependencies.domUtils.setText(this.elements.weakPointButton, isWeak ? '★' : '☆');
        this.dependencies.domUtils.toggleClass(this.elements.weakPointButton, 'is-weak', isWeak);
        this.elements.weakPointButton.title = isWeak ? '弱点解除' : '弱点登録';
    },

    loadPastedStickers: function() { this.state.pastedStickers = this.dependencies.storage.loadStickerData() || {}; },
    savePastedStickers: function() { this.dependencies.storage.saveStickerData(this.state.pastedStickers); },
    renderPastedStickers: function() {
        if (!this.elements.memberImageContainer) return;
        this.dependencies.domUtils.qsa('.pasted-sticker', this.elements.memberImageContainer).forEach(el => el.remove());
        if (!this.state.currentMember || !this.elements.memberImage || !this.elements.memberImage.src || this.elements.memberImage.src.endsWith('placeholder.png')) return;
        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath; if (!currentImageRelPath) return;
        const stickersForCurrentImage = this.state.pastedStickers[currentImageRelPath] || [];
        stickersForCurrentImage.forEach(stickerData => {
            const stickerElement = this.dependencies.domUtils.createElement('img', { class: 'pasted-sticker', src: stickerData.stickerSrc, alt: 'ステッカー', style: `left: ${stickerData.x}%; top: ${stickerData.y}%; transform: translate(-50%, -50%) rotate(${stickerData.rotation || 0}deg) scale(${stickerData.scale || 1}); filter: ${stickerData.filter || 'none'};` });
            this.elements.memberImageContainer.appendChild(stickerElement);
        });
    },
    handleImageContainerClick: function(event) {
        if (!this.state.selectedStickerPath || !this.elements.memberImageContainer) return;
        if (this.state.gameRunning) { console.log("Cannot paste stickers during game."); return; }
        if (!this.state.currentMember || !this.elements.memberImage.src || this.elements.memberImage.src.endsWith('placeholder.png')) { console.log("Cannot paste sticker: No member image displayed."); return; }
        const rect = this.elements.memberImageContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100; const y = ((event.clientY - rect.top) / rect.height) * 100;
        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath; if (!currentImageRelPath) { console.warn("Cannot paste sticker: currentImageRelPath is not set."); return; }
        if (!this.state.pastedStickers[currentImageRelPath]) this.state.pastedStickers[currentImageRelPath] = [];
        let hueRotationFilter = 'none'; const memberColor = this.state.currentMember?.color;
        if (memberColor && this.config.stickerBaseHue !== undefined) {
            const targetHsl = this.dependencies.utils.hexToHsl(memberColor);
            if (targetHsl) { let diff = targetHsl[0] - this.config.stickerBaseHue; while (diff <= -180) diff += 360; while (diff > 180) diff -= 360; hueRotationFilter = `hue-rotate(${Math.round(diff)}deg)`; }
        }
        const newStickerData = { stickerSrc: this.state.selectedStickerPath, x: x, y: y, rotation: this.dependencies.utils.getRandomInt(-15, 15), scale: this.dependencies.utils.getRandomInt(80, 120) / 100, filter: hueRotationFilter };
        this.state.pastedStickers[currentImageRelPath].push(newStickerData);
        this.savePastedStickers(); this.renderPastedStickers(); this.deselectSticker();
    },
    clearAllPastedStickersForCurrentImage: function() {
        if (!this.state.currentMember) return; const currentImageRelPath = this.elements.weakPointButton.dataset.relpath; if (!currentImageRelPath) return;
        if (this.state.pastedStickers[currentImageRelPath]) { delete this.state.pastedStickers[currentImageRelPath]; this.savePastedStickers(); this.renderPastedStickers(); console.log(`Cleared all stickers for ${currentImageRelPath}`); }
    },
    updateStickerCursor: function() { /* カーソル変更処理は削除またはCSSで対応 */ },
    deselectSticker: function() {
        this.state.selectedStickerPath = null;
        if (this.elements.stickerChoiceContainer) this.dependencies.domUtils.qsa('.sticker-choice-button.selected', this.elements.stickerChoiceContainer).forEach(btn => this.dependencies.domUtils.removeClass(btn, 'selected'));
        this.updateStickerCursor();
    },

    activate: function() {
        this.state.isActive = true;
        if (this.elements.section) {
            this.dependencies.domUtils.addClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        }
        this.loadSettings(); this.applyFixedBpm(); this.loadPastedStickers();
        this.loadImageTags();
        // loadMemberQuotesは非同期なので、完了を待たずにUI更新に進むが、
        // 実際のセリフ表示はnextEROImageのonloadやdisplayQuoteAndTagsで行われる
        this.loadMemberQuotes().then(() => {
            // ゲーム中でなくても、最後に表示していたメンバーと画像があればそれを表示
            if (!this.state.gameRunning) {
                if (this.state.currentMember && this.elements.memberImage && this.state.currentEROImages.length > 0 && this.currentEROImageIndex >= 0 && this.currentEROImageIndex < this.state.currentEROImages.length) {
                    const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
                    if (imagePath) {
                        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
                        if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
                        this.elements.memberImage.src = imagePath; // これでonloadがトリガーされる
                    } else this.clearMemberDisplayAndUpdate();
                } else this.clearMemberDisplayAndUpdate();
            }
        });


        this.updateUI(); // 先にUIの骨格を更新

        if (this.state.gameRunning && this.state.currentMember) {
            this.dependencies.app.applyTheme(this.state.currentMember.color);
            this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
            if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
            else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            this.renderPastedStickers();
            // this.displayQuoteAndTags(); // nextEROImageのonloadで呼ばれるので不要かも
        } else {
            this.dependencies.app.applyTheme(null);
            this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
            this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        }
        this.deselectSticker();
        console.log("Shikoshiko Mode Activated.");
    },
    clearMemberDisplayAndUpdate: function() {
        this.clearMemberDisplay();
        this.updateUI(); // UIを最新状態に（特にボタンの表示/非表示）
    },
    clearMemberDisplay: function() {
        if(this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
        if(this.elements.memberNameDisplay) this.dependencies.domUtils.setText(this.elements.memberNameDisplay, "メンバー名");
        if(this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
        if(this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
        if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
        this.updateWeakPointButtonState();
        this.renderPastedStickers(); // 画像がないのでステッカーも表示されないはず
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.state.gameRunning) this.finishGame();
        if (this.elements.section) {
            this.dependencies.domUtils.removeClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        }
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.deselectSticker();
        if (this.state.metronomeTimeoutId) { // メトロノームが動いていれば止める
            clearTimeout(this.state.metronomeTimeoutId);
            this.state.metronomeTimeoutId = null;
        }
        console.log("Shikoshiko Mode Deactivated.");
    },
    setCounterModeDependency: function(counterModeInstance) { this.dependencies.counterMode = counterModeInstance; },
    handleGlobalKeydown: function(event) {
        if (!this.state.isActive) return;
        if (this.state.selectedStickerPath) return;
        if (this.state.gameRunning) {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); this.skipCurrentImage(); }
        }
    }
};
