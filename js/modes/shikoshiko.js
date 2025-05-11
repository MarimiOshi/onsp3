// js/modes/shikoshiko.js

const ShikoshikoMode = {
    elements: {
        section: null,
        openSettingsModalButton: null,
        gameArea: null,
        memberProfileIcon: null,
        weakPointButton: null,
        carouselViewport: null,
        carouselTrack: null,
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
        allMemberEROImages: {},
        carouselItemsData: [],
        currentCarouselCenterIndex: 0,
        displayableImageList: [],

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
        carouselBufferSize: 2,
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
        console.log("Initializing Shikoshiko Mode (Carousel, Full Code, All Options)...");

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
        this.loadMemberQuotes();

        this.initModalUI();
        this.addEventListeners();
        this.initAudio();
        this.loadSounds();

        this.state.gameRunning = true;
        this.state.isPaused = false;
        this.applyFixedBpm();
        this.buildDisplayableImageList();
        this.currentCarouselCenterIndex = 0;

        console.log("Shikoshiko Mode Initialized (Carousel, Full Code, All Options, Auto-Start).");
    },

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
        if (this.elements.carouselViewport) { // memberImageContainer から carouselViewport に変更
            du.on(this.elements.carouselViewport, 'touchstart', (event) => this.handleTouchStart(event), { passive: true });
            du.on(this.elements.carouselViewport, 'touchmove', (event) => this.handleTouchMove(event), { passive: false });
            du.on(this.elements.carouselViewport, 'touchend', (event) => this.handleTouchEnd(event));
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
        if (this.state.carouselItemsData.length === 0 || this.state.carouselItemsData.length <= this.config.carouselBufferSize) {
            this.clearMemberDisplay(); return;
        }
        const centerItemData = this.state.carouselItemsData[this.config.carouselBufferSize];
        if (!centerItemData || !centerItemData.member) { this.clearMemberDisplay(); return; }

        this.state.currentMember = centerItemData.member;
        this.dependencies.app.applyTheme(this.state.currentMember.color);

        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = centerItemData.relativePath;
        this.updateWeakPointButtonState();

        const memberQuotes = this.state.memberQuotes[this.state.currentMember.name] || [];
        let selectedQuoteText = "（……）";
        if (memberQuotes.length > 0) {
            const randomQuote = this.dependencies.utils.getRandomElement(memberQuotes);
            if (randomQuote) selectedQuoteText = randomQuote.text;
        }
        this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, selectedQuoteText);
        this.dependencies.domUtils.empty(this.elements.imageTagsContainer);
        const tagsForCurrentImage = centerItemData.relativePath ? (this.state.imageTags[centerItemData.relativePath] || []) : [];
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
            this.setupImageInterval();
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
        this.moveCarousel('next'); // 次の画像へ（カルーセルを動かす）
    },

    buildDisplayableImageList: function() {
        this.state.displayableImageList = [];
        (this.config.members || []).forEach(member => {
            if (this.state.allMemberEROImages[member.name] && this.state.allMemberEROImages[member.name].length > 0) {
                let memberImages = this.state.allMemberEROImages[member.name];
                if (this.state.settings.weakPointOnlyEnabled) {
                    const weakPoints = this.dependencies.storage.loadWeakPoints();
                    memberImages = memberImages.filter(imgInfo => weakPoints.has(imgInfo.relativePath));
                }
                if (memberImages.length > 0) {
                    memberImages.forEach(imgInfo => {
                        this.state.displayableImageList.push({
                            member: imgInfo.member,
                            imagePath: imgInfo.path,
                            relativePath: imgInfo.relativePath
                        });
                    });
                }
            }
        });
        // 重み付けでメンバーを選び、そのメンバーの画像リストからランダムに選ぶのではなく、
        // まず表示可能な全画像リストを作り、その中から現在のカルーセル位置を決める。
        // メンバー出現率の概念は、このdisplayableImageListを構築する際に、
        // 各メンバーの画像を何回リストに入れるか、などで反映できるが、今回はシンプルに全画像をフラットに扱う。
        // もしメンバー出現率を厳密に反映するなら、displayableImageList を作る際に工夫が必要。
        // ここでは一旦、フィルタリングされた全画像をごちゃ混ぜのリストとして扱う。
        // displayableImageList をシャッフルしてランダム性を高める
        if(this.state.displayableImageList.length > 1) {
            for (let i = this.state.displayableImageList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.state.displayableImageList[i], this.state.displayableImageList[j]] = [this.state.displayableImageList[j], this.state.displayableImageList[i]];
            }
        }
        console.log(`Built displayable image list with ${this.state.displayableImageList.length} items.`);
    },

    prepareCarouselItems: function() {
        this.state.carouselItemsData = [];
        const list = this.state.displayableImageList;
        if (list.length === 0) return;

        const listLength = list.length;
        const bufferSize = this.config.carouselBufferSize; // 2
        const totalItems = bufferSize * 2 + 1; // 5

        for (let i = 0; i < totalItems; i++) {
            // カルーセルのi番目のスロットにどの画像を入れるか
            // (currentCarouselCenterIndex - bufferSize + i) がスロットに対応するdisplayableImageListのインデックス
            let imageIdx = (this.state.currentCarouselCenterIndex - bufferSize + i + listLength * (bufferSize + 1)) % listLength; // 循環させるための計算
            if(listLength > 0) {
                const imgData = list[imageIdx];
                this.state.carouselItemsData.push({
                    member: imgData.member,
                    imagePath: imgData.imagePath,
                    relativePath: imgData.relativePath,
                });
            } else { // 万が一リストが空の場合のフォールバック
                this.state.carouselItemsData.push({member: null, imagePath: 'images/placeholder.png', relativePath: `placeholder_${i}`});
            }
        }
    },

    renderCarousel: function() {
        if (!this.elements.carouselTrack) return;
        this.dependencies.domUtils.empty(this.elements.carouselTrack);

        if (this.state.carouselItemsData.length === 0) {
            const placeholderItem = this.dependencies.domUtils.createElement('div', { class: 'carousel-item active-slide' });
            const img = this.dependencies.domUtils.createElement('img', { src: 'images/placeholder.png', alt: '画像なし' });
            placeholderItem.appendChild(img);
            this.elements.carouselTrack.appendChild(placeholderItem);
            this.elements.carouselTrack.style.transition = 'none'; // アニメーションなしで即時反映
            this.elements.carouselTrack.style.left = '0%';
            this.clearMemberDisplay();
            return;
        }

        this.state.carouselItemsData.forEach((itemData, index) => {
            const itemElement = this.dependencies.domUtils.createElement('div', { class: 'carousel-item' });
            if (index === this.config.carouselBufferSize) { // 中央のアイテム
                this.dependencies.domUtils.addClass(itemElement, 'active-slide');
            }
            const img = this.dependencies.domUtils.createElement('img', { src: itemData.imagePath, alt: 'メンバー画像' });
            img.onerror = () => { img.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(img, 'image-error'); };
            itemElement.appendChild(img);
            this.elements.carouselTrack.appendChild(itemElement);
        });
        this.elements.carouselTrack.style.transition = 'none'; // 初回描画時はアニメーションなし
        this.elements.carouselTrack.style.left = `-${this.config.carouselBufferSize * 100}%`; // 中央のアイテムが表示されるように初期位置設定
        this.displayCentralCarouselItemInfo();
    },

    moveCarousel: function(direction) {
        if (this.state.displayableImageList.length <= 1) return; // 画像が1枚以下なら動かさない
        const listLength = this.state.displayableImageList.length;
        const track = this.elements.carouselTrack;
        if (!track) return;

        let newCenterIndex = this.state.currentCarouselCenterIndex;
        if (direction === 'next') {
            newCenterIndex = (this.state.currentCarouselCenterIndex + 1 + listLength) % listLength;
        } else if (direction === 'prev') {
            newCenterIndex = (this.state.currentCarouselCenterIndex - 1 + listLength) % listLength;
        }

        this.state.currentCarouselCenterIndex = newCenterIndex;
        this.prepareCarouselItems(); // 新しい中央に基づいてカルーセルデータを再構築

        // アニメーションとDOM操作
        track.style.transition = 'left 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)';
        if (direction === 'next') {
            track.style.left = `-${(this.config.carouselBufferSize + 1) * 100}%`; // 1つ右にずらす
        } else { // prev
            track.style.left = `-${(this.config.carouselBufferSize - 1) * 100}%`; // 1つ左にずらす
        }

        // トランジション完了後にDOMを再配置し、トラック位置をリセット
        setTimeout(() => {
            track.style.transition = 'none'; // トランジションを一旦オフ
            this.renderCarousel(); // これでDOMが再生成され、トラック位置もリセットされる
            // displayCentralCarouselItemInfo は renderCarousel 内で呼ばれる
            this.updateUI();
        }, 350); // CSSのトランジション時間と合わせる
    },

    nextEROImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.moveCarousel('next'); },
    prevEROImage: function() { if (!this.state.gameRunning || this.state.isPaused) return; this.moveCarousel('prev'); },
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
            this.currentCarouselCenterIndex = 0; // または最後に表示していたインデックスを復元
            this.prepareCarouselItems();
            this.renderCarousel(); // 初回カルーセル描画

            if (this.state.gameRunning && this.state.isPaused) {
                this.state.isPaused = false;
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            } else if (this.state.gameRunning && !this.state.isPaused) {
                // nextEROImageはrenderCarouselで中央が表示されるので不要かも
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            }
            this.updateUI();
        });
        // テーマ適用はdisplayCentralCarouselItemInfoで行う
        console.log("Shikoshiko Mode Activated (Carousel).");
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
        // カルーセルが空の場合の処理はrenderCarouselで行う
        if(this.elements.memberQuoteDisplay) this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, "ここにセリフが表示されます");
        if(this.elements.imageTagsContainer) this.dependencies.domUtils.toggleDisplay(this.elements.imageTagsContainer, false);
        if(this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = "";
        this.updateWeakPointButtonState();
    },
    setCounterModeDependency: function(counterModeInstance) { this.dependencies.counterMode = counterModeInstance; },
    handleTouchStart: function(event) { /* 変更なし */ }, handleTouchMove: function(event) { /* 変更なし */ },
    handleTouchEnd: function(event) { /* 変更なし */ },
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

