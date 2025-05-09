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
            DOMUtils.removeClass(contentElement, 'open'); DOMUtils.removeClass(toggleButton, 'active');
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    },
    createMemberWeightSliders: function(containerSelector, members, initialWeights = {}, onChangeCallback) {
        const container = DOMUtils.qs(containerSelector);
        if (!container) { console.error(`Slider container "${containerSelector}" not found.`); return null; }
        DOMUtils.empty(container); const sliders = {};
        if (!members || members.length === 0) { container.appendChild(DOMUtils.createElement('p', {}, ['メンバー情報がありません。'])); return sliders; }
        members.forEach(member => {
            if (!member || !member.name) return;
            const memberName = member.name;
            const initialValue = (initialWeights && initialWeights[memberName] !== undefined) ? initialWeights[memberName] : 3;
            const sliderIdSuffix = containerSelector.replace(/[^a-zA-Z0-9]/g, '') || 'default';
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
            container.appendChild(itemDiv); sliders[memberName] = slider;
        });
        return sliders;
    },
    initGenericSlider: function(sliderSelector, valueDisplaySelector, initialValue, onChangeCallback) {
        const slider = DOMUtils.qs(sliderSelector);
        const valueDisplay = DOMUtils.qs(valueDisplaySelector);
        if (slider && valueDisplay) {
            if (initialValue !== undefined && initialValue !== null) slider.value = initialValue;
            const updateValue = () => {
                const val = slider.value; DOMUtils.setText(valueDisplay, val);
                if (typeof onChangeCallback === 'function') onChangeCallback(parseFloat(val), slider);
            };
            DOMUtils.on(slider, 'input', updateValue); updateValue();
        } else console.warn(`Generic slider elements not found (slider: ${sliderSelector}, display: ${valueDisplaySelector})`);
    },
    showNotification: function(message, type = 'info', duration = 3000) { /* 変更なし (前回全文提供済み) */
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
    createStickerChoices: function(containerSelector, stickerPaths, onStickerSelectCallback) { /* 変更なし (前回全文提供済み) */
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
                const selectedButton = event.currentTarget; const selectedPath = selectedButton.dataset.stickerPath;
                const previouslySelected = DOMUtils.qs('.sticker-choice-button.selected', container);
                let newSelectedPath = null;
                if (previouslySelected === selectedButton) { DOMUtils.removeClass(selectedButton, 'selected'); newSelectedPath = null; }
                else { if (previouslySelected) DOMUtils.removeClass(previouslySelected, 'selected'); DOMUtils.addClass(selectedButton, 'selected'); newSelectedPath = selectedPath; }
                if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(newSelectedPath);
            });
            container.appendChild(button);
        });
    },
    openModal: function(modalSelector) { /* 変更なし (前回全文提供済み) */
        const modal = DOMUtils.qs(modalSelector);
        if (modal) { modal.style.display = 'flex'; requestAnimationFrame(() => { modal.style.opacity = '1'; }); document.body.style.overflow = 'hidden'; }
        else console.error(`Modal element "${modalSelector}" not found when trying to open.`);
    },
    closeModal: function(modalSelector) { /* 変更なし (前回全文提供済み) */
        const modal = DOMUtils.qs(modalSelector);
        if (modal) { modal.style.opacity = '0'; setTimeout(() => { modal.style.display = 'none'; }, 300); document.body.style.overflow = ''; }
        else console.warn(`Modal element "${modalSelector}" not found when trying to close.`);
    },
    setupModal: function(modalSelector, openButtonSelector, closeButtonSelector, onSaveCallback) { /* 変更なし (前回全文提供済み) */
        const openButton = DOMUtils.qs(openButtonSelector); const modal = DOMUtils.qs(modalSelector);
        const closeButton = DOMUtils.qs(closeButtonSelector, modal); // モーダル内から検索
        const saveButton = DOMUtils.qs('#saveShikoshikoSettingsButton', modal); // ★ HTMLのIDと一致させる
        if (!modal) { console.error(`Modal "${modalSelector}" not found for setup.`); return; }
        if (openButton) DOMUtils.on(openButton, 'click', (e) => { e.stopPropagation(); this.openModal(modalSelector); });
        else console.error(`Modal open button "${openButtonSelector}" not found for ${modalSelector}.`);
        if (closeButton) DOMUtils.on(closeButton, 'click', (e) => { e.stopPropagation(); this.closeModal(modalSelector); });
        else console.warn(`Modal close button "${closeButtonSelector}" not found inside "${modalSelector}".`);
        if (saveButton && typeof onSaveCallback === 'function') {
            DOMUtils.on(saveButton, 'click', (e) => { e.stopPropagation(); onSaveCallback(); });
        } else if (typeof onSaveCallback === 'function') {
            console.warn(`Modal save button ("#saveShikoshikoSettingsButton") not found or onSaveCallback not provided for "${modalSelector}".`);
        }
        DOMUtils.on(window, 'click', (event) => { if (event.target === modal) this.closeModal(modalSelector); });
        DOMUtils.on(window, 'keydown', (event) => { if (event.key === 'Escape' && modal && modal.style.display !== 'none') this.closeModal(modalSelector); });
    }
};
