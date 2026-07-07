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
let sceneImageSelectedFile = null;  // 添加场景图对话框中选择的图片文件对象
let productsData = [];              // 产品列表（从 /api/list-products 加载）
let currentProductIndex = -1;       // 当前选中产品索引
let productSelectedFile = null;     // 产品图片上传区选择的文件
let productEditingNew = false;      // 是否新建产品模式
let isDirty = false;                // 是否有未保存的更改
let categoryInputSaveTimer = null;  // 分类名输入防抖保存计时器

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    // 绑定事件
    bindToolbarEvents();
    bindEditorEvents();
    bindDialogEvents();
    bindTabEvents();
    bindProductEvents();

    // 加载数据
    await loadMappingData();
    await loadImageList();
    await loadDescriptionList();
    await loadProductList();

    // 渲染场景列表
    renderSceneList();

    // 离开页面前警告未保存的更改
    window.addEventListener('beforeunload', (e) => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});

// ==================== 数据加载 ====================

/** 从服务器加载 mapping.json 数据（带缓存控制） */
async function loadMappingData() {
    try {
        // 添加时间戳查询参数防止浏览器缓存
        const resp = await fetch('mapping.json?t=' + Date.now());
        if (!resp.ok) throw new Error('加载失败');
        mappingData = await resp.json();
        markClean();
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

/** 标记数据已修改（脏状态） */
function markDirty() {
    isDirty = true;
    const indicator = document.getElementById('dirty-indicator');
    if (indicator) indicator.style.display = '';
}

/** 标记数据已保存（清除脏状态） */
function markClean() {
    isDirty = false;
    const indicator = document.getElementById('dirty-indicator');
    if (indicator) indicator.style.display = 'none';
}

/** 保存 mapping 数据到服务器
 * @returns {Promise<boolean>} true=保存成功，false=保存失败
 */
async function saveMapping() {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = '保存中...';
    statusEl.className = '';

    let success = false;
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
        markClean();
        success = true;
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

    return success;
}

// ==================== 场景排序（拖拽） ====================

/** 拖拽状态：null 表示未拖拽，{ type, ... } 表示正在拖拽 */
let dragState = null;

/** 计算场景分组（按文件夹名），返回有序分组结构
 * @returns {Array<{name: string, indices: number[]}>} 分组列表
 */
function computeSceneGroups() {
    const groups = [];
    const groupMap = {};
    mappingData.scenes.forEach((scene, index) => {
        const groupName = getSceneGroupName(scene);
        if (groupMap[groupName] === undefined) {
            groupMap[groupName] = groups.length;
            groups.push({ name: groupName, indices: [] });
        }
        groups[groupMap[groupName]].indices.push(index);
    });
    return groups;
}

/** 获取当前选中场景的 ID（用于排序后恢复选中状态） */
function getCurrentSceneId() {
    if (currentSceneIndex >= 0 && mappingData.scenes[currentSceneIndex]) {
        return mappingData.scenes[currentSceneIndex].id;
    }
    return null;
}

/** 根据场景 ID 恢复 currentSceneIndex */
function restoreCurrentSceneIndex(sceneId) {
    if (!sceneId) {
        currentSceneIndex = -1;
        return;
    }
    currentSceneIndex = mappingData.scenes.findIndex(s => s.id === sceneId);
}

/** 重排分组：将 fromGroupIdx 的分组移动到指定位置
 * @param {number} fromGroupIdx - 源分组索引
 * @param {number} toGroupIdx - 目标分组索引
 * @param {boolean} insertBefore - true=插入到目标前，false=插入到目标后
 */
function reorderGroups(fromGroupIdx, toGroupIdx, insertBefore) {
    if (fromGroupIdx === toGroupIdx) return;
    const groups = computeSceneGroups();
    const moved = groups.splice(fromGroupIdx, 1)[0];

    let targetIdx = toGroupIdx;
    if (fromGroupIdx < toGroupIdx) targetIdx--;
    if (!insertBefore) targetIdx++;
    targetIdx = Math.max(0, Math.min(targetIdx, groups.length));
    groups.splice(targetIdx, 0, moved);

    const currentId = getCurrentSceneId();
    const newScenes = [];
    groups.forEach(g => g.indices.forEach(i => newScenes.push(mappingData.scenes[i])));
    mappingData.scenes = newScenes;
    restoreCurrentSceneIndex(currentId);
    renderSceneList();
    // 自动保存排序变更
    saveMapping();
}

/** 重排组内场景：将 fromIdx 的场景移动到指定位置
 * @param {number} fromIdx - 源场景索引
 * @param {number} toIdx - 目标场景索引
 * @param {boolean} insertBefore - true=插入到目标前，false=插入到目标后
 */
function reorderScenes(fromIdx, toIdx, insertBefore) {
    if (fromIdx === toIdx) return;
    const currentId = getCurrentSceneId();
    const moved = mappingData.scenes.splice(fromIdx, 1)[0];

    let targetIdx = toIdx;
    if (fromIdx < toIdx) targetIdx--;
    if (!insertBefore) targetIdx++;
    targetIdx = Math.max(0, Math.min(targetIdx, mappingData.scenes.length));
    mappingData.scenes.splice(targetIdx, 0, moved);

    restoreCurrentSceneIndex(currentId);
    renderSceneList();
    // 自动保存排序变更
    saveMapping();
}

/** 清除所有拖拽悬停样式 */
function clearDragOverStyles() {
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
}

/** 判断鼠标在元素的上半还是下半
 * @returns {boolean} true=上半部分
 */
function isMouseInTopHalf(e, el) {
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
}

// ==================== 场景列表渲染 ====================

/** 渲染左栏场景列表（按文件夹分组折叠，支持拖拽排序） */
function renderSceneList() {
    const listEl = document.getElementById('scene-list');
    listEl.innerHTML = '';

    // 使用统一的分组计算函数
    const groups = computeSceneGroups();

    // 渲染每个分组
    groups.forEach((group, groupIndex) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'scene-group';

        // 分组标题
        const header = document.createElement('div');
        header.className = 'scene-group-header';
        header.draggable = true;
        header.dataset.groupIndex = groupIndex;

        // 拖拽手柄
        const handle = document.createElement('span');
        handle.className = 'scene-group-drag-handle';
        handle.textContent = '⠿';
        handle.title = '拖拽调整大类顺序';

        const arrow = document.createElement('span');
        arrow.className = 'scene-group-arrow';
        arrow.textContent = '▼';

        const name = document.createElement('span');
        name.className = 'scene-group-name';
        name.textContent = group.name;

        const count = document.createElement('span');
        count.className = 'scene-group-count';
        count.textContent = `(${group.indices.length})`;

        header.appendChild(handle);
        header.appendChild(arrow);
        header.appendChild(name);
        header.appendChild(count);

        // 点击折叠/展开（排除拖拽手柄区域）
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('scene-group-drag-handle')) return;
            groupEl.classList.toggle('collapsed');
        });

        // --- 分组拖拽排序（大类排序）---
        header.addEventListener('dragstart', (e) => {
            dragState = { type: 'group', fromGroupIndex: groupIndex };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'group');
            header.classList.add('dragging');
        });

        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
            clearDragOverStyles();
            dragState = null;
        });

        header.addEventListener('dragover', (e) => {
            if (!dragState || dragState.type !== 'group') return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            clearDragOverStyles();
            if (isMouseInTopHalf(e, header)) {
                header.classList.add('drag-over-top');
            } else {
                header.classList.add('drag-over-bottom');
            }
        });

        header.addEventListener('dragleave', (e) => {
            const rect = header.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right ||
                e.clientY < rect.top || e.clientY >= rect.bottom) {
                header.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });

        header.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragState || dragState.type !== 'group') return;
            const insertBefore = isMouseInTopHalf(e, header);
            reorderGroups(dragState.fromGroupIndex, groupIndex, insertBefore);
            clearDragOverStyles();
            dragState = null;
        });

        // 分组内容区
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'scene-group-items';

        group.indices.forEach(sceneIndex => {
            const item = createSceneItem(mappingData.scenes[sceneIndex], sceneIndex, group.name);
            itemsContainer.appendChild(item);
        });

        groupEl.appendChild(header);
        groupEl.appendChild(itemsContainer);
        listEl.appendChild(groupEl);
    });
}

