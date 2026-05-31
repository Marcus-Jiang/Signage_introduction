# 数字标牌产品展示页面 - 项目架构文档

> 最后更新：2026-05-31  
> 项目所有者：杭州海拓商通国际贸易有限公司  
> 项目版本：v5.0
> 部署主机：192.168.124.99（Docker Compose 部署，端口 65002）

---

## 一、项目概述

### 1.1 项目定位
面向广告商和装修公司客户的数字标牌产品展示页面。通过场景化展示（如便利店、餐饮店、超市、商场、酒店等），让客户直观了解数字标牌产品在实际环境中的应用效果。支持中日文双语切换，并提供管理后台用于可视化编辑场景和产品配置。

### 1.2 核心交互流程
```
浏览场景图 → 看到脉冲闪烁热点 → 点击热点 → 弹出产品详情（左图右文） → 点击返回/外部关闭
     ↑                                                              ↓
  左右切换/分类跳转 ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
     ↑
  语言切换（日文/中文）
```

### 1.3 在线预览
- 展示页面：启动服务器后访问 `http://192.168.124.99:65002/index.html`
- 管理后台：`http://192.168.124.99:65002/manage.html`

---

## 二、技术栈

| 技术 | 版本/来源 | 用途 |
|------|----------|------|
| HTML5 | - | 页面结构 |
| CSS3 | - | 样式、动画、毛玻璃效果、骨架屏、响应式适配 |
| JavaScript (ES6+) | 原生，无框架 | 交互逻辑、DOM操作、异步加载 |
| marked.js | CDN `https://cdn.jsdelivr.net/npm/marked/marked.min.js` | Markdown→HTML解析 |
| Python HTTP Server | 内置 | 本地开发服务器 + API 端点 |
| Pillow | pip | 图片格式自动转换为 webp |
| Docker | Dockerfile + docker-compose.yml | 容器化部署 |

**设计原则**：零依赖前端框架，纯原生实现，适合新手维护。

---

## 三、项目文件结构

```
/home/wenzhu/digital_signage_introduction/
│
├── index.html                    # 展示主页面
├── manage.html                   # 管理后台页面
├── mapping.json                  # 场景/产品/多语言数据配置
│
├── css/
│   ├── style.css                 # 展示页面样式和动画定义（含3种底部导航方案）
│   └── manage.css                # 管理后台样式（含拖拽上传、分组折叠）
│
├── js/
│   ├── main.js                   # 展示页面交互逻辑（1667行）
│   └── manage.js                 # 管理后台交互逻辑（1282行）
│
├── 场景图/                        # 场景应用图（子文件夹分类，.webp格式）
│   ├── 便利店场景/
│   │   └── 便利店场景1.webp
│   ├── 餐饮店场景/
│   │   ├── 餐饮店场景1.webp
│   │   ├── 餐饮店场景2.webp
│   │   ├── 餐饮店场景3.webp
│   │   ├── 酒吧.webp
│   │   ├── 咖啡店1.webp
│   │   ├── 咖啡店2.webp
│   │   └── 奶茶店.webp
│   ├── 超市场景/
│   │   ├── 超市场景1.webp ~ 超市场景4.webp
│   ├── 酒店场景/
│   │   ├── 酒店场景1.webp
│   │   └── 酒店场景2.webp
│   ├── 集会场景/
│   │   ├── 集会场景1.webp
│   │   ├── 集会场景2.webp
│   │   └── 演唱会.webp
│   ├── 商场场景/
│   │   ├── 商场场景1.webp ~ 商场场景6.webp
│   │   ├── 服装店1.webp ~ 服装店3.webp
│   │   └── 电器店1.webp ~ 电器店3.webp
│   ├── 写字楼场景/
│   │   ├── 写字楼场景1.webp
│   │   ├── 会议室1.webp
│   │   └── 会议室2.webp
│   └── 其他场景/
│       ├── 其他场景1.webp
│       ├── 其他场景2.webp
│       ├── 机场.webp
│       ├── 汽车销售店.webp
│       ├── 图书馆.webp
│       ├── 卡拉ok.webp
│       └── 独立商铺.webp
│
├── 产品图/                        # 产品白底图（按类别分子目录，.webp格式）
│   ├── 专业视觉显示类/
│   │   ├── 商用 LED 显示屏/
│   │   │   ├── LED 一体机.webp
│   │   │   └── 商用 LED 显示屏.webp
│   │   ├── 商用异形液晶显示器/
│   │   │   ├── 商用圆形液晶显示器.webp
│   │   │   ├── 商用横长形液晶显示器.webp
│   │   │   └── 商用正方形液晶显示器.webp
│   │   ├── 商用拼接液晶显示屏/
│   │   │   └── 商用拼接液晶显示屏.webp
│   │   └── 商用液晶显示器/
│   │       ├── 商用单面吊装显示器.webp
│   │       ├── 商用双面吊装显示器.webp
│   │       └── 商用液晶显示器.webp
│   ├── 交互与自助服务类/
│   │   ├── 会议平板/
│   │   │   └── 会议平板.webp
│   │   ├── 商用防爆电视/
│   │   │   └── 防爆电视 - 卡拉OK用.webp
│   │   ├── 自助点单机/
│   │   │   ├── 自助点单机 - 桌面式.webp
│   │   │   └── 自助点单机 - 落地式.webp
│   │   └── 触摸查询一体机/
│   │       ├── 触摸查询一体机 - 壁挂式.webp
│   │       └── 触摸查询一体机 - 落地式.webp
│   └── 广告播放与信息发布类/
│       ├── 可移动广告机/
│       │   ├── 可移动广告机 - 太阳能款.webp
│       │   ├── 室外可移动广告机.webp
│       │   ├── 室外可移动广告机 - 双面显示款.webp
│       │   ├── 电子水牌 - 样式1.webp
│       │   └── 电子水牌 - 样式2.webp
│       ├── 室内一体式广告机/
│       │   ├── 室内一体式广告机 - 样式1.png
│       │   ├── 室内一体式广告机 - 样式2.webp
│       │   └── 室内桌面型广告机.webp
│       ├── 室外一体式广告机/
│       │   ├── 室外一体式广告机 - 壁挂款.webp
│       │   └── 室外一体式广告机 - 落地款.webp
│       └── 特殊用途广告机/
│           ├── 双屏立式广告机.webp
│           └── 墨水屏广告机.webp
│
├── 产品描述/                      # Markdown格式的产品描述文件（按类别分子目录）
│   ├── 专业视觉显示类/
│   │   ├── 商用 LED 显示屏/
│   │   │   ├── LED 一体机.webp
│   │   │   ├── LED 一体机_cn.md
│   │   │   ├── LED 一体机_jp.md
│   │   │   ├── 商用 LED 显示屏.webp
│   │   │   ├── 商用 LED 显示屏_cn.md
│   │   │   └── 商用 LED 显示屏_jp.md
│   │   ├── 商用异形液晶显示器/
│   │   │   ├── 商用圆形液晶显示器_cn.md / _jp.md
│   │   │   ├── 商用横长形液晶显示器.webp + _cn.md / _jp.md
│   │   │   └── 商用正方形液晶显示器_cn.md / _jp.md
│   │   ├── 商用拼接液晶显示屏/
│   │   │   └── 商用拼接液晶显示屏.webp + _cn.md / _jp.md
│   │   └── 商用液晶显示器/
│   │       ├── 商用单面吊装显示器_cn.md / _jp.md
│   │       ├── 商用双面吊装显示器_cn.md / _jp.md
│   │       └── 商用液晶显示器.webp + _cn.md / _jp.md
│   ├── 交互与自助服务类/
│   │   ├── 会议平板/ (webp + _cn.md / _jp.md)
│   │   ├── 商用防爆电视/ (webp + _cn.md / _jp.md)
│   │   ├── 自助点单机/ (桌面式/落地式 各 webp + _cn.md / _jp.md)
│   │   └── 触摸查询一体机/ (壁挂式/落地式 各 _cn.md / _jp.md)
│   └── 广告播放与信息发布类/
│       ├── 可移动广告机/ (太阳能款/室外/双面/电子水牌 各 webp + _cn.md / _jp.md)
│       ├── 室内一体式广告机/ (样式1/2/3 + 桌面型 各 webp + _cn.md / _jp.md)
│       ├── 室外一体式广告机/ (壁挂款/落地款 各 webp + _cn.md / _jp.md)
│       └── 特殊用途广告机/ (双屏/墨水屏 各 _cn.md / _jp.md)
│
├── .qoder/                        # AI 生成的项目文档
│   └── repowiki/zh/content/       # 中文文档（API、功能、指南、优化等）
│
├── 启动服务器.py                  # 本地开发服务器（含 API 端点 + Pillow webp转换）
├── Dockerfile                     # Docker 镜像构建文件
├── docker-compose.yml             # Docker Compose 编排文件
├── project_architecture.md        # 本文档
├── .gitignore
└── .dockerignore
```

