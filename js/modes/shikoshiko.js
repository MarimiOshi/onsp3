// js/modes/shikoshiko.js

const ShikoshikoMode = {
    // ... (elements, state, config, dependencies は変更なし) ...

    init: function(appInstance, initialConfig) {
        // ... (既存の初期化処理) ...
        this.dependencies.app = appInstance;
        this.dependencies.storage = StorageService;
        this.dependencies.utils = Utils;
        this.dependencies.domUtils = DOMUtils;
        this.dependencies.uiComponents = UIComponents;
        console.log("Initializing Shikoshiko Mode (Sound Fix Attempt)...");

        // DOM要素取得 (変更なし)
        this.elements.section = this.dependencies.domUtils.qs('#shikoshikoModeSection');
        // ... (他の要素取得も同様) ...
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
        this.elements.carouselViewport = this.dependencies.domUtils.qs('#shikoshikoCarouselViewport');
        this.elements.carouselTrack = this.dependencies.domUtils.qs('#shikoshikoCarouselTrack');
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
        // loadMemberQuotesはactivate時にthenで待つように変更したので、ここでは呼び出しのみ
        this.loadMemberQuotes();

        this.initModalUI();
        this.addEventListeners(); // ★ AudioContextのresumeをここにも追加検討
        this.initAudio();     // ★ AudioContextの生成を先に行う
        this.loadSounds();      // ★ サウンドのロードを開始

        this.state.gameRunning = true;
        this.state.isPaused = true; // ★★★ 初期状態を一時停止にする ★★★
        this.applyFixedBpm();
        this.buildDisplayableImageList();
        if (this.state.displayableImageList.length > 0) {
            this.currentCarouselCenterIndex = this.dependencies.utils.getRandomInt(0, this.state.displayableImageList.length - 1);
        } else {
            this.currentCarouselCenterIndex = 0;
        }
        this.prepareCarouselItems(); // activateの前に準備しておく

        console.log("Shikoshiko Mode Initialized (Sound Fix Attempt, Starts Paused).");
    },

    // ... (cacheAllMemberEROImages, initModalUI は変更なし) ...
    cacheAllMemberEROImages: function() {
        this.state.allMemberEROImages = {};
        (this.config.members || []).forEach(member => {
            if (member && member.name && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                this.state.allMemberEROImages[member.name] = [];
                const eroFolder = member.imageFolders.ero;
                for (let i = 1; i <= eroFolder.imageCount; i++) {
                    const fileName = `${i}.jpg`;
                    const relativePath = `${member.name}/ero/${fileName}`;
                    this.state.allMemberEROImages[member.name].push({
                        member: member,
                        path: `${eroFolder.path}${fileName}`,
                        relativePath: relativePath,
                        imageNumber: i
                    });
                }
            }
        });
        // console.log("ShikoshikoMode CACHE: allMemberEROImages built:", JSON.parse(JSON.stringify(this.state.allMemberEROImages)));
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
        if (this.elements.startButton) {
            du.on(this.elements.startButton, 'click', () => {
                // ★★★ 最初のクリックでAudioContextを確実に再開 ★★★
                if (this.state.metronomeAudioContext && this.state.metronomeAudioContext.state === 'suspended') {
                    this.state.metronomeAudioContext.resume().then(() => {
                        console.log("AudioContext resumed by user interaction (Start/Pause Button).");
                        this.togglePauseGame(); // AudioContextが再開してからゲームの状態をトグル
                    }).catch(e => {
                        console.error("Error resuming AudioContext on button click:", e);
                        this.togglePauseGame(); // エラーでもUIは更新
                    });
                } else {
                    this.togglePauseGame();
                }
            });
        }
        if (this.elements.finishButton) du.on(this.elements.finishButton, 'click', () => this.handleFinishClick());
        if (this.elements.skipButton) du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());
        if (this.elements.weakPointButton) du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());
        if (this.elements.carouselViewport) {
            du.on(this.elements.carouselViewport, 'touchstart', (event) => this.handleTouchStart(event), { passive: true });
            du.on(this.elements.carouselViewport, 'touchmove', (event) => this.handleTouchMove(event), { passive: false });
            du.on(this.elements.carouselViewport, 'touchend', (event) => this.handleTouchEnd(event));
        }
        if (this.elements.openSettingsModalButton) du.on(this.elements.openSettingsModalButton, 'click', () => this.openSettingsModal());
        if (this.elements.closeModalButton) du.on(this.elements.closeModalButton, 'click', () => this.closeSettingsModal());
        if (this.elements.saveSettingsButton) du.on(this.elements.saveSettingsButton, 'click', () => this.saveModalSettings());
    },

    // ... (openSettingsModal, closeModal, saveModalSettings, loadSettings, saveSettings, applyFixedBpm, loadImageTags, loadMemberQuotes, displayCentralCarouselItemInfo は変更なし) ...
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
        this.buildDisplayableImageList();
        this.currentCarouselCenterIndex = 0;
        this.prepareCarouselItems();
        this.renderCarousel();
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
    displayCentralCarouselItemInfo: function() {
        // console.log("ShikoshikoMode DISPLAY_INFO: Attempting to display info for central item.");
        if (this.state.carouselItemsData.length === 0 || this.state.carouselItemsData.length <= this.config.carouselBufferSize) {
            // console.warn("ShikoshikoMode DISPLAY_INFO: Not enough items in carouselItemsData or empty.");
            this.clearMemberDisplay(); return;
        }
        const centerItemData = this.state.carouselItemsData[this.config.carouselBufferSize];
        if (!centerItemData || !centerItemData.member) {
            // console.warn("ShikoshikoMode DISPLAY_INFO: Central item data or member is missing.");
            this.clearMemberDisplay(); return;
        }
        // console.log("ShikoshikoMode DISPLAY_INFO: Central item data:", JSON.parse(JSON.stringify(centerItemData)));

        this.state.currentMember = centerItemData.member;
        this.dependencies.app.applyTheme(this.state.currentMember.color);

        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = centerItemData.relativePath;
        this.updateWeakPointButtonState();

        const memberQuotes = this.state.memberQuotes[this.state.currentMember.name] || [];
        // console.log(`ShikoshikoMode DISPLAY_INFO: Quotes for ${this.state.currentMember.name}:`, memberQuotes.length);
        let selectedQuoteText = "（……）";
        if (memberQuotes.length > 0) {
            const randomQuote = this.dependencies.utils.getRandomElement(memberQuotes);
            if (randomQuote) selectedQuoteText = randomQuote.text;
        }
        this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, selectedQuoteText);
        this.dependencies.domUtils.empty(this.elements.imageTagsContainer);
        const tagsForCurrentImage = centerItemData.relativePath ? (this.state.imageTags[centerItemData.relativePath] || []) : [];
        // console.log(`ShikoshikoMode DISPLAY_INFO: Tags for ${centerItemData.relativePath}:`, tagsForCurrentImage);
        if (tagsForCurrentImage.length > 0) {
            tagsForCurrentImage.sort().forEach(tagText => {
                const tagElement = this.dependencies.domUtils.createElement('span', { class: 'image-tag-item' }, [tagText]);
                this.elements.imageTagsContainer.appendChild(tagElement);
            });
            this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, true);
        } else this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
    },


    togglePauseGame: function() { /* 変更なし */ },
    handleFinishClick: function() { /* 変更なし */ },
    buildDisplayableImageList: function() { /* 変更なし */ },
    prepareCarouselItems: function() { /* 変更なし */ },
    renderCarousel: function() { /* 変更なし */ },
    moveCarousel: function(direction) { /* 変更なし */ },
    nextEROImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.moveCarousel('next'); },
    prevEROImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.moveCarousel('prev'); },
    skipCurrentImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.nextEROImage(); },
    updateUI: function() { /* 変更なし */ },
    updateShikoAnimationSpeed: function() { /* 変更なし */ },
    startShikoAnimation: function() { /* 変更なし */ },
    stopShikoAnimation: function() { /* 変更なし */ },
    pauseShikoAnimationAndSound: function() { /* 変更なし */ },
    resumeShikoAnimationAndSound: function() { /* 変更なし */ },

    initAudio: function() {
        if (!this.state.metronomeAudioContext && (window.AudioContext || window.webkitAudioContext)) {
            try {
                this.state.metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext created. Initial state:", this.state.metronomeAudioContext.state);
            } catch (e) {
                console.error("Failed to create AudioContext:", e);
            }
        }
    },
    loadSounds: async function() {
        if (!this.state.metronomeAudioContext || !this.config.soundFilePaths || this.config.soundFilePaths.length === 0) {
            console.warn("AudioContext not available or no sound files configured to load for metronome.");
            return;
        }
        this.state.loadedSoundCount = 0;
        this.state.metronomeSoundBuffers = [];
        console.log("ShikoshikoMode LOAD_SOUNDS: Starting to load sounds from paths:", this.config.soundFilePaths);

        for (const path of this.config.soundFilePaths) {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    console.error(`ShikoshikoMode LOAD_SOUNDS: HTTP error! status: ${response.status} for ${path}`);
                    throw new Error(`HTTP error! status: ${response.status} for ${path}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                // デコード前にAudioContextの状態を確認し、必要ならresumeを試みる
                if (this.state.metronomeAudioContext.state === 'suspended') {
                    console.log(`ShikoshikoMode LOAD_SOUNDS: AudioContext for ${path} is suspended, attempting to resume...`);
                    try {
                        await this.state.metronomeAudioContext.resume();
                        console.log(`ShikoshikoMode LOAD_SOUNDS: AudioContext resumed for ${path}. State: ${this.state.metronomeAudioContext.state}`);
                    } catch (resumeError) {
                        console.warn(`ShikoshikoMode LOAD_SOUNDS: Could not resume audio context for decoding ${path}`, resumeError);
                        // resumeに失敗しても、decodeAudioDataを試みる (ブラウザによってはsuspendedでもデコード可能な場合がある)
                    }
                }

                if (this.state.metronomeAudioContext.state === 'running' || this.state.metronomeAudioContext.state === 'suspended') { // suspendedでもデコード試行
                    const audioBuffer = await this.state.metronomeAudioContext.decodeAudioData(arrayBuffer);
                    this.state.metronomeSoundBuffers.push(audioBuffer);
                    this.state.loadedSoundCount++;
                    console.log(`ShikoshikoMode LOAD_SOUNDS: Successfully loaded and decoded ${path}`);
                } else {
                    console.warn(`ShikoshikoMode LOAD_SOUNDS: AudioContext not in a state to decode (${this.state.metronomeAudioContext.state}), cannot decode ${path}`);
                }
            } catch (error) {
                console.error(`ShikoshikoMode LOAD_SOUNDS: Failed to load or decode sound: ${path}`, error);
            }
        }
        if (this.state.loadedSoundCount > 0) {
            console.log(`ShikoshikoMode LOAD_SOUNDS: ${this.state.loadedSoundCount} metronome sounds loaded successfully.`);
        } else {
            console.warn("ShikoshikoMode LOAD_SOUNDS: No metronome sounds could be loaded. Check paths, file integrity, and user interaction for AudioContext.");
        }
    },
    playMetronomeSound: function() {
        if (!this.state.metronomeAudioContext || this.state.metronomeSoundBuffers.length === 0 || !this.state.gameRunning || this.state.isPaused) {
            // if (!this.state.gameRunning || this.state.isPaused) console.log("Metronome play skipped: game not running or paused");
            // else if (this.state.metronomeSoundBuffers.length === 0) console.log("Metronome play skipped: no sound buffers");
            return;
        }
        if (this.state.metronomeAudioContext.state === 'suspended') {
            console.log("playMetronomeSound: AudioContext is suspended, trying to resume...");
            this.state.metronomeAudioContext.resume().then(() => {
                console.log("playMetronomeSound: AudioContext resumed. State:", this.state.metronomeAudioContext.state);
                if (this.state.metronomeAudioContext.state === 'running') this._actualPlaySound();
            }).catch(e => console.error("Error resuming AudioContext on play:", e));
        } else if (this.state.metronomeAudioContext.state === 'running') {
            this._actualPlaySound();
        } else {
            console.log("playMetronomeSound: AudioContext not in runnable state:", this.state.metronomeAudioContext.state);
        }
    },
    _actualPlaySound: function() {
        const randomBuffer = this.dependencies.utils.getRandomElement(this.state.metronomeSoundBuffers);
        if (randomBuffer) {
            try {
                const source = this.state.metronomeAudioContext.createBufferSource();
                source.buffer = randomBuffer;
                source.connect(this.state.metronomeAudioContext.destination);
                source.start();
                // console.log("Metronome sound played.");
            } catch (e) {
                console.error("Error playing metronome sound in _actualPlaySound:", e);
            }
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
            this.buildDisplayableImageList();
            if (this.state.displayableImageList.length === 0) {
                console.error("ShikoshikoMode ACTIVATE: No displayable images after build. Cannot proceed.");
                this.clearMemberDisplayAndUpdate();
                this.dependencies.uiComponents.showNotification("表示可能な画像がありません。設定を確認してください。", "error");
                if (this.state.gameRunning) this.togglePauseGame();
                return;
            }
            // currentCarouselCenterIndex は最後に表示していたものを復元するか、ランダムにするか
            // ここでは activate のたびにランダムな位置から開始する
            this.currentCarouselCenterIndex = this.dependencies.utils.getRandomInt(0, this.state.displayableImageList.length - 1);
            this.prepareCarouselItems();
            this.renderCarousel();

            if (this.state.gameRunning && this.state.isPaused) {
                this.state.isPaused = false; // 再開
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            } else if (this.state.gameRunning && !this.state.isPaused) {
                // すでに実行中の場合（初回起動も含む）
                this.resumeShikoAnimationAndSound(); // アニメーションと音を（再）開始
                this.setupImageInterval(); // 自動スキップ設定を反映
            }
            this.updateUI();
        });
        // テーマ適用はdisplayCentralCarouselItemInfo内
        console.log("Shikoshiko Mode Activated (Carousel, Full Restore).");
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
        if(this.elements.carouselTrack) this.dependencies.domUtils.empty(this.elements.carouselTrack);
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
        if (Math.abs(touchDiff) > this.state.swipeThreshold) {
            if (touchDiff > 0) this.nextEROImage();
            else this.prevEROImage();
        }
        this.state.touchStartX = 0; this.state.touchEndX = 0;
    },
    handleGlobalKeydown: function(event) {
        if (!this.state.isActive) return;
        if (this.state.gameRunning && !this.state.isPaused) {
            if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
                event.preventDefault(); this.nextEROImage();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault(); this.prevEROImage();
            }
        }
    }
};
