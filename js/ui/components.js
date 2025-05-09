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
            const label = DOMUtils.createElement('label', { for: `weight-${memberName}` }, [`${memberName}:`]);
            const slider = DOMUtils.createElement('input', { type: 'range', id: `weight-${memberName}`, min: '0', max: '5', step: '1', value: String(initialValue), dataset: { memberName: memberName } });
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
        console.log(`[Notification (${type})]: ${message}`);
        // 実装例: 画面上部や下部に一時的なメッセージバーを表示する
        const notificationBar = DOMUtils.createElement('div', {
            class: `app-notification notification-${type}`, // CSSでスタイリング
            role: 'alert'
        }, [message]);
        document.body.appendChild(notificationBar);
        setTimeout(() => {
            notificationBar.style.opacity = '0'; // フェードアウト
            setTimeout(() => {
                if (notificationBar.parentNode) {
                    notificationBar.parentNode.removeChild(notificationBar);
                }
            }, 500); // フェードアウト時間
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
                if (previouslySelected) DOMUtils.removeClass(previouslySelected, 'selected');

                // 同じボタンを再度クリックしたら選択解除、そうでなければ選択
                if (previouslySelected === selectedButton) {
                     if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(null); // 選択解除を通知
                } else {
                    DOMUtils.addClass(selectedButton, 'selected');
                    if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(selectedPath);
                }
            });
            container.appendChild(button);
        });
    }
};