---

## 四、数据配置（mapping.json）

### 4.1 概述

v4.0 将原来硬编码在 `js/main.js` 中的 `scenes` 数组抽取为独立的 `mapping.json` 文件，实现数据与逻辑分离。前端通过 `fetch` 动态加载，管理后台通过 API 读写。v5.0 扩展了 `descriptionFile` 字段为多语言对象格式。

### 4.2 数据结构定义

```json
{
  "version": "4.0",
  "scenes": [ ... ],
  "i18n": { ... }
}
```

#### 场景对象结构

```json
{
  "id": "scene_001",
  "category": { "ja": "コンビニシーン", "zh": "便利店场景" },
  "image": "场景图/便利店场景/便利店场景1.webp",
  "hotspots": [
    {
      "id": "hs_001",
      "x": 31.6,
      "y": 20.7,
      "products": [
        {
          "name": { "ja": "業務用液晶ディスプレイ", "zh": "商用液晶显示器" },
          "image": "产品描述/专业视觉显示类/商用液晶显示器/商用液晶显示器.webp",
          "descriptionFile": {
            "ja": "产品描述/专业视觉显示类/商用液晶显示器/商用液晶显示器_jp.md",
            "zh": "产品描述/专业视觉显示类/商用液晶显示器/商用液晶显示器_cn.md"
          }
        }
      ]
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 场景唯一标识，格式 `scene_NNN` |
| `category` | object | 多语言分类名，键为语言代码 |
| `image` | string | 场景图路径（相对项目根目录） |
| `hotspots` | array | 热点数组，一个场景可有多个热点 |

#### 热点对象结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 热点唯一标识，格式 `hs_NNN` |
| `x` | number | 水平位置百分比（0=最左，100=最右），支持小数精度 |
| `y` | number | 垂直位置百分比（0=最上，100=最下），支持小数精度 |
| `products` | array | 该热点关联的产品数组 |

#### 产品对象结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | object | 多语言产品名称 `{ ja: "...", zh: "..." }` |
| `image` | string | 产品图片路径（可来自产品图/或产品描述/目录） |
| `descriptionFile` | object/string | v5.0 新增多语言对象格式 `{ ja: "...", zh: "..." }`，兼容旧版字符串格式 |

#### 多语言字段

所有面向用户的文本均采用 `{ ja: "...", zh: "..." }` 格式，包括：

- `category`：场景分类名
- `name`：产品名称
- `descriptionFile`：产品描述文件路径（v5.0 新增）

普通字符串（如 `image`）不受多语言系统影响。

#### i18n 字典

```json
"i18n": {
  "ja": {
    "pageTitle": "デジタルサイネージ製品紹介",
    "companyName": "杭州海拓商通国際貿易有限公司",
    "back": "戻る",
    "hint": "点滅ポイントをクリックして製品詳細を確認 · 左右に切り替えてシーンを閲覧",
    "loading": "読み込み中...",
    "prevScene": "前のシーン",
    "nextScene": "次のシーン",
    "noDescription": "製品説明情報はまだありません。",
    "loadFailed": "読み込みに失敗しました。クリックしてリトライ",
    "initError": "データの読み込みに失敗しました。ページを更新してください。"
  },
  "zh": {
    "pageTitle": "数字标牌产品介绍",
    "companyName": "杭州海拓商通国际贸易有限公司",
    "back": "返回",
    "hint": "点击闪烁热点查看产品详情 · 左右切换浏览场景",
    "loading": "加载中...",
    "prevScene": "上一个场景",
    "nextScene": "下一个场景",
    "noDescription": "暂无产品描述信息。",
    "loadFailed": "加载失败，点击重试",
    "initError": "数据加载失败，请刷新页面重试。"
  }
}
```

| 键名 | 用途 | 使用位置 |
|------|------|---------|
| `pageTitle` | 页面标题 | `document.title` |
| `companyName` | 公司名称 | 页面标题后缀 |
| `back` | 返回按钮文字 | 详情面板返回按钮 |
| `hint` | 操作提示 | 首屏底部提示文字 |
| `loading` | 加载中文案 | 产品描述加载占位符 |
| `prevScene` / `nextScene` | 导航按钮标签 | aria-label |
| `noDescription` | 无描述提示 | 产品描述加载失败降级 |
| `loadFailed` | 加载失败提示 | 可点击重试的失败提示 |
| `initError` | 初始化失败提示 | mapping.json 加载失败全屏提示 |

### 4.3 场景与产品映射表

当前共 **39 个场景**，分为 **8 个分类**：

| 索引 | 场景ID | 场景分类 | 场景图路径 | 热点数 | 关联产品 |
|------|--------|---------|-----------|--------|---------|
| 0 | scene_001 | コンビニシーン/便利店场景 | 场景图/便利店场景/便利店场景1.webp | 1 | 商用液晶显示器 |
| 1 | scene_002 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/餐饮店场景1.webp | 1 | 商用液晶显示器 |
| 2 | scene_003 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/餐饮店场景2.webp | 2 | 自助点单机-落地式 + 商用液晶显示器 |
| 3 | scene_004 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/餐饮店场景3.webp | 1 | 自助点单机-桌面式 |
| 4 | scene_005 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/酒吧.webp | 1 | 室内桌面型广告机 |
| 5 | scene_006 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/咖啡店1.webp | 1 | 墨水屏广告机 |
| 6 | scene_007 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/咖啡店2.webp | 1 | 可移动广告机-太阳能款 |
| 7 | scene_008 | 飲食店のシーン/餐饮店场景 | 场景图/餐饮店场景/奶茶店.webp | 1 | 商用液晶显示器 |
| 8 | scene_009 | スーパーマーケットシーン/超市场景 | 场景图/超市场景/超市场景1.webp | 1 | 电子水牌-样式2 |
| 9 | scene_010 | スーパーマーケットシーン/超市场景 | 场景图/超市场景/超市场景2.webp | 1 | 商用液晶显示器 |
| 10 | scene_011 | スーパーマーケットシーン/超市场景 | 场景图/超市场景/超市场景3.webp | 1 | 商用横长形液晶显示器 |
| 11 | scene_012 | スーパーマーケットシーン/超市场景 | 场景图/超市场景/超市场景4.webp | 1 | 商用单面吊装显示器 |
| 12 | scene_013 | ホテルシーン/酒店场景 | 场景图/酒店场景/酒店场景1.webp | 1 | 室内一体式广告机-样式3 |
| 13 | scene_014 | ホテルシーン/酒店场景 | 场景图/酒店场景/酒店场景2.webp | 1 | 室内一体式广告机-样式1 |
| 14 | scene_015 | イベントシーン/集会场景 | 场景图/集会场景/集会场景1.webp | 1 | 室外可移动广告机 |
| 15 | scene_016 | イベントシーン/集会场景 | 场景图/集会场景/集会场景2.webp | 1 | 室外可移动广告机-双面显示款 |
| 16 | scene_017 | イベントシーン/集会场景 | 场景图/集会场景/演唱会.webp | 1 | 商用 LED 显示屏 |
| 17 | scene_018 | その他のシーン/其他场景 | 场景图/其他场景/其他场景1.webp | 1 | 室外一体式广告机-落地款 |
| 18 | scene_019 | その他のシーン/其他场景 | 场景图/其他场景/其他场景2.webp | 1 | 室外一体式广告机-壁挂款 |
| 19 | scene_020 | その他のシーン/其他场景 | 场景图/其他场景/机场.webp | 1 | 商用 LED 显示屏 |
| 20 | scene_021 | その他のシーン/其他场景 | 场景图/其他场景/汽车销售店.webp | 1 | 双屏立式广告机 |
| 21 | scene_022 | その他のシーン/其他场景 | 场景图/其他场景/图书馆.webp | 1 | 触摸查询一体机-壁挂式 |
| 22 | scene_023 | その他のシーン/其他场景 | 场景图/其他场景/卡拉ok.webp | 1 | 防爆电视-卡拉OK用 |
| 23 | scene_024 | その他のシーン/其他场景 | 场景图/其他场景/独立商铺.webp | 1 | 电子水牌-样式1 |
| 24 | scene_025 | モールのシーン/商场场景 | 场景图/商场场景/商场场景1.webp | 1 | 商用双面吊装显示器 |
| 25 | scene_026 | モールのシーン/商场场景 | 场景图/商场场景/商场场景2.webp | 1 | 触摸查询一体机-落地式 |
| 26 | scene_027 | モールのシーン/商场场景 | 场景图/商场场景/商场场景3.webp | 1 | 商用拼接液晶显示屏 |
| 27 | scene_028 | モールのシーン/商场场景 | 场景图/商场场景/商场场景4.webp | 1 | 商用单面吊装显示器 |
| 28 | scene_029 | モールのシーン/商场场景 | 场景图/商场场景/商场场景5.webp | 1 | 商用 LED 显示屏 |
| 29 | scene_030 | モールのシーン/商场场景 | 场景图/商场场景/商场场景6.webp | 1 | 触摸查询一体机-落地式 |
| 30 | scene_031 | モールのシーン/商场场景 | 场景图/商场场景/服装店1.webp | 1 | 商用圆形液晶显示器 |
| 31 | scene_032 | モールのシーン/商场场景 | 场景图/商场场景/服装店2.webp | 1 | 商用正方形液晶显示器 |
| 32 | scene_033 | モールのシーン/商场场景 | 场景图/商场场景/服装店3.webp | 1 | 商用圆形液晶显示器 |
| 33 | scene_034 | モールのシーン/商场场景 | 场景图/商场场景/电器店1.webp | 1 | 商用液晶显示器 |
| 34 | scene_035 | モールのシーン/商场场景 | 场景图/商场场景/电器店2.webp | 1 | 商用液晶显示器 |
| 35 | scene_036 | モールのシーン/商场场景 | 场景图/商场场景/电器店3.webp | 1 | 商用液晶显示器 |
| 36 | scene_037 | オフィスビルのシーン/写字楼场景 | 场景图/写字楼场景/写字楼场景1.webp | 1 | 室内一体式广告机-样式2 |
| 37 | scene_038 | オフィスビルのシーン/写字楼场景 | 场景图/写字楼场景/会议室1.webp | 1 | 会议平板 |
| 38 | scene_039 | オフィスビルのシーン/写字楼场景 | 场景图/写字楼场景/会议室2.webp | 1 | LED 一体机 |

### 4.4 场景分类统计

| 分类（日文） | 分类（中文） | 场景数量 | 起始索引 |
|-------------|-------------|---------|---------|
| コンビニシーン | 便利店场景 | 1 | 0 |
| 飲食店のシーン | 餐饮店场景 | 7 | 1 |
| スーパーマーケットシーン | 超市场景 | 4 | 8 |
| ホテルシーン | 酒店场景 | 2 | 12 |
| イベントシーン | 集会场景 | 3 | 14 |
| その他のシーン | 其他场景 | 7 | 17 |
| モールのシーン | 商场场景 | 12 | 24 |
| オフィスビルのシーン | 写字楼场景 | 3 | 36 |

### 4.5 产品分类体系

产品按三大类别组织：

| 大类 | 子类 | 产品数 |
|------|------|--------|
| 专业视觉显示类 | 商用 LED 显示屏 | 2（LED一体机、商用LED显示屏） |
| 专业视觉显示类 | 商用异形液晶显示器 | 3（圆形、横长形、正方形） |
| 专业视觉显示类 | 商用拼接液晶显示屏 | 1 |
| 专业视觉显示类 | 商用液晶显示器 | 3（单面吊装、双面吊装、普通） |
| 交互与自助服务类 | 会议平板 | 1 |
| 交互与自助服务类 | 商用防爆电视 | 1 |
| 交互与自助服务类 | 自助点单机 | 2（桌面式、落地式） |
| 交互与自助服务类 | 触摸查询一体机 | 2（壁挂式、落地式） |
| 广告播放与信息发布类 | 可移动广告机 | 5（太阳能款、室外、双面、电子水牌×2） |
| 广告播放与信息发布类 | 室内一体式广告机 | 4（样式1/2/3、桌面型） |
| 广告播放与信息发布类 | 室外一体式广告机 | 2（壁挂款、落地款） |
| 广告播放与信息发布类 | 特殊用途广告机 | 2（双屏立式、墨水屏） |

### 4.6 场景分类映射（动态生成）

`sceneCategories` 不再硬编码，而是从 `mappingData.scenes` 动态计算。遍历 scenes 数组，按 `getText(scene.category)` 分组，记录每个分类的第一个场景索引：

```javascript
function initSceneCategories() {
    Object.keys(sceneCategories).forEach(key => delete sceneCategories[key]);
    if (!mappingData || !mappingData.scenes) return;
    mappingData.scenes.forEach((scene, index) => {
        const categoryName = getText(scene.category);
        if (!(categoryName in sceneCategories)) {
            sceneCategories[categoryName] = index;
        }
    });
}
```

切换语言时，`initSceneCategories()` 会被重新调用，分类标签会自动更新为当前语言的名称。

---

## 五、HTML结构说明

### 5.1 展示页面（index.html）

```
#app                              ← 主容器
├── #lang-switcher                ← 语言切换器（右上角，中日文切换按钮）
│   ├── .lang-btn.active[data-lang="ja"]  ← 日文按钮
│   └── .lang-btn[data-lang="zh"]         ← 中文按钮
├── #scene-container              ← 场景图容器
│   ├── #scene-image-a.scene-layer  ← 图层A（交叉淡入淡出用）
│   └── #scene-image-b.scene-layer  ← 图层B（交叉淡入淡出用）
├── #loading-indicator            ← 图片加载中旋转动画指示器
│   └── .loading-spinner
├── #scene-switcher               ← 顶部场景分类切换器（已隐藏，与底部progressBar功能重复）
├── #hotspot-container            ← 热点容器（动态渲染多个热点）
├── #btn-prev.nav-btn             ← 左切换按钮
├── #btn-next.nav-btn             ← 右切换按钮
├── #scene-indicator              ← 底部导航指示器（3种方案可切换，默认progressBar）
├── #detail-panel.hidden          ← 产品详情弹窗
│   └── #detail-card
│       ├── #detail-header        ← 弹窗头部（返回按钮+标题，sticky固定顶部）
│       └── #product-list         ← 产品列表（动态渲染，可滚动）
│           └── .product-item     ← 单个产品（左图右文）
│               ├── .product-image-col   ← 左侧产品图片
│               └── .product-detail-col  ← 右侧产品详情
│                   ├── .product-name          ← 产品名称（多语言）
│                   └── .product-description   ← Markdown渲染内容
│                       ├── .desc-loading       ← 加载中占位符
│                       └── .desc-load-failed   ← 加载失败可重试提示
└── #overlay.hidden               ← 背景遮罩（点击关闭弹窗）
```

### 5.2 关键设计决策
- **语言切换器**：`#lang-switcher` 在 HTML 中静态声明（`index.html` 第 17-20 行），`main.js` 中 `createLangSwitcher()` 也会动态创建（用于兼容），实际使用时两者二选一
- **双层图片**：`scene-image-a` 和 `scene-image-b` 交替使用，实现无黑屏的交叉淡入淡出
- **object-fit: cover**：场景图铺满容器无黑边，通过裁剪偏移计算确保热点坐标与图片位置始终对齐
- **多热点精确定位**：`renderHotspots()` 接收热点数组，遍历渲染多个脉冲热点，每个热点独立定位
- **顶部导航栏已隐藏**：`#scene-switcher` 设置 `display: none !important`，与底部 progressBar 功能重复
- **底部导航3种方案**：通过 `NAV_STYLE` 常量切换（`groupNumber` / `slidingDots` / `progressBar`），默认 `progressBar`
- **动态渲染**：热点、指示器、产品列表均为JS动态创建
- **弹窗居中**：使用 `position:absolute` + `transform:translate(-50%,-50%)` 居中
- **弹窗头部sticky**：`#detail-header` 使用 `position:sticky; top:0` 确保返回按钮始终可见
- **加载反馈**：`#loading-indicator` 提供网络延迟时的视觉反馈
- **骨架屏**：`.desc-loading` 占位符配合 `t('loading')` 显示加载中文案
- **错误可重试**：`.desc-load-failed` 样式的失败提示，点击可重新加载
- **首屏独占带宽**：首屏图片加载完成后再启动其余图片预加载，避免慢速网络下首屏永远不显示
- **响应式适配**：弹窗在小屏幕（<600px）改为上图下文布局，中屏（<900px）微调尺寸

