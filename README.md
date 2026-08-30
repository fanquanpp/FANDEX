# FANDEX

**FANDEX 是一套面向零基础学习者的全栈自学体系，同时是学成之后的随身语法速查伴侣。**

43 个技术模块、1700+ 篇中文教学文档，从"计算机是如何工作的"一路讲到数据库、后端框架、
云原生与软件架构。全部内容离线可用：网页直接访问，也可以装进手机（Android 双端应用）。

整个体系托管在**单一 Git 仓库（monorepo）**中：根目录是唯一的仓库根（全仓库只有一个
`.git`），网站、桌面端、双端 Android 应用与共享内容层全部是根仓库下的普通子目录，不存在
任何子仓库、submodule 或嵌套 Git 配置。四端共享同一内容体系——内容单一来源为
`cnt-content/full`，模块元数据唯一来源为 `shd-shared/metadata/modules.json`。

## 不知道从哪开始？从这里开始

如果你从未写过代码，按下面的主线顺序学习即可。每个模块的第一篇都是写给零基础的
"这是什么、为什么学、怎么跑起来"，模块之间以前置依赖（prerequisites）标注衔接，不会出现断层：

| 阶段 | 模块顺序 | 你将学会 |
| --- | --- | --- |
| 认知与工具 | getting-started → markdown → git → github | 计算机与互联网的工作原理、环境搭建、版本控制 |
| Web 基石 | html5 → css → javascript → typescript | 从第一个网页到动态交互与类型安全 |
| 前端框架 | vue3 或 react（二选一）→ vite → tailwind → svg → astro → nextjs | 现代前端的工程化开发 |
| 后端与数据 | python 或 java 或 go → sql → mysql → postgresql → redis → nestjs | 服务端开发与数据库设计 |
| 计算机科学 | algorithm → cs-fundamentals → c → cpp | 数据结构、算法与底层原理 |
| 工程与架构 | devops → networking → cloud-computing → software-testing → software-architecture 等 | 部署运维、网络安全、架构设计 |
| 专项扩展 | rust、kotlin、csharp、mongodb、message-queue、cybersecurity 等 | 第二语言与专项深化 |

每篇文档都包含：学习动机、前置知识引用、可运行的代码示例、常见错误与调试方法、
下一步推荐。文档之间的引用（7000+ 处）经全量校验，无死链。

## 仓库结构

```
FANDEX/                        # 仓库根（唯一 .git 所在）
├── README.md  AGENTS.md  CHANGELOG.md  LICENSE  DISCLAIMER.md
├── app-web/            # 官网（Astro 7 + React 19 + Tailwind CSS 4），GitHub Pages 部署
├── app-desktop/        # 桌面端占位（Tauri 2，规划中）
├── app-Android-new/    # Android 应用 · 新技术栈主线（Kotlin + Jetpack Compose）
├── app-Android-old/    # Android 应用 · 旧技术栈归档线（功能完整，可构建发布）
├── cnt-content/        # 内容层：full/ 全量文档、syntax/ 语法速览素材
├── shd-shared/         # 共享层：设计令牌、模块元数据（metadata/modules.json）、图标资产
├── tls-tools/          # 工具链：文档 ID 分配、内容审计、manifest 签名分发
├── thd-third-party/    # 第三方组件 / 插件 / 适配器
└── tools/              # 内容工程批处理脚本
```

## 双端 Android 应用

两套应用共享同一内容管线，`applicationId` 不同，可并存安装：

| | app-Android-new（主线） | app-Android-old（归档线） |
| --- | --- | --- |
| 包名 | `com.fandexpp.fandex` | `com.fandex.app` |
| 技术栈 | Kotlin + Jetpack Compose + Material 3 | Kotlin + Jetpack Compose + Material 3 |
| 内容生成 | `generate-content.mjs` | `generate-legacy-content.mjs` |
| 特性 | 语法速览、学习路线、全文搜索、mermaid 图表 | 离线速查、数学公式渲染、更新自检 |

文档内容全部内置于安装包（assets），装好后完全离线可用；内容源统一锚定
`cnt-content/full`，任何一端不维护独立内容副本。

## 快速开始

### 环境

- Node.js >= 22 与 pnpm >= 10（版本见根 `package.json` 的 `packageManager` 字段）
- JDK 21 与 Android SDK（compileSdk 37，双端 Android 构建需要）
- 学习内容本身不需要任何环境——直接访问网页或安装应用即可

### 网站（app-web）

```bash
pnpm install --frozen-lockfile    # 在仓库根执行
pnpm build:web                    # 完整构建（内容统计、语法索引、静态构建、搜索索引）
pnpm dev:web                      # 本地开发服务器
```

### Android 双端

```bash
# 新技术栈主线：先从仓库根同步内容，再进子目录构建
node app-Android-new/scripts/generate-content.mjs
cd app-Android-new && ./gradlew :app:assembleDebug

# 旧技术栈归档线
node app-Android-old/scripts/generate-legacy-content.mjs
cd app-Android-old && ./gradlew :app:assembleDebug
```

两个工程均内置 Gradle wrapper，首次构建自动下载 Gradle 与依赖。

## 内容管线

内容单一来源为 `cnt-content/full/<编号-模块>/<编号-标题>.md`，frontmatter 携带
`order / title / module / category / difficulty / description` 等元数据：

- **网站**：Astro Content Collections 构建期校验（`app-web/src/content.config.ts`）；
- **Android new**：`app-Android-new/scripts/generate-content.mjs` 生成
  `assets/docs`、`assets/metadata`、语法数据与学习路径数据；
- **Android old**：`app-Android-old/scripts/generate-legacy-content.mjs` 生成
  `assets/dist-mobile`（frontmatter 剥离 + `index.json` 索引）。

模块与分类元数据唯一来源为 `shd-shared/metadata/modules.json`。新增或修改文档前，
请先阅读 [AGENTS.md](AGENTS.md) 中的 frontmatter 字段规范与内容审计入口。

## 构建与发布（CI）

`.github/workflows/android-release.yml`：push 到 main 时双端并行构建校验；push `v*`
标签时构建签名 APK 并发布 GitHub Release（`FANDEX-<tag>.apk` 与
`FANDEX-Legacy-<tag>.apk`，发布说明自动提取 CHANGELOG 版本段落）。

`.github/workflows/deploy.yml`：push 到 main 后构建网站并发布至 GitHub Pages。

版本变更历史见 [CHANGELOG.md](CHANGELOG.md)。

## 贡献

欢迎修正文档错误、补充知识点与报告问题。提交流程与规范见
[CONTRIBUTING.md](CONTRIBUTING.md)；文档 frontmatter 字段约束、目录职责与工程规范
见 [AGENTS.md](AGENTS.md)。

## 许可与免责

- 本仓库内容以 [MIT License](LICENSE) 许可发布；`thd-third-party/licenses/` 存放第三方
  组件的许可文本。
- 学习内容仅供教育参考，不构成职业或投资建议，使用前请阅读
  [DISCLAIMER.md](DISCLAIMER.md)。
