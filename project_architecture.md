# 数字标牌产品展示页面 - 项目架构文档

> 最后更新：2026-04-28  
> 项目所有者：杭州海拓商通国际贸易有限公司

---

## 一、项目概述

### 1.1 项目定位
面向广告商和装修公司客户的数字标牌产品展示页面。通过场景化展示（如快餐店、超市、商场等），让客户直观了解数字标牌产品在实际环境中的应用效果。

### 1.2 核心交互流程
```
浏览场景图 → 看到脉冲闪烁热点 → 点击热点 → 弹出产品详情（左图右文） → 点击返回/外部关闭
     ↑                                                              ↓
  左右切换/分类跳转 ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

### 1.3 在线预览
启动本地服务器后访问 `http://localhost:8080/index.html`

---

## 二、技术栈

| 技术 | 版本/来源 | 用途 |
|------|----------|------|
| HTML5 | - | 页面结构 |
| CSS3 | - | 样式、动画、毛玻璃效果 |
| JavaScript (ES6+) | 原生，无框架 | 交互逻辑、DOM操作、异步加载 |
| marked.js | CDN `https://cdn.jsdelivr.net/npm/marked/marked.min.js` | Markdown→HTML解析 |
| Python HTTP Server | 内置 | 本地开发服务器 |

**设计原则**：零依赖前端框架，纯原生实现，适合新手维护。

---

## 三、项目文件结构

```
e:\Haituo\Digital_signage_introduction\
│
├── index.html                    # 主页面（唯一HTML文件）
├── css/
│   └── style.css                 # 全部样式和动画定义
├── js/
│   └── main.js                   # 全部交互逻辑和场景数据配置
│
├── 场景图/                        # 场景应用图（子文件夹分类）
│   ├── 便利店场景/
│   │   └── 便利店场景1.png
│   ├── 快餐店场景/
│   │   ├── 快餐店场景1.png
│   │   └── 快餐店场景2.png
│   ├── 超市场景/
│   │   ├── 超市场景1.png
│   │   ├── 超市场景2.png
│   │   ├── 超市场景3.png
│   │   └── 超市场景4.png
│   ├── 酒店场景/
│   │   └── 酒店场景1.png
│   ├── 集会场景/
│   │   └── 集会场景1.png
│   └── 其他场景/
│       └── 其他场景1.png
│
├── 产品图/                        # 产品白底图
│   ├── 商用壁挂液晶显示器.png
│   ├── 商用条形液晶显示器.png
│   ├── 室内双面吊装标牌.png
│   ├── 室内立式广告机.png
│   ├── 室外可移动广告机.png
│   ├── 室外立式广告机.png
│   ├── 电子水牌.png
│   ├── 自助点单机1.png
│   ├── 自助点单机2.png
│   └── 自助点单机3.png
│
├── 产品描述/                      # Markdown格式的产品描述文件
│   ├── 商用壁挂液晶显示器.md
│   ├── 商用条形液晶显示器.md
│   ├── 室内双面吊装标牌.md
│   ├── 室内立式广告机.md
│   ├── 室外可移动广告机.md
│   ├── 室外立式广告机.md
│   ├── 电子水牌.md
│   ├── 自助点单机1.md
│   ├── 自助点单机2.md        # ⚠️ 目前只有价格表格
│   └── 自助点单机3.md        # ⚠️ 目前只有价格表格
│
├── 展示方案.md                    # 原始需求文档
├── findings.md                    # 需求发现文档
├── task_plan.md                   # 产品开发书
├── progress.md                    # 项目进度日志
└── project_architecture.md        # 本文档
```

---

## 四、场景数据配置

### 4.1 场景与产品映射表