---

## 六、CSS架构说明

### 6.1 展示页面样式（style.css）

```
style.css
├── 全局重置与基础样式
├── 主容器 (#app)
├── 语言切换器 (#lang-switcher)
│   ├── .lang-btn 共通样式
│   ├── .lang-btn:hover 悬浮效果
│   └── .lang-btn.active 活跃状态（主题蓝强调）
├── 场景图容器 (#scene-container)
│   ├── .dimmed 淡化状态（弹窗打开时）
│   └── .scene-layer 双图层（.active / .inactive）
├── 场景分类切换器 (#scene-switcher)
│   ├── .scene-tab / .scene-tab.active
│   ├── #scene-switcher.visible 显隐控制
│   └── ★已隐藏：display: none !important
├── 左右切换按钮 (.nav-btn)
├── 场景指示器 (#scene-indicator)
│   ├── 方案A: groupNumber（分组缩略+数字）
│   │   ├── .nav-group-container
│   │   ├── .nav-group-arrow 箭头按钮
│   │   ├── .nav-group-content 中间内容区
│   │   ├── .nav-group-category 分类名
│   │   └── .nav-group-counter 序号
│   ├── 方案B: slidingDots（滑动窗口圆点）
│   │   ├── .nav-dots-container
│   │   ├── .nav-dots-track 轨道
│   │   └── .nav-dots-dot 圆点（.active活跃态）
│   └── 方案C: progressBar（进度条+分类标签）★当前使用
│       ├── .nav-progress-container
│       ├── .nav-progress-label 分类标签按钮
│       ├── .nav-progress-bar 进度条外框
│       ├── .nav-progress-fill 进度条填充
│       ├── .nav-category-popup 分类弹窗
│       └── .nav-category-item 分类项
├── 响应式适配 (@media)
│   ├── max-width: 900px 中等屏幕
│   └── max-width: 600px 小屏幕（上图下文）
├── 热点容器 (#hotspot-container)
├── 脉冲热点 (.hotspot)
│   ├── .hotspot-core（中心点 + core-pulse动画）
│   ├── .hotspot-ring（波纹环 + pulse-impact动画）
│   ├── 多热点动画延迟分散 (.hotspot:nth-child)
│   └── 多热点中心点脉冲时间错开 (.hotspot:nth-child .hotspot-core)
├── #loading-indicator 加载中旋转动画
│   └── .loading-spinner
├── 背景遮罩 (#overlay)
├── 产品详情弹窗 (#detail-panel / #detail-card)
│   ├── 弹窗头部 (#detail-header) ★sticky固定
│   ├── 返回按钮 (#btn-back)
│   ├── 产品列表 (#product-list)
│   ├── 产品项 (.product-item)
│   │   ├── 产品图片列 (.product-image-col)
│   │   └── 产品详情列 (.product-detail-col)
│   │       ├── 产品名称 (.product-name)
│   │       └── 产品描述 (.product-description)
│   └── Markdown渲染样式（ul/li/table/th/td/strong）
├── 骨架屏（Skeleton UI）
│   ├── .desc-loading 描述加载占位符
│   ├── .skeleton-line 骨架线条 + shimmer动画
│   └── @keyframes skeleton-shimmer
├── 错误状态样式
│   ├── .error-overlay 全屏错误遮罩
│   ├── .retry-btn 重试按钮
│   ├── .load-failed 加载失败文本
│   └── @keyframes error-shake
├── 提示文字 (.hint-text)
├── 场景切换中状态 (.scene-transitioning)
├── 隐藏工具类 (.hidden)
└── 动画关键帧
    ├── @keyframes core-pulse       ← 中心点脉动闪烁
    ├── @keyframes pulse-impact     ← 波纹冲击扩散
    ├── @keyframes hotspot-appear   ← 热点出现动画
    ├── @keyframes bar-shimmer      ← 弹窗顶部装饰条流光
    ├── @keyframes spin             ← 加载动画旋转
    ├── @keyframes hint-fade        ← 提示文字淡入淡出
    ├── @keyframes skeleton-shimmer ← 骨架屏流光
    ├── @keyframes error-shake      ← 错误抖动
    └── @keyframes popup-appear     ← 分类弹窗出现动画
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
| 错误红 | `#ef4444` |
| 成功绿 | `#22c55e` |

