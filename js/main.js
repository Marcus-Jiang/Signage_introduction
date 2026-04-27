/**
 * ========================================
 * デジタルサイネージ製品紹介ページ - メインロジックファイル v2
 * ========================================
 * 
 * モジュール構成：
 * 1. シーンデータ設定（10シーン＋複数製品対応）
 * 2. DOM要素参照
 * 3. 状態管理
 * 4. 画像プリロード（全シーン画像＋製品画像を事前読み込み）
 * 5. Markdown説明キャッシュと読み込み
 * 6. シーン描画と切替
 * 7. ホットスポット描画とインタラクション
 * 8. 詳細パネルとアニメーション（複数製品＋左画像右テキスト）
 * 9. イベントバインドと初期化
 */

/* ============================================
   1. シーンデータ設定
   ============================================ */

/**
 * シーンデータ配列（v2 - 10シーン、複数製品対応）
 * 
 * 各シーンの構成：
 * - name: シーン名（タブとパネルタイトルに表示）
 * - image: シーン画像パス（プロジェクトルートからの相対パス）
 * - hotspot: ホットスポット位置 { x, y } パーセント座標
 * - products: 製品配列（1シーンに複数製品対応）
 *   - name: 製品名
 *   - image: 製品画像パス
 *   - descriptionFile: 製品説明Markdownファイルパス
 */
