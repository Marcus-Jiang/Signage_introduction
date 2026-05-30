/**
 * 数字标牌管理后台 - 主逻辑文件
 * 纯原生 JS 实现，无外部依赖
 */

// ==================== 全局状态 ====================
let mappingData = null;         // mapping.json 数据
let currentSceneIndex = -1;     // 当前选中场景索引
let selectedHotspotIndex = -1;  // 当前选中热点索引
let isDragging = false;         // 是否正在拖拽
let dragHotspotEl = null;       // 正在拖拽的热点 DOM 元素
let dragHotspotIndex = -1;      // 正在拖拽的热点数据索引
let imageFiles = [];            // 可用图片文件列表
let descFiles = [];             // 可用描述文件列表
let dialogSelectedFile = null;  // 对话框中选择的图片文件对象

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    // 绑定事件
    bindToolbarEvents();
    bindEditorEvents();
    bindDialogEvents();

    // 加载数据
    await loadMappingData();
    await loadImageList();
    await loadDescriptionList();

    // 渲染场景列表
    renderSceneList();
});

// ==================== 数据加载 ====================

/** 从服务器加载 mapping.json 数据 */
async function loadMappingData() {
    try {
        const resp = await fetch('mapping.json');
        if (!resp.ok) throw new Error('加载失败');
        mappingData = await resp.json();
    } catch (e) {
        console.error('加载 mapping.json 失败:', e);
        showToast('数据加载失败，请刷新页面重试', 'error');
        mappingData = { version: '4.0', scenes: [], i18n: { ja: {}, zh: {} } };
    }
}

/** 获取可用图片文件列表 */
async function loadImageList() {
    try {
        const resp = await fetch('/api/list-images');
        if (resp.ok) {
            const data = await resp.json();
            imageFiles = Array.isArray(data.products) ? data.products : [];
        }
    } catch (e) {
        console.warn('获取图片列表失败:', e);
        imageFiles = [];
    }
}

/** 获取可用描述文件列表 */
async function loadDescriptionList() {
    try {
        const resp = await fetch('/api/list-descriptions');
        if (resp.ok) {
            descFiles = await resp.json();
        }
    } catch (e) {
        console.warn('获取描述文件列表失败:', e);
        descFiles = [];
    }
}

// ==================== 工具栏事件 ====================

function bindToolbarEvents() {
    // 保存按钮
    document.getElementById('btn-save').addEventListener('click', saveMapping);
}

/** 保存 mapping 数据到服务器 */
async function saveMapping() {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = '保存中...';
    statusEl.className = '';

    try {
        const resp = await fetch('/api/save-mapping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mappingData, null, 2)
        });
        if (!resp.ok) throw new Error('保存失败');
        statusEl.textContent = '已保存 ✓';
        statusEl.className = 'success';
        showToast('配置保存成功', 'success');
    } catch (e) {
        statusEl.textContent = '保存失败 ✗';
        statusEl.className = 'error';
        showToast('保存失败: ' + e.message, 'error');
    }

    // 5秒后清除状态
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = '';
    }, 5000);
}

// ==================== 场景列表渲染 ====================

/** 渲染左栏场景列表（按文件夹分组折叠） */
function renderSceneList() {
    const listEl = document.getElementById('scene-list');
    listEl.innerHTML = '';

    // 按场景图子文件夹分组
    const groups = [];
    const groupMap = {}; // groupName -> groupIndex

    mappingData.scenes.forEach((scene, index) => {
        const groupName = getSceneGroupName(scene);
        if (groupMap[groupName] === undefined) {
            groupMap[groupName] = groups.length;
            groups.push({ name: groupName, items: [] });
        }
        groups[groupMap[groupName]].items.push({ scene, index });
    });

    // 渲染每个分组
    groups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'scene-group';

        // 分组标题
        const header = document.createElement('div');
        header.className = 'scene-group-header';

        const arrow = document.createElement('span');
        arrow.className = 'scene-group-arrow';
        arrow.textContent = '▼';

        const name = document.createElement('span');
        name.className = 'scene-group-name';
        name.textContent = group.name;

        const count = document.createElement('span');
        count.className = 'scene-group-count';
        count.textContent = `(${group.items.length})`;

        header.appendChild(arrow);
        header.appendChild(name);
        header.appendChild(count);

        // 点击折叠/展开
        header.addEventListener('click', () => {
            groupEl.classList.toggle('collapsed');
        });

        // 分组内容区
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'scene-group-items';

        group.items.forEach(({ scene, index }) => {
            const item = createSceneItem(scene, index);
            itemsContainer.appendChild(item);
        });

        groupEl.appendChild(header);
        groupEl.appendChild(itemsContainer);
        listEl.appendChild(groupEl);
    });
}