### 6.3 关键动画参数

| 动画 | 时长 | 缓动函数 | 说明 |
|------|------|---------|------|
| 场景交叉淡入淡出 | 1.2s | cubic-bezier(0.4,0,0.2,1) | .scene-layer的opacity过渡 |
| 热点中心脉动 | 2s | ease-in-out | infinite循环，scale 1→1.22→1 |
| 波纹冲击 | 2.4s | cubic-bezier(0.2,0.6,0.4,1) | infinite循环，18px→68px |
| 第二层波纹延迟 | +0.9s | - | animation-delay |
| 多热点出现延迟 | +0.12s/个 | - | nth-child递增 |
| 弹窗缩放出现 | 0.45s | cubic-bezier(0.34,1.56,0.64,1) | 弹性效果 |
| 背景淡化 | 0.5s | cubic-bezier(0.4,0,0.2,1) | opacity+filter+transform |
| 遮罩淡入 | 0.4s | cubic-bezier(0.4,0,0.2,1) | opacity |
| 加载旋转 | 0.75s | linear | infinite循环，spin动画 |
| 骨架屏流光 | 1.5s | ease-in-out | infinite循环，background-position |
| 错误抖动 | 0.6s | cubic-bezier(0.36,0.07,0.19,0.97) | 一次性 |
| 提示文字淡入淡出 | 3s | ease-in-out | infinite循环 |
| 分类弹窗出现 | 0.2s | cubic-bezier(0.34,1.56,0.64,1) | 弹性效果 |
| 进度条填充 | 0.4s | cubic-bezier(0.4,0,0.2,1) | width过渡 |

### 6.4 管理后台样式（manage.css）

