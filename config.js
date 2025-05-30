// config.js

const config = {
    members: [
        { name: 'マコ', imageFolders: { hutuu: { path: 'images/mako/hutuu/', imageCount: 3 }, ero: { path: 'images/mako/ero/', imageCount: 8 } }, color: '#F97430' },
        { name: 'リオ', imageFolders: { hutuu: { path: 'images/rio/hutuu/', imageCount: 6 }, ero: { path: 'images/rio/ero/', imageCount: 8 } }, color: '#68C2E3' },
        { name: 'マヤ', imageFolders: { hutuu: { path: 'images/maya/hutuu/', imageCount: 3 }, ero: { path: 'images/maya/ero/', imageCount: 8 } }, color: '#7F3F97' },
        { name: 'リク', imageFolders: { hutuu: { path: 'images/riku/hutuu/', imageCount: 3 }, ero: { path: 'images/riku/ero/', imageCount: 2 } }, color: '#FDE152' },
        { name: 'アヤカ', imageFolders: { hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 }, ero: { path: 'images/ayaka/ero/', imageCount: 1 } }, color: '#FFFFFF' },
        { name: 'マユカ', imageFolders: { hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 }, ero: { path: 'images/mayuka/ero/', imageCount: 32 } }, color: '#00ABA9' },
        { name: 'リマ', imageFolders: { hutuu: { path: 'images/rima/hutuu/', imageCount: 15 }, ero: { path: 'images/rima/ero/', imageCount: 35 } }, color: '#B02537' },
        { name: 'ミイヒ', imageFolders: { hutuu: { path: 'images/miihi/hutuu/', imageCount: 27 }, ero: { path: 'images/miihi/ero/', imageCount: 54 } }, color: '#F8B9C9' },
        { name: 'ニナ', imageFolders: { hutuu: { path: 'images/nina/hutuu/', imageCount: 4 }, ero: { path: 'images/nina/ero/', imageCount: 1 } }, color: '#005BAC' },
    ],

    // しこしこモード (Tinder風UI) 設定
    cardSwipeSettings: {
        feverThreshold: 10, // フィーバーになるスワイプ回数 (右スワイプのみカウントする場合など調整)
        feverDuration: 60000, // フィーバー持続時間 (ミリ秒) = 1分
        likeImageSrc: 'images/シコい.png', // 右スワイプ時の評価画像 (英数字名推奨)
        nopeImageSrc: 'images/萎え.png',   // 左スワイP時の評価画像 (英数字名推奨)
        stickerPaths: [             // フィーバー中に表示するステッカー画像のパス
            'images/stickers/1.png', 'images/stickers/2.png', 'images/stickers/3.png',
            'images/stickers/4.png', 'images/stickers/5.png', 'images/stickers/6.png',
            'images/stickers/7.png', 'images/stickers/8.png', 'images/stickers/9.png',
            'images/stickers/10.png', 'images/stickers/11.png', 'images/stickers/12.png',
            'images/stickers/13.png', 'images/stickers/14.png', 'images/stickers/15.png',
            'images/stickers/16.png', 'images/stickers/17.png', 'images/stickers/18.png',
            'images/stickers/19.png'
            // 必要に応じて追加
        ],
        nextCardPreloadCount: 2, // 次のカードを何枚事前に画像URLだけ読み込んでおくか
    },

    // データファイルパス
    DATA_FILES: {
        serifCsvPath: 'data/ONSP_セリフ.csv',
        quoteTagDelimiter: '|', // セリフCSV内のタグ区切り文字
        // imageTagsJsonPath: 'data/image_tags.json', // もし画像タグを外部JSONで管理する場合
    },

    // localStorage キー (バージョン管理がしやすいように)
    STORAGE_KEYS: {
        settings: 'onspTinderAppSettings_v1',     // アプリ設定 (メンバー出現率など)
        likedImages: 'onspTinderAppLikedImages_v1', // 右スワイプした画像の履歴 (フィーバー用)
        weakPoints: 'onspTinderAppWeakPoints_v1',  // 弱点/お気に入り登録画像
        // imageTags: 'onspTinderAppImageTags_v1',    // 画像タグデータ (もし外部JSONでない場合)
    },

    // デバッグモード
    DEBUG_MODE: true,
};