/** 创建单个场景项 DOM 元素 */
function createSceneItem(scene, index) {
    const item = document.createElement('div');
    item.className = 'scene-item' + (index === currentSceneIndex ? ' active' : '');
    item.dataset.index = index;

    // 缩略图
    const thumb = document.createElement('img');
    thumb.className = 'scene-item-thumb';
    thumb.src = encodeURI(scene.image);
    thumb.alt = scene.category.zh;
    thumb.loading = 'lazy';
    // 图片加载失败时使用占位
    thumb.onerror = () => { thumb.src = ''; thumb.style.background = '#e2e8f0'; };

    // 信息区（名称 + 统计标签）
    const info = document.createElement('div');
    info.className = 'scene-item-info';

    // 名称（使用图片文件名）
    const name = document.createElement('div');
    name.className = 'scene-item-name';
    name.textContent = getSceneDisplayName(scene);

    // 统计标签
    const stats = document.createElement('div');
    stats.className = 'scene-item-stats';

    const hsCount = scene.hotspots ? scene.hotspots.length : 0;
    const pCount = scene.hotspots
        ? scene.hotspots.reduce((sum, hs) => sum + (hs.products ? hs.products.length : 0), 0)
        : 0;

    if (hsCount === 0) {
        // 未配置警告
        const warning = document.createElement('span');
        warning.className = 'no-config-warning';
        warning.textContent = '⚠ 未配置';
        warning.title = '此场景没有配置热点和产品';
        stats.appendChild(warning);
    } else {
        const hotspotBadge = document.createElement('span');
        hotspotBadge.className = 'stat-badge hotspot-badge';
        hotspotBadge.textContent = hsCount + '热点';
        stats.appendChild(hotspotBadge);

        const productBadge = document.createElement('span');
        productBadge.className = 'stat-badge product-badge';
        productBadge.textContent = pCount + '产品';
        stats.appendChild(productBadge);
    }

    info.appendChild(name);
    info.appendChild(stats);

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.className = 'scene-item-delete';
    delBtn.textContent = '×';
    delBtn.title = '删除此场景';
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteScene(index);
    });

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(delBtn);

    // 点击切换场景
    item.addEventListener('click', () => {
        selectScene(index);
    });

    return item;
}

/** 从场景图片路径中提取分组名（子文件夹名）
 * 例如 "场景图/便利店场景/便利店场景1.webp" -> "便利店场景"
 */
function getSceneGroupName(scene) {
    if (!scene || !scene.image) return '未分类';
    const parts = scene.image.split('/');
    if (parts.length >= 2 && parts[0] === '场景图') {
        return parts[1];
    }
    return '未分类';
}

/** 获取场景的显示名称（从图片文件名中提取）
 * 例如 "场景图/便利店场景/便利店场景1.webp" -> "便利店场景1"
 */
function getSceneDisplayName(scene) {
    if (!scene || !scene.image) return scene.category.zh || scene.category.ja || scene.id;
    const filename = scene.image.split('/').pop();
    const nameWithoutExt = filename.replace(/\.\w+$/, '');
    return nameWithoutExt || scene.category.zh || scene.category.ja || scene.id;
}

/** 更新场景列表中单个场景项的显示名称 */
function updateSceneListItem(index) {
    const scene = mappingData.scenes[index];
    const itemEl = document.querySelector(`.scene-item[data-index="${index}"]`);
    if (!itemEl || !scene) return;
    const nameEl = itemEl.querySelector('.scene-item-name');
    if (nameEl) {
        nameEl.textContent = getSceneDisplayName(scene);
    }
}

/** 选中某个场景 */
function selectScene(index) {
    currentSceneIndex = index;
    selectedHotspotIndex = -1;

    // 更新场景列表高亮（使用 data-index 精确匹配）
    document.querySelectorAll('.scene-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.index) === index);
    });

    // 更新中栏编辑区
    updateSceneEditor();

    // 更新右栏产品编辑器
    updateProductEditor();

    // 更新底部热点坐标信息
    updateCoordInfo();
}

