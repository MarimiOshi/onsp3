// js/ui/components.js

const UIComponents = {
    initAccordion: function(toggleSelector, contentSelector) { /* ... (変更なし、または削除検討) ... */ },

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
            const sliderIdSuffix = containerSelector.replace(/[^a-zA-Z0-9]/g, '') || 'default'; // ID用接尾辞
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
            if (initialValue !== undefined && initialValue !== null) { // nullチェック追加
                 slider.value = initialValue;
            }
            const updateValue = () => {
                const val = slider.value;
                DOMUtils.setText(valueDisplay, val);
                if (typeof onChangeCallback === 'function') onChangeCallback(parseFloat(val), slider);
            };
            DOMUtils.on(slider, 'input', updateValue);
            updateValue();
        } else console.warn(`Generic slider elements not found (slider: ${sliderSelector}, display: ${valueDisplaySelector})`);
    },

    showNotification: function(message, type = 'info', duration = 3000) { /* 前回と同様 */ },
    createStickerChoices: function(containerSelector, stickerPaths, onStickerSelectCallback) { /* 前回と同様 */ },

    openModal: function(modalSelector) { /* 前回と同様 */
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => { modal.style.opacity = '1'; });
            document.body.style.overflow = 'hidden';
        } else console.error(`Modal element "${modalSelector}" not found when trying to open.`);
    },
    closeModal: function(modalSelector) { /* 前回と同様 */
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => { modal.style.display = 'none'; }, 300);
            document.body.style.overflow = '';
        } else console.warn(`Modal element "${modalSelector}" not found when trying to close.`);
    },
    setupModal: function(modalSelector, openButtonSelector, closeButtonSelector, onSaveCallback) {
        const openButton = DOMUtils.qs(openButtonSelector);
        const modal = DOMUtils.qs(modalSelector);
        const closeButton = DOMUtils.qs(closeButtonSelector, modal); // モーダル内から検索
        const saveButton = DOMUtils.qs('#saveShikoshikoSettingsButton', modal); // 保存ボタンのIDを特定

        if (!modal) { console.error(`Modal "${modalSelector}" not found for setup.`); return; }
        if (openButton) {
            DOMUtils.on(openButton, 'click', (e) => { e.stopPropagation(); this.openModal(modalSelector); });
        } else console.error(`Modal open button "${openButtonSelector}" not found.`);
        if (closeButton) {
            DOMUtils.on(closeButton, 'click', (e) => { e.stopPropagation(); this.closeModal(modalSelector); });
        } else console.warn(`Modal close button "${closeButtonSelector}" not found inside "${modalSelector}".`);
        if (saveButton && typeof onSaveCallback === 'function') {
            DOMUtils.on(saveButton, 'click', (e) => { e.stopPropagation(); onSaveCallback(); });
        } else if (typeof onSaveCallback === 'function') {
            console.warn(`Modal save button ("#saveShikoshikoSettingsButton") not found or onSaveCallback not provided for "${modalSelector}".`);
        }
        DOMUtils.on(window, 'click', (event) => { if (event.target === modal) this.closeModal(modalSelector); });
        DOMUtils.on(window, 'keydown', (event) => { if (event.key === 'Escape' && modal && modal.style.display !== 'none') this.closeModal(modalSelector); });
    }
};