/** 创建单个场景项 DOM 元素
 * @param {Object} scene - 场景数据
 * @param {number} index - 场景在 scenes 数组中的索引
 * @param {string} groupName - 所属分组名（用于组内排序约束）
 */
function createSceneItem(scene, index, groupName) {
    const item = document.createElement('div');
    item.className = 'scene-item' + (index === currentSceneIndex ? ' active' : '');
    item.dataset.index = index;
    item.dataset.groupName = groupName;
    item.draggable = true;

    // 缩略图
    const thumb = document.createElement('img');
    thumb.className = 'scene-item-thumb';
    if (scene.image) {
        thumb.src = encodeURI(scene.image);
    } else {
        thumb.style.background = '#e2e8f0';
    }
    thumb.alt = scene.category.zh || '';
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

    // --- 场景项拖拽排序（组内排序）---
    item.addEventListener('dragstart', (e) => {
        dragState = { type: 'scene', fromIndex: index, fromGroupName: groupName };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'scene');
        item.classList.add('dragging');
        e.stopPropagation();
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        clearDragOverStyles();
        dragState = null;
    });

    item.addEventListener('dragover', (e) => {
        if (!dragState || dragState.type !== 'scene') return;
        if (dragState.fromGroupName !== groupName) return; // 仅同组可排序
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        clearDragOverStyles();
        if (isMouseInTopHalf(e, item)) {
            item.classList.add('drag-over-top');
        } else {
            item.classList.add('drag-over-bottom');
        }
    });

    item.addEventListener('dragleave', (e) => {
        const rect = item.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right ||
            e.clientY < rect.top || e.clientY >= rect.bottom) {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragState || dragState.type !== 'scene') return;
        if (dragState.fromGroupName !== groupName) return;
        const insertBefore = isMouseInTopHalf(e, item);
        reorderScenes(dragState.fromIndex, index, insertBefore);
        clearDragOverStyles();
        dragState = null;
    });

    // 点击切换场景
    item.addEventListener('click', () => {
        selectScene(index);
    });

    return item;
}

/** 从场景数据中提取分组名
 * 优先使用 category.zh，为空时从图片路径提取子文件夹名
 */
function getSceneGroupName(scene) {
    if (!scene) return '未分类';
    if (scene.category && scene.category.zh) return scene.category.zh;
    if (scene.image) {
        const parts = scene.image.split('/');
        if (parts.length >= 2 && parts[0] === '场景图') return parts[1];
    }
    return '未分类';
}

/** 获取场景的显示名称
 * 优先使用 name.zh，为空时从图片文件名提取，最后回退到分类名
 */