const scenes = [
    {
        name: 'コンビニエンスストア',
        image: '场景图/便利店场景/便利店场景1.png',
        hotspot: { x: 30, y: 25 },
        products: [
            {
                name: '商用壁掛け液晶ディスプレイ',
                image: '产品图/商用壁挂液晶显示器.png',
                descriptionFile: '产品描述/商用壁挂液晶显示器.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景1.png',
        hotspot: { x: 29, y: 65 },
        products: [
            {
                name: '電子サイネージスタンド',
                image: '产品图/电子水牌.png',
                descriptionFile: '产品描述/电子水牌.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景2.png',
        hotspot: { x: 56, y: 40 },
        products: [
            {
                name: '商用壁掛け液晶ディスプレイ',
                image: '产品图/商用壁挂液晶显示器.png',
                descriptionFile: '产品描述/商用壁挂液晶显示器.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景3.png',
        hotspot: { x: 40, y: 29 },
        products: [
            {
                name: '商用バーライト液晶ディスプレイ',
                image: '产品图/商用条形液晶显示器.png',
                descriptionFile: '产品描述/商用条形液晶显示器.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景4.png',
        hotspot: { x: 63, y: 35 },
        products: [
            {
                name: '屋内両面吊り下げサイネージ',
                image: '产品图/室内双面吊装标牌.png',
                descriptionFile: '产品描述/室内双面吊装标牌.md'
            }
        ]
    },
    {
        name: 'イベント会場',
        image: '场景图/集会场景/集会场景1.png',
        hotspot: { x: 72, y: 58 },
        products: [
            {
                name: '屋外可搬型デジタルサイネージ',
                image: '产品图/室外可移动广告机.png',
                descriptionFile: '产品描述/室外可移动广告机.md'
            }
        ]
    },
    {
        name: 'ホテル',
        image: '场景图/酒店场景/酒店场景1.png',
        hotspot: { x: 70, y: 42 },
        products: [
            {
                name: '屋内自立型デジタルサイネージ',
                image: '产品图/室内立式广告机.png',
                descriptionFile: '产品描述/室内立式广告机.md'
            }
        ]
    },
    {
        name: 'ファストフード店',
        image: '场景图/快餐店场景/快餐店场景1.png',
        hotspot: { x: 55, y: 32 },
        products: [
            {
                name: '商用壁掛け液晶ディスプレイ',
                image: '产品图/商用壁挂液晶显示器.png',
                descriptionFile: '产品描述/商用壁挂液晶显示器.md'
            }
        ]
    },
    {
        name: 'ファストフード店',
        image: '场景图/快餐店场景/快餐店场景2.png',
        hotspot: { x: 59, y: 48 },
        products: [
            {
                name: 'セルフオーダー端末 - タイプ1',
                image: '产品图/自助点单机1.png',
                descriptionFile: '产品描述/自助点单机1.md'
            },
            {
                name: 'セルフオーダー端末 - タイプ2',
                image: '产品图/自助点单机2.png',
                descriptionFile: '产品描述/自助点单机2.md'
            },
            {
                name: 'セルフオーダー端末 - タイプ3',
                image: '产品图/自助点单机3.png',
                descriptionFile: '产品描述/自助点单机3.md'
            }
        ]
    },
    {
        name: 'その他',
        image: '场景图/其他场景/其他场景1.png',
        hotspot: { x: 32, y: 45 },
        products: [
            {
                name: '屋外自立型デジタルサイネージ',
                image: '产品图/室外立式广告机.png',
                descriptionFile: '产品描述/室外立式广告机.md'
            }
        ]
    }
];


/* ============================================
   2. DOM要素参照
   ============================================ */

const dom = {
    app: document.getElementById('app'),
    sceneContainer: document.getElementById('scene-container'),
    sceneImageA: document.getElementById('scene-image-a'),
    sceneImageB: document.getElementById('scene-image-b'),
    sceneSwitcher: document.getElementById('scene-switcher'),
    hotspotContainer: document.getElementById('hotspot-container'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    sceneIndicator: document.getElementById('scene-indicator'),
    detailPanel: document.getElementById('detail-panel'),
    detailCard: document.getElementById('detail-card'),
    detailHeader: document.getElementById('detail-header'),
    detailTitle: document.getElementById('detail-title'),
    productList: document.getElementById('product-list'),
    btnBack: document.getElementById('btn-back'),
    overlay: document.getElementById('overlay')
};


/* ============================================
   3. 状態管理
   ============================================ */

const state = {
    currentIndex: 0,
    isTransitioning: false,
    isDetailOpen: false,
    currentHotspot: null,
    activeLayer: 'a',  /* 現在表示中のレイヤ：'a' または 'b'、クロスフェード用 */
    preloadedImages: {} /* プリロード済み画像のキャッシュ：キー=画像パス、値=Imageオブジェクト */
};

/**
 * シーンカテリマッピング
 * scenes配列から自動抽出、キーがカテリ名、値がそのカテリの最初のシーンのインデックス
 * 例：{ "コンビニエンスストア": 0, "スーパーマーケット": 1, ... }
 */
const sceneCategories = {};

/**
 * シーンカテリマッピングの初期化
 * scenes配列を走査し、各カテリ名が最初に出現するインデックスを記録
 */
function initSceneCategories() {
    scenes.forEach((scene, index) => {
        if (!(scene.name in sceneCategories)) {
            sceneCategories[scene.name] = index;
        }
    });
}

/**
 * Markdown説明ファイルキャッシュ
 * 同一ファイルの重複リクエストを防止
 */
const descriptionCache = {};


/* ============================================
   4. 画像プリロード
   ============================================ */

/**
 * 全シーン画像と製品画像を事前読み込みする
 * ブラウザのキャッシュに画像を格納し、シーン切替時の遅延を防止
 * 
 * 仕組み：
 * - 非表示のImageオブジェクトを作成し、srcに画像パスを設定
 * - ブラウザが自動的にダウンロードし、HTTPキャッシュに保存
 * - その後<img>要素で同じパスを指定すると、キャッシュから即座に表示
 * 
 * @returns {Promise<number>} 読み込みに成功した画像数
 */
function preloadAllImages() {
    /* 重複を排除して全画像パスを収集 */
    const imagePaths = new Set();

    /* シーン画像を収集 */
    scenes.forEach(scene => {
        imagePaths.add(scene.image);
    });

    /* 製品画像を収集 */
    scenes.forEach(scene => {
        scene.products.forEach(product => {
            imagePaths.add(product.image);
        });
    });

    const total = imagePaths.size;
    let loaded = 0;

    /**
     * 1枚の画像をプリロード
     * @param {string} src - 画像パス
     * @returns {Promise<void>}
     */
    const preloadOne = (src) => {
        return new Promise((resolve) => {
            /* 既にプリロード済みの場合はスキップ */
            if (state.preloadedImages[src]) {
                loaded++;
                resolve();
                return;
            }

            const img = new Image();
            img.onload = () => {
                state.preloadedImages[src] = img;
                loaded++;
                resolve();
            };
            img.onerror = () => {
                /* 読み込み失敗でもエラーで止めず、警告のみ出力 */
                console.warn(`画像のプリロードに失敗: ${src}`);
                resolve();
            };
            img.src = src;
        });
    };

    /* 全画像を並列読み込み */
    return Promise.all(Array.from(imagePaths).map(preloadOne)).then(() => {
        console.log(`画像プリロード完了: ${loaded}/${total}枚`);
        return loaded;
    });
}

/**
 * 指定した画像がプリロード済みか確認
 * @param {string} src - 画像パス
 * @returns {boolean}
 */
function isImagePreloaded(src) {
    return !!state.preloadedImages[src];
}

/**
 * 画像の読み込み完了を待機するヘルパー関数
 * プリロード済みなら即座に解決、未読み込みならonloadを待機
 * @param {HTMLImageElement} imgEl - 対象の<img>要素
 * @returns {Promise<void>}
 */
function waitForImageLoad(imgEl) {
    return new Promise((resolve) => {
        if (imgEl.complete && imgEl.naturalWidth > 0) {
            resolve();
        } else {
            imgEl.onload = () => resolve();
            imgEl.onerror = () => resolve();
        }
    });
}


/* ============================================
   5. Markdown説明キャッシュと読み込み
   ============================================ */

/**
 * 製品説明Markdownファイルを非同期読み込み
 * キャッシュを優先的に参照、キャッシュミスの場合はfetchで読み込み
 * @param {string} filePath - Markdownファイルパス
 * @returns {Promise<string>} Markdownテキスト内容
 */
async function loadDescription(filePath) {
    /* キャッシュヒット時はそのまま返す */
    if (descriptionCache[filePath]) {
        return descriptionCache[filePath];
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`読み込み失敗: ${response.status}`);
        }
        const text = await response.text();
        /* キャッシュに書き込み */
        descriptionCache[filePath] = text;
        return text;
    } catch (error) {
        console.warn(`製品説明ファイルの読み込みに失敗しました: ${filePath}`, error);
        return '製品説明情報は現在ありません。';
    }
}

/**
 * MarkdownテキストをHTMLにパース
 * marked.jsライブラリを使用してパース処理
 * @param {string} markdown - Markdownテキスト
 * @returns {string} パース後のHTML文字列
 */
function parseMarkdown(markdown) {
    if (typeof marked !== 'undefined') {
        return marked.parse(markdown);
    }
    /* marked.js未読み込み時のフォールバック処理：簡易エスケープ後に表示 */
    return markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}


/* ============================================
   6. シーン描画と切替
   ============================================ */

/**
 * 指定インデックスのシーンを描画（クロスフェード、黒画面なし）
 * 
 * 改良ポイント：
 * - 画像読み込み完了後にクロスフェードを開始（空白画面を防止）
 * - プリロード済みの場合は即座にフェード開始（遅延なし）
 * - 未プリロードの場合は現在のシーンを表示したまま待機
 * 
 * @param {number} index - シーンインデックス
 * @param {boolean} animate - 遷移アニメーションを使用するか
 */
async function renderScene(index, animate = true) {
    const scene = scenes[index];
    if (!scene) return;

    if (animate) {
        const currentImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
        const nextImg = state.activeLayer === 'a' ? dom.sceneImageB : dom.sceneImageA;

        /* ホットスポットとカテリ切替を先に非表示 */
        dom.hotspotContainer.style.opacity = '0';
        dom.hotspotContainer.style.transition = 'opacity 0.3s ease';
        dom.sceneSwitcher.style.opacity = '0';
        dom.sceneSwitcher.style.transition = 'opacity 0.3s ease';

        /* 新しい画像をターゲットレイヤに設定 */
        nextImg.src = scene.image;
        nextImg.alt = scene.name;

        /* ★改良：画像読み込み完了を待ってからクロスフェード開始 */
        await waitForImageLoad(nextImg);

        /* クロスフェード：新レイヤをフェードイン、旧レイヤをフェードアウト */
        nextImg.classList.add('active');
        nextImg.classList.remove('inactive');
        currentImg.classList.remove('active');
        currentImg.classList.add('inactive');

        /* アクティブレイヤマークを切替 */
        state.activeLayer = state.activeLayer === 'a' ? 'b' : 'a';

        /* インジケータとカテリ切替を更新 */
        updateIndicator(index);
        updateSwitcher(scene.name);

        /* フェード完了後にホットスポットとカテリ切替を表示 */
        setTimeout(() => {
            renderHotspot(scene.hotspot);
            dom.hotspotContainer.style.opacity = '1';
            dom.sceneSwitcher.style.opacity = '1';
        }, 800);
    } else {
        /* アニメーションなしで直接描画：現在のアクティブレイヤに設定 */
        const currentImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
        currentImg.src = scene.image;
        currentImg.alt = scene.name;

        /* ★改良：画像読み込み完了を待ってから表示 */
        await waitForImageLoad(currentImg);

        currentImg.classList.add('active');
        currentImg.classList.remove('inactive');

        updateIndicator(index);
        updateSwitcher(scene.name);
        dom.sceneSwitcher.classList.add('visible');

        renderHotspot(scene.hotspot);
    }
}

function prevScene() {
    if (state.isTransitioning || state.isDetailOpen) return;
    state.isTransitioning = true;
    state.currentIndex = (state.currentIndex - 1 + scenes.length) % scenes.length;
    renderScene(state.currentIndex).then(() => {
        /* クロスフェード完了後にロック解除（フェード800ms＋余裕200ms） */
        setTimeout(() => { state.isTransitioning = false; }, 1000);
    });
}

function nextScene() {
    if (state.isTransitioning || state.isDetailOpen) return;
    state.isTransitioning = true;
    state.currentIndex = (state.currentIndex + 1) % scenes.length;
    renderScene(state.currentIndex).then(() => {
        setTimeout(() => { state.isTransitioning = false; }, 1000);
    });
}

function goToScene(index) {
    if (state.isTransitioning || state.isDetailOpen || index === state.currentIndex) return;
    state.isTransitioning = true;
    state.currentIndex = index;
    renderScene(state.currentIndex).then(() => {
        setTimeout(() => { state.isTransitioning = false; }, 1000);
    });
}

function createIndicator() {
    dom.sceneIndicator.innerHTML = '';
    scenes.forEach((scene, index) => {
        const dot = document.createElement('div');
        dot.className = 'indicator-dot';
        dot.title = scene.name;
        dot.addEventListener('click', () => goToScene(index));
        dom.sceneIndicator.appendChild(dot);
    });
}

function updateIndicator(activeIndex) {
    const dots = dom.sceneIndicator.querySelectorAll('.indicator-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
    });
}

/**
 * シーンカテリ切替の作成
 * sceneCategoriesに基づいて上部タブボタンを生成
 */
function createSwitcher() {
    dom.sceneSwitcher.innerHTML = '';
    Object.keys(sceneCategories).forEach((categoryName) => {
        const tab = document.createElement('button');
        tab.className = 'scene-tab';
        tab.textContent = categoryName;
        tab.addEventListener('click', () => {
            /* カテリタブクリック時、そのカテリの最初のシーン画像にジャンプ */
            const targetIndex = sceneCategories[categoryName];
            /* 既にそのカテリの最初の画像の場合は操作不要 */
            if (targetIndex === state.currentIndex) {
                return;
            }
            /* 独立したジャンプロジックを使用し、goToSceneの同インデックス制限を回避 */
            if (state.isTransitioning || state.isDetailOpen) return;
            state.isTransitioning = true;
            state.currentIndex = targetIndex;
            renderScene(state.currentIndex).then(() => {
                setTimeout(() => { state.isTransitioning = false; }, 1000);
            });
        });
        dom.sceneSwitcher.appendChild(tab);
    });
}

/**
 * カテリ切替のアクティブ状態を更新
 * @param {string} activeCategory - 現在のシーンカテリ名
 */
function updateSwitcher(activeCategory) {
    const tabs = dom.sceneSwitcher.querySelectorAll('.scene-tab');
    tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.textContent === activeCategory);
    });
}


/* ============================================
   7. ホットスポット描画とインタラクション
   ============================================ */

/**
 * パルスホットスポットの描画
 * 画像の実際の描画領域に基づいてホットスポットのピクセル位置を計算
 * @param {Object} position - ホットスポット位置 { x, y } パーセント座標（画像基準）
 */
function renderHotspot(position) {
    dom.hotspotContainer.innerHTML = '';

    /* ホットスポットのページ上のピクセル位置を計算 */
    const pixelPos = calcHotspotPixelPosition(position);

    const hotspot = document.createElement('div');
    hotspot.className = 'hotspot';
    hotspot.style.left = pixelPos.x + 'px';
    hotspot.style.top = pixelPos.y + 'px';

    const core = document.createElement('div');
    core.className = 'hotspot-core';

    const ring1 = document.createElement('div');
    ring1.className = 'hotspot-ring';

    const ring2 = document.createElement('div');
    ring2.className = 'hotspot-ring delay';

    hotspot.appendChild(ring1);
    hotspot.appendChild(ring2);
    hotspot.appendChild(core);

    hotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        onHotspotClick(hotspot);
    });

    dom.hotspotContainer.appendChild(hotspot);
}

/**
 * ホットスポットのページ上のピクセル位置を計算
 * 現在のシーン画像の実際の描画領域（object-fit: cover）に基づき
 * 画像のパーセント座標をページのピクセル座標に変換
 * 
 * coverモードでは画像がクロップされるため、クロップオフセット量を計算する必要がある
 * @param {Object} position - ホットスポット位置 { x, y } パーセント座標
 * @returns {Object} { x, y } ピクセル座標
 */
function calcHotspotPixelPosition(position) {
    const activeImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
    const containerW = window.innerWidth;
    const containerH = window.innerHeight;

    /* 画像のオリジナルサイズを取得 */
    const imgW = activeImg.naturalWidth || 1;
    const imgH = activeImg.naturalHeight || 1;

    /* object-fit: cover における画像の実際の描画領域を計算 */
    const imgAspect = imgW / imgH;
    const containerAspect = containerW / containerH;

    let renderedW, renderedH, cropOffsetX, cropOffsetY;

    if (imgAspect > containerAspect) {
        /* 画像がより横長：上下をフィット、左右をクロップ */
        renderedH = containerH;
        renderedW = containerH * imgAspect;
        cropOffsetX = (renderedW - containerW) / 2;
        cropOffsetY = 0;
    } else {
        /* 画像がより縦長：左右をフィット、上下をクロップ */
        renderedW = containerW;
        renderedH = containerW / imgAspect;
        cropOffsetX = 0;
        cropOffsetY = (renderedH - containerH) / 2;
    }

    /* パーセント座標をピクセル座標に変換し、クロップオフセットを減算 */
    return {
        x: (position.x / 100) * renderedW - cropOffsetX,
        y: (position.y / 100) * renderedH - cropOffsetY
    };
}

/**
 * 現在のホットスポットを再配置（ウィンドウサイズ変更時に呼び出し）
 */
function repositionHotspot() {
    const scene = scenes[state.currentIndex];
    if (!scene) return;

    const hotspot = dom.hotspotContainer.querySelector('.hotspot');
    if (!hotspot) return;

    const pixelPos = calcHotspotPixelPosition(scene.hotspot);
    hotspot.style.left = pixelPos.x + 'px';
    hotspot.style.top = pixelPos.y + 'px';
}

/**
 * ホットスポットクリックイベント処理
 * @param {HTMLElement} hotspotEl - クリックされたホットスポット要素
 */
function onHotspotClick(hotspotEl) {
    if (state.isDetailOpen) return;
    state.isDetailOpen = true;
    state.currentHotspot = hotspotEl;

    const scene = scenes[state.currentIndex];

    /* パネルタイトルを設定 */
    dom.detailTitle.textContent = scene.name;

    /* 全製品の説明を非同期読み込みしてパネルを描画 */
    renderProductList(scene.products);

    /* オープンアニメーションを実行 */
    openDetailAnimation();
}


/* ============================================
   8. 詳細パネルとアニメーション
   ============================================ */

/**
 * 製品リストをパネルに描画
 * 複数製品対応、各製品は左画像右テキストレイアウト
 * @param {Array} products - 製品配列
 */
async function renderProductList(products) {
    /* 旧内容をクリア */
    dom.productList.innerHTML = '';

    /* 各製品のDOM要素を作成 */
    for (const product of products) {
        const item = document.createElement('div');
        item.className = 'product-item';

        /* 左側画像カラム */
        const imageCol = document.createElement('div');
        imageCol.className = 'product-image-col';
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.name;
        imageCol.appendChild(img);

        /* 右側詳細カラム */
        const detailCol = document.createElement('div');
        detailCol.className = 'product-detail-col';

        /* 製品名 */
        const nameEl = document.createElement('div');
        nameEl.className = 'product-name';
        nameEl.textContent = product.name;

        /* 製品説明（Markdown描画） */
        const descEl = document.createElement('div');
        descEl.className = 'product-description';

        /* Markdown説明を読み込んで描画 */
        const markdown = await loadDescription(product.descriptionFile);
        descEl.innerHTML = parseMarkdown(markdown);

        detailCol.appendChild(nameEl);
        detailCol.appendChild(descEl);

        item.appendChild(imageCol);
        item.appendChild(detailCol);

        dom.productList.appendChild(item);
    }
}

/**
 * 詳細パネルを開くアニメーションシーケンス
 * パネルを中央に表示、接続線なし
 */
function openDetailAnimation() {
    /* ステップ1：背景を薄化 */
    dom.sceneContainer.classList.add('dimmed');
    dom.overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        dom.overlay.classList.add('visible');
    });

    /* ホットスポットとナビゲーションボタンを非表示 */
    dom.hotspotContainer.style.opacity = '0';
    dom.sceneSwitcher.style.opacity = '0';
    dom.sceneSwitcher.style.transition = 'opacity 0.3s ease';
    dom.btnPrev.style.opacity = '0';
    dom.btnPrev.style.transition = 'opacity 0.3s ease';
    dom.btnNext.style.opacity = '0';
    dom.btnNext.style.transition = 'opacity 0.3s ease';
    dom.sceneIndicator.style.opacity = '0';

    /* ステップ2：パネルを表示（中央からポップアップ） */
    setTimeout(() => {
        dom.detailPanel.classList.remove('hidden');
        requestAnimationFrame(() => {
            dom.detailPanel.classList.add('visible');
        });
    }, 200);
}

