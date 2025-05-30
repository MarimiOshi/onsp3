// card_ui.js

const CardUI = {
    elements: {
        stackArea: null,
        // カード要素は動的に生成・管理
        likeButtonMain: null, // 下部の「シコい!!」ボタン
        nopeButton: null,   // 下部の「萎え」ボタン
        profileIcon: null,
        weakPointButtonSide: null, // サイドの弱点/お気に入りボタン
        feverGaugeBar: null,
        // セリフ・タグ表示用 (カード内に配置される)
        // quoteDisplay: null, // これは各カードインスタンスが持つ
        // tagsContainer: null, // これも各カードインスタンスが持つ
        // 設定モーダル関連は app.js または settings_modal.js が担当
    },
    state: {
        cards: [], // 現在画面上（DOM上）にあるカード要素の配列
        topCard: null, // 最前面のカード要素
        nextCardData: null, // 次に表示するカードのデータ（事前読み込み用）
        isDragging: false,
        startX: 0, startY: 0, currentX: 0, currentY: 0,
        feverGauge: 0,
        isFeverActive: false,
        feverTimeoutId: null,
        likedImagesForFever: [], // フィーバー中に表示する高評価画像のリスト
    },
    config: null,       // アプリ全体のconfigオブジェクト
    dataHandler: null,  // DataHandlerのインスタンス
    appInterface: null, // app.jsへの参照 (テーマ変更や通知のため)

    async init(appConfig, dataHandlerInstance, appInterfaceInstance) {
        this.config = appConfig;
        this.dataHandler = dataHandlerInstance;
        this.appInterface = appInterfaceInstance;
        console.log("CardUI: Initializing...");

        this.elements.stackArea = DOMUtils.qs('#cardStackArea');
        this.elements.likeButtonMain = DOMUtils.qs('#likeButtonMain');
        this.elements.nopeButton = DOMUtils.qs('#nopeButton');
        this.elements.profileIcon = DOMUtils.qs('#memberProfileIcon');
        this.elements.weakPointButtonSide = DOMUtils.qs('#weakPointButton'); // サイドのボタン
        this.elements.feverGaugeBar = DOMUtils.qs('#feverGaugeBarVertical');

        this.addEventListeners();
        await this.preloadNextCardData(); // 最初のカードデータを読み込む
        this.addCardToStack(true); // 最初のカードをスタックに追加 (isInitial = true)
        if (this.config.cardSwipeSettings.nextCardPreloadCount > 0) {
            await this.preloadNextCardData(); // 2枚目のカードデータも読み込む
            this.addCardToStack(false, true); // 2枚目を裏に追加 (isBehind = true)
        }

        this.updateFeverGaugeDisplay();
        console.log("CardUI: Initialization complete.");
        return this;
    },

    addEventListeners: function() {
        if (this.elements.likeButtonMain) DOMUtils.on(this.elements.likeButtonMain, 'click', () => this.swipeTopCard('right'));
        if (this.elements.nopeButton) DOMUtils.on(this.elements.nopeButton, 'click', () => this.swipeTopCard('left'));
        if (this.elements.weakPointButtonSide) DOMUtils.on(this.elements.weakPointButtonSide, 'click', () => this.toggleWeakPointOnCurrentCard());
        // カード自体へのドラッグイベントはaddCardToStackで追加
    },

    async preloadNextCardData: async function() {
        const settings = this.appInterface.getCurrentSettings ? this.appInterface.getCurrentSettings() : {}; // app.jsから最新設定取得
        this.state.nextCardData = this.dataHandler.getNextCardData(settings, this.state.isFeverActive);
        if (this.state.nextCardData && this.state.nextCardData.imagePath) {
            // 画像の事前読み込み (オプショナルだが推奨)
            const img = new Image();
            img.src = this.state.nextCardData.imagePath;
            console.log("CardUI: Preloaded next card data for:", this.state.nextCardData.member.name, this.state.nextCardData.relativePath);
        } else if (this.state.isFeverActive && this.dataHandler.getLikedImages().length === 0) {
            console.warn("CardUI: No liked images to show in Fever Mode. Ending fever.");
            this.endFeverMode(); // 表示するフィーバー画像がない場合はフィーバー終了
            this.state.nextCardData = this.dataHandler.getNextCardData(settings, false); // 通常モードで再取得
            if (this.state.nextCardData && this.state.nextCardData.imagePath) {
                const img = new Image(); img.src = this.state.nextCardData.imagePath;
            }
        } else if (!this.state.nextCardData) {
             console.error("CardUI: Failed to preload next card data. No eligible images.");
             // ここでユーザーに通知するか、リトライ処理を入れる
             if(this.appInterface && this.appInterface.uiComponents) this.appInterface.uiComponents.showNotification("表示できるカードがありません。", "error");
        }
    },

    addCardToStack: function(isInitial = false, isBehind = false) {
        if (!this.state.nextCardData) {
            console.warn("CardUI: No next card data to add to stack.");
            if(this.state.cards.length === 0 && this.appInterface && this.appInterface.uiComponents){ // スタックが空ならエラー表示
                this.appInterface.uiComponents.showNotification("表示できるカードがなくなりました。設定を確認してください。", "error");
            }
            return;
        }
        const cardData = this.state.nextCardData;
        this.state.nextCardData = null; // 消費したのでクリア

        const cardElement = this.createCardElement(cardData);
        if (!cardElement) return;

        if (isBehind && this.elements.stackArea.firstChild) {
            this.elements.stackArea.insertBefore(cardElement, this.elements.stackArea.firstChild.nextSibling); // 現在の最前面の次に挿入
        } else {
            this.elements.stackArea.appendChild(cardElement);
        }
        this.state.cards.push(cardElement);
        this.updateTopCard();

        if (isInitial && this.state.topCard) {
            this.updateSidePanelInfo(cardData);
            this.appInterface.applyCardOuterTheme(cardData.member.color); // カード外のテーマ更新
        }

        // 次のカードを事前読み込み (スタックに余裕がある場合)
        if (this.state.cards.length < (this.config.cardSwipeSettings.nextCardPreloadCount + 1)) {
             this.preloadNextCardData().then(() => {
                if (this.state.nextCardData && this.state.cards.length < (this.config.cardSwipeSettings.nextCardPreloadCount + 1)) {
                    this.addCardToStack(false, true);
                }
             });
        }
    },

    createCardElement: function(cardData) {
        if (!cardData || !cardData.imagePath) return null;

        const card = DOMUtils.createElement('div', { class: 'card', dataset: { relativePath: cardData.relativePath } });
        // カードの縁の色をメンバーカラーに
        card.style.borderColor = cardData.member.color;
        card.style.boxShadow = `0 5px 15px ${Utils.hexToHsl(cardData.member.color) ? `hsla(${Utils.hexToHsl(cardData.member.color)[0]}, 50%, 50%, 0.3)` : 'rgba(0,0,0,0.3)'}`;


        const imageArea = DOMUtils.createElement('div', { class: 'card-image-area' });
        const img = DOMUtils.createElement('img', { src: cardData.imagePath, alt: cardData.member.name });
        img.onerror = () => {
            const errorPlaceholder = DOMUtils.createElement('div', { class: 'image-error-placeholder' }, ['画像読込失敗']);
            DOMUtils.empty(imageArea);
            imageArea.appendChild(errorPlaceholder);
        };
        imageArea.appendChild(img);

        const infoArea = DOMUtils.createElement('div', { class: 'card-info-area' });
        const quoteEl = DOMUtils.createElement('p', { class: 'member-quote' }, [cardData.quote]);
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

        // スワイプ評価オーバーレイ
        const likeOverlay = DOMUtils.createElement('div', { class: 'swipe-overlay like' });
        const likeImg = DOMUtils.createElement('img', { src: this.config.cardSwipeSettings.likeImageSrc, alt: 'シコい!!'});
        likeOverlay.appendChild(likeImg);

        const nopeOverlay = DOMUtils.createElement('div', { class: 'swipe-overlay nope' });
        const nopeImg = DOMUtils.createElement('img', { src: this.config.cardSwipeSettings.nopeImageSrc, alt: '萎え'});
        nopeOverlay.appendChild(nopeImg);

        card.appendChild(imageArea);
        card.appendChild(infoArea);
        card.appendChild(likeOverlay);
        card.appendChild(nopeOverlay);

        // ドラッグイベントリスナー
        DOMUtils.on(card, 'mousedown', (e) => this.handleDragStart(e, card));
        DOMUtils.on(card, 'touchstart', (e) => this.handleDragStart(e, card), { passive: true });

        return card;
    },

    updateTopCard: function() {
        this.state.topCard = this.state.cards.length > 0 ? this.state.cards[this.state.cards.length - 1] : null;
        if (this.state.topCard) {
            this.state.topCard.style.zIndex = this.state.cards.length; // 最前面に
        }
        // 他のカードのスタイル調整（例：少し小さくする、背後に隠すなど）
        this.state.cards.forEach((card, index) => {
            if (card !== this.state.topCard) {
                card.style.transform = `translateY(${(this.state.cards.length - 1 - index) * -10}px) scale(${1 - (this.state.cards.length - 1 - index) * 0.03})`;
                card.style.opacity = 1 - (this.state.cards.length - 1 - index) * 0.2;
                card.style.zIndex = index;
            } else {
                card.style.transform = ''; // 最前面は通常表示
                card.style.opacity = 1;
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
                if(iconEl) DOMUtils.setText(iconEl, isWeak ? '🌟' : '⭐'); // 絵文字変更
                DOMUtils.toggleClass(this.elements.weakPointButtonSide, 'is-weak', isWeak);
            }
        } else { // カードデータがない場合（スタックが空など）
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
            // 必要ならapp.js経由で他のモジュールに通知
            if (this.appInterface && typeof this.appInterface.notifyWeakPointChange === 'function') {
                this.appInterface.notifyWeakPointChange(relPath, isNowWeak);
            }
        }
    },

    // --- ドラッグ＆スワイプ処理 ---
    handleDragStart: function(event, card) {
        if (card !== this.state.topCard || this.state.isDragging) return; // 最前面のカード以外、または既にドラッグ中は無視
        this.state.isDragging = true;
        DOMUtils.addClass(card, 'dragging');
        const touch = event.type === 'touchstart' ? event.touches[0] : event;
        this.state.startX = touch.clientX;
        this.state.startY = touch.clientY;
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;

        // ドラッグ中のイベントリスナー
        this._dragMoveListener = (e) => this.handleDragMove(e, card);
        this._dragEndListener = (e) => this.handleDragEnd(e, card);
        document.addEventListener('mousemove', this._dragMoveListener);
        document.addEventListener('touchmove', this._dragMoveListener, { passive: false });
        document.addEventListener('mouseup', this._dragEndListener);
        document.addEventListener('touchend', this._dragEndListener);
    },

    handleDragMove: function(event, card) {
        if (!this.state.isDragging || !card) return;
        event.preventDefault(); // ページスクロールを防ぐ
        const touch = event.type === 'touchmove' ? event.touches[0] : event;
        const deltaX = touch.clientX - this.state.currentX;
        const deltaY = touch.clientY - this.state.currentY;
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;

        const cardRect = card.getBoundingClientRect();
        const currentTransform = getComputedStyle(card).transform;
        let currentAngle = 0;
        if (currentTransform && currentTransform !== 'none') {
            const values = currentTransform.split('(')[1].split(')')[0].split(',');
            // a = values[0], b = values[1], c = values[2], d = values[3]
            // angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
            // より単純に、X方向の移動量に応じて角度をつける
        }

        const offsetX = touch.clientX - this.state.startX;
        const rotateDeg = offsetX * 0.1; // X方向の移動量に応じてカードを傾ける

        card.style.transform = `translate(${offsetX}px, ${touch.clientY - this.state.startY}px) rotate(${rotateDeg}deg)`;

        // スワイプ方向に応じて評価オーバーレイ表示
        if (offsetX > 30) { // 右スワイプ（シコい）
            DOMUtils.addClass(card, 'show-like-overlay');
            DOMUtils.removeClass(card, 'show-nope-overlay');
        } else if (offsetX < -30) { // 左スワイプ（萎え）
            DOMUtils.addClass(card, 'show-nope-overlay');
            DOMUtils.removeClass(card, 'show-like-overlay');
        } else {
            DOMUtils.removeClass(card, 'show-like-overlay');
            DOMUtils.removeClass(card, 'show-nope-overlay');
        }
    },

    handleDragEnd: function(event, card) {
        if (!this.state.isDragging || !card) return;
        this.state.isDragging = false;
        DOMUtils.removeClass(card, 'dragging');
        DOMUtils.removeClass(card, 'show-like-overlay');
        DOMUtils.removeClass(card, 'show-nope-overlay');

        document.removeEventListener('mousemove', this._dragMoveListener);
        document.removeEventListener('touchmove', this._dragMoveListener);
        document.removeEventListener('mouseup', this._dragEndListener);
        document.removeEventListener('touchend', this._dragEndListener);

        const offsetX = this.state.currentX - this.state.startX;
        const swipeThreshold = card.offsetWidth * 0.3; // カード幅の30%をスワイプと判定

        if (Math.abs(offsetX) > swipeThreshold) {
            this.swipeTopCard(offsetX > 0 ? 'right' : 'left');
        } else {
            card.style.transform = ''; // 元の位置に戻す
        }
    },

    swipeTopCard: function(direction) { // 'left' or 'right'
        if (!this.state.topCard) return;
        const cardToRemove = this.state.topCard;
        DOMUtils.addClass(cardToRemove, direction === 'right' ? 'removing-right' : 'removing-left');

        if (direction === 'right') { // シコい!!
            console.log("CardUI: Swiped Right (Like)");
            const cardData = this.dataHandler.memberData.find(d => d.relativePath === cardToRemove.dataset.relativePath);
            if (cardData) this.dataHandler.addLikedImage(cardData);
            this.incrementFeverGauge();
        } else { // 萎え
            console.log("CardUI: Swiped Left (Nope)");
            // 左スワイプでもフィーバーゲージを増やすか、仕様に応じて調整
            // this.incrementFeverGauge();
        }

        // カードが画面外に飛ぶアニメーション完了後にDOMから削除し、次のカード処理
        setTimeout(() => {
            if (cardToRemove.parentNode) cardToRemove.parentNode.removeChild(cardToRemove);
            this.state.cards.pop(); // 配列からも削除
            this.updateTopCard();   // 最前面カードを更新
            this.addCardToStack(false, true); // 新しいカードを裏に追加
            if (this.state.topCard) { // 新しいトップカードの情報を表示
                const topCardData = this.dataHandler.memberData.find(d => d.relativePath === this.state.topCard.dataset.relativePath);
                if (topCardData) {
                     this.updateSidePanelInfo(topCardData);
                     this.appInterface.applyCardOuterTheme(topCardData.member.color);
                }
            } else { // スタックが空になった場合
                this.updateSidePanelInfo(null);
                this.appInterface.applyCardOuterTheme(null);
                // 必要なら「カードがありません」などの表示
            }
        }, 300); // CSSのトランジション時間と合わせる
    },


    // --- フィーバーモード関連 ---
    incrementFeverGauge: function() {
        if (this.state.isFeverActive) return; // フィーバー中はゲージ増えない
        this.state.feverGauge++;
        this.updateFeverGaugeDisplay();
        if (this.state.feverGauge >= this.config.cardSwipeSettings.feverThreshold) {
            this.startFeverMode();
        }
    },
    updateFeverGaugeDisplay: function() {
        if (!this.elements.feverGaugeBar) return;
        const percentage = Math.min(100, (this.state.feverGauge / this.config.cardSwipeSettings.feverThreshold) * 100);
        this.elements.feverGaugeBar.style.height = `${percentage}%`;
        // フィーバーゲージの色もメンバーカラーに連動させるなら、ここで設定
        if (this.state.nextCardData && this.state.nextCardData.member) { // 次のカードのメンバーカラー
            this.elements.feverGaugeBar.style.backgroundColor = this.state.nextCardData.member.color || 'var(--member-accent-color)';
        }
    },
    startFeverMode: function() {
        if (this.state.isFeverActive) return;
        console.log("CardUI: FEVER MODE START!");
        this.state.isFeverActive = true;
        this.state.likedImagesForFever = this.dataHandler.getLikedImages(); // または getWeakPointImages()
        if (this.state.likedImagesForFever.length === 0) {
            console.warn("CardUI: No liked/weak images for Fever. Ending immediately.");
            this.endFeverMode();
            return;
        }
        // フィーバー中の背景やUI変更など
        if(this.appInterface) this.appInterface.uiComponents.showNotification("フィーバー突入！", "info", 2000);
        document.body.classList.add('fever-active'); // CSSで特別スタイルを適用

        // フィーバーゲージを時間で減らすタイマー
        let feverTimeLeft = this.config.cardSwipeSettings.feverDuration;
        this.elements.feverGaugeBar.style.transition = 'height 0.1s linear'; // スムーズな減少
        this.state.feverTimeoutId = setInterval(() => {
            feverTimeLeft -= 100;
            const percentage = Math.max(0, (feverTimeLeft / this.config.cardSwipeSettings.feverDuration) * 100);
            this.elements.feverGaugeBar.style.height = `${percentage}%`;
            if (feverTimeLeft <= 0) {
                this.endFeverMode();
            }
        }, 100);

        // フィーバー中のステッカー表示開始
        this.startStickerShower();
        this.preloadNextCardData(); // フィーバー用のカードを読み込む
        this.addCardToStack(true); // 最初のフィーバーカード
    },
    endFeverMode: function() {
        console.log("CardUI: FEVER MODE END!");
        this.state.isFeverActive = false;
        this.state.feverGauge = 0; // ゲージリセット
        if (this.state.feverTimeoutId) clearInterval(this.state.feverTimeoutId);
        this.state.feverTimeoutId = null;
        if (this.elements.feverGaugeBar) {
            this.elements.feverGaugeBar.style.transition = 'height 0.3s ease-out'; // 通常の戻りアニメーション
            this.updateFeverGaugeDisplay(); // 0%に戻す
        }
        document.body.classList.remove('fever-active');
        this.stopStickerShower();
        // 通常モードのカード読み込みに戻す
        this.preloadNextCardData().then(() => {
            // スタックが空なら新しいカードを追加
            if(this.state.cards.length === 0 && this.state.nextCardData) this.addCardToStack(true);
        });
    },
    startStickerShower: function() {
        if (!this.config.cardSwipeSettings.stickerPaths || this.config.cardSwipeSettings.stickerPaths.length === 0) return;
        this._stickerInterval = setInterval(() => {
            const stickerSrc = Utils.getRandomElement(this.config.cardSwipeSettings.stickerPaths);
            const stickerEl = DOMUtils.createElement('img', { src: stickerSrc, class: 'fever-sticker' });
            // 画面の左右どちらかランダムな位置から出現し、斜め下へ落ちるアニメーション
            const side = Math.random() < 0.5 ? 'left' : 'right';
            const startX = side === 'left' ? Utils.getRandomInt(0, 30) : Utils.getRandomInt(70, 100);
            const startY = Utils.getRandomInt(-20, 20); // 上部から
            const endY = 110; // 画面下外へ
            const duration = Utils.getRandomInt(2000, 4000);
            const angle = Utils.getRandomInt(-30, 30);
            const scale = Utils.getRandomInt(5, 12) / 10;

            stickerEl.style.position = 'absolute';
            stickerEl.style.left = `${startX}vw`;
            stickerEl.style.top = `${startY}vh`;
            stickerEl.style.width = `${Utils.getRandomInt(30, 70)}px`; // ランダムなサイズ
            stickerEl.style.transform = `scale(${scale}) rotate(${angle}deg)`;
            stickerEl.style.opacity = '0.8';
            stickerEl.style.zIndex = '5'; // カードより手前、UIより奥
            stickerEl.style.pointerEvents = 'none'; // クリックを妨げない

            // アニメーションの適用 (簡易的なもの)
            // CSSアニメーションの方がパフォーマンスが良い
            // ここでは簡易的にJSで
            this.elements.stackArea.appendChild(stickerEl); // カードスタックエリアに追加
            stickerEl.animate([
                { top: `${startY}vh`, opacity: 0.8 },
                { top: `${endY}vh`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'ease-in'
            }).onfinish = () => {
                if (stickerEl.parentNode) stickerEl.parentNode.removeChild(stickerEl);
            };
        }, 500); // 0.5秒ごとに出現
    },
    stopStickerShower: function() {
        if (this._stickerInterval) clearInterval(this._stickerInterval);
        this._stickerInterval = null;
        // 既存のステッカーを削除
        DOMUtils.qsa('.fever-sticker', this.elements.stackArea).forEach(el => el.remove());
    },


    // --- ユーティリティ (一部app.jsに移動しても良い) ---
    handleTouchStart: function(event) { /* スワイプ処理はカード自体で行うので不要 */ },
    handleTouchMove: function(event) { /* スワイプ処理はカード自体で行うので不要 */ },
    handleTouchEnd: function(event) { /* スワイプ処理はカード自体で行うので不要 */ },
};

// Utils と StorageService はグローバルにある前提
// DOMUtils もグローバルにある前提 (app.js で設定される)