```
manage.css
├── 全局重置与基础样式（浅色主题，背景 #f5f7fa）
├── .hidden 工具类
├── 顶部工具栏 (#toolbar)
│   ├── #toolbar-actions
│   ├── #save-status (.success / .error)
│   └── #btn-save
├── 三栏主体布局 (#main-container)
│   ├── 左栏 - 场景列表 (#scene-list-panel)
│   │   ├── .panel-header / .panel-footer
│   │   ├── #scene-list (可滚动)
│   │   ├── ★场景分组折叠 (.scene-group)
│   │   │   ├── .scene-group-header (分组标题，可点击折叠)
│   │   │   │   ├── .scene-group-arrow (折叠箭头)
│   │   │   │   ├── .scene-group-name (分组名)
│   │   │   │   └── .scene-group-count (场景数量)
│   │   │   └── .scene-group-items (分组内容)
│   │   ├── .scene-item (.active 选中状态)
│   │   │   ├── .scene-item-thumb (缩略图)
│   │   │   ├── .scene-item-info (信息区)
│   │   │   │   ├── .scene-item-name (显示名)
│   │   │   │   └── .scene-item-stats (统计标签)
│   │   │   │       ├── .hotspot-badge (热点数)
│   │   │   │       ├── .product-badge (产品数)
│   │   │   │       └── .no-config-warning (未配置警告)
│   │   │   └── .scene-item-delete (删除按钮，悬浮显示)
│   │   └── #btn-add-scene
│   ├── 中栏 - 场景编辑区 (#scene-editor-panel)
│   │   ├── #scene-info-bar (分类名输入、图片更换)
│   │   ├── #scene-preview-area (场景大图预览)
│   │   │   ├── #scene-image-container
│   │   │   │   ├── #scene-preview-img
│   │   │   │   ├── #hotspot-overlay (热点叠加层)
│   │   │   │   ├── #no-scene-hint (无场景提示)
│   │   │   │   └── #scene-drop-overlay (★拖拽上传覆盖层)
│   │   │   └── #editor-toolbar (添加/删除热点，坐标信息)
│   │   └── 编辑器热点标记 (.editor-hotspot)
│   │       ├── .hotspot-marker (序号圆圈)
│   │       ├── .selected (选中态，红色脉冲)
│   │       └── .dragging (拖拽态)
│   └── 右栏 - 产品编辑器 (#product-editor-panel)
│       ├── #no-hotspot-hint (无热点提示)
│       ├── .product-edit-item
│       │   ├── .product-edit-header (★缩略图+名称字段，缩略图支持拖拽上传)
│       │   ├── .product-usage-info (★产品引用统计)
│       │   ├── .product-field (产品图片选择)
│       │   ├── .product-field (★描述文件日文选择)
│       │   ├── .product-field (★描述文件中文选择)
│       │   └── .product-edit-delete (删除按钮)
│       └── #btn-add-product
├── Toast 提示 (#toast-container)
│   └── .toast (.success / .error / .info / .fade-out)
├── 添加场景对话框 (#dialog-overlay)
│   └── #add-scene-dialog
│       ├── .dialog-field (分类名输入)
│       ├── .dialog-field (★拖拽上传区域 .drop-zone)
│       └── .dialog-actions (取消/确定)
├── 拖拽上传通用样式
│   ├── .drop-zone / .drop-zone.drag-over
│   ├── .scene-drop-overlay (场景图拖拽覆盖层)
│   ├── .product-edit-thumb.drag-over (产品缩略图拖拽)
│   └── .upload-loading (上传中加载状态)
├── 场景分组折叠样式
│   ├── .scene-group / .scene-group.collapsed
│   └── .scene-group-arrow 旋转动画
└── 产品引用信息样式
    ├── .product-usage-info
    ├── .product-usage-scenes
    └── .usage-scene-item
```

---

## 七、JavaScript架构说明

### 7.1 展示页面模块结构（main.js）

```
main.js (v5.0, 1667行)
├── 1. 数据加载 (第 29-82 行)
│   ├── mappingData 全局变量
│   └── loadMapping() 含重试机制（3次，500/1000/2000ms递增延迟）
├── 2. 多语言引擎 (第 85-175 行)
│   ├── t(key) 获取UI翻译文本
│   ├── getText(obj) 获取多语言对象当前语言的值
│   └── switchLanguage(lang) 切换语言（更新标题/按钮/指示器/弹窗）
├── 3. DOM元素引用 (第 178-201 行)
│   └── dom对象（含 loadingIndicator）
├── 4. 状态管理 (第 204-248 行)
│   ├── state对象
│   │   ├── currentLang: 'ja'
│   │   └── currentProducts: null
│   ├── sceneCategories 从 mappingData 动态计算
│   ├── initSceneCategories() 清空+重建
│   └── descriptionCache Markdown缓存
├── 5. 图片预加载 (第 251-419 行)
│   ├── preloadAllImages() 遍历 scenes + hotspots + products
│   ├── preloadOne(src, retries=2)
│   ├── isImagePreloaded(src)
│   ├── waitForImageLoad(imgEl, timeoutMs)
│   └── isImageCached(src)
├── 6. Markdown描述缓存与加载 (第 422-473 行)
│   ├── loadDescription(filePath) 失败时返回可点击重试的 HTML
│   └── parseMarkdown(markdown)
├── 7. 场景渲染与切换 (第 476-650 行)
│   ├── renderScene(index, animate)
│   ├── prevScene() / nextScene()
│   └── goToScene(index)
├── 8. 底部导航指示器 (第 652-1041 行) ★3种方案
│   ├── getSceneGroupInfo(sceneIndex) 计算分组信息
│   ├── createIndicator() / updateIndicator() 分流函数
│   ├── 方案A: groupNumber（分组缩略+数字）
│   │   ├── createIndicatorGroupNumber()
│   │   └── updateIndicatorGroupNumber()
│   ├── 方案B: slidingDots（滑动窗口圆点）
│   │   ├── createIndicatorSlidingDots()
│   │   └── updateIndicatorSlidingDots()
│   └── 方案C: progressBar（进度条+分类标签）★当前使用
│       ├── createIndicatorProgressBar()
│       ├── updateIndicatorProgressBar()
│       ├── showCategoryPopup() / hideCategoryPopup()
│       └── toggleCategoryPopupMobile()
├── 9. 顶部场景分类切换器 (第 1043-1087 行) ★已隐藏
│   ├── createSwitcher()
│   └── updateSwitcher()
├── 10. 多热点渲染与交互 (第 1090-1254 行)
│   ├── renderHotspots(hotspots)
│   ├── calcHotspotPixelPosition(position)
│   ├── repositionHotspots()
│   └── onHotspotClick(hotspotEl, products, categoryName)
├── 11. 详细面板与动画 (第 1257-1409 行)
│   ├── renderProductList(products)
│   ├── openDetailAnimation()
│   └── closeDetail()
├── 12. 语言切换器 (第 1412-1478 行)
│   ├── createLangSwitcher()
│   └── updateLangSwitcherState()
└── 13. 事件绑定与初始化 (第 1481-1667 行)
    ├── bindEvents()
    ├── addHintText()
    ├── showFullscreenError(message)
    └── init()
```

### 7.2 状态管理

```javascript
state = {
    currentIndex: 0,          // 当前场景索引（0-38）
    isTransitioning: false,   // 是否正在切换场景（防抖锁）
    isDetailOpen: false,      // 详情弹窗是否打开
    currentHotspot: null,     // 当前点击的热点DOM元素
    activeLayer: 'a',         // 当前显示的图层 'a'或'b'
    preloadedImages: {},      // 预加载图片缓存：key=src，value=Image对象
    currentLang: 'ja',        // 当前语言（默认日文）
    currentProducts: null     // 当前弹窗显示的产品数组（语言切换时重新渲染）
}
```

### 7.3 底部导航指示器配置

```javascript
const NAV_STYLE = 'progressBar';  // 'groupNumber' | 'slidingDots' | 'progressBar'
```

| 方案 | 常量值 | 布局 | 说明 |
|------|--------|------|------|
| 方案A | `groupNumber` | ◀ 分类名 序号/总数 ▶ | 分组缩略+数字 |
| 方案B | `slidingDots` | 滑动窗口圆点 | 只显示附近7个圆点，渐隐效果 |
| 方案C | `progressBar` | 分类标签 + 进度条 | ★当前使用，hover展开分类弹窗 |

### 7.4 核心流程详解

#### init() 启动流程

```
1. loadMapping()：从 mapping.json 加载数据（含 3 次重试，递增延迟）
2. 加载失败 → showFullscreenError() 显示全屏错误，终止初始化
3. initSceneCategories()：初始化场景分类映射（动态计算）
4. createIndicator()：创建底部导航指示器（当前为 progressBar）
5. createLangSwitcher()：创建语言切换器
6. 显示 loading-indicator（首屏一定需要）
7. img.removeAttribute('src') 清除 src
8. img.src = 首屏图片
9. updateIndicator(0)
10. requestAnimationFrame 启动 fadeIn 异步流程
11. waitForImageLoad(img, 30000) 等待 30 秒
12. 隐藏 loading-indicator
13. actuallyLoaded 二次检查
14. 如果成功：img 添加 .active 类，requestAnimationFrame 渲染热点
15. 首屏显示完成后启动 preloadAllImages()
16. bindEvents()、addHintText()
17. 更新页面标题：t('pageTitle') + ' - ' + t('companyName')
```

#### 场景切换流程（交叉淡入淡出）

