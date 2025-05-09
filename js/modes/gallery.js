// js/modes/gallery.js

const GalleryMode = {
    elements: {
        section: null,
        memberFilter: null,
        typeFilter: null,
        weakPointFilter: null,
        refreshButton: null,
        galleryGrid: null,
    },
    state: {
        isActive: false,
        images: [], // 表示する画像データのキャッシュ {member, type, number, path, relativePath, tags, isWeak}
        filters: {
            member: 'all',
            type: 'all',
            weakOnly: false
        },
        weakPoints: new Set(), // 弱点画像の相対パスを格納
        imageTags: {}, // 画像ごとのタグ { relativePath: ['tag1', 'tag2'] }
    },
    config: {
        members: [], // app.js から注入
    },
    dependencies: {
        storage: null,
        utils: null,
        domUtils: null,
    },

    init: function(appInstance, initialConfig) {
        this.dependencies.storage = StorageService;
        this.dependencies.utils = Utils;
        this.dependencies.domUtils = DOMUtils;

        console.log("Initializing Gallery Mode...");

        this.elements.section = this.dependencies.domUtils.qs('#gallerySection');
        this.elements.memberFilter = this.dependencies.domUtils.qs('#galleryMemberFilter');
        this.elements.typeFilter = this.dependencies.domUtils.qs('#galleryTypeFilter');
        this.elements.weakPointFilter = this.dependencies.domUtils.qs('#galleryWeakPointFilter');
        this.elements.refreshButton = this.dependencies.domUtils.qs('#galleryRefreshButton');
        this.elements.galleryGrid = this.dependencies.domUtils.qs('#galleryGrid');

        if (initialConfig.members) {
            this.config.members = initialConfig.members;
        }

        this.loadImageDataFromConfig(); // configから画像リストを生成
        this.state.weakPoints = this.dependencies.storage.loadWeakPoints();
        this.state.imageTags = this.dependencies.storage.loadImageTags(); // タグ情報も読み込む

        this.populateMemberFilter();
        this.addEventListeners();

        console.log("Gallery Mode Initialized.");
    },

    addEventListeners: function() {
        const du = this.dependencies.domUtils;
        du.on(this.elements.memberFilter, 'change', () => this.handleFilterChange());
        du.on(this.elements.typeFilter, 'change', () => this.handleFilterChange());
        du.on(this.elements.weakPointFilter, 'change', () => this.handleFilterChange());
        du.on(this.elements.refreshButton, 'click', () => this.renderGallery());
        // グリッド内の弱点ボタンへのイベントリスナーは renderGallery 内で設定
    },

    /**
     * config.members から画像情報を抽出し、this.state.images に格納する
     */
    loadImageDataFromConfig: function() {
        this.state.images = [];
        if (!this.config.members) return;

        this.config.members.forEach(member => {
            if (member && member.name && member.imageFolders) {
                Object.entries(member.imageFolders).forEach(([type, folderInfo]) => {
                    if (folderInfo && folderInfo.path && folderInfo.imageCount > 0) {
                        for (let i = 1; i <= folderInfo.imageCount; i++) {
                            const fileName = `${i}.jpg`; // TODO: 拡張子を動的にするか、configで指定
                            const relativePath = `${member.name}/${type}/${fileName}`;
                            this.state.images.push({
                                member: member.name,
                                type: type, // 'hutuu' or 'ero'
                                number: i,
                                path: `${folderInfo.path}${fileName}`,
                                relativePath: relativePath,
                                color: member.color || null // メンバーカラーも保持
                            });
                        }
                    }
                });
            }
        });
        console.log(`Gallery: Loaded ${this.state.images.length} image data entries from config.`);
    },

    populateMemberFilter: function() {
        if (!this.elements.memberFilter || !this.config.members) return;
        this.dependencies.domUtils.empty(this.elements.memberFilter); // 既存のオプションをクリア

        this.elements.memberFilter.appendChild(
            this.dependencies.domUtils.createElement('option', { value: 'all' }, ['全員'])
        );
        this.config.members.forEach(member => {
            if (member && member.name) {
                this.elements.memberFilter.appendChild(
                    this.dependencies.domUtils.createElement('option', { value: member.name }, [member.name])
                );
            }
        });
    },

    handleFilterChange: function() {
        this.state.filters.member = this.elements.memberFilter.value;
        this.state.filters.type = this.elements.typeFilter.value;
        this.state.filters.weakOnly = this.elements.weakPointFilter.checked;
        this.renderGallery();
    },

    renderGallery: function() {
        if (!this.elements.galleryGrid) return;
        this.dependencies.domUtils.empty(this.elements.galleryGrid);

        const loadingMsg = this.dependencies.domUtils.createElement('p', { class: 'loading-message gallery-loading' }, ['ギャラリーを読み込み中...']);
        this.elements.galleryGrid.appendChild(loadingMsg);

        // 非同期っぽく見せるため少し遅延 (実際には画像が多いと重くなるので注意)
        setTimeout(() => {
            this.dependencies.domUtils.empty(this.elements.galleryGrid); // ローディングメッセージ削除

            const filteredImages = this.state.images.filter(img => {
                const memberMatch = this.state.filters.member === 'all' || img.member === this.state.filters.member;
                const typeMatch = this.state.filters.type === 'all' || img.type === this.state.filters.type;
                const weakMatch = !this.state.filters.weakOnly || this.state.weakPoints.has(img.relativePath);
                return memberMatch && typeMatch && weakMatch;
            });

            // ソート: 弱点 -> メンバー名 -> タイプ(ERO優先) -> 番号
            filteredImages.sort((a, b) => {
                const aIsWeak = this.state.weakPoints.has(a.relativePath);
                const bIsWeak = this.state.weakPoints.has(b.relativePath);
                if (aIsWeak !== bIsWeak) return bIsWeak - aIsWeak; // true (1) が先
                if (a.member !== b.member) return a.member.localeCompare(b.member);
                if (a.type !== b.type) return a.type === 'ero' ? -1 : (b.type === 'ero' ? 1 : 0);
                return a.number - b.number;
            });


            if (filteredImages.length === 0) {
                this.elements.galleryGrid.appendChild(
                    this.dependencies.domUtils.createElement('p', { class: 'loading-message gallery-loading' }, ['該当する画像がありません。'])
                );
                return;
            }

            filteredImages.forEach(imgData => {
                const isWeak = this.state.weakPoints.has(imgData.relativePath);

                const thumb = this.dependencies.domUtils.createElement('img', {
                    class: 'gallery-thumbnail',
                    src: imgData.path,
                    alt: `${imgData.member} ${imgData.type} ${imgData.number}`,
                    loading: 'lazy'
                });
                this.dependencies.domUtils.on(thumb, 'error', e => {
                    e.target.src = 'images/placeholder.png';
                    // e.target.style.borderColor = 'red'; // エラー表示
                });

                const link = this.dependencies.domUtils.createElement('a', {
                    class: 'gallery-thumbnail-link',
                    href: imgData.path,
                    target: '_blank', // 新しいタブで開く
                    title: `クリックで拡大: ${imgData.relativePath}`
                }, [thumb]);

                const nameSpan = this.dependencies.domUtils.createElement('span', { class: 'gallery-item-name' }, [imgData.member]);
                const pathSpan = this.dependencies.domUtils.createElement('span', { class: 'gallery-item-path' }, [`${imgData.type}/${imgData.number}.jpg`]);
                const infoDiv = this.dependencies.domUtils.createElement('div', { class: 'gallery-item-info' }, [nameSpan, pathSpan]);

                const weakButton = this.dependencies.domUtils.createElement('button', {
                    class: 'weak-point-toggle icon-button' + (isWeak ? ' is-weak' : ''),
                    title: isWeak ? '弱点解除' : '弱点登録',
                    dataset: { relpath: imgData.relativePath }
                }, [isWeak ? '★' : '☆']);
                this.dependencies.domUtils.on(weakButton, 'click', (event) => this.handleWeakPointToggle(event));

                const item = this.dependencies.domUtils.createElement('div', {
                    class: 'gallery-item',
                    dataset: { relpath: imgData.relativePath }
                }, [link, infoDiv, weakButton]);

                this.elements.galleryGrid.appendChild(item);
            });
        }, 10); // わずかな遅延
    },

    handleWeakPointToggle: function(event) {
        const button = event.currentTarget;
        const relPath = button.dataset.relpath;
        if (!relPath) return;

        let isNowWeak;
        if (this.state.weakPoints.has(relPath)) {
            this.state.weakPoints.delete(relPath);
            isNowWeak = false;
        } else {
            this.state.weakPoints.add(relPath);
            isNowWeak = true;
        }
        this.dependencies.storage.saveWeakPoints(this.state.weakPoints);

        // ボタンの表示更新
        this.dependencies.domUtils.setText(button, isNowWeak ? '★' : '☆');
        this.dependencies.domUtils.toggleClass(button, 'is-weak', isNowWeak);
        button.title = isNowWeak ? '弱点解除' : '弱点登録';

        // フィルターが「弱点のみ」の場合、表示を再描画する必要があるかもしれない
        if (this.state.filters.weakOnly && !isNowWeak) {
            const itemToRemove = this.dependencies.domUtils.qs(`.gallery-item[data-relpath="${CSS.escape(relPath)}"]`, this.elements.galleryGrid);
            if (itemToRemove) itemToRemove.remove();
        }
    },

    /**
     * 外部からの弱点変更通知を受け取り、ギャラリー表示を更新する
     * @param {string} relativePath - 変更された画像の相対パス
     * @param {boolean} isNowWeak - 変更後の弱点状態
     */
    notifyWeakPointChanged: function(relativePath, isNowWeak) {
        if (!this.state.isActive) return; // ギャラリーがアクティブでない場合は何もしない

        if (isNowWeak) {
            this.state.weakPoints.add(relativePath);
        } else {
            this.state.weakPoints.delete(relativePath);
        }

        const galleryItem = this.dependencies.domUtils.qs(`.gallery-item[data-relpath="${CSS.escape(relativePath)}"]`, this.elements.galleryGrid);
        if (galleryItem) {
            const button = this.dependencies.domUtils.qs('.weak-point-toggle', galleryItem);
            if (button) {
                this.dependencies.domUtils.setText(button, isNowWeak ? '★' : '☆');
                this.dependencies.domUtils.toggleClass(button, 'is-weak', isNowWeak);
                button.title = isNowWeak ? '弱点解除' : '弱点登録';
            }
            // フィルターが「弱点のみ」で、弱点解除された場合は非表示にする
            if (this.state.filters.weakOnly && !isNowWeak) {
                galleryItem.remove();
            }
        } else if (this.state.filters.weakOnly && isNowWeak) {
            // アイテムが存在せず、弱点フィルターONで、今回弱点になった場合 -> 再描画
            // (または、該当アイテムだけ追加するロジックを組む)
            this.renderGallery();
        }
    },


    activate: function() {
        this.state.isActive = true;
        this.dependencies.domUtils.addClass(this.elements.section, 'active');
        this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        // アクティブ化時に最新の弱点情報を読み込む
        this.state.weakPoints = this.dependencies.storage.loadWeakPoints();
        this.state.imageTags = this.dependencies.storage.loadImageTags();
        this.renderGallery();
        console.log("Gallery Mode Activated.");
    },

    deactivate: function() {
        this.state.isActive = false;
        this.dependencies.domUtils.removeClass(this.elements.section, 'active');
        this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        console.log("Gallery Mode Deactivated.");
    }
};