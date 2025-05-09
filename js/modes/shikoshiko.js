// js/modes/shikoshiko.js

const ShikoshikoMode = {
    elements: {
        section: null,
        // settingsToggle: null, settingsContent: null, // モーダルに移行
        memberSlidersContainer: null, // モーダル内のスライダーコンテナ
        pulseBrightnessSlider: null,  // モーダル内のスライダー
        pulseBrightnessValue: null,   // モーダル内の値表示
        fixedBpmInput: null,          // モーダル内のBPM入力
        stickerSettingsGroup: null, stickerChoiceContainer: null, clearAllStickersButton: null, // モーダル内
        openSettingsModalButton: null, // 設定モーダルを開くボタン

        gameArea: null,
        // memberNameDisplay: null, // 削除
        memberProfileIcon: null, // TikTok風プロフィールアイコン
        weakPointButton: null,
        memberImageContainer: null, memberImage: null,
        imageTagsContainer: null, memberQuoteDisplay: null,
        shikoAnimationContainer: null, saoImage: null, shikoshikoAnimationImage: null,
        controlsArea: null, startButton: null, finishButton: null, skipButton: null,

        // モーダル自体とモーダル内要素
        settingsModal: null, closeModalButton: null, saveSettingsButton: null,
        modalMemberSlidersContainer: null, modalPulseBrightnessSlider: null,
        modalPulseBrightnessValue: null, modalFixedBpmInput: null,
        modalStickerSettingsGroup: null, modalStickerChoiceContainer: null, modalClearAllStickersButton: null,
    },
    state: {
        isActive: false, gameRunning: false, isPaused: false, // 一時停止状態を追加
        settings: { memberWeights: {}, pulseBrightness: 3, fixedBpm: 120 },
        currentBPM: 120,
        imageIntervalId: null, currentMember: null, currentEROImages: [], currentEROImageIndex: 0,
        metronomeAudioContext: null, metronomeSoundBuffers: [], loadedSoundCount: 0, metronomeTimeoutId: null,
        selectedStickerPath: null, pastedStickers: {},
        memberQuotes: {}, imageTags: {},
        // スワイプ検出用
        touchStartX: 0, touchEndX: 0, swipeThreshold: 50, // スワイプと判定する最小距離
    },
    config: { /* ... (前回と同様) ... */
        members: [], imageSlideInterval: 5000, soundFilePaths: [],
        stickerImagePaths: [], stickerBaseHue: 0,
        serifCsvPath: 'data/ONSP_セリフ.csv',
        quoteTagDelimiter: '|',
    },
    dependencies: { /* ... (前回と同様) ... */ },

    init: function(appInstance, initialConfig) {
        this.dependencies.app = appInstance;
        this.dependencies.storage = StorageService;
        this.dependencies.utils = Utils;
        this.dependencies.domUtils = DOMUtils;
        this.dependencies.uiComponents = UIComponents;
        console.log("Initializing Shikoshiko Mode (vTikTok)...");

        this.elements.section = this.dependencies.domUtils.qs('#shikoshikoModeSection');
        this.elements.openSettingsModalButton = this.dependencies.domUtils.qs('#openShikoshikoSettingsModal');

        // モーダル関連要素
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

        // ゲームエリア要素
        this.elements.gameArea = this.dependencies.domUtils.qs('#shikoshikoGameArea');
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

        // Config マージ (前回と同様)
        if (initialConfig.members) this.config.members = initialConfig.members;
        if (initialConfig.shikoshikoDefaultSettings) {
            const sds = initialConfig.shikoshikoDefaultSettings;
            if (sds.imageSlideInterval !== undefined) this.config.imageSlideInterval = sds.imageSlideInterval;
            if (sds.soundFilePaths) this.config.soundFilePaths = sds.soundFilePaths;
            // fixedBpm は loadSettings で処理
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
        this.loadMemberQuotes(); // 非同期

        // モーダルUI初期化
        this.initModalUI();

        this.addEventListeners();
        this.initAudio();
        this.loadSounds(); // 非同期
        this.updateUI();
        this.applyFixedBpm();
        console.log("Shikoshiko Mode Initialized (vTikTok).");
    },

    initModalUI: function() {
        if (!this.elements.settingsModal) return;

        // モーダル内のUIコンポーネント初期化
        if (this.config.members && this.config.members.length > 0 && this.elements.modalMemberSlidersContainer) {
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#modalShikoshikoMemberSliders', // モーダル内のコンテナID
                this.config.members,
                this.state.settings.memberWeights,
                (memberName, newValue) => { this.state.settings.memberWeights[memberName] = newValue; /* 保存はモーダル保存時に */ }
            );
        } else {
            if(this.elements.modalMemberSlidersContainer) this.elements.modalMemberSlidersContainer.innerHTML = "<p>メンバーデータがありません。</p>";
        }

        if (this.elements.modalPulseBrightnessSlider && this.elements.modalPulseBrightnessValue) {
            this.dependencies.uiComponents.initGenericSlider(
                '#modalPulseBrightnessSlider', '#modalPulseBrightnessValue',
                (newValue) => { /* 保存はモーダル保存時に */ }
            );
        }
        // モーダル内のBPM入力の初期値設定はloadSettingsで行う

        if (this.config.stickerImagePaths && this.config.stickerImagePaths.length > 0 && this.elements.modalStickerSettingsGroup) {
            this.dependencies.domUtils.toggleDisplay(this.elements.modalStickerSettingsGroup, true);
            this.dependencies.uiComponents.createStickerChoices(
                '#modalStickerChoiceContainer',
                this.config.stickerImagePaths,
                (selectedPath) => {
                    // モーダル内でのステッカー選択処理 (ゲーム中ではないので直接貼るか、選択状態を保持)
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
        if (this.elements.startButton) du.on(this.elements.startButton, 'click', () => this.startGame());
        if (this.elements.finishButton) du.on(this.elements.finishButton, 'click', () => this.finishGame());
        if (this.elements.skipButton) du.on(this.elements.skipButton, 'click', () => this.skipCurrentImage());
        // BPM入力はモーダル保存時に反映
        if (this.elements.weakPointButton) du.on(this.elements.weakPointButton, 'click', () => this.toggleWeakPoint());
        if (this.elements.memberImageContainer) {
            du.on(this.elements.memberImageContainer, 'click', (event) => this.handleImageContainerClick(event));
            // スワイプイベントリスナー
            du.on(this.elements.memberImageContainer, 'touchstart', (event) => this.handleTouchStart(event), { passive: true });
            du.on(this.elements.memberImageContainer, 'touchmove', (event) => this.handleTouchMove(event), { passive: true });
            du.on(this.elements.memberImageContainer, 'touchend', (event) => this.handleTouchEnd(event));
        }
        if (this.elements.openSettingsModalButton) du.on(this.elements.openSettingsModalButton, 'click', () => this.openSettingsModal());
        if (this.elements.closeModalButton) du.on(this.elements.closeModalButton, 'click', () => this.closeSettingsModal());
        if (this.elements.saveSettingsButton) du.on(this.elements.saveSettingsButton, 'click', () => this.saveModalSettings());
        if (this.elements.modalClearAllStickersButton) du.on(this.elements.modalClearAllStickersButton, 'click', () => this.clearAllPastedStickersForCurrentImage());
    },

    openSettingsModal: function() {
        if (!this.elements.settingsModal) return;
        // 現在の設定値をモーダルUIに反映
        if (this.elements.modalMemberSlidersContainer) { // スライダー再生成で値を反映
            this.dependencies.uiComponents.createMemberWeightSliders(
                '#modalShikoshikoMemberSliders', this.config.members, this.state.settings.memberWeights,() => {}
            );
        }
        if (this.elements.modalPulseBrightnessSlider) this.elements.modalPulseBrightnessSlider.value = this.state.settings.pulseBrightness;
        if (this.elements.modalPulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.modalPulseBrightnessValue, String(this.state.settings.pulseBrightness));
        if (this.elements.modalFixedBpmInput) this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;

        this.dependencies.domUtils.toggleDisplay(this.elements.settingsModal, true);
    },
    closeSettingsModal: function() {
        if (!this.elements.settingsModal) return;
        this.dependencies.domUtils.toggleDisplay(this.elements.settingsModal, false);
        this.deselectSticker(); // モーダルを閉じたらステッカー選択も解除
    },
    saveModalSettings: function() {
        // モーダルUIから設定値を読み取り、state.settingsに保存
        if (this.elements.modalMemberSlidersContainer) {
            this.dependencies.domUtils.qsa('input[type="range"]', this.elements.modalMemberSlidersContainer).forEach(slider => {
                if (slider.dataset.memberName) {
                    this.state.settings.memberWeights[slider.dataset.memberName] = Number(slider.value);
                }
            });
        }
        if (this.elements.modalPulseBrightnessSlider) this.state.settings.pulseBrightness = Number(this.elements.modalPulseBrightnessSlider.value);
        if (this.elements.modalFixedBpmInput) {
            const newBpm = parseInt(this.elements.modalFixedBpmInput.value, 10);
            if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) {
                this.state.settings.fixedBpm = newBpm;
            } else { // 無効な値なら現在の設定値に戻す
                this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;
            }
        }

        this.applyPulseBrightness(); // UI上のスライダー値表示も更新
        this.applyFixedBpm();      // BPMも適用
        this.saveSettings();       // localStorageに保存
        this.closeSettingsModal();
        // ゲーム中ならBPM変更を即時反映
        if (this.state.gameRunning) {
            this.updateShikoAnimationSpeed();
            this.scheduleMetronomeSound();
        }
    },


    loadSettings: function() { /* 前回と同様だが、duration関連を削除 */
        const loadedSettings = this.dependencies.storage.loadShikoshikoSettings();
        const defaultMemberWeights = {};
        if (this.config.members && Array.isArray(this.config.members)) {
            this.config.members.forEach(member => {
                if (member && member.name) defaultMemberWeights[member.name] = 3;
            });
        }
        const configDefaultBpm = (this.config.shikoshikoDefaultSettings && this.config.shikoshikoDefaultSettings.fixedBpm !== undefined)
            ? this.config.shikoshikoDefaultSettings.fixedBpm : 120;

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

        // モーダル内のUIにも初期値を設定 (initModalUIでも行うが、ここでも行うことで整合性を保つ)
        if (this.elements.modalPulseBrightnessSlider) this.elements.modalPulseBrightnessSlider.value = this.state.settings.pulseBrightness;
        if (this.elements.modalPulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.modalPulseBrightnessValue, String(this.state.settings.pulseBrightness));
        if (this.elements.modalFixedBpmInput) this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;

        this.applyPulseBrightness(); // これはメイン画面の設定スライダー用（もし残すなら）
    },
    // saveSettings, applyPulseBrightness, handleBpmChange, applyFixedBpm は前回とほぼ同様
    saveSettings: function() { /* ... */
        const settingsToSave = { ...this.state.settings };
        this.dependencies.storage.saveShikoshikoSettings(settingsToSave);
    },
    applyPulseBrightness: function() { /* ... */
        // モーダル内の値表示も更新
        if(this.elements.modalPulseBrightnessValue) this.dependencies.domUtils.setText(this.elements.modalPulseBrightnessValue, String(this.state.settings.pulseBrightness));
        // メイン画面の設定UIがモーダルに完全に移行した場合、この関数はモーダル保存時に呼ばれるだけで良い
        const brightness = this.state.settings.pulseBrightness;
        const factor = 1.0 + (brightness * 0.06);
        document.documentElement.style.setProperty('--pulse-brightness-factor', factor.toFixed(2));
    },
    handleBpmChange: function() { /* モーダル保存時にまとめて処理するので、この個別ハンドラは不要になるかも */
        if(!this.elements.modalFixedBpmInput) return; // モーダル内の要素を参照
        const newBpm = parseInt(this.elements.modalFixedBpmInput.value, 10);
        if (!isNaN(newBpm) && newBpm >= 30 && newBpm <= 300) {
            // state.settings.fixedBpm の更新はモーダル保存時に行う
            // this.state.currentBPM = newBpm;
            // if (this.state.gameRunning) {
            //     this.updateShikoAnimationSpeed();
            //     this.scheduleMetronomeSound();
            // }
        } else {
            this.elements.modalFixedBpmInput.value = this.state.settings.fixedBpm;
        }
    },
    applyFixedBpm: function() {
        this.state.currentBPM = this.state.settings.fixedBpm;
        this.updateShikoAnimationSpeed();
    },


    loadImageTags: function() { /* 前回と同様 */ this.state.imageTags = this.dependencies.storage.loadImageTags(); },
    loadMemberQuotes: async function() { /* 前回と同様 */
        if (!this.config.serifCsvPath) { this.state.memberQuotes = {}; return; }
        try {
            const response = await fetch(this.config.serifCsvPath, { cache: "no-store" });
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
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
    displayQuoteAndTags: function() { /* 前回と同様 */
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

    startGame: function() {
        if (this.state.gameRunning) return;
        console.log("Shikoshiko game starting...");
        this.deselectSticker();
        this.state.gameRunning = true;
        this.state.isPaused = false; // 再開時は一時停止解除
        this.currentEROImageIndex = -1; // nextEROImageで最初のメンバーが選ばれる
        this.applyFixedBpm();
        this.updateUI();
        this.startShikoAnimation();
        this.nextEROImage(); // 最初のメンバーと画像を表示
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.state.imageIntervalId = setInterval(() => {
            if (!this.state.isPaused) this.nextEROImage(); // 一時停止中は画像切り替えしない
        }, this.config.imageSlideInterval);
        // テーマ適用はnextEROImage内で行う
        this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
        if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
        else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        // renderPastedStickersはnextEROImageのonloadで
    },

    finishGame: function() {
        if (!this.state.gameRunning) return;
        console.log(`Shikoshiko game finished by button.`);
        this.state.gameRunning = false;
        this.state.isPaused = false;
        if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId);
        this.stopShikoAnimation();
        this.updateUI();
        // フィニッシュメッセージはshowNotificationで
        if (this.state.currentMember) {
            this.dependencies.uiComponents.showNotification(`${this.state.currentMember.name} でフィニッシュしました！`, 'success');
            if (this.dependencies.counterMode && typeof this.dependencies.counterMode.incrementCount === 'function') {
                this.dependencies.counterMode.incrementCount(this.state.currentMember.name);
            }
        } else {
            this.dependencies.uiComponents.showNotification(`フィニッシュしました！`, 'success');
        }
        if(this.elements.weakPointButton) this.dependencies.domUtils.toggleDisplay(this.elements.weakPointButton, false);
        this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.dependencies.app.applyTheme(null);
        this.state.currentMember = null; // メンバー選択状態をリセット
        this.clearMemberDisplayAndUpdate(); // 表示もクリア
    },

    selectRandomMember: function() { // 画像表示のたびに呼ばれるので、ここでメンバーを選択
        const weightedMembers = [];
        (this.config.members || []).forEach(member => {
            const weight = this.state.settings.memberWeights[member.name] !== undefined
                ? Number(this.state.settings.memberWeights[member.name]) : 3;
            if (weight > 0 && member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                weightedMembers.push({ member, weight });
            }
        });
        if (weightedMembers.length === 0) {
            this.state.currentMember = null;
            console.error("ShikoshikoMode: No weighted members available for selection.");
            return null; // メンバーが選べなかったことを示す
        }
        const totalWeight = weightedMembers.reduce((sum, item) => sum + item.weight, 0);
        let selectedMemberData = null;
        if (totalWeight <= 0) {
            selectedMemberData = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        } else {
            let randomNum = Math.random() * totalWeight;
            for (const item of weightedMembers) {
                randomNum -= item.weight;
                if (randomNum < 0) { selectedMemberData = item.member; break; }
            }
            if (!selectedMemberData) selectedMemberData = this.dependencies.utils.getRandomElement(weightedMembers.map(item => item.member));
        }
        return selectedMemberData; // 選択されたメンバーオブジェクトを返す
    },

    nextEROImage: function() {
        if (!this.state.gameRunning || this.state.isPaused) return; // 一時停止中は何もしない

        const newMember = this.selectRandomMember(); // 毎回メンバーを選択
        if (!newMember) {
            if (this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
            if (this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
            if (this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "（表示できるメンバーがいません）");
            if (this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
            if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
            this.dependencies.app.applyTheme(null); // テーマもリセット
            return;
        }
        this.state.currentMember = newMember; // 現在のメンバーを更新

        // 新しいメンバーのERO画像リストを準備
        this.state.currentEROImages = [];
        const eroFolder = this.state.currentMember.imageFolders.ero;
        for (let i = 1; i <= eroFolder.imageCount; i++) {
            this.state.currentEROImages.push(`${eroFolder.path}${i}.jpg`);
        }
        if (this.state.currentEROImages.length === 0) { // ERO画像がない場合はスキップ（selectRandomMemberでフィルタ済みだが念のため）
            console.warn(`No ERO images for selected member: ${this.state.currentMember.name}`);
            this.skipCurrentImage(); // 次のメンバー選択を試みる
            return;
        }

        // ERO画像リストからランダムに1枚選択
        this.currentEROImageIndex = this.dependencies.utils.getRandomInt(0, this.state.currentEROImages.length - 1);
        const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
        const memberImageElement = this.elements.memberImage;

        if (!memberImageElement) return;

        const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;

        // プロフィールアイコン設定 (カウンター用の画像を流用)
        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }
        // テーマ適用
        this.dependencies.app.applyTheme(this.state.currentMember.color);


        memberImageElement.src = imagePath;
        memberImageElement.onerror = () => {
            console.error(`Failed to load image: ${imagePath}`);
            memberImageElement.src = 'images/placeholder.png';
            this.dependencies.domUtils.addClass(memberImageElement, 'image-error');
            this.displayQuoteAndTags();
        };
        memberImageElement.onload = () => {
            this.dependencies.domUtils.removeClass(memberImageElement, 'image-error');
            this.updateWeakPointButtonState();
            this.renderPastedStickers();
            this.displayQuoteAndTags();
        };
        // UIのメンバー名表示は削除したので、関連処理も不要
    },

    skipCurrentImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.nextEROImage(); },

    updateUI: function() {
        const du = this.dependencies.domUtils;
        if(this.elements.startButton) {
            du.setText(this.elements.startButton, this.state.gameRunning ? (this.state.isPaused ? "再開" : "プレイ中") : "開始");
            this.elements.startButton.disabled = this.state.gameRunning && !this.state.isPaused; // プレイ中かつ一時停止中でない場合は無効

            if (window.innerWidth <= 768) du.toggleDisplay(this.elements.startButton, !this.state.gameRunning || this.state.isPaused);
            else du.toggleDisplay(this.elements.startButton, true);
        }
        if(this.elements.finishButton) du.toggleDisplay(this.elements.finishButton, this.state.gameRunning);
        if(this.elements.skipButton) du.toggleDisplay(this.elements.skipButton, this.state.gameRunning && !this.state.isPaused); // 一時停止中はスキップも不可
        if(this.elements.weakPointButton) du.toggleDisplay(this.elements.weakPointButton, !!this.state.currentMember);

        if (this.state.currentMember) {
            // メンバー名表示は削除
            if(this.elements.memberImage) this.elements.memberImage.style.borderColor = this.state.currentMember.color || 'var(--default-border-color)';
             if (this.elements.memberProfileIcon) { // プロフィールアイコンも更新
                this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
             }
        } else {
            if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
            if(this.elements.memberImage) { this.elements.memberImage.src = 'images/placeholder.png'; this.elements.memberImage.style.borderColor = 'var(--default-border-color)'; }
            if (this.elements.memberQuoteDisplay) du.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
            if (this.elements.imageTagsContainer) du.toggleDisplay(this.elements.imageTagsContainer, false);
        }
        this.updateWeakPointButtonState();
    },

    updateShikoAnimationSpeed: function() { /* 前回と同様 */
        if (this.state.currentBPM <= 0) { this.stopShikoAnimation(); return; }
        const animationDurationMs = (60 / this.state.currentBPM) * 1000;
        document.documentElement.style.setProperty('--shiko-animation-duration', `${animationDurationMs.toFixed(0)}ms`);
    },
    startShikoAnimation: function() { /* 前回と同様 */
        if (!this.elements.shikoshikoAnimationImage) return;
        this.updateShikoAnimationSpeed();
        this.dependencies.domUtils.addClass(this.elements.shikoshikoAnimationImage, 'play');
        this.scheduleMetronomeSound();
    },
    stopShikoAnimation: function() { /* 前回と同様 */
        if (!this.elements.shikoshikoAnimationImage) return;
        this.dependencies.domUtils.removeClass(this.elements.shikoshikoAnimationImage, 'play');
        if (this.state.metronomeTimeoutId) { clearTimeout(this.state.metronomeTimeoutId); this.state.metronomeTimeoutId = null; }
    },
    pauseShikoAnimationAndSound: function() {
        if (!this.elements.shikoshikoAnimationImage) return;
        this.dependencies.domUtils.removeClass(this.elements.shikoshikoAnimationImage, 'play'); // アニメーション停止
        if (this.state.metronomeTimeoutId) {
            clearTimeout(this.state.metronomeTimeoutId); // メトロノームの次のスケジュールをキャンセル
            this.state.metronomeTimeoutId = null;
        }
        console.log("Animation and Metronome Paused.");
    },
    resumeShikoAnimationAndSound: function() {
        if (!this.elements.shikoshikoAnimationImage || !this.state.gameRunning || this.state.currentBPM <= 0) return;
        this.dependencies.domUtils.addClass(this.elements.shikoshikoAnimationImage, 'play'); // アニメーション再開
        this.scheduleMetronomeSound(); // メトロノーム再開
        console.log("Animation and Metronome Resumed.");
    },
    initAudio: function() { /* 前回と同様 */ }, loadSounds: async function() { /* 前回と同様 */ },
    playMetronomeSound: function() { /* 前回と同様 */ }, scheduleMetronomeSound: function() { /* 前回と同様 */ },
    toggleWeakPoint: function() { /* 前回と同様 */ }, updateWeakPointButtonState: function() { /* 前回と同様 */ },
    loadPastedStickers: function() { /* 前回と同様 */ }, savePastedStickers: function() { /* 前回と同様 */ },
    renderPastedStickers: function() { /* 前回と同様 */ }, handleImageContainerClick: function(event) { /* 前回と同様 */ },
    clearAllPastedStickersForCurrentImage: function() { /* 前回と同様 */ }, updateStickerCursor: function() { /* 前回と同様 */ },
    deselectSticker: function() { /* 前回と同様 */ },

    activate: function() {
        this.state.isActive = true;
        if (this.elements.section) {
            this.dependencies.domUtils.addClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        }
        this.loadSettings(); this.applyFixedBpm(); this.loadPastedStickers(); this.loadImageTags();
        this.loadMemberQuotes().then(() => {
            if (this.state.isPaused && this.state.gameRunning && this.state.currentMember) { // 一時停止からの再開
                this.state.isPaused = false;
                this.dependencies.app.applyTheme(this.state.currentMember.color);
                this.dependencies.domUtils.addClass(document.body, 'shikoshiko-active');
                if (this.state.settings.pulseBrightness > 0) this.dependencies.domUtils.removeClass(document.body, 'no-pulse');
                else this.dependencies.domUtils.addClass(document.body, 'no-pulse');
                this.renderPastedStickers();
                this.displayQuoteAndTags();
                this.resumeShikoAnimationAndSound(); // アニメーションと音を再開
            } else if (!this.state.gameRunning) { // 通常の初回表示またはゲーム終了後の表示
                if (this.state.currentMember && this.elements.memberImage && this.state.currentEROImages.length > 0 && this.currentEROImageIndex >= 0 && this.currentEROImageIndex < this.state.currentEROImages.length) {
                    const imagePath = this.state.currentEROImages[this.currentEROImageIndex];
                    if (imagePath && this.elements.memberImage) {
                         const relativePath = `${this.state.currentMember.name}/ero/${this.currentEROImageIndex + 1}.jpg`;
                         if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = relativePath;
                         this.elements.memberImage.src = imagePath;
                    } else this.clearMemberDisplayAndUpdate();
                } else this.clearMemberDisplayAndUpdate();
                this.dependencies.app.applyTheme(null); // ゲーム中でなければデフォルトテーマ
                this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
                this.dependencies.domUtils.addClass(document.body, 'no-pulse');
            }
            this.updateUI();
        });
        this.deselectSticker();
        console.log("Shikoshiko Mode Activated.");
    },
    deactivate: function() {
        this.state.isActive = false;
        if (this.state.gameRunning && !this.state.isPaused) { // ゲーム実行中で一時停止中でもない場合
            this.state.isPaused = true; // 一時停止状態にする
            this.pauseShikoAnimationAndSound(); // アニメーションと音を一時停止
            if(this.state.imageIntervalId) clearInterval(this.state.imageIntervalId); // 画像スライドショーも停止
            this.state.imageIntervalId = null;
            this.updateUI(); // UI更新（例: スタートボタンを「再開」に）
            console.log("Shikoshiko Mode Paused due to tab change.");
        }
        // sectionの表示/非表示はapp.jsに任せる
        // this.dependencies.domUtils.removeClass(this.elements.section, 'active');
        // this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        // bodyのクラス変更もapp.jsで行うか、モードごとに管理するか検討
        // this.dependencies.domUtils.removeClass(document.body, 'shikoshiko-active');
        // this.dependencies.domUtils.addClass(document.body, 'no-pulse');
        this.deselectSticker();
        console.log("Shikoshiko Mode Deactivated (or Paused).");
    },
    clearMemberDisplayAndUpdate: function() { /* 前回と同様 */
        this.clearMemberDisplay(); this.updateUI();
    },
    clearMemberDisplay: function() { /* 前回と同様 */
        if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png';
        if(this.elements.memberImage) this.elements.memberImage.src = 'images/placeholder.png';
        if(this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
        if(this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
        if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
        this.updateWeakPointButtonState(); this.renderPastedStickers();
    },
    setCounterModeDependency: function(counterModeInstance) { /* 前回と同様 */ this.dependencies.counterMode = counterModeInstance; },

    // --- スワイプ処理 ---
    handleTouchStart: function(event) {
        if (!this.state.gameRunning || this.state.isPaused) return;
        this.state.touchStartX = event.touches[0].clientX;
    },
    handleTouchMove: function(event) {
        if (!this.state.gameRunning || this.state.isPaused) return;
        this.state.touchEndX = event.touches[0].clientX;
    },
    handleTouchEnd: function(event) {
        if (!this.state.gameRunning || this.state.isPaused) return;
        const touchDiff = this.state.touchStartX - this.state.touchEndX;
        if (Math.abs(touchDiff) > this.state.swipeThreshold) { // 十分な距離をスワイプしたか
            if (touchDiff > 0) { // 左スワイプ (次の画像へ)
                console.log("Swipe Left - Skip Next");
                this.skipCurrentImage();
            } else { // 右スワイプ (前の画像へ - オプション)
                console.log("Swipe Right - Skip Previous (Not Implemented Yet, or same as next)");
                // this.skipCurrentImage(); // 右スワイプもとりあえず次へ
            }
        }
        // リセット
        this.state.touchStartX = 0;
        this.state.touchEndX = 0;
    },

    handleGlobalKeydown: function(event) { /* 前回と同様 */
        if (!this.state.isActive) return;
        if (this.state.selectedStickerPath) return;
        if (this.state.gameRunning && !this.state.isPaused) { // 一時停止中はキー操作無効
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); this.skipCurrentImage(); }
        }
    }
};
