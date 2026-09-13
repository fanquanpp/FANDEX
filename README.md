# FANDEX

[![Release](https://img.shields.io/github/v/release/fanquanpp/FANDEX?sort=semver&label=%E7%A8%B3%E5%AE%9A%E7%89%88)](https://github.com/fanquanpp/FANDEX/releases/latest)
[![Deploy](https://github.com/fanquanpp/FANDEX/actions/workflows/deploy.yml/badge.svg)](https://github.com/fanquanpp/FANDEX/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/fanquanpp/FANDEX)](LICENSE)

**FANDEX 是一套面向零基础学习者的全栈自学体系，也是学成之后的随身语法速查伴侣。**

35 个技术模块、1722 篇中文教学文档、4300+ 条语法速查、979 个学习路径知识点，
从"计算机是如何工作的"讲到数据库、后端、云原生与软件架构。网页、Windows 桌面端、
Android 双端共享同一内容体系，全部内容离线可用。

整个体系托管在**单一 Git 仓库（monorepo）**中（根目录唯一 `.git`，无子仓库与
submodule）：内容单一来源 `cnt-content/full`，模块元数据唯一来源
`shd-shared/metadata/modules.json`，设计令牌唯一来源 `shd-shared/tokens/`。

## 功能亮点

- **在线编程（前端实验室）**：浏览器内编辑并运行 HTML/CSS/JS，内置成品图鉴实时
  预览、瘦条控制台与深链直达（`?showcase=<id>`）；桌面端构建自动剔除该功能；
- **学习路线**：思维导图式技术知识链（35 门技术 · 979 个知识点），节点三态进度
  标记（未学习/学习中/已完成）与工具栏总进度环；
- **语法速览**：14 门语言/技术 4300+ 张速查卡片，按语言分包按需加载；
- **命令面板搜索**：`Ctrl/⌘ + K` 全文检索，最近浏览、功能入口分组直达；
- **PWA 离线**：网页端可安装到桌面/主屏，Service Worker 缓存支持离线回访；
- **亮暗双主题**：亮色冷雾灰、暗色纯黑画布；全站视觉由设计令牌驱动
  （DTCG JSON 单一来源，CI 令牌漂移门禁保障 web 与共享层逐令牌一致）。

## 仓库结构

```
FANDEX/                        # 仓库根（唯一 .git 所在）
├── README.md  AGENTS.md  CHANGELOG.md  LICENSE  DISCLAIMER.md
├── app-web/            # 官网（Astro 7 + React 19 + Tailwind CSS 4），GitHub Pages 部署
├── app-desktop/        # Windows 桌面端（Tauri 2，内嵌 web 产物，完全离线）
├── app-desktop-portable/ # Windows 桌面端便携版（免安装解压即用，与 app-desktop 共用构建）
├── app-Android-new/    # Android 应用 · 新技术栈主线（Kotlin + Jetpack Compose）
├── app-Android-old/    # Android 应用 · 旧技术栈归档线（已冻结，仅修阻断缺陷）
├── cnt-content/        # 内容层：full/ 全量文档、syntax/ 语法速览素材
├── shd-shared/         # 共享层：设计令牌（tokens/）、模块元数据、图标资产
├── thd-third-party/    # 第三方组件 / 插件 / 适配器
└── scripts/            # 仓库级自动化脚本（release.mjs 一键发版）
```

## 客户端

三套客户端共享同一内容管线，安装名与包名均不同，可并存使用：

| | app-web | app-desktop | app-Android-new | app-Android-old |
| --- | --- | --- | --- | --- |
| 平台 | 网页 | Windows | Android | Android |
| 定位 | 在线站点 | 桌面端主线 | 移动端主线 | 移动端归档线（已冻结） |
| 技术栈 | Astro 7 + React 19 | Tauri 2（内嵌 web 产物） | Compose + Material 3 | Compose + Material 3 |
| 包名/标识 | - | `com.fandexpp.desktop` | `com.fandexpp.fandex` | `com.fandex.app` |
| 安装名 | FANDEX | FANDEX | FANDEX | FANDEXO |
| 内容生成 | 构建期 Content Collections | 内嵌 app-web 构建产物 | `generate-content.mjs` | `generate-legacy-content.mjs` |

桌面端不包含网页端的在线编程（前端实验室）功能；文档内容全部内置于安装包，装好后
完全离线可用，任何一端不维护独立内容副本。桌面端提供 `Ctrl+Alt+F` 全局呼出/隐藏、
`F11` 全屏、`Alt+方向键` 前进后退等快捷键，详见
[app-desktop/README.md](app-desktop/README.md)。另有免安装的
[便携版](app-desktop-portable/README.md)（FANDEX-Portable-<版本>.zip，解压即用、
不写注册表），随 GitHub Release 一并分发。

Android 新主线（app-Android-new）内置完整的应用更新体系：应用内检查 GitHub
Releases 新版本、下载 APK（进度通知）并调起安装，支持每日后台自动检查（可关闭）
与忽略指定版本；另有全局字号缩放（0.8–1.4，抽屉滑杆与文档页快捷按钮）与品牌
启动页。旧主线（app-Android-old）自 4.3.0 起冻结维护，存量用户建议迁移到新主线，
详见 [app-Android-old/README.md](app-Android-old/README.md)。

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

### Windows 桌面端（app-desktop）

```bash
pnpm --filter @fandex/desktop build   # web 构建 + playground 剔除 + 前端产物就绪
cd app-desktop && npx tauri build     # 打包 NSIS 安装包（需 Rust 工具链）
```

需要 Rust stable 与 MSVC 工具链；CI 会自动构建（见 desktop-build.yml），
日常使用建议直接下载 Release 安装包。

## 内容管线

内容单一来源为 `cnt-content/full/<编号-模块>/<编号-标题>.md`。内容维护遵循
「作者只写内容，元数据自动补全」：`pnpm sync`（零依赖幂等脚本
`app-web/scripts/content-sync.mjs`，已接入全部本地构建与 CI）会在构建前自动
补全 frontmatter 托管字段、以各模块 `module.json` 为事实源注册与回收模块、
清理死链引用；`app-web/scripts/content-audit.mjs` 做内容质量审计，HIGH 级
问题阻断流水线。

```mermaid
flowchart LR
    A["cnt-content/full\n35 模块 · 1722 篇"] --> B["content-sync\n元数据自动补全"]
    B --> C["app-web\nContent Collections"]
    B --> D["app-Android-new\ngenerate-content.mjs"]
    B --> E["app-Android-old\ngenerate-legacy-content.mjs"]
    C --> F["GitHub Pages\n+ app-desktop 内嵌"]
```

三端消费方式：

- **网站**：Astro Content Collections 构建期校验（`app-web/src/content.config.ts`）；
- **Android new**：`app-Android-new/scripts/generate-content.mjs` 生成
  `assets/docs`、`assets/metadata`、语法数据与学习路径数据；
- **Android old**：`app-Android-old/scripts/generate-legacy-content.mjs` 生成
  `assets/dist-mobile`（frontmatter 剥离 + `index.json` 索引）。

新增或修改文档前，请先阅读 [AGENTS.md](AGENTS.md) 中的内容规范与自动化说明，
完整协作教程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 构建与发布（CI）

全部构建工作流只在 push `main` 与指向 `main` 的 PR 上触发（push `dev` 不触发
CI），带路径过滤；Android 与桌面端采用「触发器 + reusable workflow」结构复用
同一构建逻辑。

| 工作流 | 触发 | 职责 |
| --- | --- | --- |
| `deploy.yml` | push `main` / PR | typecheck、内容审计、网站构建 + QA 门禁、发布 GitHub Pages |
| `android-build.yml` | push `main` / PR | 双端 APK 并行构建校验（reusable） |
| `desktop-build.yml` | push `main` / PR | Windows 桌面端安装包构建与"前端实验室"剔除校验（reusable） |
| `android-release.yml` | push `v*` 标签 | 构建三端安装包并发布 GitHub Release |
| `lighthouse.yml` | 定时 / 手动 | Lighthouse 性能基线巡检 |

发布说明自动提取 CHANGELOG 对应版本段落（`FANDEX-<tag>.apk`、
`FANDEX-Legacy-<tag>.apk` 与 `FANDEX-Setup-<tag>.exe`）。日常发版使用
`pnpm release [版本号]`：自动 patch +1（或指定版本）、同步五处版本文件、
Android versionCode +1、迁移 CHANGELOG「未发布」段并 commit + tag + push，
push 后 CI 自动构建并发布 GitHub Release（`--no-push` 只改文件与提交）。

版本变更历史见 [CHANGELOG.md](CHANGELOG.md)。

## 贡献

欢迎修正文档错误、补充知识点与报告问题。仓库采用 `main`（受保护发布主线）+
`dev`（协作集成分支）的双分支模型。内容开发的实操手册（新增文档/模块、本地
校验与常见问题排查）见 [CONTENT-GUIDE.md](CONTENT-GUIDE.md)；从环境准备到
合并的完整协作教程见 [CONTRIBUTING.md](CONTRIBUTING.md)；文档 frontmatter
字段约束、目录职责与工程规范见 [AGENTS.md](AGENTS.md)。

## 许可与免责

- 本仓库内容以 [MIT License](LICENSE) 许可发布；`thd-third-party/licenses/` 存放第三方
  组件的许可文本。
- 学习内容仅供教育参考，不构成职业或投资建议，使用前请阅读
  [DISCLAIMER.md](DISCLAIMER.md)。