```
1. 检查 isTransitioning 和 isDetailOpen 锁
2. 淡出热点和切换器（opacity 0）
3. needLoading 检查：isImageCached() 为 false 时显示 loading-indicator
4. nextImg.removeAttribute('src') 清除旧 src，重置 complete 状态
5. nextImg.src = scene.image 设置新图片
6. waitForImageLoad(nextImg, 15000) 等待 15 秒
7. 如果 needLoading 为 true，隐藏 loading-indicator
8. 二次检查：actuallyLoaded = nextImg.complete && naturalWidth>0
9. 先切换 activeLayer 标记（a↔b）
10. 切换CSS类：新图层 .inactive→.active，旧图层 .active→.inactive
11. CSS transition 自动执行 1.2s 交叉淡入淡出
12. 更新指示器
13. 如果 loadSuccess || actuallyLoaded：
    requestAnimationFrame 渲染多个热点，恢复热点和切换器
14. 否则：只恢复切换器，不渲染热点
15. 1300ms 后解除 isTransitioning 锁
```

#### 语言切换流程（switchLanguage）

```
1. 检查 lang !== state.currentLang 且目标语言存在
2. 更新 state.currentLang
3. 更新 document.title 和 document.documentElement.lang
4. 更新返回按钮文字（t('back')）
5. initSceneCategories()：重建分类映射（新语言分类名）
6. createIndicator() + updateIndicator()：重建底部导航指示器
7. 更新导航按钮 aria-label
8. 如果弹窗已打开：
   a. 更新弹窗标题（getText(scene.category)）
   b. 重新渲染产品列表（renderProductList(state.currentProducts)）
9. updateLangSwitcherState()：更新语言按钮活跃状态
```

#### 弹窗打开流程

```
1. 设置 isDetailOpen = true
2. 保存 state.currentProducts（用于语言切换重渲染）
3. 设置弹窗标题（getText(scene.category)）
4. renderProductList(products)：
   a. 立即创建所有产品的 DOM 骨架（左图右文）
   b. 产品名称使用 getText(product.name) 多语言
   c. 产品描述显示 t('loading') 占位符
   d. Promise.all 并行加载所有 Markdown
   e. 加载失败时显示可点击重试的提示
5. 背景淡化（#scene-container 添加 .dimmed 类）
6. 显示遮罩层（#overlay）
7. 隐藏热点、导航按钮、指示器
8. 200ms 后弹窗出现
```

#### 弹窗关闭流程

```
1. 弹窗消失（opacity 1→0）
2. 200ms 后背景恢复（移除 .dimmed 类，遮罩淡出）
3. 300ms 后恢复热点、导航按钮、指示器
4. 500ms 后清理 DOM 和状态（state.currentProducts = null）
```

### 7.5 多语言引擎详解

| 函数 | 用途 |
|------|------|
| `t(key)` | 从 `mappingData.i18n[currentLang]` 获取 UI 翻译文本 |
| `getText(obj)` | 从多语言对象 `{ ja, zh }` 获取当前语言的值；普通字符串直接返回 |
| `switchLanguage(lang)` | 切换语言并刷新所有 UI 文本 |

`getText()` 回退逻辑：`obj[currentLang]` → `obj['ja']` → `Object.values(obj)[0]` → `''`

### 7.6 数据加载重试机制

```javascript
async function loadMapping() {
    const maxRetries = 3;
    const delays = [500, 1000, 2000];
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('mapping.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            } else {
                throw error;
            }
        }
    }
}
```

### 7.7 Markdown加载机制

- **缓存策略**：`descriptionCache` 对象缓存已加载的文件，避免重复 fetch
- **降级处理**：marked.js 未加载时，简单转义 HTML 特殊字符后用 `<br>` 换行
- **错误处理**：fetch 失败时返回带 `.desc-load-failed` 样式的可点击重试提示
- **重试绑定**：失败提示绑定 click 事件，点击后清除缓存重新加载

### 7.8 管理后台模块结构（manage.js）

```
manage.js (v5.0, 1282行)
├── 全局状态 (第 6-15 行)
│   ├── mappingData
│   ├── currentSceneIndex / selectedHotspotIndex
│   ├── isDragging / dragHotspotEl / dragHotspotIndex
│   ├── imageFiles / descFiles
│   └── dialogSelectedFile
├── 初始化 (第 17-31 行)
│   └── DOMContentLoaded → bindToolbarEvents + bindEditorEvents + bindDialogEvents
│       + loadMappingData + loadImageList + loadDescriptionList + renderSceneList
├── 数据加载 (第 33-73 行)
│   ├── loadMappingData()
│   ├── loadImageList()
│   └── loadDescriptionList()
├── 工具栏事件 (第 75-109 行)
│   ├── bindToolbarEvents()
│   └── saveMapping()
├── 场景列表渲染 (第 111-284 行)
│   ├── renderSceneList() ★按文件夹分组折叠
│   ├── createSceneItem() ★含统计标签（热点数/产品数/未配置警告）
│   ├── getSceneGroupName() 从图片路径提取分组名
│   ├── getSceneDisplayName() 从图片路径提取显示名
│   ├── updateSceneListItem()
│   └── selectScene(index)
├── 场景编辑区 (第 306-404 行)
│   ├── bindEditorEvents()
│   ├── updateSceneEditor()
│   ├── clearHotspotOverlay()
│   ├── renderHotspots()
│   ├── createHotspotElement() ★带圈数字序号
│   ├── selectHotspot()
│   ├── updateCoordInfo()
│   ├── addHotspot()
│   └── deleteSelectedHotspot()
├── 热点拖拽 (第 521-572 行)
│   ├── startDrag()
│   ├── onDrag()
│   └── endDrag()
├── 场景图拖拽上传 (第 574-657 行) ★新增
│   ├── bindSceneDropEvents()
│   └── 拖拽计数器解决子元素 dragleave 问题
├── 右栏产品编辑器 (第 659-957 行)
│   ├── updateProductEditor()
│   ├── renderProductList(hotspot)
│   ├── createProductEditItem() ★含缩略图拖拽上传、引用统计
│   ├── createProductField()
│   ├── createProductSelectField()
│   └── addProductToHotspot() ★新产品的 descriptionFile 为 { ja:'', zh:'' }
├── 场景操作 (第 959-987 行)
│   ├── deleteScene(index)
│   └── getCurrentScene()
├── 添加场景对话框 (第 989-1157 行)
│   ├── bindDialogEvents()
│   ├── closeDialog()
│   ├── resetDialogDropZone() / updateDialogDropZone()
│   ├── bindDialogDropEvents() ★拖拽上传
│   └── confirmAddScene()
├── ID 生成 (第 1159-1187 行)
│   ├── generateSceneId()
│   └── generateHotspotId()
├── 图片上传 (第 1189-1208 行)
│   └── uploadImage(file, type, category)
├── 工具函数 (第 1210-1253 行)
│   ├── getSceneCategory()
│   ├── getProductUsageCount() ★产品引用统计
│   └── isImageFile()
├── Toast 提示 (第 1255-1275 行)
│   └── showToast(message, type)
└── 窗口调整 (第 1277-1282 行)
    └── resize → renderHotspots()
```

---

## 八、管理后台架构

### 8.1 概述

管理后台（`manage.html`）提供可视化编辑界面，用于管理场景、热点和产品配置，无需手动编辑 `mapping.json` 文件。

### 8.2 页面结构

管理后台采用**三栏布局**：

