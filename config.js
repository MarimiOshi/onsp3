// config.js

const config = {
    members: [
        {
            name: 'マコ',
            imageFolders: {
                hutuu: { path: 'images/mako/hutuu/', imageCount: 3 },
                ero: { path: 'images/mako/ero/', imageCount: 8 }
            },
            color: '#F97430'
        },
        {
            name: 'リオ',
            imageFolders: {
                hutuu: { path: 'images/rio/hutuu/', imageCount: 6 },
                ero: { path: 'images/rio/ero/', imageCount: 5 }
            },
            color: '#68C2E3'
        },
        {
            name: 'マヤ',
            imageFolders: {
                hutuu: { path: 'images/maya/hutuu/', imageCount: 2 },
                ero: { path: 'images/maya/ero/', imageCount: 7 }
            },
            color: '#7F3F97'
        },
        {
            name: 'リク',
            imageFolders: {
                hutuu: { path: 'images/riku/hutuu/', imageCount: 1 },
                ero: { path: 'images/riku/ero/', imageCount: 2 }
            },
            color: '#FDE152'
        },
        {
            name: 'アヤカ',
            imageFolders: {
                hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 },
                ero: { path: 'images/ayaka/ero/', imageCount: 1 }
            },
            color: '#FFFFFF'
        },
        {
            name: 'マユカ',
            imageFolders: {
                hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 },
                ero: { path: 'images/mayuka/ero/', imageCount: 10 }
            },
            color: '#00ABA9'
        },
        {
            name: 'リマ',
            imageFolders: {
                hutuu: { path: 'images/rima/hutuu/', imageCount: 15 },
                ero: { path: 'images/rima/ero/', imageCount: 12 }
            },
            color: '#B02537'
        },
        {
            name: 'ミイヒ',
            imageFolders: {
                hutuu: { path: 'images/miihi/hutuu/', imageCount: 10 },
                ero: { path: 'images/miihi/ero/', imageCount: 15 }
            },
            color: '#F8B9C9'
        },
        {
            name: 'ニナ',
            imageFolders: {
                hutuu: { path: 'images/nina/hutuu/', imageCount: 4 },
                ero: { path: 'images/nina/ero/', imageCount: 3 }
            },
            color: '#005BAC'
        }
        // ★★★ 必要に応じて他のメンバーを追加 ★★★
        // ★★★ 各メンバーの imageFolders.ero.imageCount が必ず 1 以上であることを確認 ★★★
        // ★★★ 画像パスが正しいことを確認 ★★★
    ],

    // しこしこモード設定
    shikoshikoDefaultSettings: {
        imageSlideInterval: 5000, // ms
        bpmLevels: [ // 残り時間割合が threshold "以上" の場合に適用されるBPM
            { threshold: 0.8, bpm: 80 },
            { threshold: 0.6, bpm: 100 },
            { threshold: 0.4, bpm: 120 },
            { threshold: 0.2, bpm: 150 },
            { threshold: 0.0, bpm: 180 } // 最後のレベル (残り0%以上、つまり常にこれが最低保証BPM)
        ],
        soundFilePaths: [ // ★★★ soundsフォルダ内の実際のファイル名に合わせてください ★★★
            'sounds/1.wav', 'sounds/2.wav', 'sounds/3.wav', 'sounds/4.wav',
            'sounds/5.wav', 'sounds/6.wav', 'sounds/7.wav', 'sounds/8.wav'
            // 'sounds/click1.wav', 'sounds/click2.wav', ... など
        ]
    },

    // ステッカー設定 (もしステッカー機能を利用する場合)
    stickerImagePaths: [
        'images/stickers/1.png',
        'images/stickers/2.png',
        'images/stickers/3.png',
        'images/stickers/4.png',
        'images/stickers/5.png',
        'images/stickers/6.png',
        'images/stickers/7.png',
        'images/stickers/8.png',
        'images/stickers/9.png',
        'images/stickers/10.png',
        'images/stickers/11.png',
        'images/stickers/12.png',
        'images/stickers/13.png',
        'images/stickers/14.png',
        'images/stickers/15.png',
        'images/stickers/16.png',
        'images/stickers/17.png',
        'images/stickers/18.png',
        'images/stickers/19.png',
        'images/stickers/20.png',
        'images/stickers/21.png'
        // ★★★ images/stickers/ フォルダ内の実際のファイル名に合わせてください ★★★
    ],
    STICKER_BASE_COLOR_HEX: '#ff0000', // ステッカーの色相回転の基準色 (赤)

    // localStorageのキー名定義 (StorageServiceで使われる)
    LS_COUNTER_KEY: 'onspNeoCounterData_v2',        // バージョンアップ
    LS_WEAK_POINTS_KEY: 'onspNeoWeakPoints_v2',     // バージョンアップ
    LS_SHIKOSHIKO_SETTINGS_KEY: 'onspNeoShikoshikoSettings_v2', // バージョンアップ
    TAG_STORAGE_KEY: 'onspNeoImageTags_v2',      // バージョンアップ (ギャラリーでタグ使うなら)
    LS_STICKER_DATA_KEY: 'onspNeoStickerData_v2',   // バージョンアップ

    // ONSP_セリフ.csv のパス (もし利用する場合)
    SERIF_CSV_PATH: 'data/ONSP_セリフ.csv'
};

// デバッグ用: config.js が読み込まれたことをコンソールに出力
// console.log("config.js loaded and parsed successfully. Config object:", JSON.parse(JSON.stringify(config)));
