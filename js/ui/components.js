// js/ui/components.js

const UIComponents = {
    // ... (initAccordion, createMemberWeightSliders, initGenericSlider, showNotification, createStickerChoices は前回と同様)
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
        } else {
            // console.warn(`Accordion elements not found (toggle: ${toggleSelector}, content: ${contentSelector})`);
        }
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
            const initialValue = (initialWeights && initialWeights[memberName] !== undefined) ? initialWeights[memberName] : 3;
            const sliderIdSuffix = containerSelector.replace(/[^a-zA-Z0-9]/g, '');
            const itemDiv = DOMUtils.createElement('div', { class: 'member-slider-item' });
            const label = DOMUtils.createElement('label', { for: `${sliderIdSuffix}-weight-${memberName}` }, [`${memberName}:`]);
            const slider = DOMUtils.createElement('input', { type: 'range', id: `${sliderIdSuffix}-weight-${memberName}`, min: '0', max: '5', step: '1', value: String(initialValue), dataset: { memberName: memberName } });
            const valueSpan = DOMUtils.createElement('span', { class: 'slider-value' }, [String(initialValue)]);
            DOMUtils.on(slider, 'input', (event) => {
                const newValue = parseInt(event.target.value, 10);
                DOMUtils.setText(valueSpan, String(newValue));
                if (typeof onChangeCallback === 'function') onChangeCallback(memberName, newValue, slider);
            });
            itemDiv.appendChild(label); itemDiv.appendChild(slider); itemDiv.appendChild(valueSpan);
            container.appendChild(itemDiv);
            sliders[memberName] = slider;
        });
        return sliders;
    },

    initGenericSlider: function(sliderSelector, valueDisplaySelector, initialValue, onChangeCallback) {
        const slider = DOMUtils.qs(sliderSelector);
        const valueDisplay = DOMUtils.qs(valueDisplaySelector);
        if (slider && valueDisplay) {
            if (initialValue !== undefined) slider.value = initialValue;
            const updateValue = () => {
                const val = slider.value;
                DOMUtils.setText(valueDisplay, val);
                if (typeof onChangeCallback === 'function') onChangeCallback(parseFloat(val), slider);
            };
            DOMUtils.on(slider, 'input', updateValue);
            updateValue();
        } else console.warn(`Generic slider elements not found (slider: ${sliderSelector}, display: ${valueDisplaySelector})`);
    },

    showNotification: function(message, type = 'info', duration = 3000) {
        const existingNotification = DOMUtils.qs('.app-notification');
        if (existingNotification) existingNotification.remove();
        const notificationBar = DOMUtils.createElement('div', { class: `app-notification notification-${type}`, role: 'alert' }, [message]);
        notificationBar.style.top = '10px'; notificationBar.style.bottom = 'auto';
        notificationBar.style.left = '50%'; notificationBar.style.transform = 'translateX(-50%)';
        document.body.appendChild(notificationBar);
        setTimeout(() => {
            notificationBar.style.opacity = '0';
            setTimeout(() => { if (notificationBar.parentNode) notificationBar.parentNode.removeChild(notificationBar); }, 500);
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
                let newSelectedPath = null;
                if (previouslySelected === selectedButton) {
                    DOMUtils.removeClass(selectedButton, 'selected'); newSelectedPath = null;
                } else {
                    if (previouslySelected) DOMUtils.removeClass(previouslySelected, 'selected');
                    DOMUtils.addClass(selectedButton, 'selected'); newSelectedPath = selectedPath;
                }
                if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(newSelectedPath);
            });
            container.appendChild(button);
        });
    },

    openModal: function(modalSelector) {
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            console.log(`Opening modal: ${modalSelector}`); // ★ デバッグログ
            modal.style.display = 'flex'; // displayを確実に変更
            // requestAnimationFrame を使って次のフレームで opacity を変更すると、トランジションが確実にかかる
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
            document.body.style.overflow = 'hidden';
        } else {
            console.error(`Modal element "${modalSelector}" not found when trying to open.`); // ★ エラーログ強化
        }
    },
    closeModal: function(modalSelector) {
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            console.log(`Closing modal: ${modalSelector}`); // ★ デバッグログ
            modal.style.opacity = '0';
            // opacityのトランジションが終わってからdisplay:noneにする
            // transitionendイベントリスナーを使うのが堅実だが、ここではsetTimeoutで簡易的に
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // CSSのトランジション時間と合わせる (例: 0.3s)
            document.body.style.overflow = '';
        } else {
            console.warn(`Modal element "${modalSelector}" not found when trying to close.`);
        }
    },
    setupModal: function(modalSelector, openButtonSelector, closeButtonSelector, onSaveCallback) {
        const openButton = DOMUtils.qs(openButtonSelector);
        const modal = DOMUtils.qs(modalSelector);
        const closeButtonFromSelector = DOMUtils.qs(closeButtonSelector); // ★ モーダル内外どちらでも探せるように変更
        const saveButton = DOMUtils.qs('#saveShikoshikoSettingsButton', modal); // ★ モーダル内から保存ボタンを特定

        console.log(`Setting up modal: ${modalSelector}, openBtn: ${openButtonSelector}, closeBtn: ${closeButtonSelector}`); // ★ デバッグログ
        if (!modal) { console.error(`Modal "${modalSelector}" not found for setup. Aborting setup.`); return; }

        if (openButton) {
            console.log(`Open button found for ${modalSelector}:`, openButton); // ★ デバッグログ
            DOMUtils.on(openButton, 'click', (e) => {
                e.stopPropagation(); // イベントの伝播を止める
                console.log(`Open button clicked for ${modalSelector}`); // ★ デバッグログ
                this.openModal(modalSelector);
            });
        } else {
            console.error(`Modal open button "${openButtonSelector}" not found for ${modalSelector}.`); // ★ エラーログ強化
        }

        // 閉じるボタンの探索をモーダル内外両方で行うようにする
        const actualCloseButton = closeButtonFromSelector || DOMUtils.qs(closeButtonSelector, modal);
        if (actualCloseButton) {
            console.log(`Close button found for ${modalSelector}:`, actualCloseButton); // ★ デバッグログ
            DOMUtils.on(actualCloseButton, 'click', (e) => {
                e.stopPropagation();
                console.log(`Close button clicked for ${modalSelector}`); // ★ デバッグログ
                this.closeModal(modalSelector);
            });
        } else {
             console.warn(`Modal close button "${closeButtonSelector}" not found for ${modalSelector}.`);
        }

        if (saveButton && typeof onSaveCallback === 'function') {
            console.log(`Save button found for ${modalSelector}:`, saveButton); // ★ デバッグログ
            DOMUtils.on(saveButton, 'click', (e) => {
                e.stopPropagation();
                console.log(`Save button clicked for ${modalSelector}`); // ★ デバッグログ
                onSaveCallback();
            });
        } else if (typeof onSaveCallback === 'function') {
            console.warn(`Modal save button ("#saveShikoshikoSettingsButton") not found or onSaveCallback not provided correctly for "${modalSelector}".`);
        }

        DOMUtils.on(window, 'click', (event) => {
            if (event.target === modal) {
                console.log(`Clicked outside modal ${modalSelector}, closing.`); // ★ デバッグログ
                this.closeModal(modalSelector);
            }
        });
        DOMUtils.on(window, 'keydown', (event) => {
            if (event.key === 'Escape' && modal && modal.style.display !== 'none') { // modalが存在することも確認
                console.log(`ESC key pressed, closing modal ${modalSelector}`); // ★ デバッグログ
                this.closeModal(modalSelector);
            }
        });
    }
};
