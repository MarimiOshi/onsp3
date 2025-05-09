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
        images: [], // 表示する画像データのキャッシュ {member, type, number, path, relativePath, tags, isWeak, color}
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
        app: null, // Appインスタンスへの参照
        storage: null,
        utils: null,
        domUtils: null,
    },

    init: function(appInstance, initialConfig) {
        this.dependencies.app = appInstance;
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
        } else {
            console.error("GalleryMode: initialConfig.members is missing!");
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
        if (this.elements.memberFilter) du.on(this.elements.memberFilter, 'change', () => this.handleFilterChange());
        if (this.elements.typeFilter) du.on(this.elements.typeFilter, 'change', () => this.handleFilterChange());
        if (this.elements.weakPointFilter) du.on(this.elements.weakPointFilter, 'change', () => this.handleFilterChange());
        if (this.elements.refreshButton) du.on(this.elements.refreshButton, 'click', () => this.renderGallery());
    },

    loadImageDataFromConfig: function() {
        this.state.images = [];
        // console.log("Gallery loadImageDataFromConfig - this.config.members:", JSON.parse(JSON.stringify(this.config.members)));
        if (!this.config.members || !Array.isArray(this.config.members)) {
            console.error("Gallery: this.config.members is undefined or not an array!");
            return;
        }

        this.config.members.forEach(member => {
            // console.log("Gallery processing member:", member ? member.name : "undefined member");
            if (member && member.name && member.imageFolders) {
                Object.entries(member.imageFolders).forEach(([type, folderInfo]) => {
                    // console.log(`Gallery processing type: ${type}, folderInfo:`, JSON.parse(JSON.stringify(folderInfo)));
                    if (folderInfo && folderInfo.path && folderInfo.imageCount > 0) {
                        for (let i = 1; i <= folderInfo.imageCount; i++) {
                            const fileName = `${i}.jpg`; // Assumes jpg, make configurable if needed
                            const relativePath = `${member.name}/${type}/${fileName}`;
                            this.state.images.push({
                                member: member.name,
                                type: type,
                                number: i,
                                path: `${folderInfo.path}${fileName}`,
                                relativePath: relativePath,
                                color: member.color || null // メンバーカラーも保持
                            });
                        }
                    } else {
                        // console.warn(`Gallery: Skipping folder for ${member.name}/${type} due to missing path or imageCount <= 0.`);
                    }
                });
            } else {
                // console.warn("Gallery: Skipping member due to missing name or imageFolders.", member);
            }
        });
        console.log(`Gallery: Loaded ${this.state.images.length} image data entries from config.`);
    },

    populateMemberFilter: function() {
        if (!this.elements.memberFilter || !this.config.members || !Array.isArray(this.config.members)) {
            console.warn("Cannot populate member filter: element or members data missing.");
            return;
        }
        this.dependencies.domUtils.empty(this.elements.memberFilter);

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
        if (this.elements.memberFilter) this.state.filters.member = this.elements.memberFilter.value;
        if (this.elements.typeFilter) this.state.filters.type = this.elements.typeFilter.value;
        if (this.elements.weakPointFilter) this.state.filters.weakOnly = this.elements.weakPointFilter.checked;
        this.renderGallery();
    },

    renderGallery: function() {
        if (!this.elements.galleryGrid) {
            console.error("Gallery grid element not found.");
            return;
        }
        this.dependencies.domUtils.empty(this.elements.galleryGrid);

        const loadingMsg = this.dependencies.domUtils.createElement('p', { class: 'loading-message gallery-loading' }, ['ギャラリーを読み込み中...']);
        this.elements.galleryGrid.appendChild(loadingMsg);

        // Render asynchronously to prevent UI freeze for large galleries
        requestAnimationFrame(() => {
            this.dependencies.domUtils.empty(this.elements.galleryGrid);

            const filteredImages = this.state.images.filter(img => {
                const memberMatch = this.state.filters.member === 'all' || img.member === this.state.filters.member;
                const typeMatch = this.state.filters.type === 'all' || img.type === this.state.filters.type;
                const weakMatch = !this.state.filters.weakOnly || this.state.weakPoints.has(img.relativePath);
                return memberMatch && typeMatch && weakMatch;
            });

            filteredImages.sort((a, b) => {
                const aIsWeak = this.state.weakPoints.has(a.relativePath);
                const bIsWeak = this.state.weakPoints.has(b.relativePath);
                if (aIsWeak !== bIsWeak) return bIsWeak ? 1 : -1; // true (weak) comes first
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
                    this.dependencies.domUtils.addClass(e.target, 'image-error');
                });

                const link = this.dependencies.domUtils.createElement('a', {
                    class: 'gallery-thumbnail-link',
                    href: imgData.path,
                    target: '_blank',
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
        });
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

        this.dependencies.domUtils.setText(button, isNowWeak ? '★' : '☆');
        this.dependencies.domUtils.toggleClass(button, 'is-weak', isNowWeak);
        button.title = isNowWeak ? '弱点解除' : '弱点登録';

        if (this.state.filters.weakOnly && !isNowWeak) {
            const itemToRemove = this.dependencies.domUtils.qs(`.gallery-item[data-relpath="${CSS.escape(relPath)}"]`, this.elements.galleryGrid);
            if (itemToRemove) itemToRemove.remove();
        }
        // 他のモードにも通知 (App経由で)
        if (this.dependencies.app && typeof this.dependencies.app.notifyWeakPointChange === 'function') {
            this.dependencies.app.notifyWeakPointChange(relPath, isNowWeak);
        }
    },

    notifyWeakPointChanged: function(relativePath, isNowWeak) {
        if (!this.state.isActive) return;

        const currentIsWeak = this.state.weakPoints.has(relativePath);
        if (isNowWeak && !currentIsWeak) {
            this.state.weakPoints.add(relativePath);
        } else if (!isNowWeak && currentIsWeak) {
            this.state.weakPoints.delete(relativePath);
        } else {
            return; // 状態変わらず
        }

        const galleryItem = this.dependencies.domUtils.qs(`.gallery-item[data-relpath="${CSS.escape(relativePath)}"]`, this.elements.galleryGrid);
        if (galleryItem) {
            const button = this.dependencies.domUtils.qs('.weak-point-toggle', galleryItem);
            if (button) {
                this.dependencies.domUtils.setText(button, isNowWeak ? '★' : '☆');
                this.dependencies.domUtils.toggleClass(button, 'is-weak', isNowWeak);
                button.title = isNowWeak ? '弱点解除' : '弱点登録';
            }
            if (this.state.filters.weakOnly && !isNowWeak) {
                galleryItem.remove();
            }
        } else if (this.state.filters.weakOnly && isNowWeak) {
            this.renderGallery(); // アイテムがなくて弱点フィルターONで今回弱点になった場合、再描画
        }
    },

    activate: function() {
        this.state.isActive = true;
        if (this.elements.section) {
            this.dependencies.domUtils.addClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, true);
        }
        this.state.weakPoints = this.dependencies.storage.loadWeakPoints();
        this.state.imageTags = this.dependencies.storage.loadImageTags();
        this.renderGallery();
        console.log("Gallery Mode Activated.");
    },

    deactivate: function() {
        this.state.isActive = false;
        if (this.elements.section) {
            this.dependencies.domUtils.removeClass(this.elements.section, 'active');
            this.dependencies.domUtils.toggleDisplay(this.elements.section, false);
        }
        console.log("Gallery Mode Deactivated.");
    }
};
