# FANDEX Tauri 2 后端（src-tauri）

本目录承载 FANDEX 桌面版的 Rust 后端代码，基于 Tauri 2.x latest。

## 目录结构

```
src-tauri/
├── src/
│   ├── main.rs        # 入口，仅调用 fandex_lib::run()
│   └── lib.rs         # 全部业务逻辑：命令、插件注册、菜单、状态
├── capabilities/
│   └── default.json   # Tauri 2 权限模型配置（最小化授权）
├── icons/             # 应用图标（PNG/ICO/ICNS/SVG）
├── gen/               # Tauri 构建时生成的 schema（自动生成，不入库）
├── Cargo.toml         # Rust 依赖声明
├── tauri.conf.json    # Tauri 2 应用与打包配置
└── build.rs           # Tauri 构建脚本
```

## 开发命令

> 注：以下命令在 Phase 2 完成前端 `package.json` 重写后可用。

```bash
# 开发模式（启动 Astro dev server + Tauri 窗口）
pnpm --filter web tauri:dev

# 构建生产包（MSI / NSIS）
pnpm --filter web tauri:build

# 仅运行 Rust 端检查
cd src-tauri && cargo check
```

## 已注册命令

| 命令名 | 用途 |
|--------|------|
| `export_notes` | 导出笔记到本地文件 |
| `read_config` | 读取应用配置 |
| `write_config` | 写入应用配置 |
| `get_app_version` | 获取应用版本号 |
| `open_external` | 在系统浏览器打开链接 |
| `show_in_folder` | 在文件管理器中定位文件 |
| `set_window_title` | 动态设置窗口标题 |
| `toggle_always_on_top` | 切换窗口置顶 |

完整文档将在 Phase 13 重写本文件。