function getSceneDisplayName(scene) {
    if (!scene) return '';
    if (scene.name && scene.name.zh) return scene.name.zh;
    if (scene.name && scene.name.ja) return scene.name.ja;
    if (scene.image) {
        const filename = scene.image.split('/').pop();
        const nameWithoutExt = filename.replace(/\.\w+$/, '');
        if (nameWithoutExt) return nameWithoutExt;
    }
    return (scene.category && scene.category.zh) || (scene.category && scene.category.ja) || scene.id;
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
    // 分类名输入框 - 实时更新数据 + 防抖自动保存
    document.getElementById('input-category-ja').addEventListener('input', (e) => {
        if (currentSceneIndex < 0) return;
        mappingData.scenes[currentSceneIndex].category.ja = e.target.value;
        updateSceneListItem(currentSceneIndex);
        markDirty();
        // 防抖自动保存：停止输入1秒后保存
        clearTimeout(categoryInputSaveTimer);
        categoryInputSaveTimer = setTimeout(() => saveMapping(), 1000);
    });

    document.getElementById('input-category-zh').addEventListener('input', (e) => {
        if (currentSceneIndex < 0) return;
        mappingData.scenes[currentSceneIndex].category.zh = e.target.value;
        updateSceneListItem(currentSceneIndex);
        markDirty();
        // 防抖自动保存：停止输入1秒后保存
        clearTimeout(categoryInputSaveTimer);
        categoryInputSaveTimer = setTimeout(() => saveMapping(), 1000);
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
            // 自动保存
            await saveMapping();
        } catch (err) {
            showToast('场景图上传失败: ' + err.message, 'error');
        }
        e.target.value = '';
    });

    // 添加场景图
    document.getElementById('btn-add-scene-image').addEventListener('click', openSceneImageDialog);

    // 重命名场景图
    document.getElementById('btn-rename-scene-image').addEventListener('click', openRenameSceneDialog);

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

    inputJa.value = scene.category.ja || '';
    inputZh.value = scene.category.zh || '';

    if (!scene.image) {
        // 场景没有图片，显示提示
        img.style.display = 'none';
        img.src = '';
        noHint.style.display = '';
        noHint.textContent = '此场景还没有场景图，请点击"添加场景图"上传图片';
        clearHotspotOverlay();
        return;
    }

    noHint.style.display = 'none';
    img.style.display = '';
    img.src = encodeURI(scene.image);

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
async function addHotspot() {
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
    renderSceneList(); // 更新场景列表中的热点计数
    showToast('已添加新热点', 'success');

    // 自动保存
    await saveMapping();
}

/** 删除选中热点 */
async function deleteSelectedHotspot() {
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
    renderSceneList(); // 更新场景列表中的热点计数
    showToast('热点已删除', 'success');

    // 自动保存
    await saveMapping();
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
async function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (dragHotspotEl) {
        dragHotspotEl.classList.remove('dragging');
    }
    dragHotspotEl = null;
    dragHotspotIndex = -1;

    // 拖拽结束后自动保存热点位置
    await saveMapping();
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
            // 自动保存
            await saveMapping();
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

/** 创建一个产品编辑项（下拉选择产品） */
function createProductEditItem(product, index, hotspot) {
    const item = document.createElement('div');
    item.className = 'product-edit-item';

    // 产品选择下拉框
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'product-field';

    const selectLabel = document.createElement('label');
    selectLabel.textContent = '选择产品';
    selectWrapper.appendChild(selectLabel);

    const select = document.createElement('select');
    select.className = 'product-select-dropdown';

    // 默认选项
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- 请选择产品 --';
    select.appendChild(defaultOpt);

    // 按 category > subcategory 分组加载产品列表
    const groups = {};
    productsData.forEach(p => {
        const cat = p.category || '未分类';
        const subcat = p.subcategory || '未分类';
        if (!groups[cat]) groups[cat] = {};
        if (!groups[cat][subcat]) groups[cat][subcat] = [];
        groups[cat][subcat].push(p);
    });

    Object.keys(groups).sort().forEach(catName => {
        const catGroup = document.createElement('optgroup');
        catGroup.label = catName;
        Object.keys(groups[catName]).sort().forEach(subcatName => {
            groups[catName][subcatName].forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.imagePath;
                opt.textContent = p.nameZh || p.nameJa || '未命名';
                if (product.image && product.image === p.imagePath) {
                    opt.selected = true;
                }
                catGroup.appendChild(opt);
            });
        });
        select.appendChild(catGroup);
    });

    // 如果当前产品图片不在列表中，添加自定义选项
    if (product.image && !productsData.some(p => p.imagePath === product.image)) {
        const customOpt = document.createElement('option');
        customOpt.value = product.image;
        customOpt.textContent = (product.name.zh || product.name.ja || product.image) + ' (未在产品管理中)';
        customOpt.selected = true;
        select.appendChild(customOpt);
    }

    // 缩略图（只读）
    const thumb = document.createElement('img');
    thumb.className = 'product-edit-thumb';
    thumb.src = encodeURI(product.image || '');
    thumb.onerror = () => { thumb.src = ''; thumb.style.background = '#e2e8f0'; };

    // 产品名称（只读）
    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'product-name-text';
    nameDisplay.textContent = product.name.zh || product.name.ja || '';

    // 只读信息区
    const readonlyInfo = document.createElement('div');
    readonlyInfo.className = 'product-edit-readonly-info';
    readonlyInfo.style.display = product.image ? 'flex' : 'none';
    readonlyInfo.appendChild(thumb);
    readonlyInfo.appendChild(nameDisplay);

    // "在产品管理中编辑" 提示
    const hint = document.createElement('div');
    hint.className = 'product-select-hint';
    hint.textContent = '产品信息请在"产品管理"标签页中编辑';
    hint.style.display = product.image ? 'block' : 'none';

    // 下拉选择事件
    select.addEventListener('change', async (e) => {
        const selectedPath = e.target.value;
        const selected = productsData.find(p => p.imagePath === selectedPath);
        if (selected) {
            product.name = { ja: selected.nameJa || '', zh: selected.nameZh || '' };
            product.image = selected.imagePath;
            product.descriptionFile = {
                ja: selected.descJpPath || '',
                zh: selected.descCnPath || ''
            };
            thumb.src = encodeURI(selected.imagePath);
            nameDisplay.textContent = selected.nameZh || selected.nameJa || '未命名';
            readonlyInfo.style.display = 'flex';
            hint.style.display = 'block';
        } else {
            product.name = { ja: '', zh: '' };
            product.image = '';
            product.descriptionFile = { ja: '', zh: '' };
            thumb.src = '';
            nameDisplay.textContent = '';
            readonlyInfo.style.display = 'none';
            hint.style.display = 'none';
        }
        // 自动保存产品关联变更
        await saveMapping();
    });

    selectWrapper.appendChild(select);
    item.appendChild(selectWrapper);
    item.appendChild(readonlyInfo);
    item.appendChild(hint);

    // 产品引用信息：显示该产品被哪些场景引用
    if (product.image) {
        const usageData = getProductUsageCount(product.image);
        if (usageData.count > 0) {
            const usageInfo = document.createElement('div');
            usageInfo.className = 'product-usage-info';
            usageInfo.innerHTML = '被 <span class="usage-count">' + usageData.scenes.length + '</span> 个场景引用';
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
    }

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.className = 'product-edit-delete';
    delBtn.textContent = '×';
    delBtn.title = '删除此产品';
    delBtn.addEventListener('click', async () => {
        hotspot.products.splice(index, 1);
        renderProductList(hotspot);
        renderSceneList(); // 更新场景列表中的产品计数
        showToast('产品已移除', 'success');
        // 自动保存
        await saveMapping();
    });
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

    if (productsData.length === 0) {
        showToast('产品列表为空，请先在"产品管理"中添加产品', 'error');
        return;
    }

    const hs = scene.hotspots[selectedHotspotIndex];
    const newProduct = {
        name: { ja: '', zh: '' },
        image: '',
        descriptionFile: { ja: '', zh: '' }
    };

    hs.products.push(newProduct);
    renderProductList(hs);
    showToast('请从下拉列表中选择产品', 'info');

    // 滚动到底部
    const content = document.getElementById('product-editor-content');
    content.scrollTop = content.scrollHeight;
}

