// config.js

const config = {
    members: [
        { name: 'マコ', imageFolders: { hutuu: { path: 'images/mako/hutuu/', imageCount: 3 }, ero: { path: 'images/mako/ero/', imageCount: 8 } }, color: '#F97430', tags: {} },
    { name: 'リオ', imageFolders: { hutuu: { path: 'images/rio/hutuu/', imageCount: 6 }, ero: { path: 'images/rio/ero/', imageCount: 8 } }, color: '#68C2E3', tags: {} },
    { name: 'マヤ', imageFolders: { hutuu: { path: 'images/maya/hutuu/', imageCount: 3 }, ero: { path: 'images/maya/ero/', imageCount: 8 } }, color: '#7F3F97', tags: {} },
    { name: 'リク', imageFolders: { hutuu: { path: 'images/riku/hutuu/', imageCount: 3 }, ero: { path: 'images/riku/ero/', imageCount: 2 } }, color: '#FDE152', tags: {} },
    { name: 'アヤカ', imageFolders: { hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 }, ero: { path: 'images/ayaka/ero/', imageCount: 1 } }, color: '#FFFFFF', tags: {} },
    { name: 'マユカ', imageFolders: { hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 }, ero: { path: 'images/mayuka/ero/', imageCount: 32 } }, color: '#00ABA9', tags: {} },
    { name: 'リマ', imageFolders: { hutuu: { path: 'images/rima/hutuu/', imageCount: 15 }, ero: { path: 'images/rima/ero/', imageCount: 35 } }, color: '#B02537', tags: {} },
    { name: 'ミイヒ', imageFolders: { hutuu: { path: 'images/miihi/hutuu/', imageCount: 27 }, ero: { path: 'images/miihi/ero/', imageCount: 54 } }, color: '#F8B9C9', tags: {} },
    { name: 'ニナ', imageFolders: { hutuu: { path: 'images/nina/hutuu/', imageCount: 4 }, ero: { path: 'images/nina/ero/', imageCount: 1 } }, color: '#005BAC', tags: {} },
];

    shikoshikoDefaultSettings: {
        imageSlideInterval: 5000, // ms
        fixedBpm: 120,            // Default fixed BPM
        soundFilePaths: [
            'sounds/1.wav', 'sounds/2.wav', 'sounds/3.wav', 'sounds/4.wav',
            'sounds/5.wav', 'sounds/6.wav', 'sounds/7.wav', 'sounds/8.wav'
        ]
    },

    stickerImagePaths: [
        'images/stickers/1.png', 'images/stickers/2.png', 'images/stickers/3.png',
        'images/stickers/4.png', 'images/stickers/5.png', 'images/stickers/6.png',
        'images/stickers/7.png', 'images/stickers/8.png', 'images/stickers/9.png',
        'images/stickers/10.png', 'images/stickers/11.png', 'images/stickers/12.png',
        'images/stickers/13.png', 'images/stickers/14.png', 'images/stickers/15.png',
        'images/stickers/16.png', 'images/stickers/17.png', 'images/stickers/18.png',
        'images/stickers/19.png', 'images/stickers/20.png', 'images/stickers/21.png'
    ],
    STICKER_BASE_COLOR_HEX: '#ff0000',

    LS_COUNTER_KEY: 'onspNeoCounterData_v4', // Incremented version
    LS_WEAK_POINTS_KEY: 'onspNeoWeakPoints_v4',
    LS_SHIKOSHIKO_SETTINGS_KEY: 'onspNeoShikoshikoSettings_v4',
    TAG_STORAGE_KEY: 'onspNeoImageTags_v4',
    LS_STICKER_DATA_KEY: 'onspNeoStickerData_v4',

    SERIF_CSV_PATH: 'data/ONSP_セリフ.csv',
    QUOTE_TAG_DELIMITER: '|',
};
