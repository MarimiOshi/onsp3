// js/ui/components.js

const UIComponents = {
    /**
     * 設定アコーディオンの初期化とイベントリスナー設定
     * @param {string} toggleSelector - アコーディオントグルボタンのCSSセレクタ
     * @param {string} contentSelector - アコーディオンコンテンツエリアのCSSセレクタ
     */
    initAccordion: function(toggleSelector, contentSelector) {
        const toggleButton = DOMUtils.qs(toggleSelector);
        const contentElement = DOMUtils.qs(contentSelector);

        if (toggleButton && contentElement) {
            DOMUtils.on(toggleButton, 'click', () => {
                const isOpen = DOMUtils.toggleClass(contentElement, 'open');
                DOMUtils.toggleClass(toggleButton, 'active', isOpen);
                toggleButton.setAttribute('aria-expanded', String(isOpen));
            });
            // 初期状態を閉じておく
            DOMUtils.removeClass(contentElement, 'open');
            DOMUtils.removeClass(toggleButton, 'active');
            toggleButton.setAttribute('aria-expanded', 'false');
        } else {
            console.warn(`Accordion elements not found (toggle: ${toggleSelector}, content: ${contentSelector})`);
        }
    },

    /**
     * メンバー出現率スライダーを生成してコンテナに追加する
     * @param {string} containerSelector - スライダーを追加するコンテナのCSSセレクタ
     * @param {Array<Object>} members - メンバー情報配列 (config.members)
     * @param {Object} initialWeights - 初期ウェイト値 { memberName: weight }
     * @param {Function} onChangeCallback - スライダーの値が変更されたときのコールバック関数 (memberName, newValue)
     */
    createMemberWeightSliders: function(containerSelector, members, initialWeights = {}, onChangeCallback) {
        const container = DOMUtils.qs(containerSelector);
        if (!container) {
            console.error(`Slider container "${containerSelector}" not found.`);
            return null;
        }
        DOMUtils.empty(container); // 既存の内容をクリア

        const sliders = {};

        if (!members || members.length === 0) {
            container.appendChild(DOMUtils.createElement('p', {}, ['メンバー情報がありません。']));
            return sliders;
        }

        members.forEach(member => {
            if (!member || !member.name) return;

            const memberName = member.name;
            const initialValue = initialWeights[memberName] !== undefined ? initialWeights[memberName] : 3; // デフォルト値3

            const itemDiv = DOMUtils.createElement('div', { class: 'member-slider-item' });

            const label = DOMUtils.createElement('label', { for: `weight-${memberName}` }, [`${memberName}:`]);
            const slider = DOMUtils.createElement('input', {
                type: 'range',
                id: `weight-${memberName}`,
                min: '0',
                max: '5', // 最大出現ウェイト
                step: '1',
                value: String(initialValue),
                dataset: { memberName: memberName }
            });
            const valueSpan = DOMUtils.createElement('span', { class: 'slider-value' }, [String(initialValue)]);

            DOMUtils.on(slider, 'input', (event) => {
                const newValue = parseInt(event.target.value, 10);
                DOMUtils.setText(valueSpan, String(newValue));
                if (typeof onChangeCallback === 'function') {
                    onChangeCallback(memberName, newValue);
                }
            });

            itemDiv.appendChild(label);
            itemDiv.appendChild(slider);
            itemDiv.appendChild(valueSpan);
            container.appendChild(itemDiv);

            sliders[memberName] = slider; // 作成したスライダー要素を保持
        });
        return sliders; // 各スライダー要素への参照を返す
    },

    /**
     * 汎用スライダーの値表示を更新する
     * @param {string} sliderSelector - スライダーinput要素のCSSセレクタ
     * @param {string} valueDisplaySelector - 値を表示するspan要素のCSSセレクタ
     * @param {Function} [onChangeCallback] - 値変更時のコールバック (newValue)
     */
    initGenericSlider: function(sliderSelector, valueDisplaySelector, onChangeCallback) {
        const slider = DOMUtils.qs(sliderSelector);
        const valueDisplay = DOMUtils.qs(valueDisplaySelector);

        if (slider && valueDisplay) {
            const updateValue = () => {
                const val = slider.value;
                DOMUtils.setText(valueDisplay, val);
                if (typeof onChangeCallback === 'function') {
                    onChangeCallback(parseFloat(val)); // 数値として渡す
                }
            };
            DOMUtils.on(slider, 'input', updateValue);
            updateValue(); // 初期値を表示
        } else {
            console.warn(`Generic slider elements not found (slider: ${sliderSelector}, display: ${valueDisplaySelector})`);
        }
    },

    /**
     * 通知メッセージを表示する (例: フィニッシュ時)
     * この関数は仮です。より洗練された通知システムを実装することを推奨します。
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 通知のタイプ ('success', 'error', 'info') (スタイリング用)
     * @param {number} duration - 表示時間 (ミリ秒)
     */
    showNotification: function(message, type = 'info', duration = 3000) {
        // TODO: よりリッチな通知コンポーネントの実装
        // 例: 画面隅にフェードイン/アウトするトースト通知
        console.log(`[Notification (${type})]: ${message}`);
        alert(`[${type.toUpperCase()}] ${message}`); // とりあえず alert
    },

    /**
     * ステッカー選択UIを生成する
     * @param {string} containerSelector - ステッカー選択ボタンを配置するコンテナのセレクタ
     * @param {Array<string>} stickerPaths - ステッカー画像のパスの配列 (config.js から)
     * @param {Function} onStickerSelectCallback - ステッカーが選択されたときのコールバック (selectedPath)
     */
    createStickerChoices: function(containerSelector, stickerPaths, onStickerSelectCallback) {
        const container = DOMUtils.qs(containerSelector);
        if (!container) {
            console.error(`Sticker choice container "${containerSelector}" not found.`);
            return;
        }
        DOMUtils.empty(container);

        if (!stickerPaths || stickerPaths.length === 0) {
            container.appendChild(DOMUtils.createElement('p', { class: 'sticker-loading' }, ['ステッカーがありません。']));
            return;
        }

        stickerPaths.forEach(path => {
            const img = DOMUtils.createElement('img', {
                class: 'sticker-choice-img',
                src: path,
                alt: `ステッカー ${path.split('/').pop()}`,
                loading: 'lazy'
            });
            const button = DOMUtils.createElement('button', {
                class: 'sticker-choice-button',
                title: `ステッカーを選択: ${path.split('/').pop()}`,
                dataset: { stickerPath: path }
            }, [img]);

            DOMUtils.on(img, 'error', (e) => {
                console.warn(`Failed to load sticker choice: ${path}`);
                button.style.display = 'none'; // 読み込み失敗したものは非表示
            });

            DOMUtils.on(button, 'click', (event) => {
                const selectedButton = event.currentTarget;
                const selectedPath = selectedButton.dataset.stickerPath;

                // 他のボタンの選択状態を解除
                DOMUtils.qsa('.sticker-choice-button.selected', container)
                    .forEach(btn => DOMUtils.removeClass(btn, 'selected'));
                // クリックされたボタンを選択状態にする
                DOMUtils.addClass(selectedButton, 'selected');

                if (typeof onStickerSelectCallback === 'function') {
                    onStickerSelectCallback(selectedPath);
                }
            });
            container.appendChild(button);
        });
    }
};

// グローバルスコープに公開 (またはモジュールとしてエクスポート)
// window.UIComponents = UIComponents;
// export default UIComponents;