| 索引 | 场景分类 | 场景图路径 | 产品 | 热点坐标(x%, y%) |
|------|---------|-----------|------|-----------------|
| 0 | 便利店场景 | 场景图/便利店场景/便利店场景1.png | 商用壁挂液晶显示器 | 55, 48 |
| 1 | 超市场景 | 场景图/超市场景/超市场景1.png | 电子水牌 | 25, 55 |
| 2 | 超市场景 | 场景图/超市场景/超市场景2.png | 商用壁挂液晶显示器 | 68, 48 |
| 3 | 超市场景 | 场景图/超市场景/超市场景3.png | 商用条形液晶显示器 | 55, 55 |
| 4 | 超市场景 | 场景图/超市场景/超市场景4.png | 室内双面吊装标牌 | 48, 35 |
| 5 | 集会场景 | 场景图/集会场景/集会场景1.png | 室外可移动广告机 | 50, 50 |
| 6 | 酒店场景 | 场景图/酒店场景/酒店场景1.png | 室内立式广告机 | 45, 55 |
| 7 | 快餐店场景 | 场景图/快餐店场景/快餐店场景1.png | 商用壁挂液晶显示器 | 62, 42 |
| 8 | 快餐店场景 | 场景图/快餐店场景/快餐店场景2.png | 自助点单机1/2/3（3个产品） | 38, 52 |
| 9 | 其他场景 | 场景图/其他场景/其他场景1.png | 室外立式广告机 | 50, 50 |

### 4.2 场景分类映射（自动生成）
```
sceneCategories = {
    "便利店场景": 0,
    "超市场景": 1,
    "集会场景": 5,
    "酒店场景": 6,
    "快餐店场景": 7,
    "其他场景": 9
}
```
> 点击分类标签时跳转到该分类第一个场景的索引。

### 4.3 数据结构定义

```javascript
// 场景对象
{
    name: '场景分类名称',           // 用于切换器标签和弹窗标题
    image: '场景图/xxx/xxx.png',    // 场景图路径（相对项目根目录）
    hotspot: { x: 50, y: 50 },     // 热点位置（百分比坐标）
    products: [                     // 产品数组，支持多个
        {
            name: '产品名称',
            image: '产品图/xxx.png',
            descriptionFile: '产品描述/xxx.md'
        }
    ]
}
```

### 4.4 如何修改热点位置
在 `js/main.js` 的 `scenes` 数组中，修改对应场景的 `hotspot` 值：
- `x`：水平位置百分比（0=最左，100=最右）
- `y`：垂直位置百分比（0=最上，100=最下）

---

## 五、HTML结构说明

### 5.1 DOM层级结构
```
#app                              ← 主容器
├── #scene-container              ← 场景图容器
│   ├── #scene-image-a.scene-layer  ← 图层A（交叉淡入淡出用）
│   └── #scene-image-b.scene-layer  ← 图层B（交叉淡入淡出用）
├── #scene-switcher               ← 顶部场景分类切换器（动态生成按钮）
├── #hotspot-container            ← 热点容器（动态渲染热点）
├── #btn-prev.nav-btn             ← 左切换按钮
├── #btn-next.nav-btn             ← 右切换按钮
├── #scene-indicator              ← 底部圆点指示器（动态生成）
├── #detail-panel.hidden          ← 产品详情弹窗
│   └── #detail-card
│       ├── #detail-header        ← 弹窗头部（返回按钮+标题）
│       └── #product-list         ← 产品列表（动态渲染，可滚动）
│           └── .product-item     ← 单个产品（左图右文）
│               ├── .product-image-col   ← 左侧产品图片
│               └── .product-detail-col  ← 右侧产品详情
│                   ├── .product-name          ← 产品名称
│                   └── .product-description   ← Markdown渲染内容
└── #overlay.hidden               ← 背景遮罩（点击关闭弹窗）
```

### 5.2 关键设计决策
- **双层图片**：`scene-image-a` 和 `scene-image-b` 交替使用，实现无黑屏的交叉淡入淡出
- **object-fit: cover**：场景图铺满容器无黑边，通过裁剪偏移计算确保热点坐标与图片位置始终对齐
- **热点精确定位**：通过 `calcHotspotPixelPosition()` 计算 `object-fit: cover` 下图片的裁剪偏移量，将百分比坐标转换为像素坐标，窗口缩放时自动重新计算
- **动态渲染**：热点、切换器按钮、指示器圆点、产品列表均为JS动态创建
- **弹窗居中**：使用 `position:absolute` + `transform:translate(-50%,-50%)` 居中

---

## 六、CSS架构说明