```
┌─────────────────────────────────────────────────────────────┐
│  工具栏：标题 + 保存按钮 + 保存状态                            │
├──────────┬──────────────────────────┬───────────────────────┤
│ 左栏      │ 中栏                      │ 右栏                  │
│ 场景列表  │ 场景编辑区                 │ 产品编辑器             │
│          │                          │                       │
│ ★分组折叠 │ 分类名(日文/中文)输入      │ 热点产品关联           │
│ 缩略图+名 │ 场景大图预览+热点拖拽      │ 名称/图片/描述编辑     │
│ 统计标签  │ ★拖拽上传更换场景图        │ ★缩略图拖拽上传       │
│          │                          │ ★日/中描述分别选择     │
│ +添加场景 │ 添加/删除热点工具栏        │ ★产品引用统计          │
│          │                          │                       │
│          │                          │ +添加产品              │
├──────────┴──────────────────────────┴───────────────────────┤
│  Toast 提示容器                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 交互流程

1. **左栏**：场景按文件夹分组折叠显示 → 点击展开 → 点击场景项 → 中栏显示场景图 + 热点
2. **中栏**：拖拽热点调整位置 → 实时更新坐标 → 右栏显示该热点产品 → 拖拽图片到场景图可更换
3. **右栏**：编辑产品名称（日/中）、选择图片/描述文件（日/中分别选择）、拖拽图片到缩略图更换、查看产品引用统计
4. **保存**：点击"保存配置" → POST `/api/save-mapping` → 服务器先备份再写入

### 8.4 核心功能

| 功能 | 操作方式 | 说明 |
|------|---------|------|
| 添加场景 | 点击"+ 添加场景"按钮 | 弹出对话框，输入分类名+上传/拖拽图片 |
| 删除场景 | 点击场景项右上角 × | 确认后删除 |
| 编辑分类名 | 直接输入框修改 | 实时同步到左栏列表 |
| 更换场景图 | 点击"更换场景图"或★拖拽图片到预览区 | 选择本地图片，自动上传并转换webp |
| 添加热点 | 点击"添加热点" | 在 (50%,50%) 位置创建新热点 |
| 删除热点 | 选中热点 → 点击"删除选中热点" | 连带删除关联产品 |
| 拖拽热点 | 在场景图上拖拽热点标记 | 实时更新坐标百分比 |
| 编辑产品 | 右栏直接修改字段 | 名称/图片/描述文件均可修改 |
| ★拖拽更换产品图 | 拖拽图片到产品缩略图 | 自动上传并转换webp |
| ★日/中描述分别选择 | 两个独立下拉框 | 日文选_jp.md，中文选_cn.md |
| ★产品引用统计 | 产品项下方显示 | 点击可展开查看引用该产品的场景列表 |
| 添加产品 | 点击"+ 添加产品到此热点" | 空产品添加到当前热点，descriptionFile为{ja:'',zh:''} |
| 删除产品 | 点击产品右上角 × | 从热点中移除 |
| 保存配置 | 点击"保存配置" | 自动备份旧文件，写入新文件 |
| ★分组折叠 | 点击分组标题 | 按场景图子文件夹分组，可折叠/展开 |

---

## 九、服务器 API

### 9.1 概述

本地开发服务器（`启动服务器.py`）在静态文件服务基础上新增 4 个 API 端点，供管理后台使用。默认端口 65002。支持 Pillow 自动将上传图片转换为 webp 格式。

### 9.2 API 端点列表

| 方法 | 路径 | 说明 | 请求格式 | 响应格式 |
|------|------|------|---------|---------|
| POST | `/api/save-mapping` | 保存 mapping.json（自动备份） | JSON body | `{"success": true}` |
| POST | `/api/upload-image` | 上传图片（自动转webp） | multipart/form-data | `{"success": true, "path": "...", "converted": bool}` |
| GET | `/api/list-images` | 获取所有图片文件列表（递归） | - | `{"scenes": {...}, "products": [...]}` |
| GET | `/api/list-descriptions` | 获取所有产品描述文件列表（递归） | - | `["产品描述/xxx.md", ...]` |

### 9.3 API 详细说明

#### POST /api/save-mapping

- **请求体**：完整的 mapping.json 数据（JSON 格式）
- **处理逻辑**：
  1. 解析请求体 JSON
  2. 备份原 mapping.json 为 mapping.json.bak
  3. 写入新数据到 mapping.json
- **错误响应**：请求体为空(400)、JSON 解析失败(400)、服务器错误(500)

#### POST /api/upload-image

- **请求体**：multipart/form-data
  - `file`：上传的图片文件
  - `type`：图片类型（`scene` 或 `product`）
  - `category`：场景分类名（type=scene 时必填）
  - `filename`：指定文件名（可选，默认使用原始文件名）
- **处理逻辑**：
  1. 手动解析 multipart 表单数据（替代已弃用的 cgi 模块）
  2. 根据 type 确定保存目录（场景图/分类名/ 或 产品图/）
  3. 目录不存在则自动创建
  4. 保存原始文件
  5. ★如果安装了 Pillow，自动转换为 webp 格式（quality:100, method:6）
  6. 处理 CMYK/LA/P 等特殊图像模式
  7. 保留 ICC 色彩配置文件
  8. 非 webp 原始文件转换后自动删除
  9. 返回相对路径和转换状态
- **响应格式**：
  ```json
  {
    "success": true,
    "path": "场景图/分类名/图片.webp",
    "converted": true,
    "originalName": "图片.png",
    "savedName": "图片.webp"
  }
  ```
- **错误响应**：缺少 type(400)、缺少 category(400)、无效 type(400)

#### GET /api/list-images

- **处理逻辑**：使用 `os.walk` 递归扫描 `场景图/` 和 `产品图/` 目录，收集所有图片文件路径
- **响应格式**：
  ```json
  {
    "scenes": {
      "便利店场景": ["场景图/便利店场景/便利店场景1.webp"],
      "超市场景": ["场景图/超市场景/超市场景1.webp", ...]
    },
    "products": ["产品图/专业视觉显示类/商用液晶显示器/商用液晶显示器.webp", ...]
  }
  ```

#### GET /api/list-descriptions

- **处理逻辑**：使用 `os.walk` 递归扫描 `产品描述/` 目录，收集所有 .md 文件路径
- **响应格式**：`["产品描述/专业视觉显示类/商用液晶显示器/商用液晶显示器_jp.md", ...]`

### 9.4 CORS 支持

所有 API 响应均包含 CORS 头：
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

OPTIONS 预检请求返回 204 No Content。

### 9.5 端口策略

默认端口 65002。如果被占用，自动递增查找可用端口（最多尝试 100 个端口）。

---

## 十、Docker 部署

### 10.1 部署环境

| 项目 | 值 |
|------|------|
| 部署主机 | 192.168.124.99 |
| 服务端口 | 65002 |
| 部署方式 | Docker Compose |
| 容器名称 | digital-signage-app |

### 10.2 Dockerfile

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo libwebp-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir Pillow
WORKDIR /app
COPY . .
EXPOSE 65002
CMD ["python", "启动服务器.py"]
```

### 10.3 docker-compose.yml

```yaml
version: '3.8'
services:
  digital-signage:
    build: .
    container_name: digital-signage-app
    ports:
      - "65002:65002"
    volumes:
      - ./mapping.json:/app/mapping.json
      - ./场景图:/app/场景图
      - ./产品图:/app/产品图
      - ./产品描述:/app/产品描述
    restart: unless-stopped
    environment:
      - PYTHONUNBUFFERED=1
```

### 10.4 部署步骤

1. 将项目文件上传到远程主机 192.168.124.99：
   ```bash
   scp -r /home/wenzhu/digital_signage_introduction/ wenzhu@192.168.124.99:/home/wenzhu/digital_signage_introduction/
   ```

2. SSH 登录远程主机：
   ```bash
   ssh wenzhu@192.168.124.99
   cd /home/wenzhu/digital_signage_introduction
   ```

3. 构建并启动容器：
   ```bash
   docker-compose up -d --build
   ```

4. 验证服务是否正常运行：
   ```bash
   docker-compose logs -f
   ```

5. 访问服务：
   - 展示页面：`http://192.168.124.99:65002/index.html`
   - 管理后台：`http://192.168.124.99:65002/manage.html`

### 10.5 常用运维命令

```bash
docker-compose up -d        # 后台启动
docker-compose logs -f      # 查看日志
docker-compose down         # 停止
docker-compose up -d --build  # 重新构建并启动
docker-compose restart      # 重启服务
docker-compose ps           # 查看容器状态
```

### 10.6 数据持久化说明

通过 `docker-compose.yml` 中的 `volumes` 配置，以下数据持久化到宿主机：

| 容器路径 | 宿主机路径 | 说明 |
|---------|-----------|------|
| `/app/mapping.json` | `./mapping.json` | 场景/产品配置数据 |
| `/app/场景图` | `./场景图` | 场景图片 |
| `/app/产品图` | `./产品图` | 产品图片 |
| `/app/产品描述` | `./产品描述` | 产品描述 Markdown 文件 |

容器重建后数据不会丢失。

---

## 十一、交互方式汇总