// js/modes/shikoshiko.js (抜粋 - ログ追加箇所)

// ... init関数内 ...
        this.loadSettings();
        this.loadImageTags(); // 同期処理なので先に
        this.loadMemberQuotes().then(() => { // ★ セリフロード完了後に実行する処理
            console.log("ShikoshikoMode: Member quotes loaded or failed, proceeding with UI setup.");
            this.buildDisplayableImageList();
            this.currentCarouselCenterIndex = 0;
            this.prepareCarouselItems();
            // activate時にrenderCarouselを呼ぶのでここでは不要かも
        });

        this.initModalUI();
        this.addEventListeners();
        this.initAudio();
        this.loadSounds(); // async

        this.state.gameRunning = true;
        this.state.isPaused = false;
        this.applyFixedBpm();
        console.log("Shikoshiko Mode Initialized (Carousel, Full Code, All Options, Auto-Start).");
    },

    cacheAllMemberEROImages: function() {
        this.state.allMemberEROImages = {};
        (this.config.members || []).forEach(member => {
            // ... (既存の処理) ...
        });
        console.log("ShikoshikoMode CACHE: allMemberEROImages built:", JSON.parse(JSON.stringify(this.state.allMemberEROImages))); // ★ログ追加
    },

    buildDisplayableImageList: function() {
        this.state.displayableImageList = [];
        // ... (既存の処理) ...
        console.log(`ShikoshikoMode BUILD: Displayable image list with ${this.state.displayableImageList.length} items.`);
        if (this.state.displayableImageList.length === 0) {
            console.warn("ShikoshikoMode BUILD: Displayable image list is EMPTY. Check config and filters.");
        } else {
            // console.log("ShikoshikoMode BUILD: First few items:", JSON.parse(JSON.stringify(this.state.displayableImageList.slice(0,5)))); // ★最初の数件をログ
        }
    },

    prepareCarouselItems: function() {
        this.state.carouselItemsData = [];
        // ... (既存の処理) ...
        console.log("ShikoshikoMode PREPARE: Prepared carousel items. Count:", this.state.carouselItemsData.length);
        if (this.state.carouselItemsData.length > 0) {
            // console.log("ShikoshikoMode PREPARE: Carousel data relativePaths:", this.state.carouselItemsData.map(item => item.relativePath)); // ★相対パスをログ
        }
    },

    renderCarousel: function() {
        if (!this.elements.carouselTrack) { console.error("renderCarousel: carouselTrack element not found."); return; }
        this.dependencies.domUtils.empty(this.elements.carouselTrack);
        console.log("ShikoshikoMode RENDER: Rendering carousel with items:", this.state.carouselItemsData.length); // ★アイテム数をログ

        if (this.state.carouselItemsData.length === 0) {
            // ... (既存のプレースホルダー処理) ...
            this.clearMemberDisplay();
            return;
        }
        this.state.carouselItemsData.forEach((itemData, index) => {
            // ... (既存の要素生成) ...
            console.log(`ShikoshikoMode RENDER item ${index}: Path: ${itemData.imagePath}, Member: ${itemData.member ? itemData.member.name : 'N/A'}`); // ★各アイテムのパスをログ
            img.onerror = () => {
                console.error(`ShikoshikoMode RENDER ERROR: Failed to load image ${itemData.imagePath}`); // ★エラーログ
                img.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(img, 'image-error');
            };
            // ...
        });
        // ... (既存のトラック位置設定) ...
        this.displayCentralCarouselItemInfo();
    },

    displayCentralCarouselItemInfo: function() {
        console.log("ShikoshikoMode DISPLAY_INFO: Attempting to display info for central item."); // ★ログ追加
        if (this.state.carouselItemsData.length === 0 || this.state.carouselItemsData.length <= this.config.carouselBufferSize) {
            console.warn("ShikoshikoMode DISPLAY_INFO: Not enough items in carouselItemsData or empty.");
            this.clearMemberDisplay(); return;
        }
        const centerItemData = this.state.carouselItemsData[this.config.carouselBufferSize];
        if (!centerItemData || !centerItemData.member) {
            console.warn("ShikoshikoMode DISPLAY_INFO: Central item data or member is missing.");
            this.clearMemberDisplay(); return;
        }
        console.log("ShikoshikoMode DISPLAY_INFO: Central item data:", JSON.parse(JSON.stringify(centerItemData))); // ★中央アイテムデータをログ

        // ... (既存のセリフ・タグ表示ロジック) ...
        const memberName = this.state.currentMember.name; // currentMember はここで設定済みのはず
        const memberQuotes = this.state.memberQuotes[memberName] || [];
        console.log(`ShikoshikoMode DISPLAY_INFO: Quotes for ${memberName}:`, memberQuotes.length); // ★セリフの数をログ

        const currentImageRelPath = this.elements.weakPointButton.dataset.relpath;
        const tagsForCurrentImage = currentImageRelPath ? (this.state.imageTags[currentImageRelPath] || []) : [];
        console.log(`ShikoshikoMode DISPLAY_INFO: Tags for ${currentImageRelPath}:`, tagsForCurrentImage); // ★タグをログ
        // ...
    },

    activate: function() {
        // ...
        this.loadMemberQuotes().then(() => { // ★ セリフロード完了を待つ
            console.log("ShikoshikoMode ACTIVATE: Quotes loaded, proceeding to build/render carousel.");
            this.buildDisplayableImageList();
            if (this.state.displayableImageList.length === 0) {
                console.error("ShikoshikoMode ACTIVATE: No displayable images after build. Cannot proceed.");
                this.clearMemberDisplayAndUpdate();
                this.dependencies.uiComponents.showNotification("表示可能な画像がありません。設定を確認してください。", "error");
                if (this.state.gameRunning) this.togglePauseGame(); // 問題があれば一時停止
                return;
            }
            this.currentCarouselCenterIndex = this.dependencies.utils.getRandomInt(0, this.state.displayableImageList.length - 1); // ★ランダムな位置から開始
            this.prepareCarouselItems();
            this.renderCarousel();

            if (this.state.gameRunning && this.state.isPaused) {
                // ...
            } else if (this.state.gameRunning && !this.state.isPaused) {
                // ...
            }
            this.updateUI();
        });
        // ...
    },
