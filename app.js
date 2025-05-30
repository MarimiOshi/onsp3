// data_handler.js

const DataHandler = {
    config: null,       // アプリ全体のconfigオブジェクト
    memberData: [],     // 加工済みのメンバー情報と画像リスト
    memberQuotes: {},   // { "メンバー名": [{text, tags}, ...] }
    imageTags: {},      // { "メンバー名/ero/1.jpg": ["tag1", "tag2"] }
    likedImageHistory: [], // 右スワイプした画像の履歴 (フィーバー用) {member, imagePath, relativePath}
    weakPointImages: new Set(), // 弱点/お気に入り登録された画像のrelativePathのSet

    async init(appConfig) {
        this.config = appConfig;
        console.log("DataHandler: Initializing...");

        this.processMemberData();
        await this.loadMemberQuotes();
        // this.loadImageTags(); // 画像タグをlocalStorageから読み込む場合
        this.loadLikedImageHistory();
        this.loadWeakPointImages();

        console.log("DataHandler: Initialization complete.");
        return this; // メソッドチェーン用
    },

    processMemberData: function() {
        this.memberData = [];
        if (!this.config.members || this.config.members.length === 0) {
            console.error("DataHandler: No members found in config.");
            return;
        }
        this.config.members.forEach(member => {
            if (member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.imageCount > 0) {
                const eroFolder = member.imageFolders.ero;
                for (let i = 1; i <= eroFolder.imageCount; i++) {
                    const fileName = `${i}.jpg`; // 将来的には拡張子も考慮
                    const relativePath = `${member.name}/ero/${fileName}`;
                    this.memberData.push({
                        memberInfo: member, // メンバーオブジェクト全体
                        type: 'ero',
                        imagePath: `${eroFolder.path}${fileName}`,
                        relativePath: relativePath,
                        imageNumber: i
                    });
                }
            }
            // 必要なら hutuu 画像も同様に処理
        });
        console.log(`DataHandler: Processed ${this.memberData.length} ERO images for all members.`);
    },

    loadMemberQuotes: async function() {
        if (!this.config.DATA_FILES.serifCsvPath) {
            console.warn("DataHandler: Serif CSV path not configured.");
            this.memberQuotes = {}; return;
        }
        try {
            const response = await fetch(this.config.DATA_FILES.serifCsvPath, { cache: "no-store" });
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line);
            if (lines.length <= 1) { this.memberQuotes = {}; return; }

            const quotes = {};
            lines.slice(1).forEach(line => {
                const parts = []; let currentPart = ''; let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"' && (i === 0 || line[i-1] !== '\\')) inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { parts.push(currentPart.trim()); currentPart = ''; }
                    else currentPart += char;
                }
                parts.push(currentPart.trim());
                if (parts.length >= 2) {
                    const memberName = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"');
                    const quoteText = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"');
                    const tagsString = parts.length > 2 ? parts.slice(2).join(',').trim().replace(/^"|"$/g, '') : "";
                    const quoteTags = tagsString ? tagsString.split(this.config.DATA_FILES.quoteTagDelimiter || '|').map(t => t.trim().replace(/""/g, '"')).filter(t => t) : [];
                    if (!quotes[memberName]) quotes[memberName] = [];
                    quotes[memberName].push({ text: quoteText, tags: quoteTags });
                }
            });
            this.memberQuotes = quotes;
            console.log("DataHandler: Member quotes loaded.", Object.keys(this.memberQuotes).length > 0 ? `${Object.keys(this.memberQuotes).length} members have quotes.` : "No quotes parsed.");
        } catch (error) {
            console.error("DataHandler: Failed to load member quotes:", error);
            this.memberQuotes = {};
        }
    },

    getMemberQuote: function(memberName) {
        const quotes = this.memberQuotes[memberName] || [];
        if (quotes.length > 0) {
            // TODO: 画像タグや状況に応じてセリフをフィルタリングするロジック
            const randomQuote = Utils.getRandomElement(quotes); // Utilsはapp.jsから渡すかグローバルにする
            return randomQuote ? randomQuote.text : "（……）";
        }
        return "（……）";
    },

    getImageTags: function(relativePath) {
        return this.imageTags[relativePath] || [];
    },

    // --- 右スワイプ（高評価）画像の管理 ---
    addLikedImage: function(imageData) { // imageData = {memberInfo, imagePath, relativePath}
        // 重複を避けるか、履歴としてすべて保持するか
        if (!this.likedImageHistory.find(item => item.relativePath === imageData.relativePath)) {
            this.likedImageHistory.push(imageData);
            this.saveLikedImageHistory();
            console.log("DataHandler: Added to liked history:", imageData.relativePath);
        }
    },
    getLikedImages: function() {
        return [...this.likedImageHistory]; // コピーを返す
    },
    saveLikedImageHistory: function() {
        if (StorageService) StorageService.save(this.config.STORAGE_KEYS.likedImages, this.likedImageHistory);
    },
    loadLikedImageHistory: function() {
        if (StorageService) this.likedImageHistory = StorageService.load(this.config.STORAGE_KEYS.likedImages, []);
        console.log("DataHandler: Liked image history loaded, count:", this.likedImageHistory.length);
    },
    clearLikedImageHistory: function() {
        this.likedImageHistory = [];
        this.saveLikedImageHistory();
    },

    // --- 弱点/お気に入り画像の管理 ---
    toggleWeakPoint: function(relativePath) {
        if (this.weakPointImages.has(relativePath)) {
            this.weakPointImages.delete(relativePath);
        } else {
            this.weakPointImages.add(relativePath);
        }
        this.saveWeakPointImages();
        return this.weakPointImages.has(relativePath);
    },
    isWeakPoint: function(relativePath) {
        return this.weakPointImages.has(relativePath);
    },
    saveWeakPointImages: function() {
        if (StorageService) StorageService.save(this.config.STORAGE_KEYS.weakPoints, Array.from(this.weakPointImages));
    },
    loadWeakPointImages: function() {
        if (StorageService) {
            const loaded = StorageService.load(this.config.STORAGE_KEYS.weakPoints, []);
            this.weakPointImages = new Set(loaded);
        }
        console.log("DataHandler: Weak points loaded, count:", this.weakPointImages.size);
    },
    getWeakPointImages: function() { // フィーバーモードで「高評価」として使う場合
        // this.memberData から weakPointImages に含まれるものをフィルタリングして返す
        return this.memberData.filter(img => this.weakPointImages.has(img.relativePath));
    },

    // --- カード選択ロジック ---
    getNextCardData: function(currentSettings, isFeverMode = false) {
        let eligibleImages = [];
        if (isFeverMode) {
            // フィーバー中は「右スワイプした画像」または「弱点登録した画像」からランダムに選ぶ
            // ここでは「弱点画像のみ」をフィーバーの条件とする
            eligibleImages = this.getWeakPointImages(); // これが {memberInfo, imagePath, relativePath} の配列を返すように
            if (eligibleImages.length === 0) { // フィーバー対象画像がない場合
                console.warn("DataHandler: No weak point images for Fever Mode. Falling back to all ERO.");
                // フォールバックとして全ERO画像から選ぶ (またはフィーバーを即終了するなどの仕様も検討)
                eligibleImages = this.memberData.filter(img => img.type === 'ero');
            }
        } else {
            eligibleImages = this.memberData.filter(img => img.type === 'ero'); // 通常時は全ERO画像
        }

        if (eligibleImages.length === 0) {
            console.error("DataHandler: No eligible ERO images found to select a card.");
            return null; // 表示できるカードがない
        }

        // メンバー出現率（重み）に基づいてカードを選択
        const weightedSelection = [];
        eligibleImages.forEach(imgData => {
            const memberName = imgData.memberInfo.name;
            const weight = (currentSettings && currentSettings.memberWeights && currentSettings.memberWeights[memberName] !== undefined)
                            ? Number(currentSettings.memberWeights[memberName])
                            : 1; // デフォルトの重み
            for (let i = 0; i < weight; i++) {
                weightedSelection.push(imgData);
            }
        });

        if (weightedSelection.length === 0) { // 重み付けの結果、候補がなくなった場合（ありえないはずだが）
             return Utils.getRandomElement(eligibleImages);
        }

        const selectedCardData = Utils.getRandomElement(weightedSelection);

        if (selectedCardData) {
            return {
                member: selectedCardData.memberInfo,
                imagePath: selectedCardData.imagePath,
                relativePath: selectedCardData.relativePath,
                quote: this.getMemberQuote(selectedCardData.memberInfo.name),
                tags: this.getImageTags(selectedCardData.relativePath)
            };
        }
        return null;
    },
};

// グローバルスコープへの公開 (app.js で参照するため)
// または、app.js内でインスタンス化する際にこのオブジェクト定義を直接使う
