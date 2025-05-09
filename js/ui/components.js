// js/ui/components.js

const UIComponents = {
    initAccordion: function(toggleSelector, contentSelector) {
        // このコンポーネントはモーダルに置き換えられたため、使用されなくなる想定
        // もし他の場所でアコーディオンが必要な場合は残す
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
            // initialWeights に当該メンバーのキーが存在しない場合も考慮
            const initialValue = (initialWeights && initialWeights[memberName] !== undefined) ? initialWeights[memberName] : 3;
            const sliderIdSuffix = containerSelector.replace(/[^a-zA-Z0-9]/g, ''); // セレクタからID用の接尾辞生成
            const itemDiv = DOMUtils.createElement('div', { class: 'member-slider-item' });
            const label = DOMUtils.createElement('label', { for: `${sliderIdSuffix}-weight-${memberName}` }, [`${memberName}:`]);
            const slider = DOMUtils.createElement('input', { type: 'range', id: `${sliderIdSuffix}-weight-${memberName}`, min: '0', max: '5', step: '1', value: String(initialValue), dataset: { memberName: memberName } });
            const valueSpan = DOMUtils.createElement('span', { class: 'slider-value' }, [String(initialValue)]);
            DOMUtils.on(slider, 'input', (event) => {
                const newValue = parseInt(event.target.value, 10);
                DOMUtils.setText(valueSpan, String(newValue));
                if (typeof onChangeCallback === 'function') onChangeCallback(memberName, newValue, slider); // slider要素も渡す
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
            if (initialValue !== undefined) slider.value = initialValue; // 初期値を設定
            const updateValue = () => {
                const val = slider.value;
                DOMUtils.setText(valueDisplay, val);
                if (typeof onChangeCallback === 'function') onChangeCallback(parseFloat(val), slider); // slider要素も渡す
            };
            DOMUtils.on(slider, 'input', updateValue);
            updateValue(); // 初期値を表示に反映
        } else console.warn(`Generic slider elements not found (slider: ${sliderSelector}, display: ${valueDisplaySelector})`);
    },

    showNotification: function(message, type = 'info', duration = 3000) {
        const existingNotification = DOMUtils.qs('.app-notification');
        if (existingNotification) existingNotification.remove();
        const notificationBar = DOMUtils.createElement('div', { class: `app-notification notification-${type}`, role: 'alert' }, [message]);
        // CSSで上部中央に配置されるように修正済み
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
                if (previouslySelected === selectedButton) { // 同じボタンを再度クリックで選択解除
                    DOMUtils.removeClass(selectedButton, 'selected');
                    newSelectedPath = null;
                } else {
                    if (previouslySelected) DOMUtils.removeClass(previouslySelected, 'selected');
                    DOMUtils.addClass(selectedButton, 'selected');
                    newSelectedPath = selectedPath;
                }
                if (typeof onStickerSelectCallback === 'function') onStickerSelectCallback(newSelectedPath);
            });
            container.appendChild(button);
        });
    },

    openModal: function(modalSelector) {
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            modal.style.display = 'flex'; // flexで中央寄せに対応する場合
            setTimeout(() => modal.style.opacity = '1', 10); // 少し遅れてopacity変更でtransition発動
            document.body.style.overflow = 'hidden';
        } else console.warn(`Modal element "${modalSelector}" not found.`);
    },
    closeModal: function(modalSelector) {
        const modal = DOMUtils.qs(modalSelector);
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.style.display = 'none', 300); // transition時間と合わせる
            document.body.style.overflow = '';
        } else console.warn(`Modal element "${modalSelector}" not found.`);
    },
    setupModal: function(modalSelector, openButtonSelector, closeButtonSelector, onSaveCallback) {
        const openButton = DOMUtils.qs(openButtonSelector);
        const modal = DOMUtils.qs(modalSelector);
        const closeButton = DOMUtils.qs(closeButtonSelector, modal);
        const saveButton = DOMUtils.qs('.action-button.primary', modal); // 保存ボタンは汎用的に探す

        if (!modal) { console.error(`Modal "${modalSelector}" not found for setup.`); return; }

        if (openButton) DOMUtils.on(openButton, 'click', () => this.openModal(modalSelector));
        else console.warn(`Modal open button "${openButtonSelector}" not found.`);

        if (closeButton) DOMUtils.on(closeButton, 'click', () => this.closeModal(modalSelector));
        else console.warn(`Modal close button "${closeButtonSelector}" not found inside "${modalSelector}".`);

        if (saveButton && typeof onSaveCallback === 'function') {
            DOMUtils.on(saveButton, 'click', onSaveCallback);
        } else if (typeof onSaveCallback === 'function') {
            console.warn(`Modal save button not found or onSaveCallback not provided correctly for "${modalSelector}".`);
        }

        DOMUtils.on(window, 'click', (event) => { if (event.target === modal) this.closeModal(modalSelector); });
        DOMUtils.on(window, 'keydown', (event) => { if (event.key === 'Escape' && modal.style.display !== 'none') this.closeModal(modalSelector); });
    }
};
