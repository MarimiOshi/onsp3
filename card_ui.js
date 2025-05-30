// card_ui.js
console.log("card_ui.js executing (Syntax Error Re-Fix Attempt)"); // ファイル読み込み確認用

const CardUI = {
    elements: {
        stackArea: null,
        likeButtonMain: null,
        nopeButton: null,
        profileIcon: null,
        weakPointButtonSide: null,
        feverGaugeBar: null,
        modalMemberSlidersContainer: null,
    },
    state: {
        cards: [],
        topCard: null,
        nextCardData: null,
        isDragging: false,
        startX: 0, startY: 0, currentX: 0, currentY: 0,
        feverGauge: 0,
        isFeverActive: false,
        feverTimeoutId: null,
        likedImageHistoryForFever: [],
        _stickerInterval: null,
    },
    config: null,
    dataHandler: null,
    appInterface: null,

    async init(appConfig, dataHandlerInstance, appInterfaceInstance) {
        this.config = appConfig;
        this.dataHandler = dataHandlerInstance;
        this.appInterface = appInterfaceInstance;
        console.log("CardUI: Initializing (Syntax Error Re-Fix)...");

        this.elements.stackArea = DOMUtils.qs('#cardStackArea');
        this.elements.likeButtonMain = DOMUtils.qs('#likeButtonMain');
        this.elements.nopeButton = DOMUtils.qs('#nopeButton');
        this.elements.profileIcon = DOMUtils.qs('#memberProfileIcon');
        this.elements.weakPointButtonSide = DOMUtils.qs('#weakPointButton');
        this.elements.feverGaugeBar = DOMUtils.qs('#feverGaugeBarVertical');
        this.elements.modalMemberSlidersContainer = DOMUtils.qs('#modalMemberSliders');

        if (!this.elements.stackArea || !this.elements.likeButtonMain || !this.elements.nopeButton || !this.elements.profileIcon || !this.elements.weakPointButtonSide || !this.elements.feverGaugeBar) {
            console.error("CardUI: One or more essential elements not found in DOM. Initialization may fail.");
        }

        this.addEventListeners();
        await this.preloadNextCardData();
        this.addCardToStack(true);
        if (this.config.cardSwipeSettings.nextCardPreloadCount > 0 && this.state.nextCardData) {
            await this.preloadNextCardData();
            this.addCardToStack(false, true);
        }
        if (this.config.cardSwipeSettings.nextCardPreloadCount > 1 && this.state.nextCardData) {
            await this.preloadNextCardData();
            this.addCardToStack(false, true);
        }

        this.updateFeverGaugeDisplay();
        console.log("CardUI: Initialization complete.");
        return this;
    },

    addEventListeners: function() {
        if (this.elements.likeButtonMain) DOMUtils.on(this.elements.likeButtonMain, 'click', () => this.swipeTopCard('right'));
        if (this.elements.nopeButton) DOMUtils.on(this.elements.nopeButton, 'click', () => this.swipeTopCard('left'));
        if (this.elements.weakPointButtonSide) DOMUtils.on(this.elements.weakPointButtonSide, 'click', () => this.toggleWeakPointOnCurrentCard());
    },

    async preloadNextCardData: async function() {
        const currentSettings = this.appInterface.getCurrentSettings ? this.appInterface.getCurrentSettings() : {};
        let cardDataToLoad;

        if (this.state.isFeverActive) {
            if (this.state.likedImageHistoryForFever.length > 0) {
                cardDataToLoad = Utils.getRandomElement(this.state.likedImageHistoryForFever);
            } else {
                console.warn("CardUI: No liked images for Fever Mode. Ending fever.");
                this.endFeverMode();
                cardDataToLoad = this.dataHandler.getNextCardData(currentSettings, false);
            }
        } else {
            cardDataToLoad = this.dataHandler.getNextCardData(currentSettings, false);
        }
        this.state.nextCardData = cardDataToLoad;

        if (this.state.nextCardData && this.state.nextCardData.imagePath) {
            const img = new Image();
            img.src = this.state.nextCardData.imagePath;
            console.log("CardUI: Preloaded next card data for:", this.state.nextCardData.member.name, this.state.nextCardData.relativePath);
        } else if (!this.state.nextCardData) {
             console.error("CardUI: Failed to preload next card data. No eligible images could be found by DataHandler.");
             if(this.appInterface && typeof this.appInterface.showNotification === 'function'){
                 this.appInterface.showNotification("表示できるカードがありません。", "error");
             }
        }
    },

    addCardToStack: function(isInitial = false, isBehind = false) {
        if (!this.state.nextCardData) {
            console.warn("CardUI: No next card data to add to stack.");
            if(this.state.cards.length === 0 && this.appInterface && typeof this.appInterface.showNotification === 'function'){
                this.appInterface.showNotification("表示できるカードがなくなりました。設定を確認してください。", "error");
            }
            return;
        }
        const cardData = this.state.nextCardData;
        this.state.nextCardData = null;

        const cardElement = this.createCardElement(cardData);
        if (!cardElement || !this.elements.stackArea) return;

        if (isBehind && this.elements.stackArea.children.length > 0) {
            this.elements.stackArea.insertBefore(cardElement, this.elements.stackArea.children[this.elements.stackArea.children.length -1]);
            this.state.cards.splice(this.state.cards.length -1, 0, cardElement);
        } else {
            this.elements.stackArea.appendChild(cardElement);
            this.state.cards.push(cardElement);
        }
        this.updateTopCard();

        if (isInitial && this.state.topCard) {
            this.updateSidePanelInfo(cardData);
            if (this.appInterface && typeof this.appInterface.applyCardOuterTheme === 'function') {
                this.appInterface.applyCardOuterTheme(cardData.member.color);
            }
        }

        const requiredCards = 1 + (this.config.cardSwipeSettings.nextCardPreloadCount || 1);
        if (this.state.cards.length < requiredCards) {
             this.preloadNextCardData().then(() => {
                if (this.state.nextCardData && this.state.cards.length < requiredCards) {
                    this.addCardToStack(false, true);
                }
             });
        }
    },

    createCardElement: function(cardData) {
        if (!cardData || !cardData.imagePath || !cardData.member) {
            console.error("CardUI: Invalid cardData for createCardElement", cardData);
            return null;
        }

        const card = DOMUtils.createElement('div', { class: 'card', dataset: { relativePath: cardData.relativePath } });

        if (cardData.member && cardData.member.color) {
            card.style.borderColor = cardData.member.color;
            const hslColor = Utils.hexToHsl(cardData.member.color); // グローバル Utils を使用
            let shadowCssValue;
            if (hslColor) {
                shadowCssValue = `hsla(${hslColor[0]}, 50%, 30%, 0.4)`;
            } else {
                shadowCssValue = 'rgba(0,0,0,0.3)';
            }
            card.style.boxShadow = `0 5px 15px ${shadowCssValue}`; // ★★★ 修正箇所 ★★★
        } else {
            card.style.borderColor = 'transparent';
            card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        }

        const imageArea = DOMUtils.createElement('div', { class: 'card-image-area' });
        const img = DOMUtils.createElement('img', { src: cardData.imagePath, alt: cardData.member.name });
        img.onerror = () => {
            const errorPlaceholder = DOMUtils.createElement('div', { class: 'image-error-placeholder' }, ['画像読込失敗']);
            DOMUtils.empty(imageArea); imageArea.appendChild(errorPlaceholder);
        };
        imageArea.appendChild(img);

        const infoArea = DOMUtils.createElement('div', { class: 'card-info-area' });
        const quoteEl = DOMUtils.createElement('p', { class: 'member-quote' }, [cardData.quote || "（セリフ準備中）"]);
        const tagsContainer = DOMUtils.createElement('div', { class: 'image-tags-container' });
        if (cardData.tags && cardData.tags.length > 0) {
            cardData.tags.sort().forEach(tag => {
                tagsContainer.appendChild(DOMUtils.createElement('span', { class: 'image-tag-item' }, [tag]));
            });
        } else {
            tagsContainer.style.display = 'none';
        }
        infoArea.appendChild(quoteEl);
        infoArea.appendChild(tagsContainer);

        const likeOverlay = DOMUtils.createElement('div', { class: 'swipe-overlay like' });
        if(this.config.cardSwipeSettings.likeImageSrc){
            const likeImg = DOMUtils.createElement('img', { src: this.config.cardSwipeSettings.likeImageSrc, alt: 'シコい!!'});
            likeOverlay.appendChild(likeImg);
        } else {
            likeOverlay.textContent = "シコい!!";
        }

        const nopeOverlay = DOMUtils.createElement('div', { class: 'swipe-overlay nope' });
         if(this.config.cardSwipeSettings.nopeImageSrc){
            const nopeImg = DOMUtils.createElement('img', { src: this.config.cardSwipeSettings.nopeImageSrc, alt: '萎え'});
            nopeOverlay.appendChild(nopeImg);
        } else {
            nopeOverlay.textContent = "萎え";
        }

        card.appendChild(imageArea);
        card.appendChild(infoArea);
        card.appendChild(likeOverlay);
        card.appendChild(nopeOverlay);

        DOMUtils.on(card, 'mousedown', (e) => this.handleDragStart(e, card));
        DOMUtils.on(card, 'touchstart', (e) => this.handleDragStart(e, card), { passive: true });

        return card;
    },

    updateTopCard: function() {
        this.state.topCard = this.state.cards.length > 0 ? this.state.cards[this.state.cards.length - 1] : null;
        this.state.cards.forEach((card, index) => {
            const isTop = (card === this.state.topCard);
            card.style.zIndex = index;
            if (isTop) {
                card.style.transform = 'translateY(0px) scale(1)';
                card.style.opacity = 1;
            } else {
                const depth = this.state.cards.length - 1 - index;
                card.style.transform = `translateY(${depth * 8}px) scale(${1 - depth * 0.04})`;
                card.style.opacity = 1 - depth * 0.3;
            }
        });
    },

    updateSidePanelInfo: function(cardData) {
        if (cardData && cardData.member) {
            if (this.elements.profileIcon) {
                this.elements.profileIcon.src = `images/count/${cardData.member.name}.jpg`;
                this.elements.profileIcon.onerror = () => { if(this.elements.profileIcon) this.elements.profileIcon.src = 'images/placeholder.png';};
            }
            if (this.elements.weakPointButtonSide) {
                this.elements.weakPointButtonSide.dataset.relpath = cardData.relativePath;
                const isWeak = this.dataHandler.isWeakPoint(cardData.relativePath);
                const iconEl = DOMUtils.qs('.icon-display', this.elements.weakPointButtonSide);
                if(iconEl) DOMUtils.setText(iconEl, isWeak ? '🌟' : '⭐');
                DOMUtils.toggleClass(this.elements.weakPointButtonSide, 'is-weak', isWeak);
            }
        } else {
            if (this.elements.profileIcon) this.elements.profileIcon.src = 'images/placeholder.png';
            if (this.elements.weakPointButtonSide) {
                this.elements.weakPointButtonSide.dataset.relpath = "";
                 const iconEl = DOMUtils.qs('.icon-display', this.elements.weakPointButtonSide);
                if(iconEl) DOMUtils.setText(iconEl, '⭐');
                DOMUtils.removeClass(this.elements.weakPointButtonSide, 'is-weak');
            }
        }
    },

    toggleWeakPointOnCurrentCard: function() {
        if (!this.state.topCard) return;
        const relPath = this.state.topCard.dataset.relativePath;
        if (relPath) {
            const isNowWeak = this.dataHandler.toggleWeakPoint(relPath);
            const iconEl = DOMUtils.qs('.icon-display', this.elements.weakPointButtonSide);
            if(iconEl) DOMUtils.setText(iconEl, isNowWeak ? '🌟' : '⭐');
            DOMUtils.toggleClass(this.elements.weakPointButtonSide, 'is-weak', isNowWeak);
            if (this.appInterface && typeof this.appInterface.notifyWeakPointChange === 'function') {
                this.appInterface.notifyWeakPointChange(relPath, isNowWeak);
            }
        }
    },

    handleDragStart: function(event, card) {
        if (card !== this.state.topCard || this.state.isDragging) return;
        this.state.isDragging = true;
        DOMUtils.addClass(card, 'dragging');
        const touch = event.type === 'touchstart' ? event.touches[0] : event;
        this.state.startX = touch.clientX;
        this.state.startY = touch.clientY;
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;
        this._dragMoveListener = (e) => this.handleDragMove(e, card);
        this._dragEndListener = (e) => this.handleDragEnd(e, card);
        document.addEventListener('mousemove', this._dragMoveListener);
        document.addEventListener('touchmove', this._dragMoveListener, { passive: false });
        document.addEventListener('mouseup', this._dragEndListener);
        document.addEventListener('touchend', this._dragEndListener);
    },

    handleDragMove: function(event, card) {
        if (!this.state.isDragging || !card) return;
        event.preventDefault();
        const touch = event.type === 'touchmove' ? event.touches[0] : event;
        const offsetX = touch.clientX - this.state.startX;
        const offsetY = touch.clientY - this.state.startY;
        const rotateDeg = offsetX * 0.05;
        card.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotateDeg}deg)`;
        const threshold = card.offsetWidth * 0.2;
        if (offsetX > threshold) { DOMUtils.addClass(card, 'show-like-overlay'); DOMUtils.removeClass(card, 'show-nope-overlay'); }
        else if (offsetX < -threshold) { DOMUtils.addClass(card, 'show-nope-overlay'); DOMUtils.removeClass(card, 'show-like-overlay'); }
        else { DOMUtils.removeClass(card, 'show-like-overlay'); DOMUtils.removeClass(card, 'show-nope-overlay'); }
    },

    handleDragEnd: function(event, card) {
        if (!this.state.isDragging || !card) return;
        this.state.isDragging = false;
        DOMUtils.removeClass(card, 'dragging');
        DOMUtils.removeClass(card, 'show-like-overlay'); DOMUtils.removeClass(card, 'show-nope-overlay');
        document.removeEventListener('mousemove', this._dragMoveListener);
        document.removeEventListener('touchmove', this._dragMoveListener);
        document.removeEventListener('mouseup', this._dragEndListener);
        document.removeEventListener('touchend', this._dragEndListener);
        const touch = event.type === 'touchend' ? event.changedTouches[0] : event;
        const finalOffsetX = touch.clientX - this.state.startX;
        const swipeThreshold = card.offsetWidth * 0.35;
        if (Math.abs(finalOffsetX) > swipeThreshold) {
            this.swipeTopCard(finalOffsetX > 0 ? 'right' : 'left');
        } else {
            card.style.transform = '';
        }
    },

    swipeTopCard: function(direction) {
        if (!this.state.topCard) return;
        const cardToRemove = this.state.topCard;
        const cardData = this.dataHandler.memberData.find(d => d.relativePath === cardToRemove.dataset.relativePath);
        DOMUtils.addClass(cardToRemove, direction === 'right' ? 'removing-right' : 'removing-left');
        if (direction === 'right') {
            console.log("CardUI: Swiped Right (Like)");
            if (cardData) this.dataHandler.addLikedImage(cardData);
            this.incrementFeverGauge();
        } else {
            console.log("CardUI: Swiped Left (Nope)");
        }
        setTimeout(() => {
            if (cardToRemove.parentNode) cardToRemove.parentNode.removeChild(cardToRemove);
            this.state.cards = this.state.cards.filter(c => c !== cardToRemove);
            this.updateTopCard();
            this.preloadNextCardData().then(() => {
                this.addCardToStack(false, true);
                if (this.state.topCard) {
                    const topCardRelPath = this.state.topCard.dataset.relativePath;
                    const newTopCardData = this.dataHandler.memberData.find(d => d.relativePath === topCardRelPath);
                    if (newTopCardData) {
                         this.updateSidePanelInfo(newTopCardData);
                         if (this.appInterface && typeof this.appInterface.applyCardOuterTheme === 'function') {
                            this.appInterface.applyCardOuterTheme(newTopCardData.member.color);
                         }
                    }
                } else {
                    this.updateSidePanelInfo(null);
                     if (this.appInterface && typeof this.appInterface.applyCardOuterTheme === 'function') {
                        this.appInterface.applyCardOuterTheme(null);
                     }
                }
            });
        }, 300);
    },

    incrementFeverGauge: function() {
        if (this.state.isFeverActive) return;
        this.state.feverGauge++;
        this.updateFeverGaugeDisplay();
        if (this.config.cardSwipeSettings && this.state.feverGauge >= this.config.cardSwipeSettings.feverThreshold) {
            this.startFeverMode();
        }
    },
    updateFeverGaugeDisplay: function() {
        if (!this.elements.feverGaugeBar) return;
        const threshold = (this.config.cardSwipeSettings && this.config.cardSwipeSettings.feverThreshold) || 10;
        const percentage = Math.min(100, (this.state.feverGauge / threshold) * 100);
        this.elements.feverGaugeBar.style.height = `${percentage}%`;
    },
    startFeverMode: function() {
        if (this.state.isFeverActive) return;
        console.log("CardUI: FEVER MODE START!");
        this.state.isFeverActive = true;
        this.state.likedImageHistoryForFever = this.dataHandler.getLikedImages();
        if (this.state.likedImageHistoryForFever.length === 0) {
            console.warn("CardUI: No liked images for Fever. Ending immediately.");
            this.endFeverMode(); return;
        }
        if(this.appInterface && typeof this.appInterface.showNotification === 'function') this.appInterface.showNotification("フィーバー突入！", "info", 2000);
        if (this.appInterface && typeof this.appInterface.DOMUtils !== 'undefined') this.appInterface.DOMUtils.addClass(document.body, 'fever-active');
        let feverTimeLeft = (this.config.cardSwipeSettings && this.config.cardSwipeSettings.feverDuration) || 60000;
        if (this.elements.feverGaugeBar) this.elements.feverGaugeBar.style.transition = 'height 0.1s linear';
        this.state.feverTimeoutId = setInterval(() => {
            feverTimeLeft -= 100;
            const duration = (this.config.cardSwipeSettings && this.config.cardSwipeSettings.feverDuration) || 60000;
            const percentage = Math.max(0, (feverTimeLeft / duration) * 100);
            if (this.elements.feverGaugeBar) this.elements.feverGaugeBar.style.height = `${percentage}%`;
            if (feverTimeLeft <= 0) this.endFeverMode();
        }, 100);
        this.startStickerShower();
        this.preloadNextCardData().then(() => this.addCardToStack(true));
    },
    endFeverMode: function() {
        console.log("CardUI: FEVER MODE END!");
        this.state.isFeverActive = false; this.state.feverGauge = 0;
        if (this.state.feverTimeoutId) clearInterval(this.state.feverTimeoutId); this.state.feverTimeoutId = null;
        if (this.elements.feverGaugeBar) {
            this.elements.feverGaugeBar.style.transition = 'height 0.3s ease-out';
            this.updateFeverGaugeDisplay();
        }
        if (this.appInterface && typeof this.appInterface.DOMUtils !== 'undefined') this.appInterface.DOMUtils.removeClass(document.body, 'fever-active');
        this.stopStickerShower();
        this.preloadNextCardData().then(() => { if(this.state.cards.length === 0 && this.state.nextCardData) this.addCardToStack(true); });
    },
    startStickerShower: function() {
        if (!this.config.cardSwipeSettings || !this.config.cardSwipeSettings.stickerPaths || this.config.cardSwipeSettings.stickerPaths.length === 0 || !this.elements.stackArea) return;
        this.stopStickerShower();
        this._stickerInterval = setInterval(() => {
            const stickerSrc = Utils.getRandomElement(this.config.cardSwipeSettings.stickerPaths);
            const stickerEl = DOMUtils.createElement('img', { src: stickerSrc, class: 'fever-sticker' });
            const side = Math.random() < 0.5 ? 'left' : 'right';
            const startX = side === 'left' ? Utils.getRandomInt(0, 30) : Utils.getRandomInt(70, 100);
            const startY = Utils.getRandomInt(-20, 20); const endY = 110;
            const duration = Utils.getRandomInt(2000, 4000); const angle = Utils.getRandomInt(-30, 30);
            const scale = Utils.getRandomInt(5, 12) / 10;
            stickerEl.style.position = 'absolute'; stickerEl.style.left = `${startX}vw`; stickerEl.style.top = `${startY}vh`;
            stickerEl.style.width = `${Utils.getRandomInt(30, 70)}px`; stickerEl.style.transform = `scale(${scale}) rotate(${angle}deg)`;
            stickerEl.style.opacity = '0.8'; stickerEl.style.zIndex = '5'; stickerEl.style.pointerEvents = 'none';
            this.elements.stackArea.appendChild(stickerEl);
            stickerEl.animate([{ top: `${startY}vh`, opacity: 0.8 }, { top: `${endY}vh`, opacity: 0 }],
                { duration: duration, easing: 'ease-in' }
            ).onfinish = () => { if (stickerEl.parentNode) stickerEl.parentNode.removeChild(stickerEl); };
        }, 500);
    },
    stopStickerShower: function() {
        if (this._stickerInterval) clearInterval(this._stickerInterval); this._stickerInterval = null;
        if (this.elements.stackArea) DOMUtils.qsa('.fever-sticker', this.elements.stackArea).forEach(el => el.remove());
    },

    activate: function() {
        if (this.state.cards.length === 0 && this.state.nextCardData) {
            this.addCardToStack(true);
        } else if (this.state.topCard) {
            const topCardRelPath = this.state.topCard.dataset.relativePath;
            const topCardData = this.dataHandler.memberData.find(d => d.relativePath === topCardRelPath);
            if (topCardData) this.updateSidePanelInfo(topCardData);
        }
        console.log("CardUI Activated.");
    },
    deactivate: function() {
        if (this.state.isFeverActive) this.endFeverMode();
        console.log("CardUI Deactivated.");
    },
    handleSettingsChange: function() {
        console.log("CardUI: Settings changed, rebuilding card stack if necessary.");
        this.state.cards.forEach(card => { if(card.parentNode) card.parentNode.removeChild(card); });
        this.state.cards = []; this.state.topCard = null;
        // データハンドラに設定を反映させる必要があるかもしれない
        // this.dataHandler.updateSettings(this.appInterface.getCurrentSettings());
        this.preloadNextCardData().then(() => {
            this.addCardToStack(true);
            if (this.config.cardSwipeSettings.nextCardPreloadCount > 0 && this.state.nextCardData) {
                this.preloadNextCardData().then(() => this.addCardToStack(false, true));
            }
        });
    },
    populateSettingsModal: function(currentMemberWeights) {
        if (this.elements.modalMemberSlidersContainer && this.config.members && this.appInterface && this.appInterface.UIComponents) {
            this.appInterface.UIComponents.createMemberWeightSliders(
                '#modalMemberSliders',
                this.config.members,
                currentMemberWeights,
                () => {}
            );
        }
    },
    updateWeakPointIconOnCurrentCard: function(relativePath, isNowWeak) {
        if (this.state.topCard && this.state.topCard.dataset.relativePath === relativePath) {
            const iconEl = DOMUtils.qs('.icon-display', this.elements.weakPointButtonSide);
            if(iconEl) DOMUtils.setText(iconEl, isNowWeak ? '🌟' : '⭐');
            DOMUtils.toggleClass(this.elements.weakPointButtonSide, 'is-weak', isNowWeak);
        }
    }
};
