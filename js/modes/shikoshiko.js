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
        remainingTime: 0,
        currentBPM: 60, // 初期BPM
        currentMember: null,
        currentEROImages: [],
        currentEROImageIndex: 0,
        shikoAnimationPlayStateTimeout: null,
        metronomeAudioContext: null,
        metronomeSoundBuffers: [], // sounds/フォルダの音源をデコードして格納
        loadedSoundCount: 0,
        selectedStickerPath: null, // 選択中のステッカー
        pastedStickers: {}, // 画像ごとのステッカー情報 { imageRelPath: [{stickerSrc, x, y, rotation, scale, filter}, ...] }
    },

    // 設定や定数 (config.js から読み込む値も含む)
    config: {
        imageSlideInterval: 5000, // ERO画像切り替え間隔 (ミリ秒)
        bpmLevels: [ // BPM変化の段階 (残り時間割合, BPM) - 例
            { threshold: 0.8, bpm: 80 },  // 残り80%以上
            { threshold: 0.6, bpm: 100 }, // 残り60%以上
            { threshold: 0.4, bpm: 120 }, // 残り40%以上
            { threshold: 0.2, bpm: 150 }, // 残り20%以上
            { threshold: 0.0, bpm: 180 }  // 残り20%未満
        ],
        soundFilePaths: [ // config.js で定義されていればそちらを優先
            'sounds/1.wav', 'sounds/2.wav', 'sounds/3.wav', 'sounds/4.wav',
            'sounds/5.wav', 'sounds/6.wav', 'sounds/7.wav', 'sounds/8.wav'
        ],
        stickerImagePaths: [], // config.js から読み込む
        stickerBaseHue: 0, // config.js から読み込む (STICKER_BASE_COLOR_HEX を変換)
    },

    // 依存モジュールへの参照 (app.js から設定される)
    dependencies: {
        app: null, // app.js のインスタンス (テーマ変更、通知など)
        storage: null, // StorageService
        utils: null, // Utils
        domUtils: null, // DOMUtils
        uiComponents: null, // UIComponents
        counterMode: null, // CounterMode (フィニッシュ時連携)
    },

    /**
     * しこしこモードの初期化
     * @param {Object} appInstance - app.jsのインスタンス
     * @param {Object} initialConfig - config.jsの内容
     */
    init: function(appInstance, initialConfig) {
        this.dependencies.app = appInstance;
        this.dependencies.storage = StorageService; // グローバルを直接参照 (またはappInstance経由で)
        this.dependencies.utils = Utils;
        this.dependencies.domUtils = DOMUtils;
        this.dependencies.uiComponents = UIComponents;
        // counterMode は app.js で別途設定される想定

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
        if (initialConfig.stickerImagePaths) this.config.stickerImagePaths = initialConfig.stickerImagePaths;
        if (initialConfig.STICKER_BASE_COLOR_HEX) {
            const hsl = this.dependencies.utils.hexToHsl(initialConfig.STICKER_BASE_COLOR_HEX);
            if (hsl) this.config.stickerBaseHue = hsl[0];
        }
        // 他にもinitialConfigから必要なものがあればマージ

        // 設定の読み込み
        this.loadSettings();
        this.loadPastedStickers(); // 保存されたステッカーを読み込む

        // UIコンポーネント初期化
        this.dependencies.uiComponents.initAccordion('#shikoshikoSettingsToggle', '#shikoshikoSettingsContent');
        this.dependencies.uiComponents.createMemberWeightSliders(
            '#shikoshikoMemberSliders',
            this.config.members || [],
            this.state.settings.memberWeights,
            (memberName, newValue) => {
                this.state.settings.memberWeights[memberName] = newValue;
                this.saveSettings();
            }
        );
        this.dependencies.uiComponents.initGenericSlider(
            '#pulseBrightnessSlider', '#pulseBrightnessValue',
            (newValue) => {
                this.state.settings.pulseBrightness = newValue;
                this.applyPulseBrightness();
                this.saveSettings();
            }
        );
        // ステッカーUI初期化 (configにパスがあれば)
        if (this.config.stickerImagePaths && this.config.stickerImagePaths.length > 0) {
            this.dependencies.domUtils.toggleDisplay(this.elements.stickerSettingsGroup, true);
            this.dependencies.uiComponents.createStickerChoices(
                '#shikoshikoStickerChoiceContainer',
                this.config.stickerImagePaths,
                (selectedPath) => {
                    this.state.selectedStickerPath = selectedPath;
                    this.updateStickerCursor();
                }
            );
        }


        // イベントリスナー設定
        this.addEventListeners();

        // メトロノーム音源の準備
        this.initAudio();
        this.loadSounds();

        this.updateUI(); // 初期UI状態を設定
        console.log("Shikoshiko Mode Initialized.");
    },

    addEventListeners: function() {
        const du = this.dependencies.domUtils;
        du.on(this.elements.startButton, 'click', () => this.startGame());
        du.on(this.elements.finishButton, 'click', () => this.finishGame(true)); // trueは手動フィニッシュ
        du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());

        // 設定変更イベント
        du.on(this.elements.durationMinutesInput, 'change', () => this.handleDurationChange());
        du.on(this.elements.durationSecondsInput, 'change', () => this.handleDurationChange());

        // 弱点登録ボタン
        du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());

        // ステッカー関連
        if (this.elements.memberImageContainer) {
            du.on(this.elements.memberImageContainer, 'click', (event) => this.handleImageContainerClick(event));
        }
        if (this.elements.clearAllStickersButton) {
            du.on(this.elements.clearAllStickersButton, 'click', () => this.clearAllPastedStickersForCurrentImage());
        }

        // グローバルキーイベント (app.jsからディスパッチされることを想定)
        // または、このモードがアクティブな時だけ直接リスニングする
        // document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    },

    // --- 設定関連 ---
    loadSettings: function() {
        const loadedSettings = this.dependencies.storage.loadShikoshikoSettings();
        this.state.settings = { ...this.state.settings, ...loadedSettings }; // マージ

        // UIに反映
        if (this.elements.durationMinutesInput) this.elements.durationMinutesInput.value = this.state.settings.durationMinutes || 0;
        if (this.elements.durationSecondsInput) this.elements.durationSecondsInput.value = this.state.settings.durationSeconds || 30;
        if (this.elements.pulseBrightnessSlider) this.elements.pulseBrightnessSlider.value = this.state.settings.pulseBrightness || 3;
        this.applyPulseBrightness();
        this.updateDurationFromInputs(); // state.settings.duration も更新
    },
    saveSettings: function() {
        this.dependencies.storage.saveShikoshikoSettings(this.state.settings);
    },
    handleDurationChange: function() {
        this.updateDurationFromInputs();
        this.saveSettings();
    },
    updateDurationFromInputs: function() {
        const minutes = parseInt(this.elements.durationMinutesInput.value, 10) || 0;
        const seconds = parseInt(this.elements.durationSecondsInput.value, 10) || 0;
        this.state.settings.duration = (minutes * 60) + seconds;
        if (this.state.settings.duration <= 0) { // 0秒以下はデフォルト30秒に
            this.state.settings.duration = 30;
            this.elements.durationMinutesInput.value = 0;
            this.elements.durationSecondsInput.value = 30;
        }
        // ゲーム中でなければタイマー表示も更新
        if (!this.state.gameRunning) {
            this.dependencies.domUtils.setText(this.elements.timerDisplay, Utils.formatTime(this.state.settings.duration));
        }
    },
    applyPulseBrightness: function() {
        const brightness = this.state.settings.pulseBrightness;
        const factor = 1.0 + (brightness * 0.06); // 以前の計算式を流用
        document.documentElement.style.setProperty('--pulse-brightness-factor', factor.toFixed(2));
        if(this.elements.pulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.pulseBrightnessValue, String(brightness));
    },

    // --- ゲームロジック ---
    startGame: function() {
        if (this.state.gameRunning) return;
        console.log("Shikoshiko game starting...");
        this.state.gameRunning = true;

        // メンバー選択
        this.selectRandomMember();
        if (!this.state.currentMember) {
            alert("表示できるメンバーがいません。出現率を確認してください。");
            this.state.gameRunning = false;
            return;
        }

        // 初期化
        this.state.remainingTime = this.state.settings.duration;
        this.currentEROImageIndex = -1; // 最初の画像を表示するために -1
        this.updateUI();
        this.updateTimerDisplay();
        this.updateProgressBar();
        this.updateBPM(); // 初期BPM設定
        this.startShikoAnimation();
        this.playMetronomeSound(); // 初回再生

        // タイマースタート
        this.state.timerId = setInterval(() => this.gameLoop(), 1000);
        // 画像スライドショースタート (最初の画像は即時表示したい)
        this.nextEROImage();
        this.state.imageIntervalId = setInterval(() => this.nextEROImage(), this.config.imageSlideInterval);

        this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.removeClass(document.body, 'no-pulse'); // 背景エフェクト有効

        // 以前のステッカーがあれば表示
        this.renderPastedStickers();
    },

    gameLoop: function() {
        this.state.remainingTime--;
        this.updateTimerDisplay();
        this.updateProgressBar();
        this.updateBPM();

        if (this.state.remainingTime <= 0) {
            this.finishGame(false); // falseは時間切れフィニッシュ
        }
    },

    finishGame: function(manualFinish) {
        if (!this.state.gameRunning) return;
        console.log(`Shikoshiko game finished. Manual: ${manualFinish}`);
        this.state.gameRunning = false;

        clearInterval(this.state.timerId);
        clearInterval(this.state.imageIntervalId);
        this.stopShikoAnimation();
        // メトロノーム音も止める (必要なら)

        // UI更新
        this.updateUI();
        this.dependencies.domUtils.setText(this.elements.timerDisplay, manualFinish ? "フィニッシュ！" : "時間切れ！");
        if (this.elements.progressBarInner) this.elements.progressBarInner.style.width = manualFinish ? '100%' : '0%';

        // フィニッシュ演出 (TODO: もっとリッチに)
        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(
                `${this.state.currentMember.name} で${manualFinish ? 'フィニッシュしました！' : '時間切れです。'}`,
                manualFinish ? 'success' : 'info'
            );
            // カウンター連携
            if (manualFinish && this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
                this.dependencies.counterMode.incrementCount(this.state.currentMember.name);
            }
        }

        // 弱点ボタン非表示など
        this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false);
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse'); // 背景エフェクト停止
        this.dependencies.app.applyTheme(null); // デフォルトテーマに戻す
    },

    selectRandomMember: function() {
        const weightedMembers = [];
        (this.config.members || []).forEach(member => {
            const weight = this.state.settings.memberWeights[member.name] !== undefined
                ? this.state.settings.memberWeights[member.name]
                : 3; // デフォルトウェイト
            if (weight > 0 && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                weightedMembers.push({ member, weight });
            }
        });

        if (weightedMembers.length === 0) {
            this.state.currentMember = null;
            return;
        }

        const totalWeight = weightedMembers.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeight <= 0) { // 全員のウェイトが0の場合、均等に選ぶ
            this.state.currentMember = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
            return;
        }

        let randomNum = Math.random() * totalWeight;
        for (const item of weightedMembers) {
            randomNum -= item.weight;
            if (randomNum < 0) {
                this.state.currentMember = item.member;
                break;
            }
        }
        // フォールバック (計算誤差などで選ばれなかった場合)
        if (!this.state.currentMember) {
            this.state.currentMember = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        }
        console.log("Selected member:", this.state.currentMember ? this.state.currentMember.name : "None");

        // 選択されたメンバーのERO画像リストを準備
        this.state.currentEROImages = [];
        if (this.state.currentMember) {
            const eroFolder = this.state.currentMember.imageFolders.ero;
            for (let i = 1; i <= eroFolder.imageCount; i++) {
                this.state.currentEROImages.push(`${eroFolder.path}${i}.jpg`);
            }
            // シャッフル (オプション)
            // this.state.currentEROImages.sort(() => Math.random() - 0.5);
        }
    },

    nextEROImage: function() {
        if (!this.state.gameRunning || !this.state.currentMember || this.state.currentEROImages.length === 0) {
            this.dependencies.domUtils.qs('#shikoshikoMemberImage').src = 'images/placeholder.png';
            return;
        }
        this.currentEROImageIndex = (this.currentEROImageIndex + 1) % this.state.currentEROImages.length;
        const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
        const memberImageElement = this.elements.memberImage;

        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => {
            console.error(`Failed to load image: ${imagePath}`);
            memberImageElement.src = 'images/placeholder.png';
            DOMUtils.addClass(memberImageElement, 'image-error');
        };
        memberImageElement.onload = () => {
            DOMUtils.removeClass(memberImageElement, 'image-error');
            this.updateWeakPointButtonState(); // 画像が変わったら弱点ボタンも更新
            this.renderPastedStickers(); // 画像が変わったらステッカーも再描画
        };


        // 画像の相対パスを弱点ボタンのdata属性に設定
        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
        this.elements.weakPointButton.dataset.relpath = relativePath;
    },

    skipCurrentImage: function() {
        if (!this.state.gameRunning) return;
        this.nextEROImage();
        // スキップ時のペナルティやクールダウンなどが必要ならここに追加
    },

    // --- UI更新関連 ---
    updateUI: function() {
        this.dependencies.domUtils.toggleDisplay(this.elements.startButton, !this.state.gameRunning);
        this.dependencies.domUtils.toggleDisplay(this.elements.finishButton, this.state.gameRunning);
        this.dependencies.domUtils.toggleDisplay(this.elements.skipButton, this.state.gameRunning);
        this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, this.state.gameRunning && !!this.state.currentMember);


        if (this.state.gameRunning && this.state.currentMember) {
            this.dependencies.domUtils.setText(this.elements.memberNameDisplay, this.state.currentMember.name);
            this.elements.memberImage.style.borderColor = this.state.currentMember.color || 'var(--default-border-color)';
            this.elements.progressBarInner.style.backgroundColor = this.state.currentMember.color || 'var(--member-accent-color)';
        } else {
            this.dependencies.domUtils.setText(this.elements.memberNameDisplay, "メンバー名");
            this.elements.memberImage.src = 'images/placeholder.png';
            this.elements.memberImage.style.borderColor = 'var(--default-border-color)';
            this.elements.progressBarInner.style.backgroundColor = 'var(--member-accent-color)';
            this.updateTimerDisplay(); // ゲーム中でなければ設定時間を表示
            this.updateProgressBar();
        }
        this.updateWeakPointButtonState();
    },
    updateTimerDisplay: function() {
        const timeToShow = this.state.gameRunning ? this.state.remainingTime : this.state.settings.duration;
        this.dependencies.domUtils.setText(this.elements.timerDisplay, Utils.formatTime(timeToShow));
    },
    updateProgressBar: function() {
        const totalDuration = this.state.settings.duration;
        const percentage = totalDuration > 0
            ? Math.max(0, (this.state.remainingTime / totalDuration) * 100)
            : (this.state.gameRunning ? 0 : 100); // ゲーム中で0秒なら0%、待機中なら100%
        if (this.elements.progressBarInner) this.elements.progressBarInner.style.width = `${percentage}%`;
    },

    // --- アニメーション・メトロノーム関連 ---
    updateBPM: function() {
        if (!this.state.gameRunning) {
            this.state.currentBPM = 60; // 停止時はデフォルトに戻すなど
        } else {
            const progressRatio = this.state.remainingTime / this.state.settings.duration;
            let newBPM = this.config.bpmLevels[this.config.bpmLevels.length - 1].bpm; // デフォルトは最速
            for (const level of this.config.bpmLevels) {
                if (progressRatio >= level.threshold) {
                    newBPM = level.bpm;
                    break;
                }
            }
            if (this.state.currentBPM !== newBPM) {
                this.state.currentBPM = newBPM;
                console.log(`BPM updated to: ${this.state.currentBPM}`);
                this.updateShikoAnimationSpeed();
            }
        }
    },
    updateShikoAnimationSpeed: function() {
        if (this.state.currentBPM <= 0) {
            this.stopShikoAnimation();
            return;
        }
        const animationDurationMs = (60 / this.state.currentBPM) * 1000;
        document.documentElement.style.setProperty('--shiko-animation-duration', `${animationDurationMs}ms`);
    },
    startShikoAnimation: function() {
        this.updateShikoAnimationSpeed(); // 初期速度設定
        this.dependencies.domUtils.addClass(this.elements.shikoshikoAnimationImage, 'play');
        this.scheduleMetronomeSound();
    },
    stopShikoAnimation: function() {
        this.dependencies.domUtils.removeClass(this.elements.shikoshikoAnimationImage, 'play');
        if (this.state.metronomeTimeoutId) clearTimeout(this.state.metronomeTimeoutId);
    },
    initAudio: function() {
        if (!this.state.metronomeAudioContext && window.AudioContext) {
            this.state.metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    loadSounds: async function() {
        if (!this.state.metronomeAudioContext || this.config.soundFilePaths.length === 0) {
            console.warn("AudioContext not available or no sound files to load.");
            return;
        }
        this.state.loadedSoundCount = 0;
        this.state.metronomeSoundBuffers = [];

        for (const path of this.config.soundFilePaths) {
            try {
                const response = await fetch(path);
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
            console.warn("No metronome sounds could be loaded.");
        }
    },
    playMetronomeSound: function() {
        if (!this.state.metronomeAudioContext || this.state.metronomeSoundBuffers.length === 0 || !this.state.gameRunning) {
            return;
        }
        // AudioContextがsuspended状態なら再開を試みる (ユーザーインタラクションが必要)
        if (this.state.metronomeAudioContext.state === 'suspended') {
            this.state.metronomeAudioContext.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }

        const randomBuffer = this.dependencies.utils.getRandomElement(this.state.metronomeSoundBuffers);
        if (randomBuffer) {
            const source = this.state.metronomeAudioContext.createBufferSource();
            source.buffer = randomBuffer;
            source.connect(this.state.metronomeAudioContext.destination);
            source.start();
        }
    },
    scheduleMetronomeSound: function() {
        if (this.state.metronomeTimeoutId) clearTimeout(this.state.metronomeTimeoutId);
        if (!this.state.gameRunning || this.state.currentBPM <= 0) return;

        const intervalMs = (60 / this.state.currentBPM) * 1000;
        this.state.metronomeTimeoutId = setTimeout(() => {
            this.playMetronomeSound();
            this.scheduleMetronomeSound(); // 次の音をスケジュール
        }, intervalMs);
    },


    // --- 弱点登録関連 ---
    toggleWeakPoint: function() {
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
        // ギャラリーモードにも変更を通知する仕組みが必要なら (例: カスタムイベント)
        if (this.dependencies.app && typeof this.dependencies.app.notifyWeakPointChange === 'function') {
             this.dependencies.app.notifyWeakPointChange(relPath, weakPoints.has(relPath));
        }
    },
    updateWeakPointButtonState: function() {
        if (!this.elements.weakPointButton) return;
        const relPath = this.elements.weakPointButton.dataset.relpath;
        if (!relPath || !this.state.gameRunning) {
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

    // --- ステッカー関連 ---
    loadPastedStickers: function() {
        this.state.pastedStickers = this.dependencies.storage.loadStickerData() || {};
    },
    savePastedStickers: function() {
        this.dependencies.storage.saveStickerData(this.state.pastedStickers);
    },
    renderPastedStickers: function() {
        // 既存のステッカーをクリア
        this.dependencies.domUtils.qsa('.pasted-sticker', this.elements.memberImageContainer)
            .forEach(el => el.remove());

        if (!this.state.currentMember || !this.elements.memberImage.src || this.elements.memberImage.src.endsWith('placeholder.png')) {
            return;
        }
        // 現在表示中の画像の相対パスを取得 (例: 'マコ/ero/1.jpg')
        // これは nextEROImage で設定される dataset.relpath から取得するのが確実
        const currentImageRelPath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;

        const stickersForCurrentImage = this.state.pastedStickers[currentImageRelPath] || [];

        stickersForCurrentImage.forEach(stickerData => {
            const stickerElement = this.dependencies.domUtils.createElement('img', {
                class: 'pasted-sticker',
                src: stickerData.stickerSrc,
                alt: 'ステッカー',
                style: `
                    left: ${stickerData.x}%;
                    top: ${stickerData.y}%;
                    transform: translate(-50%, -50%) rotate(${stickerData.rotation || 0}deg) scale(${stickerData.scale || 1});
                    filter: ${stickerData.filter || 'none'};
                `
            });
            this.elements.memberImageContainer.appendChild(stickerElement);
        });
    },
    handleImageContainerClick: function(event) {
        if (!this.state.selectedStickerPath || !this.state.currentMember || !this.elements.memberImageContainer) return;
        if (!this.state.gameRunning) { // ゲーム中でない場合（設定中など）のみステッカーを貼れる
            const rect = this.elements.memberImageContainer.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;

            const currentImageRelPath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`; // 仮。要修正
            if (!this.state.pastedStickers[currentImageRelPath]) {
                this.state.pastedStickers[currentImageRelPath] = [];
            }

            const memberColor = this.state.currentMember.color;
            let hueRotationFilter = 'none';
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
                x: x,
                y: y,
                rotation: Utils.getRandomInt(-15, 15), // ランダムな回転
                scale: Utils.getRandomInt(8, 12) / 10, // 0.8 ~ 1.2倍のランダムスケール
                filter: hueRotationFilter
            };

            this.state.pastedStickers[currentImageRelPath].push(newStickerData);
            this.savePastedStickers();
            this.renderPastedStickers(); // 即時反映
        }
    },
    clearAllPastedStickersForCurrentImage: function() {
        if (!this.state.currentMember) return;
        const currentImageRelPath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`; // 仮。要修正
        if (this.state.pastedStickers[currentImageRelPath]) {
            delete this.state.pastedStickers[currentImageRelPath];
            this.savePastedStickers();
            this.renderPastedStickers();
            console.log(`Cleared all stickers for ${currentImageRelPath}`);
        }
    },
    updateStickerCursor: function() {
        // TODO: マウスカーソルを選択したステッカー画像にする処理 (app.js またはここで)
        // 例: document.body.style.cursor = `url('${this.state.selectedStickerPath}') 25 25, auto`; (要調整)
        // ただし、これはゲーム中でないときのみ有効にするべき
    },
    deselectSticker: function() {
        this.state.selectedStickerPath = null;
        // 選択中ボタンの .selected クラスを削除
        DOMUtils.qsa('.sticker-choice-button.selected', this.elements.stickerChoiceContainer)
            .forEach(btn => DOMUtils.removeClass(btn, 'selected'));
        // カーソルを元に戻す
        // document.body.style.cursor = 'auto';
    },

    // --- モードのアクティブ化/非アクティブ化 (app.jsから呼ばれる) ---
    activate: function() {
        this.state.isActive = true;
        this.dependencies.domUtils.addClass(this.elements.section, 'active');
        this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        this.loadSettings(); // モード表示時に最新の設定を読み込む
        this.updateUI();
        // 必要であれば、現在選択されているメンバーカラーでテーマを適用
        if (this.state.gameRunning && this.state.currentMember) {
            this.dependencies.app.applyTheme(this.state.currentMember.color);
            this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
            this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
        } else {
            this.dependencies.app.applyTheme(null); // ゲーム中でなければデフォルトテーマ
            this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
            this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        }
        // ステッカーの選択解除
        this.deselectSticker();
        // 以前のステッカーがあれば表示 (ゲーム中でなくても画像が表示されていれば)
        if (!this.state.gameRunning && this.state.currentMember) {
            this.renderPastedStickers();
        }

        console.log("Shikoshiko Mode Activated.");
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.state.gameRunning) {
            // ゲーム中にタブ切り替えなどで非アクティブになった場合、ゲームを強制終了するか一時停止するか選択
            this.finishGame(false); // ここでは時間切れ扱いで強制終了
        }
        this.dependencies.domUtils.removeClass(this.elements.section, 'active');
        this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        console.log("Shikoshiko Mode Deactivated.");
    },

    // app.js からカウンターモードのインスタンスを受け取るためのセッター
    setCounterModeDependency: function(counterModeInstance) {
        this.dependencies.counterMode = counterModeInstance;
    },

    // グローバルキーイベントハンドラ (app.jsから呼び出される)
    handleGlobalKeydown: function(event) {
        if (!this.state.isActive || !this.state.gameRunning) return; // このモードがアクティブかつゲーム中のみ

        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            this.skipCurrentImage();
        }
    }
};

// グローバルスコープに公開 (またはモジュールとしてエクスポート)
// window.ShikoshikoMode = ShikoshikoMode;
// export default ShikoshikoMode;