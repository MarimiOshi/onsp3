// js/modes/shikoshiko.js

const ShikoshikoMode = {
    elements: {
        section: null, settingsToggle: null, settingsContent: null, memberSlidersContainer: null,
        pulseBrightnessSlider: null, pulseBrightnessValue: null, fixedBpmInput: null, // BPM入力追加
        stickerSettingsGroup: null, stickerChoiceContainer: null, clearAllStickersButton: null,
        gameArea: null, memberNameDisplay: null, weakPointButton: null,
        memberImageContainer: null, memberImage: null,
        imageTagsContainer: null, memberQuoteDisplay: null, // セリフ・タグ表示用
        shikoAnimationContainer: null, saoImage: null, shikoshikoAnimationImage: null,
        controlsArea: null, startButton: null, finishButton: null, skipButton: null,
    },
    state: {
        isActive: false, gameRunning: false,
        settings: { memberWeights: {}, pulseBrightness: 3, fixedBpm: 120 }, // duration削除, fixedBpm追加
        currentBPM: 120, // 固定BPMまたは設定値
        imageIntervalId: null, currentMember: null, currentEROImages: [], currentEROImageIndex: 0,
        metronomeAudioContext: null, metronomeSoundBuffers: [], loadedSoundCount: 0, metronomeTimeoutId: null,
        selectedStickerPath: null, pastedStickers: {},
        memberQuotes: {}, // { 'メンバー名': [{text: 'セリフ', tags: ['タグA']}] }
        imageTags: {},    // { 'メンバー名/ero/1.jpg': ['タグX', 'タグY'] }
    },
    config: { // initでconfig.jsから設定
        members: [], imageSlideInterval: 5000, soundFilePaths: [],
        stickerImagePaths: [], stickerBaseHue: 0,
        serifCsvPath: '', quoteTagDelimiter: '|',
    },
    dependencies: { /* ... */ },

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
        this.elements.fixedBpmInput = this.dependencies.domUtils.qs('#fixedBpmInput'); // BPM入力
        this.elements.stickerSettingsGroup = this.dependencies.domUtils.qs('#shikoshikoStickerSettingsGroup');
        this.elements.stickerChoiceContainer = this.dependencies.domUtils.qs('#shikoshikoStickerChoiceContainer');
        this.elements.clearAllStickersButton = this.dependencies.domUtils.qs('#shikoshikoClearAllStickersButton');
        this.elements.gameArea = this.dependencies.domUtils.qs('#shikoshikoGameArea');
        this.elements.memberNameDisplay = this.dependencies.domUtils.qs('#shikoshikoMemberName');
        this.elements.weakPointButton = this.dependencies.domUtils.qs('#shikoshikoWeakPointButton');
        this.elements.memberImageContainer = this.dependencies.domUtils.qs('#shikoshikoMemberImageContainer');
        this.elements.memberImage = this.dependencies.domUtils.qs('#shikoshikoMemberImage');
        this.elements.imageTagsContainer = this.dependencies.domUtils.qs('#shikoshikoImageTagsContainer'); // タグ表示
        this.elements.memberQuoteDisplay = this.dependencies.domUtils.qs('#shikoshikoMemberQuote'); // セリフ表示
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
            if (sds.fixedBpm !== undefined) this.state.settings.fixedBpm = sds.fixedBpm; // BPMをconfigからも設定
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
        this.loadImageTags(); // 画像タグ読み込み
        this.loadMemberQuotes(); // セリフ読み込み

        this.dependencies.uiComponents.initAccordion('#shikoshikoSettingsToggle', '#shikoshikoSettingsContent');
        if (this.config.members && this.config.members.length > 0) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#shikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights,
                (memberName, newValue) => {
                    this.state.settings.memberWeights[memberName] = newValue; this.saveSettings();
                }
            );
        } else {
            if(this.elements.memberSlidersContainer) this.elements.memberSlidersContainer.innerHTML = "<p>メンバーデータがありません。</p>";
        }
        this.dependencies.uiComponents.initGenericSlider(
            '#pulseBrightnessSlider', '#pulseBrightnessValue',
            (newValue) => {
                this.state.settings.pulseBrightness = newValue; this.applyPulseBrightness(); this.saveSettings();
            }
        );
        if (this.config.stickerImagePaths && this.config.stickerImagePaths.length > 0) {
            this.dependencies.domUtils.toggleDisplay(this.elements.stickerSettingsGroup, true);
            this.dependencies.uiComponents.createStickerChoices(
                '#shikoshikoStickerChoiceContainer', this.config.stickerImagePaths,
                (selectedPath) => {
                    if (this.state.gameRunning) { this.deselectSticker(); return; }
                    if (selectedPath === this.state.selectedStickerPath) this.deselectSticker(); // 再度クリックで解除
                    else this.state.selectedStickerPath = selectedPath;
                    this.updateStickerCursor();
                }
            );
        }

        this.addEventListeners();
        this.initAudio();
        this.loadSounds();
        this.updateUI();
        this.applyFixedBpm(); // 初期BPM適用
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
        const defaultBaseSettings = {
            memberWeights: defaultMemberWeights,
            pulseBrightness: 3,
            fixedBpm: this.config.shikoshikoDefaultSettings?.fixedBpm || 120, // config.jsのデフォルトを優先
        };
        this.state.settings = { ...defaultBaseSettings, ...loadedSettings };
        if (loadedSettings && loadedSettings.memberWeights) {
             this.state.settings.memberWeights = { ...defaultMemberWeights, ...loadedSettings.memberWeights };
        } else {
             this.state.settings.memberWeights = defaultMemberWeights;
        }
        this.state.currentBPM = this.state.settings.fixedBpm; // state.currentBPM も更新

        if (this.elements.pulseBrightnessSlider) this.elements.pulseBrightnessSlider.value = this.state.settings.pulseBrightness;
        if (this.elements.fixedBpmInput) this.elements.fixedBpmInput.value = this.state.settings.fixedBpm;
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
        if(this.elements.pulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.pulseBrightnessValue, String(brightness));
    },
    handleBpmChange: function() {
        const newBpm = parseInt(this.elements.fixedBpmInput.value, 10);
        if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) {
            this.state.settings.fixedBpm = newBpm;
            this.state.currentBPM = newBpm;
            this.saveSettings();
            if (this.state.gameRunning) {
                this.updateShikoAnimationSpeed();
                this.scheduleMetronomeSound(); // BPM変更に合わせてメトロノーム再スケジュール
            }
        } else { // 無効な値の場合は元に戻す
            this.elements.fixedBpmInput.value = this.state.settings.fixedBpm;
        }
    },
    applyFixedBpm: function() { // 初期化時やゲーム開始時にBPMを適用
        this.state.currentBPM = this.state.settings.fixedBpm;
        this.updateShikoAnimationSpeed();
    },

    // --- セリフと画像タグの読み込み・表示 ---
    loadImageTags: function() {
        this.state.imageTags = this.dependencies.storage.loadImageTags();
        // console.log("Image tags loaded:", this.state.imageTags);
    },
    loadMemberQuotes: async function() {
        if (!this.config.serifCsvPath) {
            console.warn("Serif CSV path not configured.");
            this.state.memberQuotes = {}; return;
        }
        try {
            const response = await fetch(this.config.serifCsvPath, { cache: "no-store" });
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line);
            if (lines.length <= 1) { this.state.memberQuotes = {}; return; }

            const quotes = {};
            lines.slice(1).forEach(line => {
                const parts = line.split(','); // シンプルなCSVパース
                if (parts.length >= 2) {
                    const memberName = parts[0].trim();
                    const quoteText = parts[1].trim().replace(/^"|"$/g, '').replace(/""/g, '"'); // クォート除去
                    const tagsString = parts.length > 2 ? parts.slice(2).join(',').trim() : ""; // 残りをタグ文字列として結合
                    const quoteTags = tagsString ? tagsString.split(this.config.quoteTagDelimiter || '|').map(t => t.trim()).filter(t => t) : [];

                    if (!quotes[memberName]) quotes[memberName] = [];
                    quotes[memberName].push({ text: quoteText, tags: quoteTags });
                }
            });
            this.state.memberQuotes = quotes;
            console.log("Member quotes loaded:", this.state.memberQuotes);
        } catch (error) {
            console.error("Failed to load member quotes:", error);
            this.state.memberQuotes = {};
        }
    },
    displayQuoteAndTags: function() {
        if (!this.state.currentMember || !this.elements.memberQuoteDisplay || !this.elements.imageTagsContainer) return;

        // セリフ表示
        const memberQuotes = this.state.memberQuotes[this.state.currentMember.name] || [];
        let selectedQuote = { text: "（……）", tags: [] }; // デフォルト
        if (memberQuotes.length > 0) {
            // TODO: 画像タグや状況に応じてセリフをフィルタリングするロジック (オプション)
            selectedQuote = this.dependencies.utils.getRandomElement(memberQuotes) || selectedQuote;
        }
        this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, selectedQuote.text);

        // 画像タグ表示
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


    startGame: function() { /* ... (時間関連の初期化を削除) ... */
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
        this.applyFixedBpm(); // BPMを設定値に
        this.updateUI();
        this.startShikoAnimation(); // これがメトロノームも開始

        this.nextEROImage();
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.state.imageIntervalId = setInterval(() => this.nextEROImage(), this.config.imageSlideInterval);

        this.dependencies.app.applyTheme(this.state.currentMember.color);
        this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
        if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
        else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.renderPastedStickers();
    },

    // gameLoop は削除

    finishGame: function() { /* 引数 manualFinish を削除 */
        if (!this.state.gameRunning) return;
        console.log(`Shikoshiko game finished by button.`);
        this.state.gameRunning = false;

        // timerId はないので clearInterval は不要
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.stopShikoAnimation();

        this.updateUI();
        // 終了メッセージはシンプルに
        if (this.elements.memberNameDisplay) this.dependencies.domUtils.setText(this.elements.memberNameDisplay, "フィニッシュ！");


        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(
                `${this.state.currentMember.name} でフィニッシュしました！`, 'success'
            );
            if (this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
                this.dependencies.counterMode.incrementCount(this.state.currentMember.name);
            }
        }

        if(this.elements.weakPointButton) this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false);
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.dependencies.app.applyTheme(null);
    },

    selectRandomMember: function() { /* 変更なし */
        const weightedMembers = [];
        (this.config.members || []).forEach(member => {
            const weight = this.state.settings.memberWeights[member.name] !== undefined
                ? Number(this.state.settings.memberWeights[member.name])
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
                if (randomNum < 0) { foundMember = item.member; break; }
            }
            this.state.currentMember = foundMember || this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        }
        console.log("Selected member:", this.state.currentMember ? this.state.currentMember.name : "None");
        this.state.currentEROImages = [];
        if (this.state.currentMember) {
            const eroFolder = this.state.currentMember.imageFolders.ero;
            for (let i = 1; i <= eroFolder.imageCount; i++) {
                this.state.currentEROImages.push(`${eroFolder.path}${i}.jpg`);
            }
        }
    },

    nextEROImage: function() { /* ... displayQuoteAndTags() を呼び出し追加 ... */
        if (!this.state.currentMember || this.state.currentEROImages.length === 0) {
            if (this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
            if (this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "（メンバーを選択してください）");
            if (this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
            return;
        }
        this.currentEROImageIndex = (this.currentEROImageIndex + 1) % this.state.currentEROImages.length;
        const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
        const memberImageElement = this.elements.memberImage;

        if (!memberImageElement) return;
        memberImageElement.src = imagePath;
        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;

        memberImageElement.onerror = () => { /* ... */ };
        memberImageElement.onload = () => {
            this.dependencies.domUtils.removeClass(memberImageElement, 'image-error');
            this.updateWeakPointButtonState();
            this.renderPastedStickers();
            this.displayQuoteAndTags(); // ★★★ 画像ロード後にセリフとタグを表示 ★★★
        };
    },

    updateUI: function() { /* ... 時間関連UIの操作を削除 ... */
        const du = this.dependencies.domUtils;
        // スタートボタンは「開始」と「プレイ中」でトグルしないように、常に表示してdisabled制御
        if(this.elements.startButton) {
            du.setText(this.elements.startButton, this.state.gameRunning ? "プレイ中" : "開始");
            this.elements.startButton.disabled = this.state.gameRunning;
        }
        if(this.elements.finishButton) du.toggleDisplay(this.elements.finishButton, this.state.gameRunning);
        if(this.elements.skipButton) du.toggleDisplay(this.elements.skipButton, this.state.gameRunning);
        if(this.elements.weakPointButton) du.toggleDisplay(this.elements.weakPointButton, !!this.state.currentMember); // キャラがいれば表示

        if (this.state.currentMember) { // ゲーム中でなくてもキャラがいれば名前と画像表示
            if(this.elements.memberNameDisplay) du.setText(this.elements.memberNameDisplay, this.state.currentMember.name);
            if(this.elements.memberImage) this.elements.memberImage.style.borderColor = this.state.currentMember.color || 'var(--default-border-color)';
        } else {
            if(this.elements.memberNameDisplay) du.setText(this.elements.memberNameDisplay, "メンバー名");
            if(this.elements.memberImage) {
                this.elements.memberImage.src = 'images/placeholder.png';
                this.elements.memberImage.style.borderColor = 'var(--default-border-color)';
            }
            if (this.elements.memberQuoteDisplay) du.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
            if (this.elements.imageTagsContainer) du.toggleDisplay(this.elements.imageTagsContainer, false);
        }
        this.updateWeakPointButtonState();
    },

    // updateTimerDisplay は削除
    // updateProgressBar は削除

    updateBPM: function() { /* 時間経過によるBPM変更ロジックを削除。固定BPMはapplyFixedBpmで設定済み */
        // if (!this.state.gameRunning) this.state.currentBPM = this.state.settings.fixedBpm;
        // else { /* もしゲーム中にBPMを変えるならここにロジック */ }
        this.updateShikoAnimationSpeed(); // BPM変更時にアニメーション速度更新
    },
    // scheduleMetronomeSound内のBPM取得をstate.currentBPMから
    scheduleMetronomeSound: function() {
        if (this.state.metronomeTimeoutId) clearTimeout(this.state.metronomeTimeoutId);
        if (!this.state.gameRunning || this.state.currentBPM <= 0 || this.state.metronomeSoundBuffers.length === 0) return;
        this.playMetronomeSound(); // 最初の音
        const intervalMs = (60 / this.state.currentBPM) * 1000; // this.state.currentBPM を使用
        this.state.metronomeTimeoutId = setTimeout(() => {
            this.scheduleMetronomeSound();
        }, intervalMs);
    },

    // activate, deactivate 内の時間関連処理を削除
    activate: function() { /* ... (時間関連処理削除) ... */
        this.state.isActive = true;
        if (this.elements.section) {
            this.dependencies.domUtils.addClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        }
        this.loadSettings(); // これで fixedBpm も読み込まれる
        this.applyFixedBpm(); // BPMを適用
        this.loadPastedStickers();
        this.loadImageTags(); // モード表示時に画像タグも読み込む
        this.loadMemberQuotes(); // モード表示時にセリフも読み込む
        this.updateUI();

        if (this.state.gameRunning && this.state.currentMember) {
            this.dependencies.app.applyTheme(this.state.currentMember.color);
            this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
            if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
            else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            this.renderPastedStickers();
            this.displayQuoteAndTags(); // ゲーム再開時にも表示
        } else {
            this.dependencies.app.applyTheme(null);
            this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
            this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            if (this.state.currentMember && this.elements.memberImage && !this.elements.memberImage.src.endsWith('placeholder.png')) {
                 this.renderPastedStickers();
                 this.displayQuoteAndTags(); // ゲーム中でなくてもキャラがいれば表示
            } else { // キャラがいない場合はクリア
                 if(this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
                 if(this.elements.memberNameDisplay) this.dependencies.domUtils.setText(this.elements.memberNameDisplay, "メンバー名");
                 if(this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
                 if(this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
            }
        }
        this.deselectSticker();
        console.log("Shikoshiko Mode Activated.");
    },
    deactivate: function() { /* ... (時間関連処理削除) ... */
        this.state.isActive = false;
        if (this.state.gameRunning) {
            this.finishGame(); // 引数なしに変更
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
    // ... (他のメソッドは変更なし、または軽微な調整のみ)
};
