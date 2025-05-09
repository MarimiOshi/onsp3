// config.js

const config = {
    members: [
        {
            name: 'マコ',
            imageFolders: {
                hutuu: { path: 'images/mako/hutuu/', imageCount: 3 }, // 例: 3枚の通常画像
                ero: { path: 'images/mako/ero/', imageCount: 8 }     // 例: 8枚のERO画像
            },
            color: '#F97430' // メンバーカラー (オレンジ系)
        },
        {
            name: 'リオ',
            imageFolders: {
                hutuu: { path: 'images/rio/hutuu/', imageCount: 6 },
                ero: { path: 'images/rio/ero/', imageCount: 5 }
            },
            color: '#68C2E3' // 水色系
        },
        {
            name: 'マヤ',
            imageFolders: {
                hutuu: { path: 'images/maya/hutuu/', imageCount: 2 },
                ero: { path: 'images/maya/ero/', imageCount: 7 }
            },
            color: '#7F3F97' // 紫系
        },
        // --- ★★★ 他のメンバーも同様に追加 ★★★ ---
        // 全メンバーについて、特に imageFolders.ero.imageCount が 1 以上であることを確認
        {
            name: 'リク',
            imageFolders: {
                hutuu: { path: 'images/riku/hutuu/', imageCount: 1 },
                ero: { path: 'images/riku/ero/', imageCount: 2 } // 少なくとも1枚はERO画像があること
            },
            color: '#FDE152' // 黄色系
        },
        {
            name: 'アヤカ',
            imageFolders: {
                hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 }, // 通常画像が0枚でもOK
                ero: { path: 'images/ayaka/ero/', imageCount: 1 }     // ERO画像は1枚以上必要
            },
            color: '#FFFFFF' // 白色 (テーマカラー処理で考慮が必要かも)
        },
        {
            name: 'マユカ',
            imageFolders: {
                hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 },
                ero: { path: 'images/mayuka/ero/', imageCount: 10 }
            },
            color: '#00ABA9' // 青緑系
        },
        {
            name: 'リマ',
            imageFolders: {
                hutuu: { path: 'images/rima/hutuu/', imageCount: 15 },
                ero: { path: 'images/rima/ero/', imageCount: 12 }
            },
            color: '#B02537' // 赤系
        },
        {
            name: 'ミイヒ',
            imageFolders: {
                hutuu: { path: 'images/miihi/hutuu/', imageCount: 10 },
                ero: { path: 'images/miihi/ero/', imageCount: 15 }
            },
            color: '#F8B9C9' // ピンク系
        },
        {
            name: 'ニナ',
            imageFolders: {
                hutuu: { path: 'images/nina/hutuu/', imageCount: 4 },
                ero: { path: 'images/nina/ero/', imageCount: 3 }
            },
            color: '#005BAC' // 濃い青系
        }
    ],

    // しこしこモード設定 (shikoshiko.js の config で上書きされるか、ここでデフォルト定義)
    shikoshikoDefaultSettings: {
        imageSlideInterval: 5000, // ms
        bpmLevels: [
            { threshold: 0.8, bpm: 80 },
            { threshold: 0.6, bpm: 100 },
            { threshold: 0.4, bpm: 120 },
            { threshold: 0.2, bpm: 150 },
            { threshold: 0.0, bpm: 180 }
        ],
        soundFilePaths: [ // ★★★ soundsフォルダ内の実際のファイル名に合わせる ★★★
            'sounds/1.wav', 'sounds/2.wav', 'sounds/3.wav', 'sounds/4.wav',
            'sounds/5.wav', 'sounds/6.wav', 'sounds/7.wav', 'sounds/8.wav'
        ]
    },

    // ステッカー設定 (もしステッカー機能を利用する場合)
    stickerImagePaths: [
        'images/stickers/1.png',
        'images/stickers/2.png',
        // ... images/stickers/21.png まで (config_sample.jsの記述を参考)
    ],
    STICKER_BASE_COLOR_HEX: '#ff0000', // ステッカーの色相回転の基準色

    // localStorageのキー名定義 (StorageServiceで使われる)
    LS_COUNTER_KEY: 'onspNeoCounterData_v1',
    LS_WEAK_POINTS_KEY: 'onspNeoWeakPoints_v1',
    LS_SHIKOSHIKO_SETTINGS_KEY: 'onspNeoShikoshikoSettings_v1',
    TAG_STORAGE_KEY: 'onspNeoImageTags_v1', // タグ機能は今回削除したが、ギャラリーで使う可能性も
    LS_STICKER_DATA_KEY: 'onspNeoStickerData_v1',

    // ONSP_セリフ.csv のパス (もし利用する場合)
    SERIF_CSV_PATH: 'data/ONSP_セリフ.csv'
};

// config.js の最後 (デバッグ用)
// console.log("config.js loaded:", JSON.parse(JSON.stringify(config)));