/**
 * 詳細パネルを閉じる
 */
function closeDetail() {
    if (!state.isDetailOpen) return;

    /* ステップ1：パネルを非表示 */
    dom.detailPanel.classList.remove('visible');

    /* ステップ2：背景を復元 */
    setTimeout(() => {
        dom.sceneContainer.classList.remove('dimmed');
        dom.overlay.classList.remove('visible');
    }, 200);

    /* ステップ3：ホットスポットとナビゲーションを復元 */
    setTimeout(() => {
        dom.hotspotContainer.style.opacity = '1';
        dom.sceneSwitcher.style.opacity = '1';
        dom.sceneSwitcher.style.transition = 'opacity 0.3s ease';
        dom.btnPrev.style.opacity = '1';
        dom.btnPrev.style.transition = 'opacity 0.3s ease';
        dom.btnNext.style.opacity = '1';
        dom.btnNext.style.transition = 'opacity 0.3s ease';
        dom.sceneIndicator.style.opacity = '1';
        dom.sceneIndicator.style.transition = 'opacity 0.3s ease';
    }, 300);

    /* ステップ4：状態をクリア */
    setTimeout(() => {
        dom.detailPanel.classList.add('hidden');
        dom.overlay.classList.add('hidden');
        state.isDetailOpen = false;
        state.currentHotspot = null;
    }, 500);
}