// ==================== 场景操作 ====================

/** 删除场景 */
async function deleteScene(index) {
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

    // 自动保存
    await saveMapping();
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
    // 打开添加场景对话框
    document.getElementById('btn-add-scene').addEventListener('click', () => {
        document.getElementById('dialog-category-ja').value = '';
        document.getElementById('dialog-category-zh').value = '';
        document.getElementById('dialog-overlay').classList.remove('hidden');
    });

    // 取消
    document.getElementById('btn-dialog-cancel').addEventListener('click', closeDialog);

    // 点击遮罩关闭
    document.getElementById('dialog-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'dialog-overlay') closeDialog();
    });

    // 确认添加场景
    document.getElementById('btn-dialog-confirm').addEventListener('click', confirmAddScene);

    // 添加场景图对话框事件
    bindSceneImageDialogEvents();

    // 重命名场景图对话框事件
    bindRenameSceneDialogEvents();
}

/** 关闭添加场景对话框 */
function closeDialog() {
    document.getElementById('dialog-overlay').classList.add('hidden');
}

// ==================== 添加场景图对话框 ====================

/** 打开添加场景图对话框 */
function openSceneImageDialog() {
    const scene = getCurrentScene();
    if (!scene) {
        showToast('请先选择一个场景', 'info');
        return;
    }

    // 显示当前场景的分类名
    const categoryDisplay = scene.category.zh || scene.category.ja || '未命名分类';
    document.getElementById('scene-image-category').value = categoryDisplay;
    document.getElementById('scene-image-name-ja').value = '';
    document.getElementById('scene-image-name-zh').value = '';
    sceneImageSelectedFile = null;
    resetSceneImageDropZone();

    document.getElementById('scene-image-dialog-overlay').classList.remove('hidden');
}

/** 关闭添加场景图对话框 */
function closeSceneImageDialog() {
    document.getElementById('scene-image-dialog-overlay').classList.add('hidden');
    sceneImageSelectedFile = null;
    resetSceneImageDropZone();
}

/** 重置场景图拖拽区域到初始状态 */
function resetSceneImageDropZone() {
    const dropZone = document.getElementById('scene-image-drop-zone');
    if (!dropZone) return;
    dropZone.classList.remove('drag-over');
    dropZone.innerHTML = `
        <div class="drop-zone-icon">&#128194;</div>
        <div>将场景图拖到此处</div>
        <div class="drop-zone-hint">或点击选择文件</div>
    `;
}

/** 更新场景图拖拽区域显示已选择的文件名 */
function updateSceneImageDropZone(filename) {
    const dropZone = document.getElementById('scene-image-drop-zone');
    if (!dropZone) return;
    dropZone.innerHTML = `
        <div style="color:#22c55e;font-size:18px;">&#10003;</div>
        <div style="color:#334155;font-weight:500;">${filename}</div>
        <div class="drop-zone-hint">点击重新选择</div>
    `;
}

