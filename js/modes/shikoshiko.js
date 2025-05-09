// js/modes/shikoshiko.js

const ShikoshikoMode = {
    // DOM要素への参照 (init内で設定)
    elements: {
        section: null,
        settingsPanel: null, settingsToggle: null, settingsContent: null,
        memberSlidersContainer: null,
        durationMinutesInput: null, durationSecondsInput: null,
        pulseBrightnessSlider: null, pulseBrightnessValue: null,
        stickerSettingsGroup: null, stickerChoiceContainer: null, clearAllStickersButton: null, // ステッカー関連
        gameArea: null,
        memberNameDisplay: null, weakPointButton: null,
        timerDisplay: null, progressBarInner: null,
        memberImageContainer: null, memberImage: null,
        shikoAnimationContainer: null, saoImage: null, shikoshikoAnimationImage: null,
        controlsArea: null,
        startButton: null, finishButton: null, skipButton: null,
    },

    // 状態変数
    state: {
        isActive: false, // このモードがアクティブかどうか
        gameRunning: false,
        settings: { // デフォルト設定 (storage.js から読み込んだ値で上書き)
            memberWeights: {},
            duration: 30, // 秒
            pulseBrightness: 3,
        },
        timerId: null,
        imageIntervalId: null, // 画像切り替え用のインターバルID
        remainingTime: 0,
        currentBPM: 60, // 初期BPM
        currentMember: null,
        currentEROImages: [],
        currentEROImageIndex: 0,
        metronomeAudioContext: null,
        metronomeSoundBuffers: [],
        loadedSoundCount: 0,
        metronomeTimeoutId: null, // メトロノーム音再生スケジューリング用
        selectedStickerPath: null,
        pastedStickers: {},
    },

    // 設定や定数 (config.js から読み込む値も含む)
    config: {
        members: [],
        imageSlideInterval: 5000,
        bpmLevels: [
            { threshold: 0.8, bpm: 80 }, { threshold: 0.6, bpm: 100 },
            { threshold: 0.4, bpm: 120 }, { threshold: 0.2, bpm: 150 },
            { threshold: 0.0, bpm: 180 }
        ],
        soundFilePaths: [], // initでconfig.jsから設定
        stickerImagePaths: [], // initでconfig.jsから設定
        stickerBaseHue: 0,     // initでconfig.jsから設定
    },

    // 依存モジュールへの参照 (app.js から設定される)
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

        // DOM要素取得
        this.elements.section = this.dependencies.domUtils.qs('#shikoshikoModeSection');
        this.elements.settingsToggle = this.dependencies.domUtils.qs('#shikoshikoSettingsToggle');
        this.elements.settingsContent = this.dependencies.domUtils.qs('#shikoshikoSettingsContent');
        this.elements.memberSlidersContainer = this.dependencies.domUtils.qs('#shikoshikoMemberSliders');
        this.elements.durationMinutesInput = this.dependencies.domUtils.qs('#durationMinutes');
        this.elements.durationSecondsInput = this.dependencies.domUtils.qs('#durationSeconds');
        this.elements.pulseBrightnessSlider = this.dependencies.domUtils.qs('#pulseBrightnessSlider');
        this.elements.pulseBrightnessValue = this.dependencies.domUtils.qs('#pulseBrightnessValue');
        this.elements.stickerSettingsGroup = this.dependencies.domUtils.qs('#shikoshikoStickerSettingsGroup');
        this.elements.stickerChoiceContainer = this.dependencies.domUtils.qs('#shikoshikoStickerChoiceContainer');
        this.elements.clearAllStickersButton = this.dependencies.domUtils.qs('#shikoshikoClearAllStickersButton');
        this.elements.gameArea = this.dependencies.domUtils.qs('#shikoshikoGameArea');
        this.elements.memberNameDisplay = this.dependencies.domUtils.qs('#shikoshikoMemberName');
        this.elements.weakPointButton = this.dependencies.domUtils.qs('#shikoshikoWeakPointButton');
        this.elements.timerDisplay = this.dependencies.domUtils.qs('#shikoshikoTimerDisplay');
        this.elements.progressBarInner = this.dependencies.domUtils.qs('#shikoshikoProgressBarInner');
        this.elements.memberImageContainer = this.dependencies.domUtils.qs('#shikoshikoMemberImageContainer');
        this.elements.memberImage = this.dependencies.domUtils.qs('#shikoshikoMemberImage');
        this.elements.shikoAnimationContainer = this.dependencies.domUtils.qs('#shikoAnimationContainer');
        this.elements.saoImage = this.dependencies.domUtils.qs('#saoImage');
        this.elements.shikoshikoAnimationImage = this.dependencies.domUtils.qs('#shikoshikoAnimationImage');
        this.elements.controlsArea = this.dependencies.domUtils.qs('#shikoshikoControlsArea');
        this.elements.startButton = this.dependencies.domUtils.qs('#shikoshikoStartButton');
        this.elements.finishButton = this.dependencies.domUtils.qs('#shikoshikoFinishButton');
        this.elements.skipButton = this.dependencies.domUtils.qs('#shikoshikoSkipButton');

        // config.js から設定をマージ
        if (initialConfig.members) this.config.members = initialConfig.members;
        if (initialConfig.shikoshikoDefaultSettings) {
            const sds = initialConfig.shikoshikoDefaultSettings;
            if (sds.imageSlideInterval !== undefined) this.config.imageSlideInterval = sds.imageSlideInterval;
            if (sds.bpmLevels) this.config.bpmLevels = sds.bpmLevels;
            if (sds.soundFilePaths) {
                this.config.soundFilePaths = sds.soundFilePaths;
                console.log("ShikoshikoMode: Sound paths loaded from config.js:", this.config.soundFilePaths);
            } else {
                console.warn("ShikoshikoMode: soundFilePaths not found in config.js shikoshikoDefaultSettings. Using hardcoded defaults (if any).");
            }
        } else {
            console.warn("ShikoshikoMode: shikoshikoDefaultSettings not found in config.js. Using internal defaults for shikoshiko settings.");
        }
        if (initialConfig.stickerImagePaths) this.config.stickerImagePaths = initialConfig.stickerImagePaths;
        if (initialConfig.STICKER_BASE_COLOR_HEX) {
            const hsl = this.dependencies.utils.hexToHsl(initialConfig.STICKER_BASE_COLOR_HEX);
            if (hsl) this.config.stickerBaseHue = hsl[0];
        }

        this.loadSettings();
        this.loadPastedStickers();

        this.dependencies.uiComponents.initAccordion('#shikoshikoSettingsToggle', '#shikoshikoSettingsContent');
        if (this.config.members && this.config.members.length > 0) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#shikoshikoMemberSliders',
                this.config.members,
                this.state.settings.memberWeights,
                (memberName, newValue) => {
                    this.state.settings.memberWeights[memberName] = newValue;
                    this.saveSettings();
                }
            );
        } else {
            if(this.elements.memberSlidersContainer) this.elements.memberSlidersContainer.innerHTML = "<p>メンバーデータがありません。</p>";
        }

        this.dependencies.uiComponents.initGenericSlider(
            '#pulseBrightnessSlider', '#pulseBrightnessValue',
            (newValue) => {
                this.state.settings.pulseBrightness = newValue;
                this.applyPulseBrightness();
                this.saveSettings();
            }
        );
        if (this.config.stickerImagePaths && this.config.stickerImagePaths.length > 0) {
            this.dependencies.domUtils.toggleDisplay(this.elements.stickerSettingsGroup, true);
            this.dependencies.uiComponents.createStickerChoices(
                '#shikoshikoStickerChoiceContainer',
                this.config.stickerImagePaths,
                (selectedPath) => {
                    if (this.state.gameRunning) { // ゲーム中はステッカー選択を無効にするか、選択だけさせて貼らせない
                        console.log("Sticker selection disabled during game.");
                        this.deselectSticker(); // 念のため選択解除
                        return;
                    }
                    this.state.selectedStickerPath = selectedPath;
                    this.updateStickerCursor();
                }
            );
        }

        this.addEventListeners();
        this.initAudio();
        this.loadSounds();
        this.updateUI();
        console.log("Shikoshiko Mode Initialized.");
    },

    addEventListeners: function() {
        const du = this.dependencies.domUtils;
        if (this.elements.startButton) du.on(this.elements.startButton, 'click', () => this.startGame());
        if (this.elements.finishButton) du.on(this.elements.finishButton, 'click', () => this.finishGame(true));
        if (this.elements.skipButton) du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());
        if (this.elements.durationMinutesInput) du.on(this.elements.durationMinutesInput, 'change', () => this.handleDurationChange());
        if (this.elements.durationSecondsInput) du.on(this.elements.durationSecondsInput, 'change', () => this.handleDurationChange());
        if (this.elements.weakPointButton) du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());
        if (this.elements.memberImageContainer) du.on(this.elements.memberImageContainer, 'click', (event) => this.handleImageContainerClick(event));
        if (this.elements.clearAllStickersButton) du.on(this.elements.clearAllStickersButton, 'click', () => this.clearAllPastedStickersForCurrentImage());
    },

    loadSettings: function() {
        const loadedSettings = this.dependencies.storage.loadShikoshikoSettings();
        // console.log("Shikoshiko loadSettings - loadedSettings from storage:", JSON.parse(JSON.stringify(loadedSettings)));

        const defaultMemberWeights = {};
        if (this.config.members && Array.isArray(this.config.members)) {
            this.config.members.forEach(member => {
                if (member && member.name) defaultMemberWeights[member.name] = 3;
            });
        }

        const defaultBaseSettings = {
            memberWeights: defaultMemberWeights,
            durationMinutes: 0,
            durationSeconds: 30,
            pulseBrightness: 3,
        };

        this.state.settings = { ...defaultBaseSettings, ...loadedSettings };
        if (loadedSettings && loadedSettings.memberWeights) {
             this.state.settings.memberWeights = { ...defaultMemberWeights, ...loadedSettings.memberWeights };
        } else {
             this.state.settings.memberWeights = defaultMemberWeights;
        }
        // durationMinutes と durationSeconds を settings から復元
        this.state.settings.duration = (this.state.settings.durationMinutes * 60) + this.state.settings.durationSeconds;
        if (this.state.settings.duration <=0) this.state.settings.duration = 30;


        // console.log("Shikoshiko loadSettings - final this.state.settings:", JSON.parse(JSON.stringify(this.state.settings)));

        if (this.elements.durationMinutesInput) this.elements.durationMinutesInput.value = this.state.settings.durationMinutes || 0;
        if (this.elements.durationSecondsInput) this.elements.durationSecondsInput.value = this.state.settings.durationSeconds !==undefined ? this.state.settings.durationSeconds : 30;
        if (this.elements.pulseBrightnessSlider) this.elements.pulseBrightnessSlider.value = this.state.settings.pulseBrightness !==undefined ? this.state.settings.pulseBrightness : 3;

        this.applyPulseBrightness();
        this.updateDurationFromInputs();
    },
    saveSettings: function() {
        // durationMinutes と durationSeconds も保存対象に含める
        const settingsToSave = {
            ...this.state.settings,
            durationMinutes: parseInt(this.elements.durationMinutesInput.value, 10) || 0,
            durationSeconds: parseInt(this.elements.durationSecondsInput.value, 10) || 0,
        };
        this.dependencies.storage.saveShikoshikoSettings(settingsToSave);
        // console.log("Shikoshiko settings saved:", settingsToSave);
    },
    handleDurationChange: function() {
        this.updateDurationFromInputs();
        this.saveSettings();
    },
    updateDurationFromInputs: function() {
        const minutes = parseInt(this.elements.durationMinutesInput.value, 10) || 0;
        const seconds = parseInt(this.elements.durationSecondsInput.value, 10) || 0;
        let newDuration = (minutes * 60) + seconds;
        if (newDuration <= 0) {
            newDuration = 30; // 最小時間を30秒とする
            if(this.elements.durationMinutesInput) this.elements.durationMinutesInput.value = 0;
            if(this.elements.durationSecondsInput) this.elements.durationSecondsInput.value = 30;
        }
        this.state.settings.duration = newDuration;
        this.state.settings.durationMinutes = Math.floor(newDuration / 60);
        this.state.settings.durationSeconds = newDuration % 60;

        if (!this.state.gameRunning && this.elements.timerDisplay) {
            this.dependencies.domUtils.setText(this.elements.timerDisplay, this.dependencies.utils.formatTime(this.state.settings.duration));
        }
    },
    applyPulseBrightness: function() {
        const brightness = this.state.settings.pulseBrightness;
        const factor = 1.0 + (brightness * 0.06);
        document.documentElement.style.setProperty('--pulse-brightness-factor', factor.toFixed(2));
        if(this.elements.pulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.pulseBrightnessValue, String(brightness));
    },

    startGame: function() {
        if (this.state.gameRunning) return;
        console.log("Shikoshiko game starting...");
        this.deselectSticker(); // ゲーム開始時にステッカー選択解除

        this.selectRandomMember();
        if (!this.state.currentMember) {
            alert("表示できるメンバーがいません。出現率と各メンバーのERO画像数を確認してください。");
            this.state.gameRunning = false;
            return;
        }
        this.state.gameRunning = true;

        this.state.remainingTime = this.state.settings.duration;
        this.currentEROImageIndex = -1;
        this.updateUI();
        this.updateTimerDisplay();
        this.updateProgressBar();
        this.updateBPM();
        this.startShikoAnimation();
        // this.playMetronomeSound(); // scheduleMetronomeSoundが初回再生を行う

        this.state.timerId = setInterval(() => this.gameLoop(), 1000);
        this.nextEROImage(); // 初回画像表示
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); // 既存のインターバルをクリア
        this.state.imageIntervalId = setInterval(() => this.nextEROImage(), this.config.imageSlideInterval);

        this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
        if (this.state.settings.pulseBrightness > 0) {
            this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
        } else {
            this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        }
        this.renderPastedStickers();
    },

    gameLoop: function() {
        if (!this.state.gameRunning) return;
        this.state.remainingTime--;
        this.updateTimerDisplay();
        this.updateProgressBar();
        this.updateBPM();

        if (this.state.remainingTime <= 0) {
            this.finishGame(false);
        }
    },

    finishGame: function(manualFinish) {
        if (!this.state.gameRunning) return;
        console.log(`Shikoshiko game finished. Manual: ${manualFinish}`);
        this.state.gameRunning = false;

        if(this.state.timerId) clearInterval(this.state.timerId);
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.stopShikoAnimation(); // これがメトロノームも止める

        this.updateUI();
        if (this.elements.timerDisplay) this.dependencies.domUtils.setText(this.elements.timerDisplay, manualFinish ? "フィニッシュ！" : "時間切れ！");
        if (this.elements.progressBarInner) this.elements.progressBarInner.style.width = manualFinish ? '100%' : '0%';

        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(
                `${this.state.currentMember.name} で${manualFinish ? 'フィニッシュしました！' : '時間切れです。'}`,
                manualFinish ? 'success' : 'info'
            );
            if (manualFinish && this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
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
                ? Number(this.state.settings.memberWeights[member.name]) // 数値に変換
                : 3;
            if (weight > 0 && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                weightedMembers.push({ member, weight });
            }
        });

        if (weightedMembers.length === 0) {
            this.state.currentMember = null;
            console.error("ShikoshikoMode: No weighted members available for selection.");
            return;
        }

        const totalWeight = weightedMembers.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeight <= 0) {
            this.state.currentMember = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        } else {
            let randomNum = Math.random() * totalWeight;
            let foundMember = null;
            for (const item of weightedMembers) {
                randomNum -= item.weight;
                if (randomNum < 0) {
                    foundMember = item.member;
                    break;
                }
            }
            this.state.currentMember = foundMember || this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        }
        console.log("Selected member:", this.state.currentMember ? this.state.currentMember.name : "None");

        this.state.currentEROImages = [];
        if (this.state.currentMember) {
            const eroFolder = this.state.currentMember.imageFolders.ero;
            for (let i = 1; i <= eroFolder.imageCount; i++) {
                this.state.currentEROImages.push(`${eroFolder.path}${i}.jpg`); // jpg固定。必要ならconfigで拡張子指定
            }
        }
    },

    nextEROImage: function() {
        if (!this.state.currentMember || this.state.currentEROImages.length === 0) {
            if (this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
            return;
        }
        this.currentEROImageIndex = (this.currentEROImageIndex + 1) % this.state.currentEROImages.length;
        const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
        const memberImageElement = this.elements.memberImage;

        if (!memberImageElement) return;
        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => {
            console.error(`Failed to load image: ${imagePath}`);
            memberImageElement.src = 'images/placeholder.png';
            this.dependencies.domUtils.addClass(memberImageElement, 'image-error');
        };
        memberImageElement.onload = () => {
            this.dependencies.domUtils.removeClass(memberImageElement, 'image-error');
            this.updateWeakPointButtonState();
            this.renderPastedStickers();
        };

        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
    },

    skipCurrentImage: function() {
        if (!this.state.gameRunning) return;
        this.nextEROImage();
    },

    updateUI: function() {
        const du = this.dependencies.domUtils;
        if(this.elements.startButton) du.toggleDisplay(this.elements.startButton, !this.state.gameRunning);
        if(this.elements.finishButton) du.toggleDisplay(this.elements.finishButton, this.state.gameRunning);
        if(this.elements.skipButton) du.toggleDisplay(this.elements.skipButton, this.state.gameRunning);
        if(this.elements.weakPointButton) du.toggleDisplay(this.elements.weakPointButton, this.state.gameRunning && !!this.state.currentMember);

        if (this.state.gameRunning && this.state.currentMember) {
            if(this.elements.memberNameDisplay) du.setText(this.elements.memberNameDisplay, this.state.currentMember.name);
            if(this.elements.memberImage) this.elements.memberImage.style.borderColor = this.state.currentMember.color || 'var(--default-border-color)';
            if(this.elements.progressBarInner) this.elements.progressBarInner.style.backgroundColor = this.state.currentMember.color || 'var(--member-accent-color)';
        } else {
            if(this.elements.memberNameDisplay) du.setText(this.elements.memberNameDisplay, "メンバー名");
            if(this.elements.memberImage) {
                this.elements.memberImage.src = 'images/placeholder.png';
                this.elements.memberImage.style.borderColor = 'var(--default-border-color)';
            }
            if(this.elements.progressBarInner) this.elements.progressBarInner.style.backgroundColor = 'var(--member-accent-color)';
            this.updateTimerDisplay();
            this.updateProgressBar();
        }
        this.updateWeakPointButtonState();
    },
    updateTimerDisplay: function() {
        if (!this.elements.timerDisplay) return;
        const timeToShow = this.state.gameRunning ? this.state.remainingTime : (this.state.settings.duration || 0);
        this.dependencies.domUtils.setText(this.elements.timerDisplay, this.dependencies.utils.formatTime(timeToShow));
    },
    updateProgressBar: function() {
        if (!this.elements.progressBarInner) return;
        const totalDuration = this.state.settings.duration;
        const percentage = totalDuration > 0
            ? Math.max(0, (this.state.remainingTime / totalDuration) * 100)
            : (this.state.gameRunning ? 0 : 100);
        this.elements.progressBarInner.style.width = `${percentage}%`;
    },

    updateBPM: function() {
        if (!this.state.gameRunning) {
            this.state.currentBPM = 60;
        } else {
            const totalDuration = this.state.settings.duration;
            if (totalDuration <= 0) { // 0除算を避ける
                this.state.currentBPM = this.config.bpmLevels[this.config.bpmLevels.length - 1].bpm;
            } else {
                const progressRatio = this.state.remainingTime / totalDuration;
                let newBPM = this.config.bpmLevels[this.config.bpmLevels.length - 1].bpm;
                for (const level of this.config.bpmLevels) {
                    if (progressRatio >= level.threshold) {
                        newBPM = level.bpm;
                        break;
                    }
                }
                this.state.currentBPM = newBPM;
            }
            // console.log(`BPM updated to: ${this.state.currentBPM}`);
            this.updateShikoAnimationSpeed(); // BPMが変わったらアニメーション速度も更新
        }
    },
    updateShikoAnimationSpeed: function() {
        if (this.state.currentBPM <= 0) {
            this.stopShikoAnimation();
            return;
        }
        const animationDurationMs = (60 / this.state.currentBPM) * 1000;
        document.documentElement.style.setProperty('--shiko-animation-duration', `${animationDurationMs.toFixed(0)}ms`);
    },
    startShikoAnimation: function() {
        if (!this.elements.shikoshikoAnimationImage) return;
        this.updateShikoAnimationSpeed();
        this.dependencies.domUtils.addClass(this.elements.shikoshikoAnimationImage, 'play');
        this.scheduleMetronomeSound(); // メトロノーム開始
    },
    stopShikoAnimation: function() {
        if (!this.elements.shikoshikoAnimationImage) return;
        this.dependencies.domUtils.removeClass(this.elements.shikoshikoAnimationImage, 'play');
        if (this.state.metronomeTimeoutId) {
            clearTimeout(this.state.metronomeTimeoutId);
            this.state.metronomeTimeoutId = null;
        }
    },
    initAudio: function() {
        if (!this.state.metronomeAudioContext && (window.AudioContext || window.webkitAudioContext)) {
            try {
                this.state.metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Failed to create AudioContext:", e);
            }
        }
    },
    loadSounds: async function() {
        if (!this.state.metronomeAudioContext || !this.config.soundFilePaths || this.config.soundFilePaths.length === 0) {
            console.warn("AudioContext not available or no sound files configured to load.");
            return;
        }
        this.state.loadedSoundCount = 0;
        this.state.metronomeSoundBuffers = [];
        console.log("Loading sounds from paths:", this.config.soundFilePaths);

        for (const path of this.config.soundFilePaths) {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${path}`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.state.metronomeAudioContext.decodeAudioData(arrayBuffer);
                this.state.metronomeSoundBuffers.push(audioBuffer);
                this.state.loadedSoundCount++;
            } catch (error) {
                console.error(`Failed to load or decode sound: ${path}`, error);
            }
        }
        if (this.state.loadedSoundCount > 0) {
            console.log(`${this.state.loadedSoundCount} metronome sounds loaded.`);
        } else {
            console.warn("No metronome sounds could be loaded. Check paths and file integrity.");
        }
    },
    playMetronomeSound: function() {
        if (!this.state.metronomeAudioContext || this.state.metronomeSoundBuffers.length === 0 || !this.state.gameRunning) {
            return;
        }
        if (this.state.metronomeAudioContext.state === 'suspended') {
            this.state.metronomeAudioContext.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
        if (this.state.metronomeAudioContext.state !== 'running') return; // 再開できなかった場合

        const randomBuffer = this.dependencies.utils.getRandomElement(this.state.metronomeSoundBuffers);
        if (randomBuffer) {
            try {
                const source = this.state.metronomeAudioContext.createBufferSource();
                source.buffer = randomBuffer;
                source.connect(this.state.metronomeAudioContext.destination);
                source.start();
            } catch (e) {
                console.error("Error playing metronome sound:", e);
            }
        }
    },
    scheduleMetronomeSound: function() {
        if (this.state.metronomeTimeoutId) clearTimeout(this.state.metronomeTimeoutId);
        if (!this.state.gameRunning || this.state.currentBPM <= 0 || this.state.metronomeSoundBuffers.length === 0) return;

        // 最初の音を鳴らす
        this.playMetronomeSound();

        // 次の音をスケジュール
        const intervalMs = (60 / this.state.currentBPM) * 1000;
        this.state.metronomeTimeoutId = setTimeout(() => {
            this.scheduleMetronomeSound(); // 再帰的に呼び出し
        }, intervalMs);
    },

    toggleWeakPoint: function() {
        if (!this.elements.weakPointButton) return;
        const relPath = this.elements.weakPointButton.dataset.relpath;
        if (!relPath) return;

        const weakPoints = this.dependencies.storage.loadWeakPoints();
        if (weakPoints.has(relPath)) {
            weakPoints.delete(relPath);
        } else {
            weakPoints.add(relPath);
        }
        this.dependencies.storage.saveWeakPoints(weakPoints);
        this.updateWeakPointButtonState();
        if (this.dependencies.app && typeof this.dependencies.app.notifyWeakPointChange === 'function') {
             this.dependencies.app.notifyWeakPointChange(relPath, weakPoints.has(relPath));
        }
    },
    updateWeakPointButtonState: function() {
        if (!this.elements.weakPointButton) return;
        const relPath = this.elements.weakPointButton.dataset.relpath;
        if (!relPath || !this.state.gameRunning && !this.state.currentMember) { // ゲーム中でなくてもキャラがいれば表示
            this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false);
            return;
        }
        this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, true);
        const weakPoints = this.dependencies.storage.loadWeakPoints();
        const isWeak = weakPoints.has(relPath);
        this.dependencies.domUtils.setText(this.elements.weakPointButton, isWeak ? '★' : '☆');
        this.dependencies.domUtils.toggleClass(this.elements.weakPointButton, 'is-weak', isWeak);
        this.elements.weakPointButton.title = isWeak ? '弱点解除' : '弱点登録';
    },

    loadPastedStickers: function() {
        this.state.pastedStickers = this.dependencies.storage.loadStickerData() || {};
    },
    savePastedStickers: function() {
        this.dependencies.storage.saveStickerData(this.state.pastedStickers);
    },
    renderPastedStickers: function() {
        if (!this.elements.memberImageContainer) return;
        this.dependencies.domUtils.qsa('.pasted-sticker', this.elements.memberImageContainer)
            .forEach(el => el.remove());

        if (!this.state.currentMember || !this.elements.memberImage || !this.elements.memberImage.src || this.elements.memberImage.src.endsWith('placeholder.png')) {
            return;
        }
        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath; // 表示中の画像のrelpathを取得
        if (!currentImageRelPath) return;

        const stickersForCurrentImage = this.state.pastedStickers[currentImageRelPath] || [];

        stickersForCurrentImage.forEach(stickerData => {
            const stickerElement = this.dependencies.domUtils.createElement('img', {
                class: 'pasted-sticker',
                src: stickerData.stickerSrc,
                alt: 'ステッカー',
                style: `left: ${stickerData.x}%; top: ${stickerData.y}%; transform: translate(-50%, -50%) rotate(${stickerData.rotation || 0}deg) scale(${stickerData.scale || 1}); filter: ${stickerData.filter || 'none'};`
            });
            this.elements.memberImageContainer.appendChild(stickerElement);
        });
    },
    handleImageContainerClick: function(event) {
        if (!this.state.selectedStickerPath || !this.elements.memberImageContainer) return;
        // ゲーム中はステッカーを貼れないようにする (または設定画面でのみ貼れるようにする)
        if (this.state.gameRunning) {
            console.log("Cannot paste stickers during game.");
            return;
        }
        if (!this.state.currentMember || !this.elements.memberImage.src || this.elements.memberImage.src.endsWith('placeholder.png')) {
            console.log("Cannot paste sticker: No member image displayed.");
            return;
        }

        const rect = this.elements.memberImageContainer.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath; // 表示中の画像のrelpath
        if (!currentImageRelPath) {
            console.warn("Cannot paste sticker: currentImageRelPath is not set on weakPointButton.");
            return;
        }

        if (!this.state.pastedStickers[currentImageRelPath]) {
            this.state.pastedStickers[currentImageRelPath] = [];
        }

        let hueRotationFilter = 'none';
        const memberColor = this.state.currentMember?.color; // currentMemberがnullでないことを確認
        if (memberColor && this.config.stickerBaseHue !== undefined) {
            const targetHsl = this.dependencies.utils.hexToHsl(memberColor);
            if (targetHsl) {
                let diff = targetHsl[0] - this.config.stickerBaseHue;
                while (diff <= -180) diff += 360;
                while (diff > 180) diff -= 360;
                hueRotationFilter = `hue-rotate(${Math.round(diff)}deg)`;
            }
        }

        const newStickerData = {
            stickerSrc: this.state.selectedStickerPath,
            x: x, y: y,
            rotation: this.dependencies.utils.getRandomInt(-15, 15),
            scale: this.dependencies.utils.getRandomInt(80, 120) / 100, // 0.8 ~ 1.2
            filter: hueRotationFilter
        };

        this.state.pastedStickers[currentImageRelPath].push(newStickerData);
        this.savePastedStickers();
        this.renderPastedStickers();
        this.deselectSticker(); // 貼ったら選択解除
    },
    clearAllPastedStickersForCurrentImage: function() {
        if (!this.state.currentMember) return;
        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath;
        if (!currentImageRelPath) return;

        if (this.state.pastedStickers[currentImageRelPath]) {
            delete this.state.pastedStickers[currentImageRelPath];
            this.savePastedStickers();
            this.renderPastedStickers();
            console.log(`Cleared all stickers for ${currentImageRelPath}`);
        }
    },
    updateStickerCursor: function() {
        // document.body.style.cursor = this.state.selectedStickerPath
        //     ? `url('${this.state.selectedStickerPath}') 25 25, auto` // 25 25 はカーソルのホットスポット (中央)
        //     : 'auto';
        // 上記はあまり推奨されないため、CSSで専用のカーソルプレビュー要素を動かす方が良い
    },
    deselectSticker: function() {
        this.state.selectedStickerPath = null;
        if (this.elements.stickerChoiceContainer) {
            this.dependencies.domUtils.qsa('.sticker-choice-button.selected', this.elements.stickerChoiceContainer)
                .forEach(btn => this.dependencies.domUtils.removeClass(btn, 'selected'));
        }
        this.updateStickerCursor();
    },

    activate: function() {
        this.state.isActive = true;
        if (this.elements.section) {
            this.dependencies.domUtils.addClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        }
        this.loadSettings();
        this.loadPastedStickers(); // アクティブ化時にもステッカー読み込み
        this.updateUI();

        if (this.state.gameRunning && this.state.currentMember) {
            this.dependencies.app.applyTheme(this.state.currentMember.color);
            this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
            if (this.state.settings.pulseBrightness > 0) {
                this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
            } else {
                this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            }
            this.renderPastedStickers(); // ゲーム再開時にステッカー表示
        } else {
            this.dependencies.app.applyTheme(null);
            this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
            this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            // ゲーム中でなくても、前回表示していたメンバー画像があればステッカー表示
            if (this.state.currentMember && this.elements.memberImage && !this.elements.memberImage.src.endsWith('placeholder.png')) {
                 this.renderPastedStickers();
            }
        }
        this.deselectSticker();
        console.log("Shikoshiko Mode Activated.");
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.state.gameRunning) {
            this.finishGame(false);
        }
        if (this.elements.section) {
            this.dependencies.domUtils.removeClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        }
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.deselectSticker();
        console.log("Shikoshiko Mode Deactivated.");
    },

    setCounterModeDependency: function(counterModeInstance) {
        this.dependencies.counterMode = counterModeInstance;
    },

    handleGlobalKeydown: function(event) {
        if (!this.state.isActive) return;
        // ステッカー選択中はキー操作無効 (ESCで解除など別途実装も可)
        if (this.state.selectedStickerPath) return;

        if (this.state.gameRunning) {
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                this.skipCurrentImage();
            }
        }
    }
};
