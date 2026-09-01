# FANDEX Windows 桌面端（app-desktop）

> 本目录是 FANDEX 单一 monorepo 的子项目，不是独立仓库。仓库结构、内容体系、
> 工程规范与贡献流程的完整说明见根 [README.md](../README.md) 与 [AGENTS.md](../AGENTS.md)。

FANDEX 的 Windows 桌面端，基于 **Tauri 2**：内嵌 `app-web` 的静态构建产物，
完全离线可用，安装名 **FANDEX**（标识 `com.fandexpp.desktop`）。

## 功能定位

- **完整学习体验**：与网页端一致的模块阅读、语法速览、学习路线与界面设计；
- **内容离线**：文档与索引全部内置于安装包，无任何联网依赖；
- **窗口状态记忆**：关闭时保存窗口位置与尺寸，下次启动自动恢复
  （`tauri-plugin-window-state`）；
- **桌面快捷键**：`Ctrl+Alt+F` 全局呼出/隐藏主窗口（应用在后台时仍可触发）；
  `F11` 全屏切换，`Esc` 退出全屏；`Alt+左/右方向键` 后退/前进，
  对齐浏览器阅读习惯；
- **无在线编程**：网页端的"前端实验室"（在线编程）页面在桌面构建中剔除，
  与学习主线无关的能力不带入桌面端。

## 构建流程

```bash
# 1. 桌面端构建编排：web 构建（base 切换为根路径）+ playground 剔除
pnpm --filter @fandex/desktop build

# 2. Tauri 打包（NSIS 安装包，需 Rust stable 与 MSVC 工具链）
cd app-desktop && npx tauri build
```

产物位于 `src-tauri/target/release/bundle/nsis/`。CI 环境下由
`desktop-build.yml`（构建校验）与 `android-release.yml`（v* 标签发布）
自动完成，安装包统一命名为 `FANDEX-Setup-<版本>.exe` 进入 GitHub Release。

## 与 web 端的关系

桌面端不复制 web 代码：`tauri.conf.json` 的 `frontendDist` 直接指向
`../app-web/dist`，web 端每次构建即桌面端可用产物。唯二差异由构建编排处理：

1. `DESKTOP_BUILD=1` 时 Astro `base` 切换为根路径（Tauri 内 `/FANDEX/` 前缀会 404）；
2. 构建后剔除 playground 页面与静态 HTML 中的入口链接。

## 目录结构

```
app-desktop/
├── build-desktop.mjs       # 构建编排：web 构建 + 桌面适配后处理
├── package.json            # @fandex/desktop（tauri-cli 依赖）
└── src-tauri/
    ├── tauri.conf.json     # 窗口/打包/图标/前端产物配置
    ├── capabilities/       # Tauri 能力声明（窗口状态记忆、全屏快捷键）
    ├── icons/              # 图标套件（由 shd-shared 统一 app-icon.svg 生成）
    └── src/                # Rust 入口（main.rs / lib.rs：窗口构建、快捷键注册）
```