/** 绑定添加场景图对话框事件 */
function bindSceneImageDialogEvents() {
    // 取消
    document.getElementById('btn-scene-image-cancel').addEventListener('click', closeSceneImageDialog);

    // 点击遮罩关闭
    document.getElementById('scene-image-dialog-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'scene-image-dialog-overlay') closeSceneImageDialog();
    });

    // 拖拽区域点击选择文件
    document.getElementById('scene-image-drop-zone').addEventListener('click', () => {
        document.getElementById('scene-image-file-input').click();
    });

    // 文件选择变化
    document.getElementById('scene-image-file-input').addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        if (!isImageFile(file)) {
            showToast('请选择图片文件', 'error');
            e.target.value = '';
            return;
        }
        sceneImageSelectedFile = file;
        updateSceneImageDropZone(file.name);
    });

    // 拖拽区域事件
    bindSceneImageDropEvents();

    // 确认添加
    document.getElementById('btn-scene-image-confirm').addEventListener('click', confirmAddSceneImage);
}

/** 绑定场景图拖拽区域的拖放事件 */
function bindSceneImageDropEvents() {
    const dropZone = document.getElementById('scene-image-drop-zone');
    let dragCounter = 0;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            dragCounter++;
            dropZone.classList.add('drag-over');
        }
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!isImageFile(file)) {
            showToast('只支持图片格式文件', 'error');
            return;
        }

        sceneImageSelectedFile = file;
        updateSceneImageDropZone(file.name);
    });
}

/** 确认添加场景图 */
async function confirmAddSceneImage() {
    const scene = getCurrentScene();
    if (!scene) {
        showToast('请先选择一个场景', 'error');
        return;
    }

    const nameJa = document.getElementById('scene-image-name-ja').value.trim();
    const nameZh = document.getElementById('scene-image-name-zh').value.trim();

    if (!nameZh && !nameJa) {
        showToast('请输入至少一个场景图名称', 'error');
        return;
    }

    if (!sceneImageSelectedFile) {
        showToast('请选择场景图片', 'error');
        return;
    }

    // 上传图片到场景分类目录
    const categoryDir = scene.category.zh || scene.category.ja || '';
    const customFilename = nameZh ? nameZh : sceneImageSelectedFile.name;

    try {
        const result = await uploadImage(sceneImageSelectedFile, 'scene', categoryDir, customFilename);
        await loadImageList();

        // 创建新场景条目
        const newScene = {
            id: generateSceneId(),
            category: { ja: scene.category.ja || '', zh: scene.category.zh || '' },
            name: { ja: nameJa || '', zh: nameZh || '' },
            image: result.path,
            hotspots: []
        };

        mappingData.scenes.push(newScene);

        // 关闭对话框
        closeSceneImageDialog();

        // 刷新列表并选中新场景
        renderSceneList();
        selectScene(mappingData.scenes.length - 1);

        // 自动保存（先保存再提示成功，避免保存失败但用户以为成功）
        const saved = await saveMapping();
        if (saved) {
            showToast('场景图已添加' + (result.converted ? '（已转换为webp）' : ''), 'success');
        } else {
            showToast('场景图已上传但保存配置失败，请手动点击保存按钮重试', 'error');
            markDirty();
        }
    } catch (err) {
        showToast('场景图上传失败: ' + err.message, 'error');
    }
}

// ==================== 场景图重命名功能 ====================

/** 绑定重命名场景图对话框事件 */
function bindRenameSceneDialogEvents() {
    document.getElementById('btn-rename-scene-cancel').addEventListener('click', closeRenameSceneDialog);

    document.getElementById('rename-scene-dialog-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeRenameSceneDialog();
    });

    document.getElementById('btn-rename-scene-confirm').addEventListener('click', confirmRenameSceneImage);
}

/** 打开重命名场景图对话框 */
function openRenameSceneDialog() {
    const scene = getCurrentScene();
    if (!scene || !scene.image) {
        showToast('请先选择一个场景图', 'error');
        return;
    }

    // 显示当前名称
    const currentName = getSceneDisplayName(scene);
    document.getElementById('rename-scene-current-name').value = currentName;

    // 预填充当前名称
    document.getElementById('rename-scene-name-ja').value = scene.name?.ja || '';
    document.getElementById('rename-scene-name-zh').value = scene.name?.zh || '';

    document.getElementById('rename-scene-dialog-overlay').classList.remove('hidden');
}

/** 关闭重命名场景图对话框 */
function closeRenameSceneDialog() {
    document.getElementById('rename-scene-dialog-overlay').classList.add('hidden');
}

/** 确认重命名场景图 */
async function confirmRenameSceneImage() {
    const scene = getCurrentScene();
    if (!scene || !scene.image) {
        showToast('请先选择一个场景图', 'error');
        return;
    }

    const nameJa = document.getElementById('rename-scene-name-ja').value.trim();
    const nameZh = document.getElementById('rename-scene-name-zh').value.trim();

    if (!nameZh && !nameJa) {
        showToast('请输入至少一个新名称', 'error');
        return;
    }

    const newName = nameZh || nameJa;
    const oldPath = scene.image;

    try {
        // 调用后端 API 重命名文件
        const formData = new FormData();
        formData.append('oldPath', oldPath);
        formData.append('newName', newName);

        const resp = await fetch('/api/rename-scene-image', {
            method: 'POST',
            body: formData
        });
        const result = await resp.json();
        if (!result.success) {
            throw new Error(result.error || '重命名失败');
        }

        // 更新场景数据
        scene.image = result.newPath;
        scene.name = { ja: nameJa || '', zh: nameZh || '' };

        // 关闭对话框
        closeRenameSceneDialog();

        // 自动保存（先保存再刷新UI，避免UI错误导致保存丢失）
        const saved = await saveMapping();

        // 刷新场景预览和列表
        renderSceneList();
        selectScene(currentSceneIndex);

        if (saved) {
            showToast('场景图已重命名', 'success');
        } else {
            showToast('文件已重命名但配置保存失败，请手动点击保存按钮重试', 'error');
            markDirty();
        }
    } catch (err) {
        showToast('重命名失败: ' + err.message, 'error');
    }
}

