# FANDEX

**FANDEX 是一套面向零基础学习者的全栈自学体系，也是学成之后的随身语法速查伴侣。**

46 个技术模块、1700+ 篇中文教学文档，从"计算机是如何工作的"讲到数据库、后端、云原生与
软件架构，全部内容离线可用——网页、Windows 桌面端、Android 双端应用均可使用。

整个体系托管在**单一 Git 仓库（monorepo）**中（根目录唯一 `.git`，无子仓库与
submodule），四端共享同一内容体系：内容单一来源 `cnt-content/full`，模块元数据
唯一来源 `shd-shared/metadata/modules.json`。

## 仓库结构

```
FANDEX/                        # 仓库根（唯一 .git 所在）
├── README.md  AGENTS.md  CHANGELOG.md  LICENSE  DISCLAIMER.md
├── app-web/            # 官网（Astro 7 + React 19 + Tailwind CSS 4），GitHub Pages 部署
├── app-desktop/        # Windows 桌面端（Tauri 2，内嵌 web 产物，完全离线）
├── app-desktop-portable/ # Windows 桌面端便携版（免安装解压即用，与 app-desktop 共用构建）
├── app-Android-new/    # Android 应用 · 新技术栈主线（Kotlin + Jetpack Compose）
├── app-Android-old/    # Android 应用 · 旧技术栈归档线（功能完整，可构建发布）
├── cnt-content/        # 内容层：full/ 全量文档、syntax/ 语法速览素材
├── shd-shared/         # 共享层：设计令牌、模块元数据（metadata/modules.json）、图标资产
├── tls-tools/          # 工具链：文档 ID 分配、内容清单（manifest）生成
└── thd-third-party/    # 第三方组件 / 插件 / 适配器
```

## 客户端

三套客户端共享同一内容管线，安装名与包名均不同，可并存使用：

| | app-web | app-desktop | app-Android-new | app-Android-old |
| --- | --- | --- | --- | --- |
| 平台 | 网页 | Windows | Android | Android |
| 定位 | 在线站点 | 桌面端主线 | 移动端主线 | 移动端归档线 |
| 技术栈 | Astro 7 + React 19 | Tauri 2（内嵌 web 产物） | Compose + Material 3 | Compose + Material 3 |
| 包名/标识 | - | `com.fandexpp.desktop` | `com.fandexpp.fandex` | `com.fandex.app` |
| 安装名 | FANDEX | FANDEX | FANDEX | FANDEXO |
| 内容生成 | 构建期 Content Collections | 内嵌 app-web 构建产物 | `generate-content.mjs` | `generate-legacy-content.mjs` |

桌面端不包含网页端的在线编程（前端实验室）功能；文档内容全部内置于安装包，装好后
完全离线可用，任何一端不维护独立内容副本。桌面端提供 `Ctrl+Alt+F` 全局呼出/隐藏、
`F11` 全屏、`Alt+方向键` 前进后退等快捷键，详见 [app-desktop/README.md](app-desktop/README.md)。
另有免安装的
[便携版](app-desktop-portable/README.md)（FANDEX-Portable-<版本>.zip，解压即用、
不写注册表），随 GitHub Release 一并分发。

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

`.github/workflows/android-build.yml`：push 与 PR 时双端 APK 并行构建校验。

`.github/workflows/android-release.yml`：push `v*` 标签时构建三端安装包并发布
GitHub Release（`FANDEX-<tag>.apk`、`FANDEX-Legacy-<tag>.apk` 与
`FANDEX-Setup-<tag>.exe`，发布说明自动提取 CHANGELOG 版本段落）。

`.github/workflows/desktop-build.yml`：push 与 PR 时构建 Windows 桌面端安装包并
校验"前端实验室"剔除。

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
