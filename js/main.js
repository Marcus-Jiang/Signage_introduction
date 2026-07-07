/**
 * ========================================
 * 数字标牌产品介绍页 - 主逻辑文件 v4
 * ========================================
 *
 * 模块构成：
 * 1. 数据加载（从 mapping.json 动态加载，含重试机制）
 * 2. 多语言引擎（中文/日文切换）
 * 3. DOM 元素引用
 * 4. 状态管理
 * 5. 图片预加载（全场景图片+产品图片预加载，含重试机制）
 * 6. Markdown 说明缓存与加载
 * 7. 场景渲染与切换（交叉淡入淡出，图片加载等待）
 * 8. 多热点渲染与交互（单场景多热点支持）
 * 9. 详细面板与动画（多产品 + 左图右文）
 * 10. 底部导航指示器（3种方案可切换）
 * 11. 语言切换器
 * 12. 事件绑定与初始化
 *
 * v4 变更点：
 * - 删除硬编码 scenes 数组，从 mapping.json 动态加载数据
 * - 新增多语言系统（中文/日文），支持 t() / getText() / switchLanguage()
 * - 新增多热点支持（单场景可有多个热点，各自关联不同产品）
 * - sceneCategories 从 mapping.json 动态计算
 * - mapping.json 加载失败时重试 3 次（递增延迟 500ms/1000ms/2000ms）
 * - Markdown 加载失败时显示可点击重试文本
 * - 首屏独占带宽策略、双层交叉淡入淡出、防抖与状态锁等核心机制保持不变
 * - 底部导航指示器支持3种方案：groupNumber / slidingDots / progressBar
 */

/* 底部导航样式配置：'groupNumber' | 'slidingDots' | 'progressBar'
 * groupNumber  - 分组缩略+数字：◀ 分类名 序号/总数 ▶
 * slidingDots  - 滑动窗口圆点：只显示附近7个圆点，渐隐效果
 * progressBar  - 进度条+分类标签：细进度条 + 可点击分类名
 */
const NAV_STYLE = 'progressBar';

/* ============================================
   1. 数据加载
   ============================================ */

/**
 * 全局映射数据（从 mapping.json 加载）
 * 加载前为 null，加载成功后包含 scenes、i18n 等字段
 */
let mappingData = null;

/**
 * 从 mapping.json 加载数据，含重试机制
 *
 * 重试策略：
 * - 最多重试 3 次
 * - 递增延迟：500ms → 1000ms → 2000ms
 * - 最终失败时抛出错误，由调用方处理
 *
 * @returns {Promise<Object>} mapping.json 解析后的对象
 */
