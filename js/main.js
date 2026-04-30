/**
 * ========================================
 * デジタルサイネージ製品紹介ページ - メインロジックファイル v3
 * ========================================
 * 
 * モジュール構成：
 * 1. シーンデータ設定（10シーン＋複数製品対応）
 * 2. DOM要素参照
 * 3. 状態管理
 * 4. 画像プリロード（全シーン画像＋製品画像を事前読み込み、リトライ機能付き）
 * 5. Markdown説明キャッシュと読み込み
 * 6. シーン描画と切替（クロスフェード、画像ロード完了待機付き）
 * 7. ホットスポット描画とインタラクション（画像ロード状態チェック付き）
 * 8. 詳細パネルとアニメーション（複数製品＋左画像右テキスト）
 * 9. イベントバインドと初期化（非ブロッキングプリロード）
 * 
 * v3 変更点：
 * - waitForImageLoad: 超時保護(8秒) + addEventListener(once:true) + メモリリーク防止
 * - renderScene: src設定前にremoveAttribute('src')でcomplete リセット
 * - renderScene: activeLayerマークをCSS切替の前に更新
 * - renderScene: ホットスポットをrequestAnimationFrameで即時描画（setTimeout 800ms廃止）
 * - calcHotspotPixelPosition: 画像ロード完了チェック追加
 * - repositionHotspot: 画像ロード完了チェック + resize デバウンス(200ms)
 * - preloadAllImages: リトライ機能追加（デフォルト2回、遅延递增）
 * - init: 非ブロッキングプリロード（首画面即時表示、残りバックグラウンド）
 * - Loading インジケータ追加（ネットワーク遅延時のフィードバック）
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
        image: '场景图/便利店场景/便利店场景1.webp',
        hotspot: { x: 30, y: 25 },
        products: [
            {
                name: '商用壁掛け液晶ディスプレイ',
                image: '产品图/商用壁挂液晶显示器.webp',
                descriptionFile: '产品描述/商用壁挂液晶显示器.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景1.webp',
        hotspot: { x: 29, y: 65 },
        products: [
            {
                name: '電子サイネージスタンド',
                image: '产品图/电子水牌.webp',
                descriptionFile: '产品描述/电子水牌.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景2.webp',
        hotspot: { x: 56, y: 40 },
        products: [
            {
                name: '商用壁掛け液晶ディスプレイ',
                image: '产品图/商用壁挂液晶显示器.webp',
                descriptionFile: '产品描述/商用壁挂液晶显示器.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景3.webp',
        hotspot: { x: 40, y: 29 },
        products: [
            {
                name: '商用バーライト液晶ディスプレイ',
                image: '产品图/商用条形液晶显示器.webp',
                descriptionFile: '产品描述/商用条形液晶显示器.md'
            }
        ]
    },
    {
        name: 'スーパーマーケット',
        image: '场景图/超市场景/超市场景4.webp',
        hotspot: { x: 63, y: 35 },
        products: [
            {
                name: '屋内両面吊り下げサイネージ',
                image: '产品图/室内双面吊装标牌.webp',
                descriptionFile: '产品描述/室内双面吊装标牌.md'
            }
        ]
    },
    {
        name: 'イベント会場',
        image: '场景图/集会场景/集会场景1.webp',
        hotspot: { x: 72, y: 58 },
        products: [
            {
                name: '屋外可搬型デジタルサイネージ',
                image: '产品图/室外可移动广告机.webp',
                descriptionFile: '产品描述/室外可移动广告机.md'
            }
        ]
    },
    {
        name: 'ホテル',
        image: '场景图/酒店场景/酒店场景1.webp',
        hotspot: { x: 70, y: 42 },
        products: [
            {
                name: '屋内自立型デジタルサイネージ',
                image: '产品图/室内立式广告机.webp',
                descriptionFile: '产品描述/室内立式广告机.md'
            }
        ]
    },
    {
        name: 'ファストフード店',
        image: '场景图/快餐店场景/快餐店场景1.webp',
        hotspot: { x: 55, y: 32 },
        products: [
            {
                name: '商用壁掛け液晶ディスプレイ',
                image: '产品图/商用壁挂液晶显示器.webp',
                descriptionFile: '产品描述/商用壁挂液晶显示器.md'
            }
        ]
    },
    {
        name: 'ファストフード店',
        image: '场景图/快餐店场景/快餐店场景2.webp',
        hotspot: { x: 59, y: 48 },
        products: [
            {
                name: 'セルフオーダー端末 - タイプ1',
                image: '产品图/自助点单机1.webp',
                descriptionFile: '产品描述/自助点单机1.md'
            },
            {
                name: 'セルフオーダー端末 - タイプ2',
                image: '产品图/自助点单机2.webp',
                descriptionFile: '产品描述/自助点单机2.md'
            },
            {
                name: 'セルフオーダー端末 - タイプ3',
                image: '产品图/自助点单机3.webp',
                descriptionFile: '产品描述/自助点单机3.md'
            }
        ]
    },
    {
        name: 'その他',
        image: '场景图/其他场景/其他场景1.webp',
        hotspot: { x: 32, y: 45 },
        products: [
            {
                name: '屋外自立型デジタルサイネージ',
                image: '产品图/室外立式广告机.webp',
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
    overlay: document.getElementById('overlay'),
    /* ★画像ロード中インジケータ */
    loadingIndicator: document.getElementById('loading-indicator')
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
 * ★改良（v3）：
 * - ロード失敗時にリトライ機能を追加（デフォルト2回、遅延递增）
 * - ネットワーク不安定な環境でも画像ロード成功率を向上
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
     * 1枚の画像をプリロード（リトライ機能付き）
     * 
     * @param {string} src - 画像パス
     * @param {number} retries - リトライ回数（デフォルト2回）
     * @returns {Promise<void>}
     */
    const preloadOne = (src, retries = 2) => {
        return new Promise((resolve) => {
            /* 既にプリロード済みの場合はスキップ */
            if (state.preloadedImages[src]) {
                loaded++;
                resolve();
                return;
            }

            /**
             * 指定回数リトライしながら画像ロードを試行
             * @param {number} attempt - 現在の試行回数（0から開始）
             */
            const tryLoad = (attempt) => {
                const img = new Image();
                img.onload = () => {
                    state.preloadedImages[src] = img;
                    loaded++;
                    resolve();
                };
                img.onerror = () => {
                    if (attempt < retries) {
                        /* ★リトライ：遅延を递增させながら再試行
                         * 1回目のリトライ: 500ms後、2回目: 1000ms後 */
                        setTimeout(() => tryLoad(attempt + 1), 500 * (attempt + 1));
                    } else {
                        /* リトライ回数上限に達した場合は警告のみ出力して続行 */
                        console.warn(`画像のプリロードに失敗（${retries + 1}回試行）: ${src}`);
                        resolve();
                    }
                };
                img.src = src;
            };
            tryLoad(0);
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
 * 画像の読み込み完了を待機するヘルパー関数（改良版 v3.1）
 * 
 * 改良ポイント：
 * - addEventListener + { once: true } を使用し、メモリリークを防止
 * - 超時保護を追加（デフォルト8秒）、ネットワーク異常時に永遠に待機しない
 * - onload/onerror 代入ではなく addEventListener を使用し、他のリスナーを上書きしない
 * - ★戻り値としてロード成功かどうかを返す（true=成功、false=失敗/超時）
 * 
 * 注意：この関数を呼び出す前に、imgElのsrcを一度クリア（removeAttribute('src')）してから
 * 新しいsrcを設定することで、complete プロパティが正しく false になり、
 * 新しい画像のロード完了を確実に待機できる
 * 
 * @param {HTMLImageElement} imgEl - 対象の<img>要素
 * @param {number} timeoutMs - 超時時間（ミリ秒）、デフォルト8秒
 * @returns {Promise<boolean>} true=ロード成功、false=失敗または超時
 */
function waitForImageLoad(imgEl, timeoutMs = 8000) {
    return new Promise((resolve) => {
        /* 既にロード完了している場合は即座に成功を返す */
        if (imgEl.complete && imgEl.naturalWidth > 0) {
            resolve(true);
            return;
        }

        let resolved = false;
        let timeoutId = null;

        /* ロード完了時の処理：成功 */
        const onLoad = () => {
            if (resolved) return;
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve(true);
        };

        /* ロードエラー時の処理：失敗 */
        const onError = () => {
            if (resolved) return;
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve(false);
        };

        /* 超時時の処理：失敗 */
        const onTimeout = () => {
            if (resolved) return;
            resolved = true;
            resolve(false);
        };

        /* ロード完了/エラーイベントを監听（once: true で自動的にリスナーを削除） */
        imgEl.addEventListener('load', onLoad, { once: true });
        imgEl.addEventListener('error', onError, { once: true });

        /* 超時保護：指定時間内にロードが完了しなくても処理を続行 */
        timeoutId = setTimeout(onTimeout, timeoutMs);
    });
}

/**
 * 画像がブラウザキャッシュに存在するか確認
 * プリロード済みの場合は即座にロード可能なので、ローディング表示が不要
 * 
 * @param {string} src - 画像パス
 * @returns {boolean} true=キャッシュ済み（ローディング不要）、false=未キャッシュ
 */
function isImageCached(src) {
    return !!state.preloadedImages[src];
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
 * 改良ポイント（v3.1）：
 * - 画像src設定前にremoveAttribute('src')でクリアし、completeプロパティをリセット
 * - activeLayerマークをCSS切替の前に更新し、repositionHotspotが正しいレイヤを参照
 * - ★画像がプリロード済み（キャッシュあり）の場合はローディング表示しない
 * - ★画像ロード失敗/超時の場合はホットスポットを描画しない（黒画面に孤立ホットスポット防止）
 * - ★waitForImageLoadの戻り値でロード成功/失敗を判定
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

        /* ★画像がキャッシュ済みかチェック
         * プリロード済みの画像は即座に表示されるため、ローディング表示は不要 */
        const needLoading = !isImageCached(scene.image);
        if (needLoading) {
            dom.loadingIndicator.classList.add('visible');
        }

        /* ★重要：srcをクリアしてから新しい画像を設定
         * クリアしないと、古い画像のcomplete=trueが残り、
         * waitForImageLoadが新しい画像のロードを待機できず、
         * 前の画像が表示されるバグが発生する */
        nextImg.removeAttribute('src');
        nextImg.src = scene.image;
        nextImg.alt = scene.name;

        /* 画像読み込み完了を待ってからクロスフェード開始（超時保護付き）
         * ★戻り値でロード成功/失敗を判定
         * ★シーン切替時は15秒超時（首画面より短く、ユーザーが待てる範囲） */
        const loadSuccess = await waitForImageLoad(nextImg, 15000);

        /* ★ローディングインジケータを非表示（表示していた場合のみ） */
        if (needLoading) {
            dom.loadingIndicator.classList.remove('visible');
        }

        /* ★超時の場合でも、画像が実際にロード完了しているか再確認
         * 超時直前に画像がロード完了した場合の安全網 */
        const actuallyLoaded = nextImg.complete && nextImg.naturalWidth > 0;

        /* ★重要：activeLayerマークを先に切替
         * これにより、クロスフェード中にrepositionHotspotが呼ばれても
         * 正しいレイヤ（nextImg）を参照してホットスポット位置を計算できる */
        state.activeLayer = state.activeLayer === 'a' ? 'b' : 'a';

        /* クロスフェード：新レイヤをフェードイン、旧レイヤをフェードアウト */
        nextImg.classList.add('active');
        nextImg.classList.remove('inactive');
        currentImg.classList.remove('active');
        currentImg.classList.add('inactive');

        /* インジケータとカテリ切替を更新 */
        updateIndicator(index);
        updateSwitcher(scene.name);

        /* ★画像ロード成功時のみホットスポットを描画
         * ロード失敗/超時の場合、ホットスポット位置が不正確になるため描画しない
         * これにより「黒画面に孤立したホットスポット」の問題を防止
         * ★actuallyLoaded チェック：超時直前にロード完了した場合も表示する */
        if (loadSuccess || actuallyLoaded) {
            requestAnimationFrame(() => {
                renderHotspot(scene.hotspot);
                dom.hotspotContainer.style.opacity = '1';
                dom.sceneSwitcher.style.opacity = '1';
            });
        } else {
            /* ロード失敗時でもカテリ切替は表示（操作不能を防ぐため） */
            dom.sceneSwitcher.style.opacity = '1';
            console.warn(`シーン画像のロードに失敗: ${scene.image}`);
        }
    } else {
        /* アニメーションなしで直接描画：現在のアクティブレイヤに設定 */
        const currentImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;

        /* ★キャッシュチェック */
        const needLoading = !isImageCached(scene.image);
        if (needLoading) {
            dom.loadingIndicator.classList.add('visible');
        }

        /* ★srcをクリアしてから新しい画像を設定（アニメーションなしの場合も同様） */
        currentImg.removeAttribute('src');
        currentImg.src = scene.image;
        currentImg.alt = scene.name;

        /* 画像読み込み完了を待ってから表示
         * ★シーン切替時は15秒超時 */
        const loadSuccess = await waitForImageLoad(currentImg, 15000);

        if (needLoading) {
            dom.loadingIndicator.classList.remove('visible');
        }

        /* ★超時の場合でも、画像が実際にロード完了しているか再確認 */
        const actuallyLoaded = currentImg.complete && currentImg.naturalWidth > 0;

        currentImg.classList.add('active');
        currentImg.classList.remove('inactive');

        updateIndicator(index);
        updateSwitcher(scene.name);
        dom.sceneSwitcher.classList.add('visible');

        /* ★画像ロード成功時のみホットスポットを描画 */
        if (loadSuccess || actuallyLoaded) {
            requestAnimationFrame(() => {
                renderHotspot(scene.hotspot);
            });
        }
    }
}

function prevScene() {
    if (state.isTransitioning || state.isDetailOpen) return;
    state.isTransitioning = true;
    state.currentIndex = (state.currentIndex - 1 + scenes.length) % scenes.length;
    renderScene(state.currentIndex).then(() => {
        /* ★CSS遷移完了後にロック解除（transition 1.2s + 余裕100ms）
         * 画像ロード完了後にクロスフェードが開始されるため、
         * ロック解除は画像ロード完了 + CSS遷移完了の両方を待つ必要がある */
        setTimeout(() => { state.isTransitioning = false; }, 1300);
    });
}

function nextScene() {
    if (state.isTransitioning || state.isDetailOpen) return;
    state.isTransitioning = true;
    state.currentIndex = (state.currentIndex + 1) % scenes.length;
    renderScene(state.currentIndex).then(() => {
        setTimeout(() => { state.isTransitioning = false; }, 1300);
    });
}

function goToScene(index) {
    if (state.isTransitioning || state.isDetailOpen || index === state.currentIndex) return;
    state.isTransitioning = true;
    state.currentIndex = index;
    renderScene(state.currentIndex).then(() => {
        setTimeout(() => { state.isTransitioning = false; }, 1300);
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
                setTimeout(() => { state.isTransitioning = false; }, 1300);
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
 * 
 * ★改良：画像が未ロードの場合は計算をスキップし、画面中央を返す
 * naturalWidth/naturalHeightが0または旧画像の値の場合、計算結果が完全に誤るため
 * 
 * @param {Object} position - ホットスポット位置 { x, y } パーセント座標
 * @returns {Object} { x, y } ピクセル座標
 */
function calcHotspotPixelPosition(position) {
    const activeImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
    const containerW = window.innerWidth;
    const containerH = window.innerHeight;

    /* ★重要：画像が完全にロードされているか確認
     * 未ロードの場合、naturalWidth/naturalHeightが0または旧画像の値になり、
     * ホットスポット位置が大きくずれる原因となる */
    if (!activeImg.complete || activeImg.naturalWidth === 0) {
        console.warn('画像未読み込み、ホットスポット計算スキップ');
        /* 画像がロードされるまで画面中央を仮の位置として返す */
        return { x: containerW / 2, y: containerH / 2 };
    }

    /* 画像のオリジナルサイズを取得（ロード完了確認済みなので安全） */
    const imgW = activeImg.naturalWidth;
    const imgH = activeImg.naturalHeight;

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
 * 
 * ★改良（v3）：
 * - 画像がロード完了しているか確認し、未ロード時は再配置をスキップ
 * - 未ロードの画像で計算するとホットスポット位置が大きくずれるため
 */
function repositionHotspot() {
    const scene = scenes[state.currentIndex];
    if (!scene) return;

    const hotspot = dom.hotspotContainer.querySelector('.hotspot');
    if (!hotspot) return;

    /* ★画像がロード完了しているか確認（未ロード時は計算が不正確になるためスキップ） */
    const activeImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
    if (!activeImg.complete || activeImg.naturalWidth === 0) return;

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
 * 
 * ★改良（v3.1）：
 * - まず全製品のDOM骨組みを即座に表示（ローディングプレースホルダ付き）
 * - Markdown説明を並列読み込み（直列→並列で高速化）
 * - 読み込み完了後にプレースホルダを実際の内容で置き換え
 * 
 * @param {Array} products - 製品配列
 */
async function renderProductList(products) {
    /* 旧内容をクリア */
    dom.productList.innerHTML = '';

    /* ★第一步：全製品のDOM骨組みを即座に作成（ローディングプレースホルダ付き）
     * これにより、パネルがすぐに表示され、ユーザーは待機中であることを認識できる */
    const descElements = [];
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

        /* ★製品説明エリア：ローディングプレースホルダを表示 */
        const descEl = document.createElement('div');
        descEl.className = 'product-description';
        descEl.innerHTML = '<div class="desc-loading">読み込み中...</div>';
        descElements.push({ el: descEl, file: product.descriptionFile });

        detailCol.appendChild(nameEl);
        detailCol.appendChild(descEl);

        item.appendChild(imageCol);
        item.appendChild(detailCol);

        dom.productList.appendChild(item);
    }

    /* ★第二步：全製品のMarkdown説明を並列読み込み（直列→並列で大幅に高速化）
     * 例：3製品×各1秒 → 旧版3秒 → 新版1秒 */
    const loadPromises = descElements.map(async ({ el, file }) => {
        const markdown = await loadDescription(file);
        el.innerHTML = parseMarkdown(markdown);
    });
    await Promise.all(loadPromises);
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

    /* ウィンドウサイズ変更時にホットスポットを再配置（★デバウンス付き） */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        /* ★デバウンス：200ms以内の連続resizeイベントをまとめて1回だけ処理
         * 頻繁なresizeで毎回計算するとパフォーマンスが低下するため */
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            repositionHotspot();
        }, 200);
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
 * 起動フロー（v3.2改良版）：
 * 1. シーンカテリマッピング初期化
 * 2. UI要素（切替、インジケータ）作成
 * 3. ★最初のシーンをロード（全帯域を占有）
 * 4. ★最初のシーンが表示された後に残りの画像をプリロード
 * 5. イベントバインド
 * 
 * v3.2改良理由：
 * - 旧版では preloadAllImages() が最初の画像と同時に開始され、
 *   慢速4G環境で帯域を奪い合い、最初の画像が8秒超時で永遠に表示されなかった
 * - 新版では最初の画像が完全に表示されてからプリロードを開始し、
 *   最初の画像が全帯域を独占できるようにする
 */
async function init() {
    /* シーンカテリマッピングを初期化 */
    initSceneCategories();

    /* シーンカテリ切替を作成 */
    createSwitcher();

    /* 下部インジケータを作成 */
    createIndicator();

    /* ★最初のシーンを即座にロードして表示（全プリロードを待たない） */
    const scene = scenes[0];
    const img = dom.sceneImageA;

    /* ★最初の画像は必ずローディング表示（まだ何もキャッシュされていないため） */
    dom.loadingIndicator.classList.add('visible');

    /* srcをクリアしてから設定（complete プロパティのリセット） */
    img.removeAttribute('src');
    img.src = scene.image;
    img.alt = scene.name;

    updateIndicator(0);
    updateSwitcher(scene.name);

    /* 画像読み込み完了後にフェードインアニメーションをトリガー */
    const fadeIn = async () => {
        /* ★最初の画像は30秒超時（慢速ネットワーク対応）
         * 8秒では慢速4G環境で帯域争奪により間に合わない */
        const loadSuccess = await waitForImageLoad(img, 30000);

        /* ★ローディングインジケータを非表示 */
        dom.loadingIndicator.classList.remove('visible');

        /* ★超時の場合でも、画像が実際にロード完了しているか再確認
         * 超時直前に画像がロード完了した場合、loadSuccess=false でも
         * 画像データはDOMに存在するため、表示を試みる */
        const actuallyLoaded = img.complete && img.naturalWidth > 0;

        if (loadSuccess || actuallyLoaded) {
            /* レイヤAをactiveに切替、CSS transitionでフェードインを発火 */
            img.classList.add('active');
            img.classList.remove('inactive');

            /* ホットスポットを即時描画 */
            requestAnimationFrame(() => {
                renderHotspot(scene.hotspot);
                dom.sceneSwitcher.classList.add('visible');
            });
        } else {
            console.warn('最初のシーン画像のロードに失敗');
        }

        /* ★★★重要：最初の画像が表示されてからプリロードを開始
         * これにより、最初の画像が全帯域を独占でき、慢速ネットワークでも確実に表示される
         * プリロードが同時に開始されると、20枚の画像が帯域を奪い合い、
         * 最初の画像のロードが超時して永遠に表示されなくなる */
        preloadAllImages().then(count => {
            console.log(`バックグラウンドプリロード完了: ${count}枚`);
        });
    };

    requestAnimationFrame(fadeIn);

    /* イベントをバインド */
    bindEvents();

    /* ヒントテキストを追加 */
    addHintText();

    console.log('デジタルサイネージ製品紹介ページ v3.2 初期化完了');
}

document.addEventListener('DOMContentLoaded', init);