### 6.1 样式组织结构
```
style.css
├── 全局重置与基础样式
├── 主容器 (#app)
├── 场景图容器 (#scene-container)
│   ├── .dimmed 淡化状态（弹窗打开时）
│   └── .scene-layer 双图层（.active / .inactive）
├── 场景分类切换器 (#scene-switcher)
│   └── .scene-tab / .scene-tab.active
├── 左右切换按钮 (.nav-btn)
├── 场景指示器 (#scene-indicator)
│   └── .indicator-dot / .indicator-dot.active
├── 热点容器 (#hotspot-container)
├── 脉冲热点 (.hotspot)
│   ├── .hotspot-core（中心点 + core-pulse动画）
│   └── .hotspot-ring（波纹环 + pulse-impact动画）
├── 背景遮罩 (#overlay)
├── 产品详情弹窗 (#detail-panel / #detail-card)
│   ├── 弹窗头部 (#detail-header)
│   ├── 返回按钮 (#btn-back)
│   ├── 产品列表 (#product-list)
│   ├── 产品项 (.product-item)
│   │   ├── 产品图片列 (.product-image-col)
│   │   └── 产品详情列 (.product-detail-col)
│   │       ├── 产品名称 (.product-name)
│   │       └── 产品描述 (.product-description)
│   └── Markdown渲染样式（ul/li/table/th/td/strong）
└── 动画关键帧
    ├── @keyframes core-pulse     ← 中心点脉动闪烁
    ├── @keyframes pulse-impact   ← 波纹冲击扩散
    └── @keyframes hotspot-appear ← 热点出现动画
```

### 6.2 主题色值参考
| 用途 | 色值 |
|------|------|
| 主题蓝 | `#3b82f6` |
| 深蓝 | `#2563eb` |
| 浅蓝 | `#60a5fa` / `#93c5fd` |
| 标题深色 | `#1a1a2e` |
| 正文灰色 | `#444` / `#555` / `#666` |
| 背景黑 | `#0a0a0a` |
| 毛玻璃 | `rgba(0,0,0,0.4)` + `backdrop-filter:blur(12px)` |

### 6.3 关键动画参数
| 动画 | 时长 | 缓动函数 | 说明 |
|------|------|---------|------|
| 场景交叉淡入淡出 | 0.6s | ease | .scene-layer的opacity过渡 |
| 热点中心脉动 | 1.5s | ease-in-out | infinite循环，scale 1→1.35→1 |
| 波纹冲击 | 2s | ease-out | infinite循环，24px→100px |
| 第二层波纹延迟 | +0.8s | - | animation-delay |
| 弹窗缩放出现 | 0.4s | cubic-bezier(0.34,1.56,0.64,1) | 弹性效果 |
| 背景淡化 | 0.5s | ease | opacity+filter+transform |
| 遮罩淡入 | 0.4s | ease | opacity |

---

## 七、JavaScript架构说明

### 7.1 模块结构
```
main.js
├── 1. 场景数据配置 (scenes数组)
├── 2. DOM元素引用 (dom对象)
├── 3. 状态管理 (state对象 + sceneCategories + descriptionCache)
├── 4. Markdown描述缓存与加载
│   ├── loadDescription(filePath)    ← 异步fetch+缓存
│   └── parseMarkdown(markdown)      ← marked.js解析
├── 5. 场景渲染与切换
│   ├── renderScene(index, animate)  ← 核心渲染函数
│   ├── prevScene() / nextScene()    ← 前后切换
│   ├── goToScene(index)             ← 指定跳转
│   ├── createIndicator()            ← 创建底部圆点
│   ├── updateIndicator(activeIndex) ← 更新圆点状态
│   ├── createSwitcher()             ← 创建分类切换器
│   ├── updateSwitcher(activeCategory)← 更新切换器状态
│   └── initSceneCategories()        ← 初始化分类映射
├── 6. 热点渲染与交互
│   ├── renderHotspot(position)      ← 渲染脉冲热点
│   └── onHotspotClick(hotspotEl)    ← 热点点击处理
├── 7. 详情弹窗与动画
│   ├── renderProductList(products)  ← 渲染多产品列表
│   ├── openDetailAnimation()        ← 打开弹窗动画序列
│   └── closeDetail()                ← 关闭弹窗动画序列
└── 8. 事件绑定与初始化
    ├── bindEvents()                 ← 绑定所有事件
    ├── addHintText()                ← 添加提示文字
    └── init()                       ← 应用初始化入口
```

### 7.2 状态管理
```javascript
state = {
    currentIndex: 0,          // 当前场景索引（0-9）
    isTransitioning: false,   // 是否正在切换场景（防抖锁）
    isDetailOpen: false,      // 详情弹窗是否打开
    currentHotspot: null,     // 当前点击的热点DOM元素
    activeLayer: 'a'          // 当前显示的图层 'a'或'b'
}
```

