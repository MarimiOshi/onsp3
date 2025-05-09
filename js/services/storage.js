// js/services/storage.js

const StorageService = {
    // config.js で定義されるキー名を使用
    COUNTER_KEY: typeof LS_COUNTER_KEY !== 'undefined' ? LS_COUNTER_KEY : 'onspNeoCounterData_v4', // バージョンに合わせて更新
    WEAK_POINTS_KEY: typeof LS_WEAK_POINTS_KEY !== 'undefined' ? LS_WEAK_POINTS_KEY : 'onspNeoWeakPoints_v4',
    SHIKOSHIKO_SETTINGS_KEY: typeof LS_SHIKOSHIKO_SETTINGS_KEY !== 'undefined' ? LS_SHIKOSHIKO_SETTINGS_KEY : 'onspNeoShikoshikoSettings_v4',
    TAG_STORAGE_KEY: typeof TAG_STORAGE_KEY !== 'undefined' ? TAG_STORAGE_KEY : 'onspNeoImageTags_v4',
    STICKER_DATA_KEY: typeof LS_STICKER_DATA_KEY !== 'undefined' ? LS_STICKER_DATA_KEY : 'onspNeoStickerData_v4',


    /**
     * localStorageが利用可能かチェックする
     * @returns {boolean} 利用可能ならtrue、そうでなければfalse
     */
    isLocalStorageAvailable: function() {
        try {
            const testKey = '__testLocalStorage__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn("LocalStorage is not available.", e);
            return false;
        }
    },

    /**
     * データをlocalStorageに保存する (JSON形式)
     * @param {string} key - 保存するデータのキー
     * @param {*} value - 保存するデータ (JSONにシリアライズ可能なもの)
     */
    save: function(key, value) {
        if (!this.isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error saving to localStorage (key: ${key}):`, e);
        }
    },

    /**
     * localStorageからデータを読み込む (JSON形式)
     * @param {string} key - 読み込むデータのキー
     * @param {*} [defaultValue=null] - データが存在しない場合のデフォルト値
     * @returns {*} 読み込んだデータ、またはデフォルト値
     */
    load: function(key, defaultValue = null) {
        if (!this.isLocalStorageAvailable()) return defaultValue;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error loading from localStorage (key: ${key}):`, e);
            return defaultValue;
        }
    },

    /**
     * localStorageからデータを削除する
     * @param {string} key - 削除するデータのキー
     */
    remove: function(key) {
        if (!this.isLocalStorageAvailable()) return;
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`Error removing from localStorage (key: ${key}):`, e);
        }
    },

    // --- アプリケーション固有のセーバー/ローダー ---

    saveCounterData: function(counterData) {
        this.save(this.COUNTER_KEY, counterData);
    },
    loadCounterData: function() {
        return this.load(this.COUNTER_KEY, {}); // デフォルトは空オブジェクト
    },

    saveWeakPoints: function(weakPointsSet) { // Setを配列に変換して保存
        this.save(this.WEAK_POINTS_KEY, Array.from(weakPointsSet));
    },
    loadWeakPoints: function() { // 配列をSetに変換して返す
        const loadedArray = this.load(this.WEAK_POINTS_KEY, []);
        return new Set(loadedArray);
    },

    saveShikoshikoSettings: function(settings) {
        this.save(this.SHIKOSHIKO_SETTINGS_KEY, settings);
    },
    loadShikoshikoSettings: function() {
        // shikoshiko.js側でデフォルト値を定義・マージするため、ここでは空オブジェクトを返す
        return this.load(this.SHIKOSHIKO_SETTINGS_KEY, {});
    },

    saveImageTags: function(tagsData) {
        this.save(this.TAG_STORAGE_KEY, tagsData);
    },
    loadImageTags: function() {
        return this.load(this.TAG_STORAGE_KEY, {});
    },

    saveStickerData: function(stickerPositions) {
        this.save(this.STICKER_DATA_KEY, stickerPositions);
    },
    loadStickerData: function() {
        return this.load(this.STICKER_DATA_KEY, {});
    }
};