/* ============================================
   9. イベントバインドと初期化
   ============================================ */

function bindEvents() {
    /* 左右切替ボタン */
    dom.btnPrev.addEventListener('click', prevScene);
    dom.btnNext.addEventListener('click', nextScene);

    /* 戻るボタン */
    dom.btnBack.addEventListener('click', closeDetail);

    /* オーバーレイクリックでパネルを閉じる */
    dom.overlay.addEventListener('click', closeDetail);

    /* キーボードイベント */
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                prevScene();
                break;
            case 'ArrowRight':
                nextScene();
                break;
            case 'Escape':
                if (state.isDetailOpen) {
                    closeDetail();
                }
                break;
        }
    });

    /* ウィンドウサイズ変更時にホットスポットを再配置 */
    window.addEventListener('resize', () => {
        repositionHotspot();
    });
}

/**
 * ヒントテキストの追加
 */
function addHintText() {
    const hint = document.createElement('div');
    hint.className = 'hint-text';
    hint.textContent = '点滅ポイントをクリックして製品詳細を確認 · 左右に切り替えてシーンを閲覧';
    dom.app.appendChild(hint);

    setTimeout(() => {
        hint.style.transition = 'opacity 1s ease';
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 1000);
    }, 5000);
}

/**
 * アプリケーション初期化
 * 
 * 起動フロー：
 * 1. シーンカテリマッピング初期化
 * 2. UI要素（切替、インジケータ）作成
 * 3. ★全画像プリロード（シーン画像＋製品画像）
 * 4. 最初のシーンをフェードイン表示
 * 5. イベントバインド
 */