// ==================== 场景编辑区 ====================

function bindEditorEvents() {
    // 分类名输入框 - 实时更新数据
    document.getElementById('input-category-ja').addEventListener('input', (e) => {
        if (currentSceneIndex < 0) return;
        mappingData.scenes[currentSceneIndex].category.ja = e.target.value;
        // 同步更新场景列表中的显示名称
        updateSceneListItem(currentSceneIndex);
    });

    document.getElementById('input-category-zh').addEventListener('input', (e) => {
        if (currentSceneIndex < 0) return;
        mappingData.scenes[currentSceneIndex].category.zh = e.target.value;
        // 同步更新场景列表中的显示名称
        updateSceneListItem(currentSceneIndex);
    });

    // 更换场景图按钮
    document.getElementById('btn-change-image').addEventListener('click', () => {
        document.getElementById('input-scene-image').click();
    });

    document.getElementById('input-scene-image').addEventListener('change', async (e) => {
        if (currentSceneIndex < 0 || !e.target.files.length) return;
        const file = e.target.files[0];
        if (!isImageFile(file)) {
            showToast('请选择图片文件', 'error');
            e.target.value = '';
            return;
        }
        const scene = getCurrentScene();
        const category = getSceneCategory(scene);
        try {
            const result = await uploadImage(file, 'scene', category);
            mappingData.scenes[currentSceneIndex].image = result.path;
            await loadImageList();
            updateSceneEditor();
            renderSceneList();
            showToast('场景图已更新' + (result.converted ? '（已转换为webp）' : ''), 'success');
        } catch (err) {
            showToast('场景图上传失败: ' + err.message, 'error');
        }
        e.target.value = '';
    });

    // 添加热点
    document.getElementById('btn-add-hotspot').addEventListener('click', addHotspot);

    // 删除选中热点
    document.getElementById('btn-delete-hotspot').addEventListener('click', deleteSelectedHotspot);

    // 添加产品
    document.getElementById('btn-add-product').addEventListener('click', addProductToHotspot);

    // 全局拖拽事件（热点位置拖拽）
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);

    // 场景图拖拽上传事件
    bindSceneDropEvents();
}

/** 更新场景编辑区内容 */
function updateSceneEditor() {
    const scene = getCurrentScene();
    const img = document.getElementById('scene-preview-img');
    const noHint = document.getElementById('no-scene-hint');
    const inputJa = document.getElementById('input-category-ja');
    const inputZh = document.getElementById('input-category-zh');

    if (!scene) {
        img.style.display = 'none';
        img.src = '';
        noHint.style.display = '';
        inputJa.value = '';
        inputZh.value = '';
        clearHotspotOverlay();
        return;
    }

    noHint.style.display = 'none';
    img.style.display = '';
    img.src = encodeURI(scene.image);
    inputJa.value = scene.category.ja || '';
    inputZh.value = scene.category.zh || '';

    // 等待图片加载后渲染热点
    if (img.complete) {
        renderHotspots();
    } else {
        img.onload = renderHotspots;
    }
}

/** 清除热点叠加层 */
function clearHotspotOverlay() {
    document.getElementById('hotspot-overlay').innerHTML = '';
}

/** 渲染当前场景的所有热点 */
function renderHotspots() {
    const overlay = document.getElementById('hotspot-overlay');
    overlay.innerHTML = '';

    const scene = getCurrentScene();
    if (!scene) return;

    scene.hotspots.forEach((hs, index) => {
        const el = createHotspotElement(hs, index);
        overlay.appendChild(el);
    });
}

/** 创建一个热点 DOM 元素 */
function createHotspotElement(hs, index) {
    const el = document.createElement('div');
    el.className = 'editor-hotspot' + (index === selectedHotspotIndex ? ' selected' : '');
    el.style.left = hs.x + '%';
    el.style.top = hs.y + '%';
    el.dataset.index = index;

    // 序号标记
    const marker = document.createElement('div');
    marker.className = 'hotspot-marker';
    // 使用带圈数字序号（①②③...）
    marker.textContent = toCircledNumber(index + 1);

    el.appendChild(marker);

    // 点击选中
    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        selectHotspot(index);
        startDrag(e, el, index);
    });

    return el;
}

