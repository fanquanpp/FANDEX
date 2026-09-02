# FANDEX Windows 桌面端便携版

免安装的 Windows 桌面端形态：解压即用、不写注册表、可随身携带。与
[app-desktop](../app-desktop)（NSIS 安装版）共用同一套 Tauri 配置与 web 构建
产物，仅打包方式不同——安装版走 NSIS 安装向导，便携版直接产出裸 `FANDEX.exe`
并压缩为 zip。

## 产物

- `dist/FANDEX-Portable-v<版本>.zip`：解压后运行 `FANDEX.exe` 即可使用

## 与安装版的差异

| 维度 | 安装版（app-desktop） | 便携版（本目录） |
| --- | --- | --- |
| 安装方式 | NSIS 安装向导（currentUser） | 解压即用 |
| 注册表 / 卸载项 | 写入，可在"应用与功能"卸载 | 不写入，删文件夹即卸载 |
| WebView2 引导 | 缺失时可自动安装 | 不引导，需系统自带（Win10/11 默认内置） |
| 便携性 | 固定安装目录 | 可放 U 盘等移动介质 |

## 构建

仓库根执行：

```bash
pnpm install
pnpm --filter @fandex/desktop-portable build
```

流程说明（见 [build-portable.mjs](./build-portable.mjs)）：

1. `tauri build --no-bundle`：复用 app-desktop 的 Tauri 配置，
   `beforeBuildCommand` 自动完成 web 端构建与"前端实验室"页面剔除，
   `--no-bundle` 跳过 NSIS 打包仅产出裸 exe；
2. 收集 `target/release` 下的 `FANDEX.exe` 与运行所需 DLL；
3. 通过 PowerShell `Compress-Archive`（Windows 原生）打包为 zip。

## CI 集成

`.github/workflows/android-release.yml` 的 desktop 任务在打 `v*` 标签时会
同时构建安装包与便携版，并将
`FANDEX-Portable-<tag>.zip` 一并上传到 GitHub Release。