async function loadMapping() {
    const maxRetries = 3;
    const delays = [500, 1000, 2000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('mapping.json?t=' + Date.now());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            console.log(`mapping.json 加载成功${attempt > 0 ? `（第 ${attempt + 1} 次尝试）` : ''}`);
            return data;
        } catch (error) {
            if (attempt < maxRetries) {
                const delay = delays[attempt];
                console.warn(`mapping.json 加载失败（第 ${attempt + 1} 次），${delay}ms 后重试: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`mapping.json 加载失败（已重试 ${maxRetries} 次）: ${error.message}`);
                throw error;
            }
        }
    }
}


/* ============================================
   2. 多语言引擎
   ============================================ */

/**
 * 获取 UI 翻译文本
 * 从 mappingData.i18n[currentLang] 中获取指定 key 的翻译
 *
 * @param {string} key - i18n 键名（如 'pageTitle'、'back' 等）
 * @returns {string} 当前语言的翻译文本，未找到时返回 key 本身
 */
function t(key) {
    if (!mappingData || !mappingData.i18n) return key;
    const langObj = mappingData.i18n[state.currentLang];
    if (!langObj) return key;
    return langObj[key] !== undefined ? langObj[key] : key;
}

/**
 * 从多语言对象中获取当前语言的值
 * 多语言对象格式：{ ja: "...", zh: "..." }
 * 如果传入的是普通字符串，则直接返回
 *
 * @param {Object|string} obj - 多语言对象或普通字符串
 * @returns {string} 当前语言的值
 */
function getText(obj) {
    if (typeof obj === 'string') return obj;
    if (!obj) return '';
    return obj[state.currentLang] || obj['ja'] || Object.values(obj)[0] || '';
}

/**
 * 切换语言
 *
 * 执行以下操作：
 * 1. 更新 state.currentLang
 * 2. 重新渲染所有 UI 文本（页面标题、提示文字、按钮文字、切换器标签等）
 * 3. 如果弹窗已打开，重新渲染弹窗内容
 * 4. 更新语言切换器按钮的活跃状态
 *
 * @param {string} lang - 语言代码（'ja' 或 'zh'）
 */
function switchLanguage(lang) {
    if (lang === state.currentLang) return;
    if (!mappingData || !mappingData.i18n || !mappingData.i18n[lang]) return;

    state.currentLang = lang;

    /* 更新页面标题 */
    document.title = t('pageTitle') + ' - ' + t('companyName');
    document.documentElement.lang = lang;

    /* 更新返回按钮文字 */
    const backSpan = dom.btnBack.querySelector('span');
    if (backSpan) {
        backSpan.textContent = t('back');
    }

    /* 更新场景分类（需要重建以更新分类名称） */
    initSceneCategories();
    // createSwitcher();  /* 暂时隐藏顶部导航栏，与底部progressBar功能重复 */
    // updateSwitcher(getText(mappingData.scenes[state.currentIndex].category));  /* 暂时隐藏顶部导航栏 */

    /* 重建底部导航指示器（分类名等文字需更新） */
    createIndicator();
    updateIndicator(state.currentIndex);

    /* 更新导航按钮 aria-label */
    dom.btnPrev.setAttribute('aria-label', t('prevScene'));
    dom.btnNext.setAttribute('aria-label', t('nextScene'));

    /* 如果弹窗已打开，重新渲染弹窗内容 */
    if (state.isDetailOpen) {
        const scene = mappingData.scenes[state.currentIndex];
        if (scene) {
            /* 更新弹窗标题 */
            dom.detailTitle.textContent = getText(scene.category);

            /* 重新渲染产品列表 */
            if (state.currentProducts) {
                renderProductList(state.currentProducts);
            }
        }
    }

    /* 更新语言切换器按钮的活跃状态 */
    updateLangSwitcherState();

    console.log(`语言已切换为: ${lang}`);
}


/* ============================================
   3. DOM 元素引用
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
    /* 图片加载中指示器 */
    loadingIndicator: document.getElementById('loading-indicator')
};


/* ============================================
   4. 状态管理
   ============================================ */

const state = {
    currentIndex: 0,
    isTransitioning: false,
    isDetailOpen: false,
    currentHotspot: null,
    activeLayer: 'a',           /* 当前显示中的图层：'a' 或 'b'，交叉淡入淡出用 */
    preloadedImages: {},         /* 预加载图片缓存：键=图片路径，值=Image 对象 */
    currentLang: 'ja',           /* 当前语言（默认日文） */
    currentProducts: null         /* 当前弹窗显示的产品数组（用于语言切换时重新渲染） */
};

/**
 * 场景分类映射
 * 从 mappingData.scenes 动态计算，键为分类名，值为该分类第一个场景的索引
 * 例：{ "便利店": 0, "超市": 1, ... }
 */
const sceneCategories = {};

/**
 * 初始化场景分类映射
 * 遍历 scenes，按 getText(category) 分组，记录每个分类的第一个场景索引
 */
function initSceneCategories() {
    /* 清空已有数据 */
    Object.keys(sceneCategories).forEach(key => delete sceneCategories[key]);

    if (!mappingData || !mappingData.scenes) return;

    mappingData.scenes.forEach((scene, index) => {
        const categoryName = getText(scene.category);
        if (!(categoryName in sceneCategories)) {
            sceneCategories[categoryName] = index;
        }
    });
}

/**
 * Markdown 说明文件缓存
 * 防止同一文件的重复请求
 */
const descriptionCache = {};


/* ============================================
   5. 图片预加载
   ============================================ */

/**
 * 全场景图片和产品图片预加载
 * 将图片预先下载到浏览器缓存，防止场景切换时延迟
 *
 * 机制：
 * - 创建隐藏的 Image 对象，设置 src 为图片路径
 * - 浏览器自动下载并存入 HTTP 缓存
 * - 后续 <img> 元素使用同一路径时从缓存即时显示
 *
 * 改良（v3）：
 * - 加载失败时重试（默认 2 次，延迟递增）
 * - 网络不稳定环境下提高图片加载成功率
 *
 * @returns {Promise<number>} 加载成功的图片数量
 */
function preloadAllImages() {
    /* 去重后收集所有图片路径 */
    const imagePaths = new Set();

    /* 收集场景图片 */
    mappingData.scenes.forEach(scene => {
        imagePaths.add(scene.image);
    });

    /* 收集产品图片 */
    mappingData.scenes.forEach(scene => {
        scene.hotspots.forEach(hotspot => {
            hotspot.products.forEach(product => {
                imagePaths.add(product.image);
            });
        });
    });

    const total = imagePaths.size;
    let loaded = 0;

    /**
     * 预加载单张图片（含重试机制）
     *
     * @param {string} src - 图片路径
     * @param {number} retries - 重试次数（默认 2 次）
     * @returns {Promise<void>}
     */
    const preloadOne = (src, retries = 2) => {
        return new Promise((resolve) => {
            /* 已预加载的图片跳过 */
            if (state.preloadedImages[src]) {
                loaded++;
                resolve();
                return;
            }

            /**
             * 指定次数重试图片加载
             * @param {number} attempt - 当前尝试次数（从 0 开始）
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
                        /* 重试：递增延迟
                         * 第 1 次重试: 500ms 后，第 2 次: 1000ms 后 */
                        setTimeout(() => tryLoad(attempt + 1), 500 * (attempt + 1));
                    } else {
                        /* 重试次数用尽，仅输出警告并继续 */
                        console.warn(`图片预加载失败（${retries + 1} 次尝试）: ${src}`);
                        resolve();
                    }
                };
                img.src = src;
            };
            tryLoad(0);
        });
    };

    /* 分批并发加载：每批最多 4 张图片同时加载
     * 避免一次性发出 40+ 请求导致服务端排队
     * 浏览器对同一域名最多 6 个并发连接，
     * 4 个并发既充分利用连接池，又不会压垂单线程服务器 */
    const PRELOAD_BATCH_SIZE = 4;
    const allPaths = Array.from(imagePaths);

    async function preloadInBatches() {
        for (let i = 0; i < allPaths.length; i += PRELOAD_BATCH_SIZE) {
            const batch = allPaths.slice(i, i + PRELOAD_BATCH_SIZE);
            await Promise.all(batch.map(preloadOne));
            console.log(`图片预加载进度: ${loaded}/${total} 张`);
        }
        console.log(`图片预加载完成: ${loaded}/${total} 张`);
        return loaded;
    }

    return preloadInBatches();
}

/**
 * 检查指定图片是否已预加载
 * @param {string} src - 图片路径
 * @returns {boolean}
 */
function isImagePreloaded(src) {
    return !!state.preloadedImages[src];
}

/**
 * 图片加载完成等待辅助函数（改良版 v3.1）
 *
 * 改良点：
 * - 使用 addEventListener + { once: true } 防止内存泄漏
 * - 超时保护（默认 8 秒），网络异常时不会永远等待
 * - 使用 addEventListener 而非 onload/onerror 赋值，不覆盖其他监听器
 * - 返回加载成功与否（true=成功，false=失败/超时）
 *
 * 注意：调用前需先 removeAttribute('src') 清除旧 src，
 * 以确保 complete 属性正确重置为 false，可靠等待新图片加载
 *
 * @param {HTMLImageElement} imgEl - 目标 <img> 元素
 * @param {number} timeoutMs - 超时时间（毫秒），默认 8 秒
 * @returns {Promise<boolean>} true=加载成功，false=失败或超时
 */
function waitForImageLoad(imgEl, timeoutMs = 8000) {
    return new Promise((resolve) => {
        /* 已加载完成时立即返回成功 */
        if (imgEl.complete && imgEl.naturalWidth > 0) {
            resolve(true);
            return;
        }

        let resolved = false;
        let timeoutId = null;

        /* 加载完成：成功 */
        const onLoad = () => {
            if (resolved) return;
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve(true);
        };

        /* 加载错误：失败 */
        const onError = () => {
            if (resolved) return;
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve(false);
        };

        /* 超时：失败 */
        const onTimeout = () => {
            if (resolved) return;
            resolved = true;
            resolve(false);
        };

        /* 监听加载完成/错误事件（once: true 自动移除监听器） */
        imgEl.addEventListener('load', onLoad, { once: true });
        imgEl.addEventListener('error', onError, { once: true });

        /* 超时保护：指定时间内未完成也继续执行 */
        timeoutId = setTimeout(onTimeout, timeoutMs);
    });
}

/**
 * 检查图片是否在浏览器缓存中
 * 已预加载的图片可即时显示，无需加载指示器
 *
 * @param {string} src - 图片路径
 * @returns {boolean} true=已缓存（无需加载提示），false=未缓存
 */
function isImageCached(src) {
    return !!state.preloadedImages[src];
}


/* ============================================
   6. Markdown 说明缓存与加载
   ============================================ */

/**
 * 异步加载产品说明 Markdown 文件
 * 优先使用缓存，缓存未命中时通过 fetch 加载
 * 加载失败时返回可点击重试的 HTML 文本
 *
 * @param {string} filePath - Markdown 文件路径
 * @returns {Promise<string>} Markdown 文本内容
 */
async function loadDescription(filePath) {
    /* 缓存命中直接返回 */
    if (descriptionCache[filePath]) {
        return descriptionCache[filePath];
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`加载失败: ${response.status}`);
        }
        const text = await response.text();
        /* 写入缓存 */
        descriptionCache[filePath] = text;
        return text;
    } catch (error) {
        console.warn(`产品说明文件加载失败: ${filePath}`, error);
        /* 返回可点击重试的提示文本 */
        const retryText = t('loadFailed');
        return `<div class="desc-load-failed" data-file="${filePath}" style="color:#ef4444;cursor:pointer;padding:12px 0;text-align:center;text-decoration:underline;">${retryText}</div>`;
    }
}

/**
 * Markdown 文本解析为 HTML
 * 使用 marked.js 库进行解析
 * @param {string} markdown - Markdown 文本
 * @returns {string} 解析后的 HTML 字符串
 */
function parseMarkdown(markdown) {
    if (typeof marked !== 'undefined') {
        return marked.parse(markdown);
    }
    /* marked.js 未加载时的降级处理：简易转义后显示 */
    return markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}


/* ============================================
   7. 场景渲染与切换
   ============================================ */

/**
 * 渲染指定索引的场景（交叉淡入淡出，无黑屏）
 *
 * 改良点（v3.1）：
 * - 设置 src 前先 removeAttribute('src') 清除，重置 complete 属性
 * - 在 CSS 切换前更新 activeLayer 标记，确保 repositionHotspots 引用正确图层
 * - 已缓存图片不显示加载指示器
 * - 图片加载失败/超时不渲染热点（防止黑屏上出现孤立热点）
 * - 使用 waitForImageLoad 返回值判断加载成功/失败
 *
 * @param {number} index - 场景索引
 * @param {boolean} animate - 是否使用过渡动画
 */
async function renderScene(index, animate = true) {
    const scenes = mappingData.scenes;
    const scene = scenes[index];
    if (!scene) return;

    /* 场景分类名（多语言） */
    const categoryName = getText(scene.category);

    if (animate) {
        const currentImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
        const nextImg = state.activeLayer === 'a' ? dom.sceneImageB : dom.sceneImageA;

        /* 先隐藏热点和分类切换器 */
        dom.hotspotContainer.style.opacity = '0';
        dom.hotspotContainer.style.transition = 'opacity 0.3s ease';
        dom.sceneSwitcher.style.opacity = '0';
        dom.sceneSwitcher.style.transition = 'opacity 0.3s ease';

        /* 检查图片是否已缓存
         * 已缓存的图片可即时显示，无需加载提示 */
        const needLoading = !isImageCached(scene.image);
        if (needLoading) {
            dom.loadingIndicator.classList.add('visible');
        }

        /* 重要：先清除 src 再设置新图片
         * 不清除的话旧图片的 complete=true 会残留，
         * waitForImageLoad 无法等待新图片加载，
         * 导致显示旧图片的 bug */
        nextImg.removeAttribute('src');
        nextImg.src = scene.image;
        nextImg.alt = categoryName;

        /* 等待图片加载完成后再开始交叉淡入淡出（含超时保护）
         * 场景切换时 15 秒超时 */
        const loadSuccess = await waitForImageLoad(nextImg, 15000);

        /* 隐藏加载指示器 */
        if (needLoading) {
            dom.loadingIndicator.classList.remove('visible');
        }

        /* 超时时再次确认图片是否实际加载完成
         * 超时瞬间图片可能刚好加载完成，作为安全网 */
        const actuallyLoaded = nextImg.complete && nextImg.naturalWidth > 0;

        /* 重要：先更新 activeLayer 标记
         * 这样交叉淡入淡出过程中 repositionHotspots 被调用时
         * 能引用正确的图层（nextImg）来计算热点位置 */
        state.activeLayer = state.activeLayer === 'a' ? 'b' : 'a';

        /* 交叉淡入淡出：新图层淡入，旧图层淡出 */
        nextImg.classList.add('active');
        nextImg.classList.remove('inactive');
        currentImg.classList.remove('active');
        currentImg.classList.add('inactive');

        /* 更新指示器 */
        updateIndicator(index);
        // updateSwitcher(categoryName);  /* 暂时隐藏顶部导航栏 */

        /* 仅在图片加载成功时渲染热点
         * 加载失败/超时时热点位置不准确，不渲染
         * 防止"黑屏上出现孤立热点"的问题
         * actuallyLoaded 检查：超时瞬间加载完成也显示 */
        if (loadSuccess || actuallyLoaded) {
            requestAnimationFrame(() => {
                renderHotspots(scene.hotspots);
                dom.hotspotContainer.style.opacity = '1';
                dom.sceneSwitcher.style.opacity = '1';
            });
        } else {
            /* 加载失败时仍显示分类切换器（防止无法操作） */
            dom.sceneSwitcher.style.opacity = '1';
            console.warn(`场景图片加载失败: ${scene.image}`);
        }
    } else {
        /* 无动画直接渲染：在当前活动图层上设置 */
        const currentImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;

        /* 缓存检查 */
        const needLoading = !isImageCached(scene.image);
        if (needLoading) {
            dom.loadingIndicator.classList.add('visible');
        }

        /* 清除 src 后设置新图片（无动画时同样需要） */
        currentImg.removeAttribute('src');
        currentImg.src = scene.image;
        currentImg.alt = categoryName;

        /* 等待图片加载完成 */
        const loadSuccess = await waitForImageLoad(currentImg, 15000);

        if (needLoading) {
            dom.loadingIndicator.classList.remove('visible');
        }

        /* 超时时再次确认 */
        const actuallyLoaded = currentImg.complete && currentImg.naturalWidth > 0;

        currentImg.classList.add('active');
        currentImg.classList.remove('inactive');

        updateIndicator(index);
        // updateSwitcher(categoryName);  /* 暂时隐藏顶部导航栏 */
        // dom.sceneSwitcher.classList.add('visible');  /* 暂时隐藏顶部导航栏 */

        /* 仅在图片加载成功时渲染热点 */
        if (loadSuccess || actuallyLoaded) {
            requestAnimationFrame(() => {
                renderHotspots(scene.hotspots);
            });
        }
    }
}

/**
 * 切换到上一个场景
 */
function prevScene() {
    if (state.isTransitioning || state.isDetailOpen) return;
    state.isTransitioning = true;
    const scenes = mappingData.scenes;
    state.currentIndex = (state.currentIndex - 1 + scenes.length) % scenes.length;
    renderScene(state.currentIndex).then(() => {
        /* CSS 过渡完成后解锁（transition 1.2s + 余量 100ms）
         * 图片加载完成后才开始交叉淡入淡出，
         * 因此解锁需要等待图片加载 + CSS 过渡两者完成 */
        setTimeout(() => { state.isTransitioning = false; }, 1300);
    });
}

/**
 * 切换到下一个场景
 */
function nextScene() {
    if (state.isTransitioning || state.isDetailOpen) return;
    state.isTransitioning = true;
    const scenes = mappingData.scenes;
    state.currentIndex = (state.currentIndex + 1) % scenes.length;
    renderScene(state.currentIndex).then(() => {
        setTimeout(() => { state.isTransitioning = false; }, 1300);
    });
}

/**
 * 跳转到指定场景
 * @param {number} index - 目标场景索引
 */
function goToScene(index) {
    if (state.isTransitioning || state.isDetailOpen || index === state.currentIndex) return;
    state.isTransitioning = true;
    state.currentIndex = index;
    renderScene(state.currentIndex).then(() => {
        setTimeout(() => { state.isTransitioning = false; }, 1300);
    });
}

/* ============================================
   10. 底部导航指示器（3种方案可切换）
   ============================================ */

/**
 * 计算指定场景在其所属分组中的信息
 * @param {number} sceneIndex - 场景在 scenes 数组中的索引
 * @returns {{ categoryName: string, groupIndex: number, groupTotal: number, groupStartIndex: number }}
 */
function getSceneGroupInfo(sceneIndex) {
    const scenes = mappingData.scenes;
    const scene = scenes[sceneIndex];
    const categoryName = getText(scene.category);

    /* 遍历所有场景，找出同一分类的所有索引 */
    const groupIndices = [];
    scenes.forEach((s, i) => {
        if (getText(s.category) === categoryName) {
            groupIndices.push(i);
        }
    });

    /* 当前场景在分组内的序号（从1开始） */
    const groupIndex = groupIndices.indexOf(sceneIndex) + 1;

    return {
        categoryName,
        groupIndex,
        groupTotal: groupIndices.length,
        groupStartIndex: groupIndices[0]
    };
}

/**
 * 创建场景指示器（根据 NAV_STYLE 分流）
 */
function createIndicator() {
    switch (NAV_STYLE) {
        case 'groupNumber':
            createIndicatorGroupNumber();
            break;
        case 'slidingDots':
            createIndicatorSlidingDots();
            break;
        case 'progressBar':
            createIndicatorProgressBar();
            break;
        default:
            createIndicatorGroupNumber();
    }
}

/**
 * 更新指示器的活跃状态（根据 NAV_STYLE 分流）
 * @param {number} activeIndex - 当前场景索引
 */
function updateIndicator(activeIndex) {
    switch (NAV_STYLE) {
        case 'groupNumber':
            updateIndicatorGroupNumber(activeIndex);
            break;
        case 'slidingDots':
            updateIndicatorSlidingDots(activeIndex);
            break;
        case 'progressBar':
            updateIndicatorProgressBar(activeIndex);
            break;
        default:
            updateIndicatorGroupNumber(activeIndex);
    }
}


/* --------------------------------------------
   方案A: groupNumber（分组缩略+数字）
   -------------------------------------------- */

/**
 * 创建分组缩略+数字指示器
 * 布局：左箭头 + 分类名 + 序号/总数 + 右箭头
 */
function createIndicatorGroupNumber() {
    const container = dom.sceneIndicator;
    container.innerHTML = '';
    container.className = 'nav-group-container';

    /* 左箭头 */
    const btnPrev = document.createElement('button');
    btnPrev.className = 'nav-group-arrow nav-group-prev';
    btnPrev.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btnPrev.addEventListener('click', prevScene);

    /* 中间内容区 */
    const content = document.createElement('div');
    content.className = 'nav-group-content';

    /* 分类名 */
    const categoryEl = document.createElement('span');
    categoryEl.className = 'nav-group-category';
    categoryEl.id = 'nav-group-category';

    /* 序号 */
    const counterEl = document.createElement('span');
    counterEl.className = 'nav-group-counter';
    counterEl.id = 'nav-group-counter';

    content.appendChild(categoryEl);
    content.appendChild(counterEl);

    /* 右箭头 */
    const btnNext = document.createElement('button');
    btnNext.className = 'nav-group-arrow nav-group-next';
    btnNext.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btnNext.addEventListener('click', nextScene);

    container.appendChild(btnPrev);
    container.appendChild(content);
    container.appendChild(btnNext);
}

/**
 * 更新分组缩略+数字指示器
 * @param {number} activeIndex - 当前场景索引
 */
function updateIndicatorGroupNumber(activeIndex) {
    const info = getSceneGroupInfo(activeIndex);
    const categoryEl = document.getElementById('nav-group-category');
    const counterEl = document.getElementById('nav-group-counter');
    if (categoryEl) categoryEl.textContent = info.categoryName;
    if (counterEl) counterEl.textContent = `${info.groupIndex}/${info.groupTotal}`;
}


/* --------------------------------------------
   方案B: slidingDots（滑动窗口圆点）
   -------------------------------------------- */

/** 滑动窗口最多显示的圆点数 */
const SLIDING_DOTS_MAX = 7;

/**
 * 创建滑动窗口圆点指示器
 * 初始创建所有圆点，但只显示窗口内的
 */
function createIndicatorSlidingDots() {
    const container = dom.sceneIndicator;
    container.innerHTML = '';
    container.className = 'nav-dots-container';

    /* 内部轨道容器（用于滑动动画） */
    const track = document.createElement('div');
    track.className = 'nav-dots-track';
    track.id = 'nav-dots-track';

    const scenes = mappingData.scenes;
    scenes.forEach((scene, index) => {
        const dot = document.createElement('div');
        dot.className = 'nav-dots-dot';
        dot.dataset.index = index;
        dot.title = getText(scene.category);
        dot.addEventListener('click', () => goToScene(index));
        track.appendChild(dot);
    });

    container.appendChild(track);
}

/**
 * 更新滑动窗口圆点指示器
 * 计算窗口范围，只渲染窗口内圆点的可见状态
 * @param {number} activeIndex - 当前场景索引
 */
function updateIndicatorSlidingDots(activeIndex) {
    const track = document.getElementById('nav-dots-track');
    if (!track) return;

    const dots = track.querySelectorAll('.nav-dots-dot');
    const total = dots.length;

    /* 计算窗口的起始索引，使 activeIndex 尽量居中 */
    const halfWindow = Math.floor(SLIDING_DOTS_MAX / 2);
    let windowStart = activeIndex - halfWindow;

    /* 边界修正 */
    if (windowStart < 0) windowStart = 0;
    if (windowStart + SLIDING_DOTS_MAX > total) {
        windowStart = total - SLIDING_DOTS_MAX;
    }
    if (windowStart < 0) windowStart = 0;

    const windowEnd = windowStart + SLIDING_DOTS_MAX;

    /* 更新每个圆点的样式 */
    dots.forEach((dot, index) => {
        /* 是否在窗口内 */
        const inWindow = index >= windowStart && index < windowEnd;
        dot.style.display = inWindow ? '' : 'none';

        if (!inWindow) return;

        /* 相对于窗口中心的位置，用于计算渐隐效果 */
        const relPos = index - activeIndex; /* -3 ~ +3 */
        const absPos = Math.abs(relPos);

        /* 活跃圆点 */
        const isActive = index === activeIndex;

        /* 缩放：中心最大1.0，两侧逐渐缩小 */
        const scale = isActive ? 1.0 : Math.max(0.5, 1.0 - absPos * 0.12);
        /* 透明度：中心1.0，两侧逐渐降低 */
        const opacity = isActive ? 1.0 : Math.max(0.25, 1.0 - absPos * 0.2);

        dot.style.transform = `scale(${scale})`;
        dot.style.opacity = opacity;

        if (isActive) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}


/* --------------------------------------------
   方案C: progressBar（进度条+分类标签）
   -------------------------------------------- */

/**
 * 创建进度条+分类标签指示器
 * 布局：上方分类标签（可点击）+ 下方进度条
 */
function createIndicatorProgressBar() {
    const container = dom.sceneIndicator;
    container.innerHTML = '';
    container.className = 'nav-progress-container';

    /* 分类标签（hover展开分类列表，移动端点击展开） */
    const label = document.createElement('button');
    label.className = 'nav-progress-label';
    label.id = 'nav-progress-label';

    /* 桌面端：hover展开分类列表（200ms延迟避免快速划过时频繁开关） */
    label.addEventListener('mouseenter', () => {
        clearTimeout(categoryPopupTimer);
        categoryPopupTimer = setTimeout(showCategoryPopup, 200);
    });
    label.addEventListener('mouseleave', () => {
        clearTimeout(categoryPopupTimer);
        categoryPopupTimer = setTimeout(hideCategoryPopup, 200);
    });

    /* 移动端：点击展开分类列表（touch设备无hover效果，保留点击逻辑） */
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        label.addEventListener('click', toggleCategoryPopupMobile);
    }

    /* 进度条外框 */
    const barBg = document.createElement('div');
    barBg.className = 'nav-progress-bar';

    /* 进度条填充 */
    const barFill = document.createElement('div');
    barFill.className = 'nav-progress-fill';
    barFill.id = 'nav-progress-fill';
    barBg.appendChild(barFill);

    container.appendChild(label);
    container.appendChild(barBg);
}

/**
 * 更新进度条+分类标签指示器
 * @param {number} activeIndex - 当前场景索引
 */
function updateIndicatorProgressBar(activeIndex) {
    const info = getSceneGroupInfo(activeIndex);
    const totalScenes = mappingData.scenes.length;

    /* 更新分类标签 */
    const label = document.getElementById('nav-progress-label');
    if (label) {
        label.textContent = `${info.categoryName}  ${info.groupIndex}/${info.groupTotal}`;
    }

    /* 更新进度条 */
    const fill = document.getElementById('nav-progress-fill');
    if (fill) {
        const percent = ((activeIndex + 1) / totalScenes) * 100;
        fill.style.width = percent + '%';
    }
}

/* 分类弹窗hover延迟计时器 */
let categoryPopupTimer = null;

/**
 * 显示分类弹窗（桌面端hover触发 / 移动端点击触发）
 */
function showCategoryPopup() {
    clearTimeout(categoryPopupTimer);

    /* 如果弹窗已存在则不重复创建 */
    const existing = document.getElementById('nav-category-popup');
    if (existing) return;

    /* 创建分类弹窗 */
    const popup = document.createElement('div');
    popup.id = 'nav-category-popup';
    popup.className = 'nav-category-popup';

    /* 遍历所有分类，创建可点击按钮 */
    Object.keys(sceneCategories).forEach((categoryName) => {
        const btn = document.createElement('button');
        btn.className = 'nav-category-item';
        btn.textContent = categoryName;

        /* 判断当前场景是否属于该分类 */
        const scene = mappingData.scenes[state.currentIndex];
        const currentCat = getText(scene.category);
        if (categoryName === currentCat) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            /* 跳转到该分类的第一个场景 */
            const targetIndex = sceneCategories[categoryName];
            popup.remove();
            if (targetIndex === state.currentIndex) return;
            if (state.isTransitioning || state.isDetailOpen) return;
            state.isTransitioning = true;
            state.currentIndex = targetIndex;
            renderScene(state.currentIndex).then(() => {
                setTimeout(() => { state.isTransitioning = false; }, 1300);
            });
        });

        popup.appendChild(btn);
    });

    /* 弹窗挂载到指示器容器附近 */
    dom.sceneIndicator.appendChild(popup);

    /* 弹窗hover事件：鼠标进入弹窗时取消隐藏计时器（防止从标签滑到弹窗时误关闭） */
    popup.addEventListener('mouseenter', () => {
        clearTimeout(categoryPopupTimer);
    });
    /* 鼠标离开弹窗时启动隐藏计时器 */
    popup.addEventListener('mouseleave', () => {
        categoryPopupTimer = setTimeout(hideCategoryPopup, 200);
    });
}

/**
 * 隐藏分类弹窗
 */
function hideCategoryPopup() {
    const popup = document.getElementById('nav-category-popup');
    if (popup) popup.remove();
}

/**
 * 移动端点击切换分类弹窗（touch设备无hover效果，保留点击展开逻辑）
 */
function toggleCategoryPopupMobile() {
    const existing = document.getElementById('nav-category-popup');
    if (existing) {
        existing.remove();
        return;
    }

    showCategoryPopup();

    /* 移动端：点击弹窗外部关闭 */
    const closePopup = (e) => {
        const popup = document.getElementById('nav-category-popup');
        if (!popup) {
            document.removeEventListener('click', closePopup);
            return;
        }
        if (!popup.contains(e.target) && e.target.id !== 'nav-progress-label') {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }
    };
    /* 延迟绑定防止立即触发 */
    setTimeout(() => {
        document.addEventListener('click', closePopup);
    }, 10);
}

/* ============================================
   暂时隐藏：顶部场景分类切换器
   与底部 progressBar 的分类标签功能重复
   恢复方法：取消下方调用处的注释 + CSS中移除 display:none
   ============================================ */

/**
 * 创建场景分类切换器（暂时隐藏，与底部progressBar功能重复）
 * 基于 sceneCategories 生成顶部标签按钮
 */
function createSwitcher() {
    dom.sceneSwitcher.innerHTML = '';
    Object.keys(sceneCategories).forEach((categoryName) => {
        const tab = document.createElement('button');
        tab.className = 'scene-tab';
        tab.textContent = categoryName;
        tab.addEventListener('click', () => {
            /* 分类标签点击时，跳转到该分类的第一个场景 */
            const targetIndex = sceneCategories[categoryName];
            /* 已在该分类的第一个场景时不操作 */
            if (targetIndex === state.currentIndex) {
                return;
            }
            /* 使用独立跳转逻辑，绕过 goToScene 的同索引限制 */
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
 * 更新分类切换器的活跃状态
 * @param {string} activeCategory - 当前场景分类名
 */
function updateSwitcher(activeCategory) {
    const tabs = dom.sceneSwitcher.querySelectorAll('.scene-tab');
    tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.textContent === activeCategory);
    });
}


/* ============================================
   8. 多热点渲染与交互
   ============================================ */

/**
 * 渲染多个脉冲热点
 * 根据图片实际绘制区域计算每个热点的像素位置
 *
 * @param {Array} hotspots - 热点数组，每个热点包含 { id, x, y, products }
 */
function renderHotspots(hotspots) {
    dom.hotspotContainer.innerHTML = '';

    if (!hotspots || hotspots.length === 0) return;

    hotspots.forEach((hotspotData) => {
        /* 计算热点的页面像素位置 */
        const pixelPos = calcHotspotPixelPosition({ x: hotspotData.x, y: hotspotData.y });

        const hotspot = document.createElement('div');
        hotspot.className = 'hotspot';
        hotspot.style.left = pixelPos.x + 'px';
        hotspot.style.top = pixelPos.y + 'px';
        /* 保存热点数据索引，用于重新定位 */
        hotspot.dataset.x = hotspotData.x;
        hotspot.dataset.y = hotspotData.y;

        /* 核心点 */
        const core = document.createElement('div');
        core.className = 'hotspot-core';

        /* 第一层波纹 */
        const ring1 = document.createElement('div');
        ring1.className = 'hotspot-ring';

        /* 第二层波纹（延迟动画） */
        const ring2 = document.createElement('div');
        ring2.className = 'hotspot-ring delay';

        hotspot.appendChild(ring1);
        hotspot.appendChild(ring2);
        hotspot.appendChild(core);

        /* 点击事件：传递该热点关联的产品数组和分类名 */
        const scene = mappingData.scenes[state.currentIndex];
        const categoryName = getText(scene.category);
        hotspot.addEventListener('click', (e) => {
            e.stopPropagation();
            onHotspotClick(hotspot, hotspotData.products, categoryName);
        });

        dom.hotspotContainer.appendChild(hotspot);
    });
}

/**
 * 计算热点的页面像素位置
 * 基于当前场景图片的实际绘制区域（object-fit: cover）
 * 将图片的百分比坐标转换为页面的像素坐标
 *
 * cover 模式下图片会被裁切，因此需要计算裁切偏移量
 *
 * 改良：图片未加载时跳过计算，返回屏幕中央
 * naturalWidth/naturalHeight 为 0 或旧图片值时计算结果完全错误
 *
 * @param {Object} position - 热点位置 { x, y } 百分比坐标
 * @returns {Object} { x, y } 像素坐标
 */
function calcHotspotPixelPosition(position) {
    const activeImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
    const containerW = window.innerWidth;
    const containerH = window.innerHeight;

    /* 重要：确认图片已完全加载
     * 未加载时 naturalWidth/naturalHeight 为 0 或旧图片值，
     * 热点位置会大幅偏移 */
    if (!activeImg.complete || activeImg.naturalWidth === 0) {
        console.warn('图片未加载，热点计算跳过');
        /* 图片加载前以屏幕中央作为临时位置 */
        return { x: containerW / 2, y: containerH / 2 };
    }

    /* 获取图片原始尺寸（已确认加载完成，安全） */
    const imgW = activeImg.naturalWidth;
    const imgH = activeImg.naturalHeight;

    /* 计算 object-fit: cover 下图片的实际绘制区域 */
    const imgAspect = imgW / imgH;
    const containerAspect = containerW / containerH;

    let renderedW, renderedH, cropOffsetX, cropOffsetY;

    if (imgAspect > containerAspect) {
        /* 图片更宽：上下适配，左右裁切 */
        renderedH = containerH;
        renderedW = containerH * imgAspect;
        cropOffsetX = (renderedW - containerW) / 2;
        cropOffsetY = 0;
    } else {
        /* 图片更高：左右适配，上下裁切 */
        renderedW = containerW;
        renderedH = containerW / imgAspect;
        cropOffsetX = 0;
        cropOffsetY = (renderedH - containerH) / 2;
    }

    /* 百分比坐标转像素坐标，减去裁切偏移 */
    return {
        x: (position.x / 100) * renderedW - cropOffsetX,
        y: (position.y / 100) * renderedH - cropOffsetY
    };
}

/**
 * 重新定位所有热点（窗口大小变化时调用）
 *
 * 改良（v3）：
 * - 确认图片已加载完成，未加载时跳过重新定位
 * - 未加载的图片计算热点位置会大幅偏移
 */
function repositionHotspots() {
    const scene = mappingData.scenes[state.currentIndex];
    if (!scene) return;

    const hotspots = dom.hotspotContainer.querySelectorAll('.hotspot');
    if (!hotspots.length) return;

    /* 确认图片已加载完成（未加载时计算不准确，跳过） */
    const activeImg = state.activeLayer === 'a' ? dom.sceneImageA : dom.sceneImageB;
    if (!activeImg.complete || activeImg.naturalWidth === 0) return;

    /* 遍历所有热点，重新计算位置 */
    hotspots.forEach((hotspotEl) => {
        const x = parseFloat(hotspotEl.dataset.x);
        const y = parseFloat(hotspotEl.dataset.y);
        if (isNaN(x) || isNaN(y)) return;

        const pixelPos = calcHotspotPixelPosition({ x, y });
        hotspotEl.style.left = pixelPos.x + 'px';
        hotspotEl.style.top = pixelPos.y + 'px';
    });
}

/**
 * 热点点击事件处理
 *
 * @param {HTMLElement} hotspotEl - 被点击的热点元素
 * @param {Array} products - 该热点关联的产品数组
 * @param {string} categoryName - 场景分类名（用于弹窗标题）
 */
function onHotspotClick(hotspotEl, products, categoryName) {
    if (state.isDetailOpen) return;
    state.isDetailOpen = true;
    state.currentHotspot = hotspotEl;
    state.currentProducts = products;

    /* 设置弹窗标题为场景分类名 */
    dom.detailTitle.textContent = categoryName;

    /* 异步加载所有产品说明并渲染面板 */
    renderProductList(products);

    /* 执行打开动画 */
    openDetailAnimation();
}


/* ============================================
   9. 详细面板与动画
   ============================================ */

/**
 * 渲染产品列表到面板
 * 支持多产品，每个产品为左图右文布局
 *
 * 改良（v3.1）：
 * - 先立即创建所有产品的 DOM 骨架（含加载占位符）
 * - 并行加载 Markdown 说明（串行→并行，大幅提速）
 * - 加载完成后替换占位符为实际内容
 *
 * @param {Array} products - 产品数组
 */
async function renderProductList(products) {
    /* 清空旧内容 */
    dom.productList.innerHTML = '';

    /* 第一步：立即创建所有产品的 DOM 骨架（含加载占位符）
     * 使面板快速显示，用户能感知正在加载 */
    const descElements = [];
    for (const product of products) {
        const item = document.createElement('div');
        item.className = 'product-item';

        /* 左侧图片列 */
        const imageCol = document.createElement('div');
        imageCol.className = 'product-image-col';
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = getText(product.name);
        imageCol.appendChild(img);

        /* 右侧详情列 */
        const detailCol = document.createElement('div');
        detailCol.className = 'product-detail-col';

        /* 产品名（多语言） */
        const nameEl = document.createElement('div');
        nameEl.className = 'product-name';
        nameEl.textContent = getText(product.name);

        /* 产品说明区域：显示加载占位符 */
        const descEl = document.createElement('div');
        descEl.className = 'product-description';
        descEl.innerHTML = `<div class="desc-loading">${t('loading')}</div>`;
        descElements.push({ el: descEl, file: getText(product.descriptionFile) });

        detailCol.appendChild(nameEl);
        detailCol.appendChild(descEl);

        item.appendChild(imageCol);
        item.appendChild(detailCol);

        dom.productList.appendChild(item);
    }

    /* 第二步：并行加载所有产品的 Markdown 说明
     * 例：3 个产品 × 各 1 秒 → 旧版 3 秒 → 新版 1 秒 */
    const loadPromises = descElements.map(async ({ el, file }) => {
        const markdown = await loadDescription(file);
        el.innerHTML = parseMarkdown(markdown);

        /* 为加载失败的元素绑定重试点击事件 */
        const failedEl = el.querySelector('.desc-load-failed');
        if (failedEl) {
            failedEl.addEventListener('click', async () => {
                failedEl.innerHTML = `<div class="desc-loading">${t('loading')}</div>`;
                /* 清除缓存以重新加载 */
                delete descriptionCache[file];
                const retryMarkdown = await loadDescription(file);
                el.innerHTML = parseMarkdown(retryMarkdown);

                /* 重试后仍可能失败，再次绑定 */
                const retryFailedEl = el.querySelector('.desc-load-failed');
                if (retryFailedEl) {
                    retryFailedEl.addEventListener('click', arguments.callee);
                }
            });
        }
    });
    await Promise.all(loadPromises);
}

/**
 * 打开详细面板的动画序列
 * 面板居中显示，无连接线
 */
function openDetailAnimation() {
    /* 步骤 1：背景变暗 */
    dom.sceneContainer.classList.add('dimmed');
    dom.overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        dom.overlay.classList.add('visible');
    });

    /* 隐藏热点和导航按钮 */
    dom.hotspotContainer.style.opacity = '0';
    dom.sceneSwitcher.style.opacity = '0';
    dom.sceneSwitcher.style.transition = 'opacity 0.3s ease';
    dom.btnPrev.style.opacity = '0';
    dom.btnPrev.style.transition = 'opacity 0.3s ease';
    dom.btnNext.style.opacity = '0';
    dom.btnNext.style.transition = 'opacity 0.3s ease';
    dom.sceneIndicator.style.opacity = '0';

    /* 步骤 2：显示面板（居中弹出） */
    setTimeout(() => {
        dom.detailPanel.classList.remove('hidden');
        requestAnimationFrame(() => {
            dom.detailPanel.classList.add('visible');
        });
    }, 200);
}

/**
 * 关闭详细面板
 */
function closeDetail() {
    if (!state.isDetailOpen) return;

    /* 步骤 1：隐藏面板 */
    dom.detailPanel.classList.remove('visible');

    /* 步骤 2：恢复背景 */
    setTimeout(() => {
        dom.sceneContainer.classList.remove('dimmed');
        dom.overlay.classList.remove('visible');
    }, 200);

    /* 步骤 3：恢复热点和导航 */
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

    /* 步骤 4：清除状态 */
    setTimeout(() => {
        dom.detailPanel.classList.add('hidden');
        dom.overlay.classList.add('hidden');
        state.isDetailOpen = false;
        state.currentHotspot = null;
        state.currentProducts = null;
    }, 500);
}


/* ============================================
   10. 语言切换器
   ============================================ */

/**
 * 创建语言切换器
 * 在页面右上角添加中日文切换按钮
 */
function createLangSwitcher() {
    /* 检查是否已存在 */
    if (document.getElementById('lang-switcher')) return;

    const switcher = document.createElement('div');
    switcher.id = 'lang-switcher';
    switcher.style.cssText = 'position:absolute;top:20px;right:20px;z-index:10;display:flex;gap:2px;padding:4px;background:linear-gradient(135deg,rgba(0,0,0,0.55),rgba(0,0,0,0.4));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:20px;border:1px solid rgba(255,255,255,0.12);box-shadow:0 4px 24px rgba(0,0,0,0.25);';

    const languages = [
        { code: 'ja', label: '日本語' },
        { code: 'zh', label: '中文' }
    ];

    languages.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = 'lang-btn' + (lang.code === state.currentLang ? ' active' : '');
        btn.dataset.lang = lang.code;
        btn.textContent = lang.label;
        btn.style.cssText = 'padding:6px 14px;border-radius:16px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-size:12px;font-weight:500;cursor:pointer;transition:all 0.3s ease;font-family:inherit;white-space:nowrap;letter-spacing:0.5px;';

        if (lang.code === state.currentLang) {
            btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            btn.style.color = '#ffffff';
            btn.style.boxShadow = '0 2px 12px rgba(59, 130, 246, 0.4)';
        }

        btn.addEventListener('click', () => {
            switchLanguage(lang.code);
        });

        switcher.appendChild(btn);
    });

    dom.app.appendChild(switcher);
}

/**
 * 更新语言切换器按钮的活跃状态
 */
function updateLangSwitcherState() {
    const switcher = document.getElementById('lang-switcher');
    if (!switcher) return;

    const buttons = switcher.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        const isActive = btn.dataset.lang === state.currentLang;
        btn.classList.toggle('active', isActive);

        if (isActive) {
            btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            btn.style.color = '#ffffff';
            btn.style.boxShadow = '0 2px 12px rgba(59, 130, 246, 0.4)';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = 'rgba(255,255,255,0.55)';
            btn.style.boxShadow = 'none';
        }
    });
}


/* ============================================
   11. 事件绑定与初始化
   ============================================ */

/**
 * 绑定所有事件
 */
function bindEvents() {
    /* 左右切换按钮 */
    dom.btnPrev.addEventListener('click', prevScene);
    dom.btnNext.addEventListener('click', nextScene);

    /* 返回按钮 */
    dom.btnBack.addEventListener('click', closeDetail);

    /* 点击遮罩关闭面板 */
    dom.overlay.addEventListener('click', closeDetail);

    /* 键盘事件 */
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

    /* 语言切换按钮 */
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchLanguage(btn.dataset.lang);
        });
    });

    /* 窗口大小变化时重新定位热点（含防抖） */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        /* 防抖：200ms 内连续 resize 事件合并为一次处理
         * 频繁 resize 每次都计算会导致性能下降 */
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            repositionHotspots();
        }, 200);
    });
}

/**
 * 添加提示文本
 */
function addHintText() {
    const hint = document.createElement('div');
    hint.className = 'hint-text';
    hint.textContent = t('hint');
    dom.app.appendChild(hint);

    setTimeout(() => {
        hint.style.transition = 'opacity 1s ease';
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 1000);
    }, 5000);
}

/**
 * 显示全屏错误提示
 * mapping.json 加载失败时使用
 *
 * @param {string} message - 错误提示信息
 */
function showFullscreenError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;font-size:18px;text-align:center;padding:40px;line-height:1.8;';
    errorDiv.innerHTML = `<div>${message}</div>`;
    document.body.appendChild(errorDiv);
}

/**
 * 应用程序初始化
 *
 * 启动流程（v4）：
 * 1. 从 mapping.json 加载数据（含重试）
 * 2. 初始化场景分类映射
 * 3. 创建 UI 元素（切换器、指示器、语言切换器）
 * 4. 加载第一个场景（独占全带宽）
 * 5. 第一个场景显示后预加载剩余图片
 * 6. 绑定事件
 *
 * 首屏独占带宽策略：
 * - 旧版 preloadAllImages() 与首图同时启动
 * - 慢速 4G 环境下带宽争夺导致首图 8 秒超时永不显示
 * - 新版首图完全显示后才启动预加载
 * - 首图独占全带宽，慢速网络也能确保显示
 */
async function init() {
    /* 步骤 1：加载 mapping.json */
    try {
        mappingData = await loadMapping();
    } catch (error) {
        /* 加载失败：显示全屏错误提示 */
        console.error('初始化失败: mapping.json 无法加载');
        showFullscreenError(t('initError') || '数据加载失败，请刷新页面重试。');
        return;
    }

    /* 步骤 2：初始化场景分类映射 */
    initSceneCategories();

    /* 步骤 3：创建 UI 元素 */
    // createSwitcher();  /* 暂时隐藏顶部导航栏，与底部progressBar功能重复 */
    createIndicator();
    createLangSwitcher();

    /* 步骤 4：立即加载并显示第一个场景（不等待全部预加载） */
    const scenes = mappingData.scenes;
    const scene = scenes[0];
    const img = dom.sceneImageA;

    /* 第一个图片必然需要加载提示（此时无缓存） */
    dom.loadingIndicator.classList.add('visible');

    /* 清除 src 后设置（重置 complete 属性） */
    img.removeAttribute('src');
    img.src = scene.image;
    img.alt = getText(scene.category);

    updateIndicator(0);
    // updateSwitcher(getText(scene.category));  /* 暂时隐藏顶部导航栏 */

    /* 图片加载完成后触发淡入动画 */
    const fadeIn = async () => {
        /* 首图 30 秒超时（慢速网络支持）
         * 8 秒在慢速 4G 下因带宽争夺无法完成 */
        const loadSuccess = await waitForImageLoad(img, 30000);

        /* 隐藏加载指示器 */
        dom.loadingIndicator.classList.remove('visible');

        /* 超时时再次确认图片是否实际加载完成
         * 超时瞬间图片可能刚好加载完成，即使 loadSuccess=false
         * 图片数据已在 DOM 中，尝试显示 */
        const actuallyLoaded = img.complete && img.naturalWidth > 0;

        if (loadSuccess || actuallyLoaded) {
            /* 图层 A 设为 active，CSS transition 触发淡入 */
            img.classList.add('active');
            img.classList.remove('inactive');

            /* 立即渲染热点 */
            requestAnimationFrame(() => {
                renderHotspots(scene.hotspots);
                dom.sceneSwitcher.classList.add('visible');
            });
        } else {
            console.warn('首场景图片加载失败');
        }

        /* 重要：首图显示后再启动预加载
         * 首图独占全带宽，慢速网络也能确保显示
         * 预加载同时启动的话 20 张图片争夺带宽，
         * 首图加载超时导致永远无法显示 */
        preloadAllImages().then(count => {
            console.log(`后台预加载完成: ${count} 张`);
        });
    };

    requestAnimationFrame(fadeIn);

    /* 步骤 5：绑定事件 */
    bindEvents();

    /* 步骤 6：添加提示文本 */
    addHintText();

    /* 更新页面标题 */
    document.title = t('pageTitle') + ' - ' + t('companyName');

    console.log('数字标牌产品介绍页 v4 初始化完成');
}

document.addEventListener('DOMContentLoaded', init);