/** 将数字转换为带圈数字 */
function toCircledNumber(n) {
    if (n >= 1 && n <= 20) {
        return String.fromCharCode(0x2460 + n - 1);
    }
    return n.toString();
}

/** 选中某个热点 */
function selectHotspot(index) {
    selectedHotspotIndex = index;

    // 更新热点高亮
    document.querySelectorAll('.editor-hotspot').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });

    // 更新坐标信息
    updateCoordInfo();

    // 更新右栏产品编辑器
    updateProductEditor();
}

/** 更新热点坐标显示 */
function updateCoordInfo() {
    const coordEl = document.getElementById('hotspot-coord-info');
    const scene = getCurrentScene();

    if (selectedHotspotIndex >= 0 && scene && scene.hotspots[selectedHotspotIndex]) {
        const hs = scene.hotspots[selectedHotspotIndex];
        coordEl.textContent = `热点 ${toCircledNumber(selectedHotspotIndex + 1)} 位置: (${hs.x.toFixed(1)}%, ${hs.y.toFixed(1)}%)`;
    } else {
        coordEl.textContent = '未选中热点';
    }
}

/** 添加热点 */
function addHotspot() {
    const scene = getCurrentScene();
    if (!scene) {
        showToast('请先选择一个场景', 'info');
        return;
    }

    const newId = generateHotspotId();
    const newHotspot = {
        id: newId,
        x: 50,
        y: 50,
        products: []
    };

    scene.hotspots.push(newHotspot);
    renderHotspots();
    selectHotspot(scene.hotspots.length - 1);
    showToast('已添加新热点', 'success');
}

/** 删除选中热点 */
function deleteSelectedHotspot() {
    const scene = getCurrentScene();
    if (!scene || selectedHotspotIndex < 0) {
        showToast('请先选中一个热点', 'info');
        return;
    }

    scene.hotspots.splice(selectedHotspotIndex, 1);
    selectedHotspotIndex = -1;
    renderHotspots();
    updateCoordInfo();
    updateProductEditor();
    showToast('热点已删除', 'success');
}

// ==================== 热点拖拽 ====================

/** 开始拖拽 */
function startDrag(e, el, index) {
    isDragging = true;
    dragHotspotEl = el;
    dragHotspotIndex = index;
    el.classList.add('dragging');
    e.preventDefault();
}

/** 拖拽中 */
function onDrag(e) {
    if (!isDragging || !dragHotspotEl) return;

    const container = document.getElementById('scene-image-container');
    const rect = container.getBoundingClientRect();

    // 计算百分比坐标
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    // 限制范围
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // 更新 DOM 位置
    dragHotspotEl.style.left = x + '%';
    dragHotspotEl.style.top = y + '%';

    // 更新数据
    const scene = getCurrentScene();
    if (scene && scene.hotspots[dragHotspotIndex]) {
        scene.hotspots[dragHotspotIndex].x = Math.round(x * 10) / 10;
        scene.hotspots[dragHotspotIndex].y = Math.round(y * 10) / 10;
    }

    // 更新坐标显示
    updateCoordInfo();
}

/** 结束拖拽 */
function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (dragHotspotEl) {
        dragHotspotEl.classList.remove('dragging');
    }
    dragHotspotEl = null;
    dragHotspotIndex = -1;
}

// ==================== 场景图拖拽上传 ====================

/** 场景图拖拽计数器，用于解决子元素触发 dragleave 的问题 */
let sceneDragCounter = 0;

/** 绑定场景图区域的文件拖拽上传事件 */
function bindSceneDropEvents() {
    const container = document.getElementById('scene-image-container');
    const overlay = document.getElementById('scene-drop-overlay');

    // 阻止浏览器默认拖拽行为
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    // 拖拽进入
    container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 只在拖拽文件时显示覆盖层，忽略热点拖拽
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            sceneDragCounter++;
            if (currentSceneIndex >= 0) {
                overlay.classList.remove('hidden');
            }
        }
    });

    // 拖拽离开
    container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();

        sceneDragCounter--;
        if (sceneDragCounter <= 0) {
            sceneDragCounter = 0;
            overlay.classList.add('hidden');
        }
    });

    // 释放文件
    container.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        sceneDragCounter = 0;
        overlay.classList.add('hidden');

        if (currentSceneIndex < 0) {
            showToast('请先选择一个场景', 'info');
            return;
        }

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!isImageFile(file)) {
            showToast('只支持图片格式文件', 'error');
            return;
        }

        // 上传图片
        const scene = getCurrentScene();
        const category = getSceneCategory(scene);
        const imgEl = document.getElementById('scene-preview-img');
        imgEl.classList.add('upload-loading');

        try {
            const result = await uploadImage(file, 'scene', category);
            mappingData.scenes[currentSceneIndex].image = result.path;
            await loadImageList();
            updateSceneEditor();
            renderSceneList();
            showToast('场景图已更新' + (result.converted ? '（已转换为webp）' : ''), 'success');
        } catch (err) {
            showToast('场景图上传失败: ' + err.message, 'error');
        } finally {
            imgEl.classList.remove('upload-loading');
        }
    });
}