| 操作 | 触发方式 | 效果 |
|------|---------|------|
| 切换上一场景 | 点击左箭头 / 键盘← | 交叉淡入淡出到上一场景 |
| 切换下一场景 | 点击右箭头 / 键盘→ | 交叉淡入淡出到下一场景 |
| 跳转分类 | 点击底部分类标签 → 弹出分类列表 | 跳到该分类第一张场景图 |
| 查看产品详情 | 点击脉冲热点 | 弹出该热点关联的产品详情弹窗 |
| 关闭弹窗 | 点击返回按钮 | 关闭弹窗回到场景 |
| 关闭弹窗 | 点击遮罩层 | 关闭弹窗回到场景 |
| 关闭弹窗 | 键盘ESC | 关闭弹窗回到场景 |
| 切换语言 | 点击右上角语言按钮 | 切换日文/中文，更新所有UI文本 |

---

## 十二、常见修改指南

### 12.1 通过管理后台修改（推荐）

1. 启动服务器：双击 `启动服务器.py` 或 `docker-compose up -d`
2. 打开管理后台：`http://192.168.124.99:65002/manage.html`
3. 在左栏选择场景 → 中栏编辑 → 右栏编辑产品
4. 点击"保存配置"

### 12.2 手动修改 mapping.json

如需手动修改，直接编辑 `mapping.json`，遵循以下结构：

#### 添加新场景

```json
{
  "id": "scene_040",
  "category": { "ja": "新场景日文名", "zh": "新场景中文名" },
  "image": "场景图/新分类/新场景1.webp",
  "hotspots": [
    {
      "id": "hs_041",
      "x": 50,
      "y": 50,
      "products": [
        {
          "name": { "ja": "产品日文名", "zh": "产品中文名" },
          "image": "产品图/分类/产品.webp",
          "descriptionFile": {
            "ja": "产品描述/分类/产品_jp.md",
            "zh": "产品描述/分类/产品_cn.md"
          }
        }
      ]
    }
  ]
}
```

#### 修改热点位置

修改对应热点的 `x`、`y` 值，为百分比坐标（0=最左/最上，100=最右/最下），支持小数精度。

#### 添加新语言

1. 在 `mapping.json` 的 `i18n` 中添加新语言字典
2. 在所有 `category` 和 `name` 字段中添加新语言值
3. 在 `descriptionFile` 中添加新语言文件路径
4. 在 `index.html` 的 `#lang-switcher` 中添加新语言按钮
5. 在 `main.js` 的 `createLangSwitcher()` 的 `languages` 数组中添加新语言配置

### 12.3 修改产品描述

直接编辑 `产品描述/` 文件夹中的 `.md` 文件，支持标准 Markdown 语法（列表、粗体、表格）。日文描述文件名后缀为 `_jp.md`，中文为 `_cn.md`。

### 12.4 切换底部导航样式

在 `js/main.js` 第 36 行修改 `NAV_STYLE` 常量：

```javascript
const NAV_STYLE = 'progressBar';  // 改为 'groupNumber' 或 'slidingDots'
```

### 12.5 恢复顶部导航栏

1. 在 `css/style.css` 中移除 `#scene-switcher` 的 `display: none !important`
2. 在 `js/main.js` 中取消 `createSwitcher()` 和 `updateSwitcher()` 调用处的注释

### 12.6 修改动画速度

在 `css/style.css` 中搜索对应的 `transition` 或 `animation` 属性调整时长。

### 12.7 修改主题色

全局搜索替换 `#3b82f6`（主题蓝）和 `#2563eb`（深蓝）。

### 12.8 修改弹窗尺寸

在 `css/style.css` 中修改 `#detail-card` 的 `width` 和 `max-height`。

---

## 十三、版本改进记录

### v5.0 改进（继承自 v4.0）

| 改进 | 说明 |
|------|------|
| 场景数量扩展 | 从 10 个场景扩展到 39 个场景，覆盖 8 个分类 |
| 产品分类体系 | 产品按三大类别（专业视觉显示类/交互与自助服务类/广告播放与信息发布类）组织 |
| 多语言描述文件 | descriptionFile 从字符串改为 `{ ja, zh }` 对象，日/中描述分别存储 |
| 底部导航3种方案 | 新增 groupNumber / slidingDots / progressBar 三种导航方案，默认 progressBar |
| 顶部导航栏隐藏 | #scene-switcher 设置 display:none，与底部 progressBar 功能重复 |
| 管理后台分组折叠 | 场景列表按文件夹分组，可折叠/展开 |
| 拖拽上传 | 场景图和产品缩略图均支持拖拽上传，自动转换 webp |
| 产品引用统计 | 编辑产品时显示被多少个场景引用 |
| 日/中描述分别选择 | 管理后台右栏日文和中文描述文件独立下拉选择 |
| Pillow webp转换 | 服务器端自动将上传图片转换为 webp 格式 |
| Docker 部署 | 新增 Dockerfile 和 docker-compose.yml，支持容器化部署 |
| multipart 手动解析 | 替代已弃用的 cgi 模块，手动解析 multipart/form-data |
| 弹窗响应式适配 | 小屏幕(<600px)上图下文，中屏(<900px)微调尺寸 |
| 弹窗头部 sticky | 返回按钮始终可见，不随内容滚动 |

### v4.0 改进记录

| 改进 | 说明 |
|------|------|
| 数据与逻辑分离 | scenes 数组从 main.js 抽取为 mapping.json，支持动态加载和管理后台编辑 |
| 多语言系统 | 新增中日文双语支持，t()/getText()/switchLanguage() 完整引擎 |
| 多热点支持 | 单场景从 1 个热点扩展为 hotspots 数组，支持任意数量热点 |
| 管理后台 | 新增 manage.html + manage.js + manage.css，可视化编辑配置 |
| 服务器 API | 新增 4 个 API 端点，支持配置保存、图片上传、文件列表查询 |
| 数据加载重试 | mapping.json 加载失败自动重试 3 次，递增延迟 |
| Markdown 加载失败可重试 | 点击失败提示可重新加载，无需刷新页面 |

### CSS 改进

| 改进 | 说明 |
|------|------|
| 语言切换器样式 | #lang-switcher 毛玻璃胶囊按钮，.lang-btn.active 主题蓝强调 |
| 骨架屏 | .skeleton-line + shimmer 动画，优化加载感知 |
| 错误状态样式 | .error-overlay 全屏错误遮罩、.retry-btn 重试按钮、.load-failed 失败提示 |
| 多热点动画 | nth-child 递增延迟，多热点错开出现和脉冲 |
| 顶部装饰条流光 | #detail-card::before bar-shimmer 动画 |
| 底部导航3方案 | groupNumber / slidingDots / progressBar 三套完整样式 |
| 分类弹窗动画 | popup-appear 弹性出现动画 |
| 响应式适配 | @media 断点 900px / 600px，弹窗自适应 |

### 已修复问题

| 问题 | 修复方案 |
|------|---------|
| 翻页显示前一张图片 | 设置 src 前先 removeAttribute('src') 清除 complete 状态残留 |
| 热点位置偏移 | naturalWidth||1 回退值移除，添加图像加载完成检查，热点用 requestAnimationFrame 渲染 |
| 黑屏孤立热点 | loadSuccess 检查，失败不渲染热点 |
| 首屏永远不显示（慢速4G） | preloadAllImages() 移到首屏加载完成后，首屏超时从8s增加到30s，添加 actuallyLoaded 二次检查 |
| 转圈动画行为异常 | isImageCached() 判断是否需要显示loading，首屏无条件显示 |
| 详情面板加载慢 | 先显示DOM骨架+占位符，Promise.all并行加载Markdown |
| resize热点偏移 | 200ms防抖，resize时也检查图像加载状态 |
| waitForImageLoad内存泄漏 | addEventListener + {once:true} 替代 onload/onerror 赋值 |
| cgi 模块弃用 | 手动实现 _parse_multipart() 解析 multipart/form-data |

---

## 十四、已知问题与待办

| 问题 | 状态 | 说明 |
|------|------|------|
| marked.js依赖CDN | ⚠️ 可选优化 | 如需离线使用，可下载到本地 |
| 仅桌面版 | ✅ 符合需求 | 弹窗有响应式适配，但主要面向桌面 |
| 语言切换器样式冲突 | ⚠️ 注意 | index.html 中静态声明和 main.js 动态创建两套逻辑并存，以实际渲染为准 |
| 顶部导航栏隐藏 | ℹ️ 可恢复 | CSS 中 display:none!important，取消注释即可恢复 |
