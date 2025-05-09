// js/ui/components.js

const UIComponents = {
    initAccordion: function(toggleSelector, contentSelector) {
        const toggleButton = DOMUtils.qs(toggleSelector);
        const contentElement = DOMUtils.qs(contentSelector);
        if (toggleButton && contentElement) {
            DOMUtils.on(toggleButton, 'click', () => {
                const isOpen = DOMUtils.toggleClass(contentElement, 'open');
                DOMUtils.toggleClass(toggleButton, 'active', isOpen);
                toggleButton.setAttribute('aria-expanded', String(isOpen));
            });
            DOMUtils.removeClass(contentElement, 'open');
            DOMUtils.removeClass(toggleButton, 'active');
            toggleButton.setAttribute('aria-expanded', 'false');
        } else console.warn(`Accordion elements not found (toggle: ${toggleSelector}, content: ${contentSelector})`);
    },

    createMemberWeightSliders: function(containerSelector, members, initialWeights = {}, onChangeCallback) {
        const container = DOMUtils.qs(containerSelector);
        if (!container) { console.error(`Slider container "${containerSelector}" not found.`); return null; }
        DOMUtils.empty(container);
        const sliders = {};
        if (!members || members.length === 0) {
            container.appendChild(DOMUtils.createElement('p', {}, ['メンバー情報がありません。']));
            return sliders;
        }
        members.forEach(member => {
            if (!member || !member.name) return;
            const memberName = member.name;
            const initialValue = initialWeights[memberName] !== undefined ? initialWeights[memberName] : 3;
            const itemDiv = DOMUtils.createElement('div', { class: 'member-slider-item' });
            const label = DOMUtils.createElement('label', { for: `${containerSelector.substring(1)}-weight-${memberName}` }, [`${memberName}:`]); // IDが一意になるように
            const slider = DOMUtils.createElement('input', { type: 'range', id: `${containerSelector.substring(1)}-weight-${memberName}`, min: '0', max: '5', step: '1', value: String(initialValue), dataset: { memberName: memberName } });
            const valueSpan = DOMUtils.createElement('span', { class: 'slider-value' }, [String(initialValue)]);
            DOMUtils.on(slider, 'input', (event) => {
                const newValue = parseInt(event.target.value, 10);
                DOMUtils.setText(valueSpan, String(newValue));
                if (typeof onChangeCallback === 'function') onChangeCallback(memberName, newValue);
            });
            itemDiv.appendChild(label); itemDiv.appendChild(slider); itemDiv.appendChild(valueSpan);
            container.appendChild(itemDiv);
            sliders[memberName] = slider;
        });
        return sliders;
    },

    initGenericSlider: function(sliderSelector, valueDisplaySelector, onChangeCallback) {
        const slider = DOMUtils.qs(sliderSelector);
        const valueDisplay = DOMUtils.qs(valueDisplaySelector);
        if (slider && valueDisplay) {
            const updateValue = () => {
                const val = slider.value;
                DOMUtils.setText(valueDisplay, val);
                if (typeof onChangeCallback === 'function') onChangeCallback(parseFloat(val));
            };
            DOMUtils.on(slider, 'input', updateValue);
            updateValue();
        } else console.warn(`Generic slider elements not found (slider: ${sliderSelector}, display: ${valueDisplaySelector})`);
    },

    showNotification: function(message, type = 'info', duration = 3000) {
        const existingNotification = DOMUtils.qs('.app-notification');
        if (existingNotification) existingNotification.remove(); // 既存があれば削除

        const notificationBar = DOMUtils.createElement('div', {
            class: `app-notification notification-${type}`,
            role: 'alert'
        }, [message]);
        // 画面上部に表示するように変更
        notificationBar.style.top = '10px'; // 上からの位置
        notificationBar.style.bottom = 'auto';
        notificationBar.style.left = '50%';
        notificationBar.style.transform = 'translateX(-50%)';

        document.body.appendChild(notificationBar);
        setTimeout(() => {
            notificationBar.style.opacity = '0';
            setTimeout(() => {
                if (notificationBar.parentNode) notificationBar.parentNode.removeChild(notificationBar);
            }, 500);
        }, duration);
    },

    createStickerChoices: function(containerSelector, stickerPaths, onStickerSelectCallback) {
        const container = DOMUtils.qs(containerSelector);
        if (!container) { console.error(`Sticker choice container "${containerSelector}" not found.`); return; }
        DOMUtils.empty(container);
        if (!stickerPaths || stickerPaths.length === 0) {
            container.appendChild(DOMUtils.createElement('p', { class: 'sticker-loading' }, ['ステッカーがありません。']));
            return;
        }
        stickerPaths.forEach(path => {
            const img = DOMUtils.createElement('img', { class: 'sticker-choice-img', src: path, alt: `ステッカー ${path.split('/').pop()}`, loading: 'lazy' });
            const button = DOMUtils.createElement('button', { class: 'sticker-choice-button', title: `ステッカーを選択: ${path.split('/').pop()}`, dataset: { stickerPath: path } }, [img]);
            DOMUtils.on(img, 'error', (e) => { console.warn(`Failed to load sticker choice: ${path}`); button.style.display = 'none'; });
            DOMUtils.on(button, 'click', (event) => {
                const selectedButton = event.currentTarget;
                const selectedPath = selectedButton.dataset.stickerPath;
                const previouslySelected = DOMUtils.qs('.sticker-choice-button.selected', container);

                if (previouslySelected === selectedButton) { // 同じボタンを再度クリック
                    DOMUtils.removeClass(selectedButton, 'selected');
                    if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(null);
                } else {
                    if (previouslySelected) DOMUtils.removeClass(previouslySelected, 'selected');
                    DOMUtils.addClass(selectedButton, 'selected');
                    if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(selectedPath);
                }
            });
            container.appendChild(button);
        });
    },

    // --- モーダル関連 ---
    /**
     * モーダルを開く
     * @param {string} modalSelector - モーダル要素のCSSセレクタ
     */
    openModal: function(modalSelector) {
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            DOMUtils.toggleDisplay(modal, true);
            // document.body.style.overflow = 'hidden'; // 背景スクロール禁止 (オプション)
        } else {
            console.warn(`Modal element "${modalSelector}" not found.`);
        }
    },

    /**
     * モーダルを閉じる
     * @param {string} modalSelector - モーダル要素のCSSセレクタ
     */
    closeModal: function(modalSelector) {
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            DOMUtils.toggleDisplay(modal, false);
            // document.body.style.overflow = ''; // 背景スクロール許可
        } else {
            console.warn(`Modal element "${modalSelector}" not found.`);
        }
    },

    /**
     * モーダルのセットアップ (開くボタン、閉じるボタン、モーダル外クリックで閉じる)
     * @param {string} modalSelector
     * @param {string} openButtonSelector
     * @param {string} closeButtonSelector
     */
    setupModal: function(modalSelector, openButtonSelector, closeButtonSelector) {
        const openButton = DOMUtils.qs(openButtonSelector);
        const modal = DOMUtils.qs(modalSelector);
        const closeButton = DOMUtils.qs(closeButtonSelector, modal); // モーダル内から検索

        if (openButton) {
            DOMUtils.on(openButton, 'click', () => this.openModal(modalSelector));
        } else {
            console.warn(`Modal open button "${openButtonSelector}" not found.`);
        }

        if (closeButton) {
            DOMUtils.on(closeButton, 'click', () => this.closeModal(modalSelector));
        } else if (modal) { // モーダルがあっても閉じるボタンがない場合がある
             console.warn(`Modal close button "${closeButtonSelector}" not found inside "${modalSelector}".`);
        }


        if (modal) {
            // モーダル外クリックで閉じる
            DOMUtils.on(window, 'click', (event) => {
                if (event.target === modal) { // モーダルの背景部分をクリックした場合
                    this.closeModal(modalSelector);
                }
            });
            // ESCキーで閉じる
            DOMUtils.on(window, 'keydown', (event) => {
                if (event.key === 'Escape' && modal.style.display !== 'none') {
                    this.closeModal(modalSelector);
                }
            });
        }
    }
};