// ==================== 右栏产品编辑器 ====================

/** 更新产品编辑器 */
function updateProductEditor() {
    const scene = getCurrentScene();
    const titleEl = document.getElementById('product-editor-title');
    const noHint = document.getElementById('no-hotspot-hint');
    const listEl = document.getElementById('product-list-editor');
    const footer = document.getElementById('product-editor-footer');

    if (!scene || selectedHotspotIndex < 0 || !scene.hotspots[selectedHotspotIndex]) {
        titleEl.textContent = '热点产品关联';
        noHint.style.display = '';
        listEl.style.display = 'none';
        footer.style.display = 'none';
        return;
    }

    // 调试日志：确认数据流是否正确
    console.log('[调试] updateProductEditor:', { selectedHotspotIndex, sceneId: scene?.id, hotspotsCount: scene?.hotspots?.length });

    const hs = scene.hotspots[selectedHotspotIndex];
    titleEl.textContent = `热点 ${toCircledNumber(selectedHotspotIndex + 1)} 关联产品`;
    noHint.style.display = 'none';
    listEl.style.display = '';
    footer.style.display = '';

    renderProductList(hs);
}

/** 渲染产品列表 */
function renderProductList(hotspot) {
    const listEl = document.getElementById('product-list-editor');
    listEl.innerHTML = '';

    // 防御性检查：热点为空或无关联产品时显示提示
    if (!hotspot || !Array.isArray(hotspot.products) || hotspot.products.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">此热点暂无关联产品，请点击下方按钮添加</div>';
        return;
    }

    hotspot.products.forEach((product, index) => {
        const item = createProductEditItem(product, index, hotspot);
        listEl.appendChild(item);
    });
}