/** 确认添加场景（仅分类名，无图片） */
async function confirmAddScene() {
    const ja = document.getElementById('dialog-category-ja').value.trim();
    const zh = document.getElementById('dialog-category-zh').value.trim();

    if (!ja && !zh) {
        showToast('请输入至少一个分类名', 'error');
        return;
    }

    // 生成新场景（仅分类名，无图片）
    const newScene = {
        id: generateSceneId(),
        category: { ja: ja || '', zh: zh || '' },
        name: { ja: '', zh: '' },
        image: '',
        hotspots: []
    };

    mappingData.scenes.push(newScene);

    // 关闭对话框
    closeDialog();

    // 刷新列表并选中新场景
    renderSceneList();
    selectScene(mappingData.scenes.length - 1);

    // 自动保存到服务器（先保存再提示，避免保存失败但用户以为成功）
    const saved = await saveMapping();
    if (saved) {
        showToast('场景已添加，请点击"添加场景图"上传图片', 'success');
    } else {
        showToast('场景已创建但保存失败，请手动点击保存按钮重试', 'error');
        markDirty();
    }
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
async function uploadImage(file, type = 'product', category = '', customFilename = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type); // 'scene' 或 'product'
    formData.append('category', category); // 场景分类文件夹名
    formData.append('filename', customFilename || file.name); // 自定义文件名或原始文件名

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

// ==================== 标签页切换 ====================

function bindTabEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName + '-tab');
    });
    if (tabName === 'product') {
        loadProductList();
    }
}

// ==================== 产品管理 ====================

function bindProductEvents() {
    // 添加产品按钮
    document.getElementById('btn-add-product-new').addEventListener('click', () => {
        productEditingNew = true;
        currentProductIndex = -1;
        document.querySelectorAll('.product-item').forEach(el => el.classList.remove('active'));
        document.getElementById('no-product-hint').style.display = 'none';
        document.getElementById('product-edit-form').style.display = 'block';
        document.getElementById('product-editor-title-new').textContent = '新增产品';
        document.getElementById('product-name-ja').value = '';
        document.getElementById('product-name-zh').value = '';
        document.getElementById('product-desc-cn').value = '';
        document.getElementById('product-desc-jp').value = '';
        productSelectedFile = null;
        resetProductImageDropZone();
        document.getElementById('product-image-preview').style.display = 'none';
        populateCategorySelects();
        document.getElementById('btn-delete-product').style.display = 'none';
    });

    // 保存产品
    document.getElementById('btn-save-product').addEventListener('click', saveProduct);

    // 删除产品
    document.getElementById('btn-delete-product').addEventListener('click', deleteProduct);

    // 新建大类按钮
    document.getElementById('btn-new-category').addEventListener('click', () => {
        const input = document.getElementById('product-category-new');
        const btn = document.getElementById('btn-new-category');
        if (input.style.display === 'none' || !input.style.display) {
            input.style.display = 'inline-block';
            input.focus();
            btn.textContent = '确定';
        } else {
            const val = input.value.trim();
            if (val) {
                const select = document.getElementById('product-category-select');
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                select.appendChild(opt);
                select.value = val;
                populateSubcategorySelect(val);
            }
            input.style.display = 'none';
            input.value = '';
            btn.textContent = '新建';
        }
    });

    // 大类切换时更新子类下拉
    document.getElementById('product-category-select').addEventListener('change', (e) => {
        populateSubcategorySelect(e.target.value);
    });

    // 新建子类按钮
    document.getElementById('btn-new-subcategory').addEventListener('click', () => {
        const input = document.getElementById('product-subcategory-new');
        const btn = document.getElementById('btn-new-subcategory');
        if (input.style.display === 'none' || !input.style.display) {
            input.style.display = 'inline-block';
            input.focus();
            btn.textContent = '确定';
        } else {
            const val = input.value.trim();
            if (val) {
                const select = document.getElementById('product-subcategory-select');
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                select.appendChild(opt);
                select.value = val;
            }
            input.style.display = 'none';
            input.value = '';
            btn.textContent = '新建';
        }
    });

    // 产品图片拖拽区点击选择文件
    document.getElementById('product-image-drop-zone').addEventListener('click', () => {
        document.getElementById('product-image-file-input').click();
    });

    document.getElementById('product-image-file-input').addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        if (!isImageFile(file)) {
            showToast('请选择图片文件', 'error');
            e.target.value = '';
            return;
        }
        productSelectedFile = file;
        updateProductImageDropZone(file.name);
    });

    bindProductImageDropEvents();
}

/** 加载产品列表 */
async function loadProductList() {
    try {
        const resp = await fetch('/api/list-products');
        if (resp.ok) {
            const data = await resp.json();
            productsData = data.products || [];
            renderProductManageList()
        }
    } catch (e) {
        console.warn('加载产品列表失败:', e);
        productsData = [];
    }
}

