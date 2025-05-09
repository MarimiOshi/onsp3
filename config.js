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
        // ★★★ 上記はサンプルです。実際のメンバー構成、画像数、パスに合わせてください ★★★
        // ★★★ 全メンバーの imageFolders.ero.imageCount が必ず 1 以上であることを確認してください ★★★
    ],

    shikoshikoDefaultSettings: {
        imageSlideInterval: 5000, // 画像切り替え間隔 (ミリ秒)
        fixedBpm: 120,            // ★★★ 固定BPM ★★★
        soundFilePaths: [         // ★★★ soundsフォルダ内の実際のファイル名に合わせてください ★★★
            'sounds/1.wav', 'sounds/2.wav', 'sounds/3.wav', 'sounds/4.wav',
            'sounds/5.wav', 'sounds/6.wav', 'sounds/7.wav', 'sounds/8.wav'
        ]
    },

    stickerImagePaths: [ // ★★★ images/stickers/ フォルダ内の実際のファイル名に合わせてください ★★★
        'images/stickers/1.png', 'images/stickers/2.png', 'images/stickers/3.png',
        'images/stickers/4.png', 'images/stickers/5.png', 'images/stickers/6.png',
        'images/stickers/7.png', 'images/stickers/8.png', 'images/stickers/9.png',
        'images/stickers/10.png', 'images/stickers/11.png', 'images/stickers/12.png',
        'images/stickers/13.png', 'images/stickers/14.png', 'images/stickers/15.png',
        'images/stickers/16.png', 'images/stickers/17.png', 'images/stickers/18.png',
        'images/stickers/19.png', 'images/stickers/20.png', 'images/stickers/21.png'
    ],
    STICKER_BASE_COLOR_HEX: '#ff0000',

    // localStorageのキー名定義
    LS_COUNTER_KEY: 'onspNeoCounterData_v3',
    LS_WEAK_POINTS_KEY: 'onspNeoWeakPoints_v3',
    LS_SHIKOSHIKO_SETTINGS_KEY: 'onspNeoShikoshikoSettings_v3',
    TAG_STORAGE_KEY: 'onspNeoImageTags_v3',
    LS_STICKER_DATA_KEY: 'onspNeoStickerData_v3',

    // セリフ関連
    SERIF_CSV_PATH: 'data/ONSP_セリフ.csv', // ★★★ CSVファイルのパス ★★★
    QUOTE_TAG_DELIMITER: '|',               // ★★★ CSV内のタグ区切り文字 ★★★
};

// console.log("config.js loaded and parsed. Config object:", JSON.parse(JSON.stringify(config)));