/** 创建一个产品编辑项 */
function createProductEditItem(product, index, hotspot) {
    const item = document.createElement('div');
    item.className = 'product-edit-item';

    // 头部：缩略图 + 字段区
    const header = document.createElement('div');
    header.className = 'product-edit-header';

    // 缩略图（同时作为拖拽上传区域）
    const thumb = document.createElement('img');
    thumb.className = 'product-edit-thumb';
    thumb.src = encodeURI(product.image);
    thumb.alt = product.name.zh || '';
    thumb.onerror = () => { thumb.src = ''; thumb.style.background = '#e2e8f0'; };
    thumb.title = '拖拽图片到此处更换';

    // 产品缩略图拖拽上传事件
    let thumbDragCounter = 0;
    thumb.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    thumb.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            thumbDragCounter++;
            thumb.classList.add('drag-over');
        }
    });
    thumb.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        thumbDragCounter--;
        if (thumbDragCounter <= 0) {
            thumbDragCounter = 0;
            thumb.classList.remove('drag-over');
        }
    });
    thumb.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        thumbDragCounter = 0;
        thumb.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!isImageFile(file)) {
            showToast('只支持图片格式文件', 'error');
            return;
        }

        // 上传产品图
        thumb.classList.add('upload-loading');
        try {
            const result = await uploadImage(file, 'product');
            product.image = result.path;
            thumb.src = encodeURI(result.path);
            await loadImageList();
            showToast('产品图已更新' + (result.converted ? '（已转换为webp）' : ''), 'success');
        } catch (err) {
            showToast('产品图上传失败: ' + err.message, 'error');
        } finally {
            thumb.classList.remove('upload-loading');
        }
    });

    // 字段区
    const fields = document.createElement('div');
    fields.className = 'product-edit-fields';

    // 日文名称
    const nameJa = createProductField('名称(日文)', product.name.ja, (val) => {
        product.name.ja = val;
    });
    fields.appendChild(nameJa);

    // 中文名称
    const nameZh = createProductField('名称(中文)', product.name.zh, (val) => {
        product.name.zh = val;
    });
    fields.appendChild(nameZh);

    header.appendChild(thumb);
    header.appendChild(fields);

    // 产品图片路径选择
    const imgField = createProductSelectField('产品图片', product.image, imageFiles, (val) => {
        product.image = val;
        thumb.src = encodeURI(val);
    });

    // 描述文件路径选择（日文和中文分别选择）
    const descJaValue = (product.descriptionFile && typeof product.descriptionFile === 'object')
        ? product.descriptionFile.ja || ''
        : (typeof product.descriptionFile === 'string' ? product.descriptionFile : '');
    const descZhValue = (product.descriptionFile && typeof product.descriptionFile === 'object')
        ? product.descriptionFile.zh || ''
        : (typeof product.descriptionFile === 'string' ? product.descriptionFile : '');

    // 筛选日文描述文件（文件名包含 _jp 或 .ja.）
    const descJaFiles = descFiles.filter(f => {
        const name = f.split('/').pop();
        return name.includes('_jp') || name.includes('.ja.');
    });
    // 筛选中文描述文件（文件名包含 _cn 或 .zh.）
    const descZhFiles = descFiles.filter(f => {
        const name = f.split('/').pop();
        return name.includes('_cn') || name.includes('.zh.');
    });

    const descJaField = createProductSelectField('描述文件(日文)', descJaValue, descJaFiles, (val) => {
        // 确保 descriptionFile 是对象格式
        if (!product.descriptionFile || typeof product.descriptionFile === 'string') {
            product.descriptionFile = { ja: '', zh: '' };
        }
        product.descriptionFile.ja = val;
    });

    const descZhField = createProductSelectField('描述文件(中文)', descZhValue, descZhFiles, (val) => {
        // 确保 descriptionFile 是对象格式
        if (!product.descriptionFile || typeof product.descriptionFile === 'string') {
            product.descriptionFile = { ja: '', zh: '' };
        }
        product.descriptionFile.zh = val;
    });

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.className = 'product-edit-delete';
    delBtn.textContent = '×';
    delBtn.title = '删除此产品';
    delBtn.addEventListener('click', () => {
        hotspot.products.splice(index, 1);
        renderProductList(hotspot);
        showToast('产品已移除', 'success');
    });

    item.appendChild(header);

    // 产品引用信息：显示该产品被哪些场景引用
    const usageData = getProductUsageCount(product.image);
    if (usageData.count > 0) {
        const usageInfo = document.createElement('div');
        usageInfo.className = 'product-usage-info';
        usageInfo.innerHTML = `被 <span class="usage-count">${usageData.scenes.length}</span> 个场景引用`;
        // 点击展开/折叠引用详情
        usageInfo.addEventListener('click', () => {
            const existing = usageInfo.querySelector('.product-usage-scenes');
            if (existing) {
                existing.remove();
            } else {
                const detail = document.createElement('div');
                detail.className = 'product-usage-scenes';
                usageData.scenes.forEach(s => {
                    const si = document.createElement('div');
                    si.className = 'usage-scene-item';
                    si.textContent = '· ' + s;
                    detail.appendChild(si);
                });
                usageInfo.appendChild(detail);
            }
        });
        item.appendChild(usageInfo);
    }

    item.appendChild(imgField);
    item.appendChild(descJaField);
    item.appendChild(descZhField);
    item.appendChild(delBtn);

    return item;
}

/** 创建文本输入字段 */
function createProductField(label, value, onChange) {
    const field = document.createElement('div');
    field.className = 'product-field';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.addEventListener('input', (e) => {
        onChange(e.target.value);
    });

    field.appendChild(lbl);
    field.appendChild(input);
    return field;
}

/** 创建下拉选择字段（带可选列表） */
function createProductSelectField(label, currentValue, options, onChange) {
    const field = document.createElement('div');
    field.className = 'product-field';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const select = document.createElement('select');
    
    // 当前值选项
    const currentOpt = document.createElement('option');
    currentOpt.value = currentValue || '';
    currentOpt.textContent = currentValue || '-- 请选择 --';
    currentOpt.selected = true;
    select.appendChild(currentOpt);

    // 可选列表
    options.forEach(opt => {
        if (opt === currentValue) return; // 跳过当前值（已添加）
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        onChange(e.target.value);
    });

    field.appendChild(lbl);
    field.appendChild(select);
    return field;
}