/** 渲染产品管理列表（按大类/子类分组） */
function renderProductManageList() {
    const container = document.getElementById('product-list');
    container.innerHTML = '';

    if (productsData.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">暂无产品</div>';
        return;
    }

    // 按 category -> subcategory 分组
    const groups = {};
    productsData.forEach((product, index) => {
        const cat = product.category || '未分类';
        const subcat = product.subcategory || '未分类';
        if (!groups[cat]) groups[cat] = {};
        if (!groups[cat][subcat]) groups[cat][subcat] = [];
        groups[cat][subcat].push({ product, index });
    });

    // 渲染分组
    Object.keys(groups).sort().forEach(catName => {
        const groupEl = document.createElement('div');
        groupEl.className = 'product-group';

        const groupHeader = document.createElement('div');
        groupHeader.className = 'product-group-header';
        groupHeader.innerHTML = '<span class="toggle-icon">▼</span>' + catName;
        groupHeader.addEventListener('click', () => groupEl.classList.toggle('collapsed'));
        groupEl.appendChild(groupHeader);

        const groupItems = document.createElement('div');
        groupItems.className = 'product-group-items';

        Object.keys(groups[catName]).sort().forEach(subcatName => {
            const subgroupEl = document.createElement('div');
            subgroupEl.className = 'product-subgroup';

            const subgroupHeader = document.createElement('div');
            subgroupHeader.className = 'product-subgroup-header';
            subgroupHeader.innerHTML = '<span class="toggle-icon">▼</span>' + subcatName;
            subgroupHeader.addEventListener('click', () => subgroupEl.classList.toggle('collapsed'));
            subgroupEl.appendChild(subgroupHeader);

            const subgroupItems = document.createElement('div');
            subgroupItems.className = 'product-subgroup-items';

            groups[catName][subcatName].forEach(({ product, index }) => {
                const item = document.createElement('div');
                item.className = 'product-item';
                if (index === currentProductIndex) item.classList.add('active');

                const thumb = document.createElement('img');
                thumb.className = 'product-item-thumb';
                thumb.src = encodeURI(product.imagePath || '');
                thumb.onerror = () => { thumb.style.background = '#e2e8f0'; };

                const name = document.createElement('div');
                name.className = 'product-item-name';
                name.textContent = product.nameZh || product.nameJa || '未命名';

                item.appendChild(thumb);
                item.appendChild(name);
                item.addEventListener('click', () => selectProduct(index));
                subgroupItems.appendChild(item);
            });

            subgroupEl.appendChild(subgroupItems);
            groupItems.appendChild(subgroupEl);
        });

        groupEl.appendChild(groupItems);
        container.appendChild(groupEl);
    });
}

/** 选中产品 */
async function selectProduct(index) {
    currentProductIndex = index;
    productEditingNew = false;
    document.querySelectorAll('.product-item').forEach(el => el.classList.remove('active'));
    document.getElementById('no-product-hint').style.display = 'none';
    document.getElementById('product-edit-form').style.display = 'block';
    document.getElementById('btn-delete-product').style.display = 'inline-block';
    await updateProductManageEditor();
    renderProductManageList()
}

/** 更新产品编辑器 */
async function updateProductManageEditor() {
    if (currentProductIndex < 0 || !productsData[currentProductIndex]) {
        document.getElementById('no-product-hint').style.display = 'block';
        document.getElementById('product-edit-form').style.display = 'none';
        return;
    }

    const product = productsData[currentProductIndex];
    document.getElementById('product-editor-title-new').textContent = '编辑产品：' + product.nameZh;

    populateCategorySelects();
    document.getElementById('product-category-select').value = product.category;
    populateSubcategorySelect(product.category);
    document.getElementById('product-subcategory-select').value = product.subcategory;

    document.getElementById('product-name-ja').value = product.nameJa || '';
    document.getElementById('product-name-zh').value = product.nameZh || '';

    const descCn = await loadProductDescription(product.descCnPath);
    const descJp = await loadProductDescription(product.descJpPath);
    document.getElementById('product-desc-cn').value = descCn || '';
    document.getElementById('product-desc-jp').value = descJp || '';

    productSelectedFile = null;
    if (product.imagePath) {
        document.getElementById('product-image-preview-img').src = encodeURI(product.imagePath);
        document.getElementById('product-image-preview').style.display = 'block';
        resetProductImageDropZone();
    } else {
        document.getElementById('product-image-preview').style.display = 'none';
    }
}

/** 填充大类下拉 */
function populateCategorySelects() {
    const select = document.getElementById('product-category-select');
    const currentVal = select.value;
    select.innerHTML = '';
    const categories = [...new Set(productsData.map(p => p.category))].filter(c => c).sort();
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
}

/** 填充子类下拉 */
function populateSubcategorySelect(category) {
    const select = document.getElementById('product-subcategory-select');
    select.innerHTML = '';
    const subcategories = [...new Set(
        productsData.filter(p => p.category === category).map(p => p.subcategory)
    )].filter(s => s).sort();
    subcategories.forEach(subcat => {
        const opt = document.createElement('option');
        opt.value = subcat;
        opt.textContent = subcat;
        select.appendChild(opt);
    });
}

/** 加载产品描述内容 */
async function loadProductDescription(path) {
    if (!path) return '';
    try {
        const resp = await fetch('/api/read-description?path=' + encodeURIComponent(path));
        if (resp.ok) {
            const data = await resp.json();
            return data.content || '';
        }
    } catch (e) {
        console.warn('加载描述失败:', e);
    }
    return '';
}

