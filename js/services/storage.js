// js/services/storage.js

const StorageService = {
    COUNTER_KEY: typeof LS_COUNTER_KEY !== 'undefined' ? LS_COUNTER_KEY : 'onspNeoCounterData_v2',
    WEAK_POINTS_KEY: typeof LS_WEAK_POINTS_KEY !== 'undefined' ? LS_WEAK_POINTS_KEY : 'onspNeoWeakPoints_v2',
    SHIKOSHIKO_SETTINGS_KEY: typeof LS_SHIKOSHIKO_SETTINGS_KEY !== 'undefined' ? LS_SHIKOSHIKO_SETTINGS_KEY : 'onspNeoShikoshikoSettings_v2',
    TAG_STORAGE_KEY: typeof TAG_STORAGE_KEY !== 'undefined' ? TAG_STORAGE_KEY : 'onspNeoImageTags_v2',
    STICKER_DATA_KEY: typeof LS_STICKER_DATA_KEY !== 'undefined' ? LS_STICKER_DATA_KEY : 'onspNeoStickerData_v2',

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
    save: function(key, value) {
        if (!this.isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error saving to localStorage (key: ${key}):`, e);
        }
    },
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
    remove: function(key) {
        if (!this.isLocalStorageAvailable()) return;
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`Error removing from localStorage (key: ${key}):`, e);
        }
    },
    saveCounterData: function(counterData) { this.save(this.COUNTER_KEY, counterData); },
    loadCounterData: function() { return this.load(this.COUNTER_KEY, {}); },
    saveWeakPoints: function(weakPointsSet) { this.save(this.WEAK_POINTS_KEY, Array.from(weakPointsSet)); },
    loadWeakPoints: function() {
        const loadedArray = this.load(this.WEAK_POINTS_KEY, []);
        return new Set(loadedArray);
    },
    saveShikoshikoSettings: function(settings) { this.save(this.SHIKOSHIKO_SETTINGS_KEY, settings); },
    loadShikoshikoSettings: function() {
        // shikoshiko.js側でデフォルト値を定義・マージする方が柔軟
        return this.load(this.SHIKOSHIKO_SETTINGS_KEY, {}); // 空オブジェクトを返す
    },
    saveImageTags: function(tagsData) { this.save(this.TAG_STORAGE_KEY, tagsData); },
    loadImageTags: function() { return this.load(this.TAG_STORAGE_KEY, {}); },
    saveStickerData: function(stickerPositions) { this.save(this.STICKER_DATA_KEY, stickerPositions); },
    loadStickerData: function() { return this.load(this.STICKER_DATA_KEY, {}); }
};
