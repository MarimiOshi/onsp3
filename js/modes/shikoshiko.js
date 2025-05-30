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
        currentCarouselCenterIndex: 0, // displayableImageList内のインデックス
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
        carouselBufferSize: 2, // 中央の左右に表示する画像の数
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
        console.log("Initializing Shikoshiko Mode (Carousel, Full Code, Debug Logs)...");

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
        this.loadMemberQuotes().then(() => { // セリフとタグの読み込み完了を待つ
            console.log("ShikoshikoMode: Member quotes and tags loaded (or failed), proceeding with UI setup.");
            this.buildDisplayableImageList(); // 表示可能リスト構築
            if (this.state.displayableImageList.length > 0) {
                this.currentCarouselCenterIndex = this.dependencies.utils.getRandomInt(0, this.state.displayableImageList.length - 1);
            } else {
                this.currentCarouselCenterIndex = 0;
            }
            this.prepareCarouselItems(); // カルーセルアイテム準備
            // renderCarouselはactivate時に行う
        });

        this.initModalUI();
        this.addEventListeners();
        this.initAudio();
        this.loadSounds();

        this.state.gameRunning = true;
        this.state.isPaused = false;
        this.applyFixedBpm();
        console.log("Shikoshiko Mode Initialized (Carousel, Full Code, Debug Logs, Auto-Start).");
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
        console.log("ShikoshikoMode CACHE: allMemberEROImages built:", JSON.parse(JSON.stringify(this.state.allMemberEROImages)));
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
        if (this.elements.carouselViewport) {
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
        console.log("ShikoshikoMode DISPLAY_INFO: Attempting to display info for central item.");
        if (this.state.carouselItemsData.length === 0 || this.state.carouselItemsData.length <= this.config.carouselBufferSize) {
            console.warn("ShikoshikoMode DISPLAY_INFO: Not enough items in carouselItemsData or empty.");
            this.clearMemberDisplay(); return;
        }
        const centerItemData = this.state.carouselItemsData[this.config.carouselBufferSize];
        if (!centerItemData || !centerItemData.member) {
            console.warn("ShikoshikoMode DISPLAY_INFO: Central item data or member is missing.");
            this.clearMemberDisplay(); return;
        }
        console.log("ShikoshikoMode DISPLAY_INFO: Central item data:", JSON.parse(JSON.stringify(centerItemData)));

        this.state.currentMember = centerItemData.member;
        this.dependencies.app.applyTheme(this.state.currentMember.color);

        if (this.elements.memberProfileIcon) {
            this.elements.memberProfileIcon.src = `images/count/${this.state.currentMember.name}.jpg`;
            this.elements.memberProfileIcon.onerror = () => { if(this.elements.memberProfileIcon) this.elements.memberProfileIcon.src = 'images/placeholder.png'; };
        }
        if (this.elements.weakPointButton) this.elements.weakPointButton.dataset.relpath = centerItemData.relativePath;
        this.updateWeakPointButtonState();

        const memberQuotes = this.state.memberQuotes[this.state.currentMember.name] || [];
        console.log(`ShikoshikoMode DISPLAY_INFO: Quotes for ${this.state.currentMember.name}:`, memberQuotes.length);
        let selectedQuoteText = "（……）";
        if (memberQuotes.length > 0) {
            const randomQuote = this.dependencies.utils.getRandomElement(memberQuotes);
            if (randomQuote) selectedQuoteText = randomQuote.text;
        }
        this.dependencies.domUtils.setText(this.elements.memberQuoteDisplay, selectedQuoteText);
        this.dependencies.domUtils.empty(this.elements.imageTagsContainer);
        const tagsForCurrentImage = centerItemData.relativePath ? (this.state.imageTags[centerItemData.relativePath] || []) : [];
        console.log(`ShikoshikoMode DISPLAY_INFO: Tags for ${centerItemData.relativePath}:`, tagsForCurrentImage);
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
        this.moveCarousel('next');
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
                    // メンバー出現率に基づいて画像を追加
                    const weight = this.state.settings.memberWeights[member.name] !== undefined ? Number(this.state.settings.memberWeights[member.name]) : 1;
                    for (let w = 0; w < weight; w++) { // 重み分だけ各画像セットを追加（またはメンバーごとに追加回数を変える）
                        memberImages.forEach(imgInfo => {
                            this.state.displayableImageList.push({
                                member: imgInfo.member,
                                imagePath: imgInfo.path,
                                relativePath: imgInfo.relativePath
                            });
                        });
                    }
                }
            }
        });
        if(this.state.displayableImageList.length > 1) {
            for (let i = this.state.displayableImageList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.state.displayableImageList[i], this.state.displayableImageList[j]] = [this.state.displayableImageList[j], this.state.displayableImageList[i]];
            }
        }
        console.log(`ShikoshikoMode BUILD: Displayable image list with ${this.state.displayableImageList.length} items.`);
        if (this.state.displayableImageList.length === 0) {
            console.warn("ShikoshikoMode BUILD: Displayable image list is EMPTY. Check config and filters.");
        }
    },

    prepareCarouselItems: function() {
        this.state.carouselItemsData = [];
        const list = this.state.displayableImageList;
        if (list.length === 0) { console.log("prepareCarouselItems: displayableImageList is empty, cannot prepare items."); return; }

        const listLength = list.length;
        const bufferSize = this.config.carouselBufferSize;
        const totalItems = bufferSize * 2 + 1;

        for (let i = 0; i < totalItems; i++) {
            let imageIndex = (this.state.currentCarouselCenterIndex - bufferSize + i + listLength * (bufferSize + 1)) % listLength;
            const imgData = list[imageIndex];
            this.state.carouselItemsData.push({
                member: imgData.member,
                imagePath: imgData.imagePath,
                relativePath: imgData.relativePath,
            });
        }
        // console.log("ShikoshikoMode PREPARE: Prepared carousel items. Count:", this.state.carouselItemsData.length);
    },

    renderCarousel: function() {
        if (!this.elements.carouselTrack) { console.error("renderCarousel: carouselTrack element not found."); return; }
        this.dependencies.domUtils.empty(this.elements.carouselTrack);
        console.log("ShikoshikoMode RENDER: Rendering carousel with items:", this.state.carouselItemsData.length);

        if (this.state.carouselItemsData.length === 0) {
            const placeholderItem = this.dependencies.domUtils.createElement('div', { class: 'carousel-item active-slide' });
            const img = this.dependencies.domUtils.createElement('img', { src: 'images/placeholder.png', alt: '画像なし' });
            placeholderItem.appendChild(img);
            this.elements.carouselTrack.appendChild(placeholderItem);
            this.elements.carouselTrack.style.transition = 'none';
            this.elements.carouselTrack.style.left = '0%';
            this.clearMemberDisplay();
            return;
        }
        this.state.carouselItemsData.forEach((itemData, index) => {
            const itemElement = this.dependencies.domUtils.createElement('div', { class: 'carousel-item' });
            if (index === this.config.carouselBufferSize) {
                this.dependencies.domUtils.addClass(itemElement, 'active-slide');
            }
            const img = this.dependencies.domUtils.createElement('img', { src: itemData.imagePath, alt: 'メンバー画像' });
            img.onerror = () => { console.error(`ShikoshikoMode RENDER ERROR: Failed to load image ${itemData.imagePath}`); img.src = 'images/placeholder.png'; this.dependencies.domUtils.addClass(img, 'image-error'); };
            itemElement.appendChild(img);
            this.elements.carouselTrack.appendChild(itemElement);
        });
        this.elements.carouselTrack.style.transition = 'none';
        this.elements.carouselTrack.style.left = `-${this.config.carouselBufferSize * 100}%`;
        this.displayCentralCarouselItemInfo();
    },

    moveCarousel: function(direction) {
        if (this.state.displayableImageList.length <= 1) return;
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
        this.prepareCarouselItems(); // 新しい中央に基づいてカルーセルデータを再構築 (DOM再生成はしない)

        track.style.transition = 'left 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)';
        if (direction === 'next') {
            track.style.left = `-${(this.config.carouselBufferSize + 1) * 100}%`;
        } else {
            track.style.left = `-${(this.config.carouselBufferSize - 1) * 100}%`;
        }
        setTimeout(() => {
            track.style.transition = 'none';
            this.renderCarousel(); // DOM再構築とトラック位置リセット
            this.updateUI();
        }, 350);
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
            if (this.state.displayableImageList.length === 0) {
                console.error("ShikoshikoMode ACTIVATE: No displayable images after build. Cannot proceed.");
                this.clearMemberDisplayAndUpdate();
                this.dependencies.uiComponents.showNotification("表示可能な画像がありません。設定を確認してください。", "error");
                if (this.state.gameRunning) this.togglePauseGame();
                return;
            }
            this.currentCarouselCenterIndex = this.dependencies.utils.getRandomInt(0, this.state.displayableImageList.length - 1);
            this.prepareCarouselItems();
            this.renderCarousel();

            if (this.state.gameRunning && this.state.isPaused) {
                this.state.isPaused = false; // 再開なので一時停止解除
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            } else if (this.state.gameRunning && !this.state.isPaused) {
                // nextEROImageはrenderCarouselで初期表示されるため、ここでは不要
                this.resumeShikoAnimationAndSound();
                this.setupImageInterval();
            }
            this.updateUI();
        });
        // テーマ適用はdisplayCentralCarouselItemInfoで行われる
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
        if(this.elements.carouselTrack) this.dependencies.domUtils.empty(this.elements.carouselTrack); // カルーセルもクリア
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