/** 保存产品 */
async function saveProduct() {
    const category = document.getElementById('product-category-select').value;
    const subcategory = document.getElementById('product-subcategory-select').value;
    const nameJa = document.getElementById('product-name-ja').value.trim();
    const nameZh = document.getElementById('product-name-zh').value.trim();
    const descCn = document.getElementById('product-desc-cn').value;
    const descJp = document.getElementById('product-desc-jp').value;

    if (!category || !subcategory) {
        showToast('请选择或新建大类和子类', 'error');
        return;
    }
    if (!nameZh) {
        showToast('请输入中文产品名', 'error');
        return;
    }

    let originalNameZh = '';
    let oldImagePath = '';
    if (!productEditingNew && currentProductIndex >= 0 && productsData[currentProductIndex]) {
        originalNameZh = productsData[currentProductIndex].nameZh;
        oldImagePath = productsData[currentProductIndex].imagePath || '';
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('subcategory', subcategory);
    formData.append('nameJa', nameJa);
    formData.append('nameZh', nameZh);
    formData.append('originalNameZh', originalNameZh);
    formData.append('descCn', descCn);
    formData.append('descJp', descJp);
    if (productSelectedFile) {
        formData.append('image', productSelectedFile);
    }

    try {
        const resp = await fetch('/api/save-product', {
            method: 'POST',
            body: formData
        });
        const result = await resp.json();
        if (!result.success) {
            throw new Error(result.error || '保存失败');
        }

        // 同步到 mapping.json
        const newProductData = {
            name: { ja: result.nameJa || nameJa, zh: result.nameZh || nameZh },
            image: result.imagePath,
            descriptionFile: { ja: result.descJpPath, zh: result.descCnPath }
        };
        if (oldImagePath) {
            syncProductToMapping(oldImagePath, newProductData);
        }
        await saveMapping();

        // 重新加载产品列表
        await loadProductList();

        // 选中刚保存的产品
        const savedIndex = productsData.findIndex(p =>
            p.category === category && p.subcategory === subcategory && p.nameZh === nameZh
        );
        if (savedIndex >= 0) {
            currentProductIndex = savedIndex;
            productEditingNew = false;
            renderProductManageList()
            await updateProductManageEditor();
        }

        showToast('产品保存成功', 'success');
    } catch (err) {
        showToast('产品保存失败: ' + err.message, 'error');
    }
}

/** 删除产品 */
async function deleteProduct() {
    if (currentProductIndex < 0 || !productsData[currentProductIndex]) return;

    const product = productsData[currentProductIndex];
    if (!confirm('确定删除产品「' + product.nameZh + '」吗？\n此操作将删除产品图片和描述文件。')) return;

    try {
        const resp = await fetch('/api/delete-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: product.category,
                subcategory: product.subcategory,
                nameZh: product.nameZh
            })
        });
        const result = await resp.json();
        if (!result.success) {
            throw new Error(result.error || '删除失败');
        }

        // 从 mapping.json 中移除引用
        syncProductToMapping(product.imagePath || '', null);
        await saveMapping();
        await loadProductList();

        currentProductIndex = -1;
        productEditingNew = false;
        document.getElementById('no-product-hint').style.display = 'block';
        document.getElementById('product-edit-form').style.display = 'none';
        renderProductManageList()

        showToast('产品已删除', 'success');
    } catch (err) {
        showToast('删除失败: ' + err.message, 'error');
    }
}

/** 将产品变更同步到 mapping.json 中所有引用该产品的热点
 * @param {string} oldImagePath - 旧的产品图片路径
 * @param {object|null} newProductData - 新的产品数据（null 表示删除）
 */
function syncProductToMapping(oldImagePath, newProductData) {
    if (!mappingData || !mappingData.scenes) return;

    if (newProductData) {
        // 更新引用
        mappingData.scenes.forEach(scene => {
            if (!scene.hotspots) return;
            scene.hotspots.forEach(hotspot => {
                if (!hotspot.products) return;
                hotspot.products.forEach(product => {
                    if (product.image === oldImagePath) {
                        product.name = newProductData.name;
                        product.image = newProductData.image;
                        product.descriptionFile = newProductData.descriptionFile;
                    }
                });
            });
        });
    } else {
        // 删除引用
        mappingData.scenes.forEach(scene => {
            if (!scene.hotspots) return;
            scene.hotspots.forEach(hotspot => {
                if (!hotspot.products) return;
                hotspot.products = hotspot.products.filter(p => p.image !== oldImagePath);
            });
        });
    }
}

// ==================== 产品图片上传区 ====================

function resetProductImageDropZone() {
    const dropZone = document.getElementById('product-image-drop-zone');
    if (!dropZone) return;
    dropZone.classList.remove('drag-over');
    dropZone.innerHTML =
        '<div class="drop-zone-icon">&#128194;</div>' +
        '<div>将产品图片拖到此处</div>' +
        '<div class="drop-zone-hint">或点击选择文件</div>';
}

function updateProductImageDropZone(filename) {
    const dropZone = document.getElementById('product-image-drop-zone');
    if (!dropZone) return;
    dropZone.innerHTML =
        '<div style="color:#22c55e;font-size:18px;">&#10003;</div>' +
        '<div style="color:#334155;font-weight:500;">' + filename + '</div>' +
        '<div class="drop-zone-hint">点击重新选择</div>';
}

function bindProductImageDropEvents() {
    const dropZone = document.getElementById('product-image-drop-zone');
    let dragCounter = 0;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            dragCounter++;
            dropZone.classList.add('drag-over');
        }
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            dropZone.classList.remove('drag-over');
        }
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!isImageFile(file)) {
            showToast('只支持图片格式文件', 'error');
            return;
        }
        productSelectedFile = file;
        updateProductImageDropZone(file.name);
    });
}
