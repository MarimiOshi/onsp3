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
        modalFixedBpmInput: null,
        modalAutoSkipToggle: null,
        modalWeakPointOnlyToggle: null,
    },
    state: {
        isActive: false,
        gameRunning: true,
        isPaused: false,
        settings: {
            memberWeights: {},
            fixedBpm: 120,
            autoSkipEnabled: true,
            weakPointOnlyEnabled: false,
        },
        currentBPM: 120,
        imageIntervalId: null,
        currentMember: null,
        currentEROImages: [],
        allMemberEROImages: {},
        currentEROImageIndex: 0,
        metronomeAudioContext: null,
        metronomeSoundBuffers: [],
        loadedSoundCount: 0,
        metronomeTimeoutId: null,
        memberQuotes: {},
        imageTags: {},
        touchStartX: 0, touchEndX: 0, swipeThreshold: 50,
    },
    config: {
        members: [],
        imageSlideInterval: 5000,
        soundFilePaths: [],
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
        console.log("Initializing Shikoshiko Mode (Full Code, New Options)...");

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
            this.cacheAllMemberEROImages();
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
        console.log("Shikoshiko Mode Initialized (Full Code, Auto-Start, New Options).");
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
            this.setupImageInterval();
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
    loadMemberQuotes: async function() {
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
            tagsForCurrentImage.sort().forEach(tagText => {
                const tagElement = this.dependencies.domUtils.createElement('span', { class: 'image-tag-item' }, [tagText]);
                this.elements.imageTagsContainer.appendChild(tagElement);
            });
            this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, true);
        } else this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
    },

    togglePauseGame: function() {
        if (!this.state.gameRunning) return;
        this.state.isPaused = !this.state.isPaused;
        if (this.state.isPaused) {
            this.pauseShikoAnimationAndSound();
            if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); this.state.imageIntervalId = null;
            console.log("Game Paused.");
        } else {
            this.resumeShikoAnimationAndSound();
            this.setupImageInterval(); // 自動スキップ設定を考慮して再開
            console.log("Game Resumed.");
        }
        this.updateUI();
    },

    handleFinishClick: function() {
        if (!this.state.gameRunning || this.state.isPaused) return;
        console.log(`Shikoshiko Finish Clicked for ${this.state.currentMember ? this.state.currentMember.name : 'Unknown'}`);
        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(`${this.state.currentMember.name} でフィニッシュ！`, 'success');
            if (this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
                this.dependencies.counterMode.incrementCount(this.state.currentMember.name);
            }
        } else this.dependencies.uiComponents.showNotification(`フィニッシュ！`, 'success');
        this.nextEROImage();
    },

    selectRandomMember: function() {
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
        const newMember = this.selectRandomMember();
        if (!newMember) { this.clearMemberDisplayAndUpdate(); this.dependencies.app.applyTheme(null); this.dependencies.uiComponents.showNotification("表示できるメンバーがいません。", "error"); this.togglePauseGame(); return; }
        this.state.currentMember = newMember;
        this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.state.currentEROImages = this.getAvailableEROImagesForMember(this.state.currentMember);
        if (this.state.currentEROImages.length === 0) {
            const message = this.state.settings.weakPointOnlyEnabled ? `${this.state.currentMember.name} の弱点画像がありません。フィルターを解除するか、弱点を登録してください。` : `${this.state.currentMember.name} のERO画像がありません。`;
            this.dependencies.uiComponents.showNotification(message, "info");
            this.clearMemberDisplayAndUpdate(); // 表示をクリア
            // 次のメンバーを試行するか、一時停止するかなどの判断が必要
            // ここでは一度クリアして、ユーザーの次のアクションを待つか、自動スキップがONなら次のインターバルで再度nextEROImageが呼ばれる
            if (!this.state.settings.autoSkipEnabled) { // 自動スキップOFFなら一時停止
                this.togglePauseGame();
            }
            return;
        }
        this.currentEROImageIndex = this.dependencies.utils.getRandomInt(0, this.state.currentEROImages.length - 1);
        const selectedImageInfo = this.state.currentEROImages[this.currentEROImageIndex];
        const imagePath = selectedImageInfo.path;
        const relativePath = selectedImageInfo.relativePath;
        const memberImageElement = this.elements.memberImage; if (!memberImageElement) return;
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }
        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => { memberImageElement.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(memberImageElement, 'image-error'); this.displayQuoteAndTags(); };
        memberImageElement.onload = () => { this.dependencies.domUtils.removeClass(memberImageElement, 'image-error'); this.updateWeakPointButtonState(); this.displayQuoteAndTags(); };
        this.updateUI();
    },
    skipCurrentImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.nextEROImage(); },

    updateUI: function() {
        const du = this.dependencies.domUtils;
        const isGameEffectivelyRunning = this.state.gameRunning && !this.state.isPaused;

        if (this.elements.startButton) {
            du.setText(this.elements.startButton, this.state.isPaused ? "再開" : "一時停止");
            this.elements.startButton.disabled = !this.state.gameRunning;
            du.toggleDisplay(this.elements.startButton, true);
        }
        if (this.elements.finishButton) du.toggleDisplay(this.elements.finishButton, isGameEffectivelyRunning);
        if (this.elements.skipButton) du.toggleDisplay(this.elements.skipButton, isGameEffectivelyRunning);
        if (this.elements.weakPointButton) du.toggleDisplay(this.elements.weakPointButton, !!this.state.currentMember);

        if (this.state.currentMember) {
            if(this.elements.memberImage && this.elements.memberImage.style) this.elements.memberImage.style.borderColor = 'transparent';
            if (this.elements.memberProfileIcon) {
                this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
                this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
             }
        } else {
            if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
            if(this.elements.memberImage && this.elements.memberImage.style) { this.elements.memberImage.src = 'images/placeholder.png'; this.elements.memberImage.style.borderColor = 'transparent'; }
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
    pauseShikoAnimationAndSound: function() {
        if (!this.elements.shikoshikoAnimationImage) return;
        this.dependencies.domUtils.removeClass(this.elements.shikoshikoAnimationImage, 'play');
        if (this.state.metronomeTimeoutId) { clearTimeout(this.state.metronomeTimeoutId); this.state.metronomeTimeoutId = null; }
        console.log("Animation and Metronome Paused.");
    },
    resumeShikoAnimationAndSound: function() {
        if (!this.elements.shikoshikoAnimationImage || !this.state.gameRunning || this.state.currentBPM <= 0) return;
        this.dependencies.domUtils.addClass(this.elements.shikoshikoAnimationImage, 'play');
        this.scheduleMetronomeSound();
        console.log("Animation and Metronome Resumed.");
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
        for (const path of this.config.soundFilePaths) {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${path}`);
                const arrayBuffer = await response.arrayBuffer();
                if (this.state.metronomeAudioContext.state === 'suspended') {
                    await this.state.metronomeAudioContext.resume().catch(e => console.warn("Could not resume audio context for decoding", e));
                }
                if (this.state.metronomeAudioContext.state === 'running') {
                    const audioBuffer = await this.state.metronomeAudioContext.decodeAudioData(arrayBuffer);
                    this.state.metronomeSoundBuffers.push(audioBuffer); this.state.loadedSoundCount++;
                } else console.warn(`AudioContext not running, cannot decode ${path}`);
            } catch (error) { console.error(`Failed to load or decode sound: ${path}`, error); }
        }
        if (this.state.loadedSoundCount > 0) console.log(`${this.state.loadedSoundCount} metronome sounds loaded.`);
        else console.warn("No metronome sounds could be loaded. Check paths, file integrity, and user interaction for AudioContext.");
    },
    playMetronomeSound: function() {
        if (!this.state.metronomeAudioContext || this.state.metronomeSoundBuffers.length === 0 || !this.state.gameRunning || this.state.isPaused) return;
        if (this.state.metronomeAudioContext.state === 'suspended') {
            this.state.metronomeAudioContext.resume().then(() => {
                if (this.state.metronomeAudioContext.state === 'running') this._actualPlaySound();
            }).catch(e => console.error("Error resuming AudioContext on play:", e));
        } else if (this.state.metronomeAudioContext.state === 'running') {
            this._actualPlaySound();
        }
    },
    _actualPlaySound: function() {
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
        if (!this.state.gameRunning || this.state.isPaused || this.state.currentBPM <= 0 || this.state.metronomeSoundBuffers.length === 0) return;
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
        if (!relPath || !this.state.currentMember) { this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false); return; }
        this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, true);
        const weakPoints = this.dependencies.storage.loadWeakPoints(); const isWeak = weakPoints.has(relPath);
        if(this.elements.weakPointButton.firstElementChild) this.dependencies.domUtils.setText(this.elements.weakPointButton.firstElementChild, isWeak ? '★' : '☆');
        this.dependencies.domUtils.toggleClass(this.elements.weakPointButton, 'is-weak', isWeak);
        this.elements.weakPointButton.title = isWeak ? '弱点解除' : '弱点登録';
    },

    setupImageInterval: function() {
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
        this.loadImageTags();
        this.loadMemberQuotes().then(() => {
            if (this.state.gameRunning && this.state.isPaused) {
                this.state.isPaused = false;
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            } else if (this.state.gameRunning && !this.state.isPaused) {
                if (!this.state.currentMember) this.nextEROImage(); // 初回メンバー選択含む
                else this.displayQuoteAndTags(); // 既存表示を更新
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            }
            this.updateUI();
        });
        if (!this.state.currentMember && this.dependencies.app) this.dependencies.app.applyTheme(null);
        else if (this.state.currentMember && this.dependencies.app) this.dependencies.app.applyTheme(this.state.currentMember.color);
        // 背景パルスは廃止
        console.log("Shikoshiko Mode Activated (New Options).");
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.state.gameRunning && !this.state.isPaused) {
            this.state.isPaused = true; this.pauseShikoAnimationAndSound();
            if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); this.state.imageIntervalId = null;
            this.updateUI(); console.log("Shikoshiko Mode Paused due to tab change.");
        }
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
    },
    setCounterModeDependency: function(counterModeInstance) { this.dependencies.counterMode = counterModeInstance; },
    handleTouchStart: function(event) {
        if (!this.state.gameRunning || this.state.isPaused || event.touches.length === 0) return;
        this.state.touchStartX = event.touches[0].clientX; this.state.touchEndX = event.touches[0].clientX;
    },
    handleTouchMove: function(event) {
        if (!this.state.gameRunning || this.state.isPaused || event.touches.length === 0) return;
        this.state.touchEndX = event.touches[0].clientX;
        if (Math.abs(this.state.touchStartX - this.state.touchEndX) > 10) event.preventDefault();
    },
    handleTouchEnd: function(event) {
        if (!this.state.gameRunning || this.state.isPaused) return;
        const touchDiff = this.state.touchStartX - this.state.touchEndX;
        if (Math.abs(touchDiff) > this.state.swipeThreshold) { console.log("Swipe detected - Skip Next"); this.skipCurrentImage(); }
        this.state.touchStartX = 0; this.state.touchEndX = 0;
    },
    handleGlobalKeydown: function(event) {
        if (!this.state.isActive) return;
        if (this.state.gameRunning && !this.state.isPaused) {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); this.skipCurrentImage(); }
        }
    }
};