/** 添加产品到当前热点 */
function addProductToHotspot() {
    const scene = getCurrentScene();
    if (!scene || selectedHotspotIndex < 0) return;

    const hs = scene.hotspots[selectedHotspotIndex];
    const newProduct = {
        name: { ja: '', zh: '' },
        image: '',
        descriptionFile: { ja: '', zh: '' }
    };

    hs.products.push(newProduct);
    renderProductList(hs);
    showToast('已添加新产品', 'success');

    // 滚动到底部
    const content = document.getElementById('product-editor-content');
    content.scrollTop = content.scrollHeight;
}

// ==================== 场景操作 ====================

/** 删除场景 */
function deleteScene(index) {
    if (!confirm(`确定删除场景「${mappingData.scenes[index].category.zh}」吗？`)) return;

    mappingData.scenes.splice(index, 1);

    // 调整选中索引
    if (currentSceneIndex === index) {
        currentSceneIndex = -1;
        selectedHotspotIndex = -1;
        updateSceneEditor();
        updateProductEditor();
    } else if (currentSceneIndex > index) {
        currentSceneIndex--;
    }

    renderSceneList();
    showToast('场景已删除', 'success');
}

/** 获取当前选中场景 */
function getCurrentScene() {
    if (currentSceneIndex >= 0 && mappingData && mappingData.scenes[currentSceneIndex]) {
        return mappingData.scenes[currentSceneIndex];
    }
    return null;
}

// ==================== 添加场景对话框 ====================

function bindDialogEvents() {
    // 打开对话框
    document.getElementById('btn-add-scene').addEventListener('click', () => {
        dialogSelectedFile = null;
        document.getElementById('dialog-category-ja').value = '';
        document.getElementById('dialog-category-zh').value = '';
        resetDialogDropZone();
        document.getElementById('dialog-overlay').classList.remove('hidden');
    });

    // 取消
    document.getElementById('btn-dialog-cancel').addEventListener('click', closeDialog);

    // 点击遮罩关闭
    document.getElementById('dialog-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'dialog-overlay') closeDialog();
    });

    // 拖拽区域点击选择文件
    document.getElementById('dialog-drop-zone').addEventListener('click', () => {
        document.getElementById('dialog-scene-image').click();
    });

    // 文件选择变化
    document.getElementById('dialog-scene-image').addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        if (!isImageFile(file)) {
            showToast('请选择图片文件', 'error');
            e.target.value = '';
            return;
        }
        dialogSelectedFile = file;
        updateDialogDropZone(file.name);
    });

    // 对话框拖拽区域事件
    bindDialogDropEvents();

    // 确认添加
    document.getElementById('btn-dialog-confirm').addEventListener('click', confirmAddScene);
}

/** 关闭对话框 */
function closeDialog() {
    document.getElementById('dialog-overlay').classList.add('hidden');
    dialogSelectedFile = null;
    resetDialogDropZone();
}

/** 重置对话框拖拽区域到初始状态 */
function resetDialogDropZone() {
    const dropZone = document.getElementById('dialog-drop-zone');
    if (!dropZone) return;
    dropZone.classList.remove('drag-over');
    dropZone.innerHTML = `
        <div class="drop-zone-icon">&#128194;</div>
        <div>将场景图拖到此处</div>
        <div class="drop-zone-hint">或点击选择文件</div>
    `;
}

/** 更新对话框拖拽区域显示已选择的文件名 */
function updateDialogDropZone(filename) {
    const dropZone = document.getElementById('dialog-drop-zone');
    if (!dropZone) return;
    dropZone.innerHTML = `
        <div style="color:#22c55e;font-size:18px;">&#10003;</div>
        <div style="color:#334155;font-weight:500;">${filename}</div>
        <div class="drop-zone-hint">点击重新选择</div>
    `;
}

/** 绑定对话框拖拽区域的拖放事件 */
function bindDialogDropEvents() {
    const dropZone = document.getElementById('dialog-drop-zone');
    let dialogDragCounter = 0;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            dialogDragCounter++;
            dropZone.classList.add('drag-over');
        }
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogDragCounter--;
        if (dialogDragCounter <= 0) {
            dialogDragCounter = 0;
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogDragCounter = 0;
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!isImageFile(file)) {
            showToast('只支持图片格式文件', 'error');
            return;
        }

        dialogSelectedFile = file;
        updateDialogDropZone(file.name);
    });
}

