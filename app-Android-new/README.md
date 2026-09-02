# FANDEX Android

FANDEX 知识体系的 Android 端应用，基于 Jetpack Compose 的离线全量内容客户端。
开发重构以 `app-web`（Astro 站点）为唯一设计基准：数据管线、Service 分层、
UI/UX 美术风格（ark-ui 设计语言）均与 web 端对齐。

> 本应用与旧版 FANDEX-App（`com.fandex.app`，仅语法速查）是**两个独立应用**，
> applicationId 不同、签名不同，互不覆盖更新，可并存安装。

## 应用信息

| 项 | 值 |
| --- | --- |
| applicationId | `com.fandexpp.fandex` |
| 版本 | 1.0.0 (versionCode 1) |
| 技术栈 | Kotlin 2.4 + Jetpack Compose (BOM 2026.08) + Material 3 |
| minSdk / targetSdk | 26 / 37 |
| 内容规模 | 46 模块 / 1743 篇文档 / 8500+ 语法点 / 40+ 学习路径，全部离线内置 |

旧版安装包归档于 `legacy/`（已 gitignore），用于设备上的恢复参考。

## 信息架构（参考旧版 FANDEX-App 设计）

- **顶部 Dock**：各页面统一常驻功能按钮（语法速览 / 学习路线 / 搜索 / 主题快切），
  首页左侧为抽屉菜单、详情页为返回；无底部导航
- **抽屉面板**：设置收纳其中——品牌头部与站点统计、快捷导航（当前项高亮）、
  显示设置（主题三选 / 显示大小滑杆 0.8x-1.4x / 动态背景开关）、
  模块快速导航（多彩分类分组 + 文档计数）、免责声明
- **主页开门见山**：分类筛选 chips（多彩选中态）+ 最近浏览 + 模块内容，
  无 Hero 遮挡
- **图标体系**：统一使用共享 Material 图标集与 modules.json 的 icon 文本元数据，
  不单独生成图标，保证全局一致

## 目录架构（模块化拆解，对齐 app-web 分层）

```
app-Android-new/
├── scripts/
│   └── generate-content.mjs        # 内容管线：从仓库内容源生成 assets
├── legacy/                          # 旧版 FANDEX-App APK 归档（不入库）
└── app/src/main/
    ├── assets/                      # 生成产物（勿手改，运行 generate-content.mjs 再生成）
    │   ├── metadata/
    │   │   ├── modules.json         # 模块元数据（源自 shd-shared/metadata）
    │   │   ├── doc-index.json       # 全量文档索引（frontmatter 解析生成）
    │   │   ├── syntax-index.json    # 语法语言索引（源自 app-web 预构建索引）
    │   │   └── learning-path/       # 学习路径索引与各技术路径
    │   ├── syntax-data/             # 各语言语法速查卡片
    │   └── docs/                    # 全部文档 Markdown（源自 cnt-content/full）
    └── java/com/fandex/app/
        ├── AppContainer.kt          # 依赖容器（仓库单例，对齐 web services 统一出口）
        ├── data/
        │   ├── asset/AssetStore.kt  # assets 读取 + 内存缓存
        │   ├── model/Models.kt      # 数据模型（与内容源 JSON 严格对齐）
        │   ├── prefs/               # DataStore 偏好（主题模式）
        │   └── repository/          # 仓库层，逐一对齐 app-web/src/services
        │       ├── ModuleRepository.kt        # module-service.ts
        │       ├── DocRepository.kt           # doc-service.ts（含阅读时长公式）
        │       ├── SyntaxRepository.kt        # syntax-service.ts
        │       └── LearningPathRepository.kt  # learning-path 数据源
        └── ui/
            ├── common/              # 容器获取辅助
            ├── components/          # ModuleCard / DocListItem / GeoBgDecor / AppBottomBar
            ├── markdown/            # Markdown 块模型 / AST 访问器 / 渲染器 / 语法高亮
            ├── navigation/          # Routes + AppRoot（单 Activity + Navigation Compose）
            ├── screens/             # home / module / document / search / syntax /
            │                        # learningpath / settings（页面级模块）
            └── theme/               # Color / Theme / Type / Shapes（逐值对齐 web 令牌）
```

## 设计体系（对齐 app-web）

- 颜色：`ui/theme/Color.kt` 逐值同步 web 端 `tokens.css` 的 primitive 层
  （纯中性灰色阶 + 青色强调：浅色 `#0B6E7E` / 深色 `#00E5FF`）。
- 语义：`ui/theme/Theme.kt` 的 Material 3 ColorScheme 与 FandexExtendedColors
  一一对应 web 语义令牌（bg/fg/border/code 各层级）。
- 代码块：双主题恒为深底浅字（与 web `--color-code-bg` 行为一致），
  内置轻量语法高亮（关键字 / 字符串 / 数字 / 注释 / 注解 / 函数名）。
- 圆角：卡片 8dp、按钮与徽章 4dp、模态 12dp；禁止点状装饰，
  指示器统一为 1-4px 竖条（ark-ui 风格）。
- 字体：系统 Sans 主体 + Monospace 代码；正文行高 1.625，展示标题 ExtraBold。

## 功能清单

- 首页：Hero（渐变标题 / 统计栏 / 快捷入口）+ 最近浏览横滑区（直达文档）+
  分类区块（计数药丸 + 模块卡片）
- 模块页：按学习顺序（frontmatter order）排列的文档列表
- 文档页：Markdown 渲染（表格 / 告警块 / 任务列表 / 嵌套列表 / 代码高亮 / 复制 /
  链接跳转 / 图片占位）、目录（H2-H4 底部面板定位）、阅读进度条、阅读时长、
  前置知识与相关文档（跨模块解析）、上下篇导航、回到顶部悬浮按钮、系统分享
- 语法速查：语言索引（与 web 同序）→ 卡片搜索、section 分组、代码高亮、
  跳转来源文档
- 学习路线：路径列表（web 索引同序，并发预加载）→ 阶段 / 节点 / 难度徽章 /
  节点跳转文档
- 搜索：标题 / 描述 / 模块名全文检索，300ms 防抖，结果带模块归属标签
- 设置：主题模式（跟随系统 / 浅色 / 深色），DataStore 持久化
- 阅读历史：DataStore 记录最近浏览（上限 12 条，最新在前去重）

## 交互与动效（对齐 web motion 令牌）

- 页面过渡：Tab 级页面淡入淡出 + 轻微上移；详情级页面横滑推入 /
  横滑退出，承接系统预测性返回手势（返回时实时播放离场动效）
- 卡片按压缩放反馈（scale 0.98，75ms instant）
- 启动底色双主题（深色模式冷启动无白闪）

## 构建与内容更新

```bash
# 1. 内容变更后重新生成 assets（仓库根目录执行）
node app-Android-new/scripts/generate-content.mjs

# 2. 构建 Debug APK
cd app-Android-new && ./gradlew :app:assembleDebug

# 产物：app/build/outputs/apk/debug/app-debug.apk
```

注意：`gradle-wrapper.properties` 的发行版地址指向腾讯镜像
（官方源在当前网络环境不可达）；Gradle 9.6.1 与全部依赖均已本地缓存。