async function init() {
    /* シーンカテリマッピングを初期化 */
    initSceneCategories();

    /* シーンカテリ切替を作成 */
    createSwitcher();

    /* 下部インジケータを作成 */
    createIndicator();

    /* ★全画像をプリロード（ネットワーク遅延によるシーン切替の空白を防止） */
    await preloadAllImages();

    /* 最初のシーンを描画（フェードインアニメーション付き） */
    const scene = scenes[0];
    const img = dom.sceneImageA;
    img.src = scene.image;
    img.alt = scene.name;

    updateIndicator(0);
    updateSwitcher(scene.name);

    /* 画像読み込み完了後にフェードインアニメーションをトリガー */
    const fadeIn = async () => {
        /* 画像読み込み完了を確実に待機 */
        await waitForImageLoad(img);

        /* レイヤAをactiveに切替、CSS transitionでフェードインを発火 */
        img.classList.add('active');
        img.classList.remove('inactive');

        /* フェードイン完了後にホットスポットとカテリ切替を描画 */
        setTimeout(() => {
            renderHotspot(scene.hotspot);
            dom.sceneSwitcher.classList.add('visible');
        }, 800);
    };

    requestAnimationFrame(fadeIn);

    /* イベントをバインド */
    bindEvents();

    /* ヒントテキストを追加 */
    addHintText();

    console.log('デジタルサイネージ製品紹介ページ v2 初期化完了');
}

document.addEventListener('DOMContentLoaded', init);