/** 确认添加场景 */
async function confirmAddScene() {
    const ja = document.getElementById('dialog-category-ja').value.trim();
    const zh = document.getElementById('dialog-category-zh').value.trim();

    if (!ja && !zh) {
        showToast('请输入至少一个分类名', 'error');
        return;
    }

    let imagePath = '';

    // 如果选择了图片文件，先上传
    if (dialogSelectedFile) {
        // 构造场景分类目录名：使用中文分类名 + "场景"
        const categoryDir = zh ? zh + '场景' : '';
        try {
            const result = await uploadImage(dialogSelectedFile, 'scene', categoryDir);
            imagePath = result.path;
            await loadImageList();
        } catch (err) {
            showToast('场景图上传失败: ' + err.message, 'error');
            return;
        }
    }

    // 生成新场景
    const newScene = {
        id: generateSceneId(),
        category: { ja: ja || '', zh: zh || '' },
        image: imagePath,
        hotspots: []
    };

    mappingData.scenes.push(newScene);

    // 关闭对话框
    closeDialog();

    // 刷新列表并选中新场景
    renderSceneList();
    selectScene(mappingData.scenes.length - 1);

    showToast('场景已添加', 'success');
}

// ==================== ID 生成 ====================

/** 生成场景 ID：scene_NNN */
function generateSceneId() {
    let maxNum = 0;
    mappingData.scenes.forEach(s => {
        const match = s.id.match(/scene_(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    return 'scene_' + String(maxNum + 1).padStart(3, '0');
}

/** 生成热点 ID：hs_NNN */
function generateHotspotId() {
    let maxNum = 0;
    mappingData.scenes.forEach(s => {
        s.hotspots.forEach(hs => {
            const match = hs.id.match(/hs_(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
    });
    return 'hs_' + String(maxNum + 1).padStart(3, '0');
}

// ==================== 图片上传 ====================

/** 上传图片到服务器，自动转换为 webp 格式
 * @param {File} file - 要上传的文件对象
 * @param {string} type - 上传类型：'scene' 或 'product'
 * @param {string} category - 场景分类文件夹名（type=scene 时必填）
 * @returns {Promise<Object>} 服务器返回的结果对象
 */
async function uploadImage(file, type = 'product', category = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type); // 'scene' 或 'product'
    formData.append('category', category); // 场景分类文件夹名
    formData.append('filename', file.name); // 原始文件名（服务端会转换后缀）

    const resp = await fetch('/api/upload-image', { method: 'POST', body: formData });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || '上传失败');
    return result;
}

/** 从场景图片路径中提取分类目录名
 * 例如 "场景图/便利店场景/便利店场景1.webp" -> "便利店场景"
 */
function getSceneCategory(scene) {
    if (!scene || !scene.image) return '';
    const parts = scene.image.split('/');
    if (parts.length >= 2 && parts[0] === '场景图') {
        return parts[1];
    }
    return '';
}

/** 获取产品被引用的统计信息
 * @param {string} productImage - 产品图片路径
 * @returns {{ count: number, scenes: string[] }} 引用次数和引用场景列表
 */
function getProductUsageCount(productImage) {
    let count = 0;
    const scenes = [];
    mappingData.scenes.forEach(scene => {
        let foundInScene = false;
        if (scene.hotspots) {
            scene.hotspots.forEach(hs => {
                if (hs.products) {
                    hs.products.forEach(p => {
                        if (p.image === productImage) {
                            count++;
                            foundInScene = true;
                        }
                    });
                }
            });
        }
        if (foundInScene) {
            scenes.push(scene.category.zh || scene.category.ja || scene.id);
        }
    });
    return { count, scenes };
}

/** 验证文件是否为图片格式 */
function isImageFile(file) {
    return file && file.type && file.type.startsWith('image/');
}

// ==================== Toast 提示 ====================

/** 显示 toast 提示 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;

    container.appendChild(toast);

    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ==================== 窗口调整时重新渲染热点 ====================
window.addEventListener('resize', () => {
    if (currentSceneIndex >= 0) {
        renderHotspots();
    }
});