### 7.3 核心流程详解

#### 场景切换流程（交叉淡入淡出）
```
1. 检查 isTransitioning 和 isDetailOpen 锁
2. 淡出热点和切换器（opacity 0）
3. 将新图片src设置到非活跃图层
4. 切换CSS类：新图层 .inactive→.active，旧图层 .active→.inactive
5. CSS transition 自动执行0.6s交叉淡入淡出
6. 翻转 activeLayer 标记（a↔b）
7. 更新热点、指示器、切换器
8. 400ms后恢复热点和切换器（opacity 1）
9. 700ms后解除 isTransitioning 锁
```

#### 弹窗打开流程
```
1. 设置 isDetailOpen = true
2. 设置弹窗标题
3. 异步加载所有产品描述（fetch Markdown文件）
4. 用marked.js解析Markdown为HTML
5. 动态创建产品DOM（左图右文布局）
6. 背景淡化（#scene-container添加.dimmed类）
7. 显示遮罩层（#overlay）
8. 隐藏热点、切换器、导航按钮、指示器
9. 200ms后弹窗出现（scale 0.85→1 + opacity 0→1）
```

#### 弹窗关闭流程
```
1. 弹窗消失（opacity 1→0）
2. 200ms后背景恢复（移除.dimmed类，遮罩淡出）
3. 300ms后恢复热点、切换器、导航按钮、指示器
4. 500ms后清理DOM（添加.hidden类）和状态
```

### 7.4 Markdown加载机制
- **缓存策略**：`descriptionCache` 对象缓存已加载的文件，避免重复fetch
- **降级处理**：marked.js未加载时，简单转义HTML特殊字符后用`<br>`换行
- **错误处理**：fetch失败时返回"暂无产品描述信息。"

---

## 八、交互方式汇总

| 操作 | 触发方式 | 效果 |
|------|---------|------|
| 切换上一场景 | 点击左箭头 / 键盘← | 交叉淡入淡出到上一场景 |
| 切换下一场景 | 点击右箭头 / 键盘→ | 交叉淡入淡出到下一场景 |
| 跳转分类 | 点击顶部分类标签 | 跳到该分类第一张场景图 |
| 跳转指定场景 | 点击底部圆点 | 跳到对应场景 |
| 查看产品详情 | 点击脉冲热点 | 弹出产品详情弹窗 |
| 关闭弹窗 | 点击返回按钮 | 关闭弹窗回到场景 |
| 关闭弹窗 | 点击遮罩层 | 关闭弹窗回到场景 |
| 关闭弹窗 | 键盘ESC | 关闭弹窗回到场景 |

---

## 九、常见修改指南

### 9.1 添加新场景
在 `js/main.js` 的 `scenes` 数组中添加新对象：
```javascript
{
    name: '新场景分类名',
    image: '场景图/新分类/新场景1.png',
    hotspot: { x: 50, y: 50 },  // 估算后调整
    products: [
        {
            name: '产品名称',
            image: '产品图/产品.png',
            descriptionFile: '产品描述/产品.md'
        }
    ]
}
```
分类切换器和指示器会自动更新。

### 9.2 修改热点位置
修改 `scenes` 数组中对应场景的 `hotspot` 值，x/y为百分比坐标。

### 9.3 修改产品描述
直接编辑 `产品描述/` 文件夹中的 `.md` 文件，支持标准Markdown语法（列表、粗体、表格）。

### 9.4 修改动画速度
在 `css/style.css` 中搜索对应的 `transition` 或 `animation` 属性调整时长。

### 9.5 修改主题色
全局搜索替换 `#3b82f6`（主题蓝）和 `#2563eb`（深蓝）。

### 9.6 修改弹窗尺寸
在 `css/style.css` 中修改 `#detail-card` 的 `width` 和 `max-height`。

---

## 十、已知问题与待办

| 问题 | 状态 | 说明 |
|------|------|------|
| 自助点单机2/3描述不完整 | ⚠️ 待补充 | 产品描述文件只有价格表格，缺少特性描述 |
| 热点坐标为估算值 | ⚠️ 可调整 | 部分场景热点位置可能需要微调 |
| marked.js依赖CDN | ⚠️ 可选优化 | 如需离线使用，可下载到本地 |
| 仅桌面版 | ✅ 符合需求 | 无需响应式设计 |
