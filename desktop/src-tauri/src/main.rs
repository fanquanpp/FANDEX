// FANDEX 桌面应用 Tauri 2 入口
//
// 本模块承载 FANDEX 桌面版全部 Rust 业务逻辑：
// - 应用配置读写（基于 tauri-plugin-fs 的轻量 JSON 持久化）
// - 笔记导出（通过 tauri-plugin-dialog 选择保存路径后写入文件）
// - 外部链接打开、文件管理器定位（tauri-plugin-shell）
// - 窗口标题动态设置、置顶切换（tauri::WebviewWindow API）
// - 应用菜单注册（File / Edit / View / Window / Help）
//
// 所有命令均通过 `#[tauri::command]` 暴露给前端，
// 错误统一以 `Result<T, String>` 形式跨 IPC 边界传递。
//
// 说明：原 lib.rs + main.rs 双 crate 结构已合并为单一 binary crate，
// 以规避 Windows 上 libfandex_lib.rlib 膨胀（5.7GB）导致的 E0786 元数据损坏问题。

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;

/// 应用配置条目，对应 config.json 中的一条键值对
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ConfigEntry {
    key: String,
    value: String,
}

/// 应用全局状态：
/// - `config`: 内存中的配置缓存，启动时由 init_config 载入，写操作同步落盘
/// - `always_on_top`: 当前窗口是否处于置顶状态，用于 toggle_always_on_top 切换
/// - `zoom_level`: 当前 webview 缩放因子（Tauri 2.11 移除了 WebviewWindow::zoom，
///   改由 AppState 维护当前缩放值，通过 Webview::set_zoom 应用）
struct AppState {
    config: Mutex<HashMap<String, String>>,
    always_on_top: Mutex<bool>,
    zoom_level: Mutex<f64>,
}

/// 获取应用配置文件路径（$APPDATA/fandex/config.json）
///
/// - 入参：`app` Tauri 应用句柄
/// - 返回：配置文件绝对路径
fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取 APPDATA 目录失败: {}", e))?;
    let config_dir = app_data.join("fandex");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    Ok(config_dir.join("config.json"))
}

/// 启动时载入配置文件到内存
///
/// - 若文件不存在，初始化为空 HashMap
/// - 若文件存在但解析失败，记录警告并使用空配置，避免阻塞启动
fn load_config(app: &tauri::AppHandle, state: &AppState) {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(e) => {
            log::warn!("配置路径不可用: {}", e);
            return;
        }
    };

    if !path.exists() {
        log::info!("配置文件不存在，使用默认空配置");
        return;
    }

    match fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Vec<ConfigEntry>>(&content) {
            Ok(entries) => {
                let mut config = state.config.lock().unwrap();
                for entry in entries {
                    config.insert(entry.key, entry.value);
                }
                log::info!("已载入 {} 条配置", config.len());
            }
            Err(e) => {
                log::warn!("配置文件解析失败，使用空配置: {}", e);
            }
        },
        Err(e) => {
            log::warn!("配置文件读取失败，使用空配置: {}", e);
        }
    }
}

/// 将内存中的配置整体落盘
///
/// - 序列化为 JSON 数组形式写入 config.json
fn save_config(app: &tauri::AppHandle, state: &AppState) -> Result<(), String> {
    let path = config_path(app)?;
    let config = state.config.lock().unwrap();
    let entries: Vec<ConfigEntry> = config
        .iter()
        .map(|(k, v)| ConfigEntry {
            key: k.clone(),
            value: v.clone(),
        })
        .collect();
    let json = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("配置序列化失败: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("配置文件写入失败: {}", e))?;
    Ok(())
}

/// 导出笔记到本地文件
///
/// - 入参 `notes`：笔记内容（已由前端组装为最终文本，支持 Markdown）
/// - 入参 `file_name`：建议的文件名（不带扩展名时自动追加 .md）
/// - 流程：调用 tauri-plugin-dialog 弹出保存对话框 → 写入用户选定路径
/// - 返回：成功返回 `()`，失败返回错误描述字符串
#[tauri::command]
async fn export_notes(
    app: tauri::AppHandle,
    notes: String,
    file_name: String,
) -> Result<(), String> {
    // 文件名兜底处理：为空时使用默认名；缺失扩展名时追加 .md
    let safe_name = if file_name.trim().is_empty() {
        "fandex-notes.md".to_string()
    } else if !file_name.contains('.') {
        format!("{}.md", file_name)
    } else {
        file_name
    };

    // 弹出原生保存对话框，限定为 Markdown / 文本 两类过滤项
    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .add_filter("Text", &["txt"])
        .set_file_name(&safe_name)
        .blocking_save_file();

    let file_path = match file_path {
        Some(path) => path.into_path(),
        None => return Err("用户取消了导出".to_string()),
    };

    let file_path = file_path.map_err(|e| format!("路径解析失败: {}", e))?;

    // 写入文件：先确保父目录存在，再落盘
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    fs::write(&file_path, notes).map_err(|e| format!("文件写入失败: {}", e))?;

    log::info!("笔记已导出至: {:?}", file_path);
    Ok(())
}

/// 读取应用配置项
///
/// - 入参 `key`：配置键
/// - 返回：存在则 `Some(value)`，不存在则 `None`
#[tauri::command]
fn read_config(key: String, state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let config = state.config.lock().unwrap();
    Ok(config.get(&key).cloned())
}

/// 写入应用配置项
///
/// - 入参 `key`：配置键
/// - 入参 `value`：配置值
/// - 流程：更新内存缓存 → 立即落盘（保证崩溃后不丢失）
/// - 返回：成功返回 `()`，失败返回错误描述字符串
#[tauri::command]
fn write_config(
    app: tauri::AppHandle,
    key: String,
    value: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    {
        let mut config = state.config.lock().unwrap();
        config.insert(key, value);
    }
    save_config(&app, &state)
}

/// 获取应用版本号
///
/// - 返回：Cargo.toml 中声明的版本（如 "3.0.0"）
#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

/// 使用系统默认浏览器打开外部链接
///
/// - 入参 `url`：目标 URL（必须以 http:// 或 https:// 开头）
/// - 流程：调用 tauri-plugin-shell 的 open 方法
/// - 返回：成功返回 `()`，失败返回错误描述字符串
#[tauri::command]
async fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    // URL 协议白名单校验，防止 file://、javascript: 等危险协议
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(format!("不支持的 URL 协议: {}", url));
    }
    app.shell()
        .open(url, None)
        .map_err(|e| format!("打开链接失败: {}", e))
}

/// 在系统文件管理器中定位指定文件
///
/// - 入参 `path`：目标文件或目录的绝对路径
/// - 返回：成功返回 `()`，失败返回错误描述字符串
#[tauri::command]
async fn show_in_folder(path: String) -> Result<(), String> {
    let path_obj = PathBuf::from(&path);
    if !path_obj.exists() {
        return Err(format!("路径不存在: {}", path));
    }

    // 跨平台调用：Windows 使用 explorer.exe /select,，macOS 使用 open -R，Linux 使用 xdg-open
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("打开 Finder 失败: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path_obj.parent().unwrap_or(&path_obj))
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    }
    Ok(())
}

/// 动态设置窗口标题
///
/// - 入参 `title`：新窗口标题
/// - 返回：成功返回 `()`，失败返回错误描述字符串
#[tauri::command]
fn set_window_title(window: WebviewWindow, title: String) -> Result<(), String> {
    window
        .set_title(&title)
        .map_err(|e| format!("设置窗口标题失败: {}", e))
}

/// 切换窗口置顶状态
///
/// - 流程：读取当前置顶状态 → 取反 → 应用到窗口 → 更新状态缓存
/// - 返回：切换后的置顶状态（true 表示已置顶）
#[tauri::command]
fn toggle_always_on_top(
    window: WebviewWindow,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let mut always_on_top = state.always_on_top.lock().unwrap();
    *always_on_top = !*always_on_top;
    let new_state = *always_on_top;
    drop(always_on_top);

    window
        .set_always_on_top(new_state)
        .map_err(|e| format!("切换窗口置顶失败: {}", e))?;

    Ok(new_state)
}

/// 构建应用菜单
///
/// 菜单结构：
/// - File：导出笔记 / 退出
/// - Edit：复制 / 粘贴 / 全选（系统预定义项）
/// - View：放大 / 缩小 / 重置 / 切换全屏
/// - Window：最小化 / 缩放 / 关闭
/// - Help：关于 / 文档 / 报告问题
///
/// Tauri 2.11 API 变更：所有菜单构造函数均需传入 manager 参数，并返回 Result
/// 因此本函数改为接收 app_handle 参数，返回 Result<Menu, String>
fn build_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, String> {
    // File 菜单：导出笔记 + 退出
    let file_menu = Submenu::new(app, "File", true)
        .map_err(|e| format!("创建 File 菜单失败: {}", e))?;
    let export_notes_item = MenuItem::with_id(app, "export_notes", "导出笔记", true, None::<&str>)
        .map_err(|e| format!("创建 export_notes 菜单项失败: {}", e))?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
        .map_err(|e| format!("创建 quit 菜单项失败: {}", e))?;
    let file_separator = PredefinedMenuItem::separator(app)
        .map_err(|e| format!("创建分隔符失败: {}", e))?;
    file_menu
        .append_items(&[&export_notes_item, &file_separator, &quit_item])
        .map_err(|e| format!("追加 File 菜单项失败: {}", e))?;

    // Edit 菜单：复制 / 粘贴 / 全选（系统预定义项）
    let edit_menu = Submenu::new(app, "Edit", true)
        .map_err(|e| format!("创建 Edit 菜单失败: {}", e))?;
    let copy_item = PredefinedMenuItem::copy(app, None)
        .map_err(|e| format!("创建 copy 菜单项失败: {}", e))?;
    let paste_item = PredefinedMenuItem::paste(app, None)
        .map_err(|e| format!("创建 paste 菜单项失败: {}", e))?;
    let select_all_item = PredefinedMenuItem::select_all(app, None)
        .map_err(|e| format!("创建 select_all 菜单项失败: {}", e))?;
    edit_menu
        .append_items(&[&copy_item, &paste_item, &select_all_item])
        .map_err(|e| format!("追加 Edit 菜单项失败: {}", e))?;

    // View 菜单：放大 / 缩小 / 重置 / 切换全屏
    let view_menu = Submenu::new(app, "View", true)
        .map_err(|e| format!("创建 View 菜单失败: {}", e))?;
    let zoom_in_item = MenuItem::with_id(app, "zoom_in", "放大", true, None::<&str>)
        .map_err(|e| format!("创建 zoom_in 菜单项失败: {}", e))?;
    let zoom_out_item = MenuItem::with_id(app, "zoom_out", "缩小", true, None::<&str>)
        .map_err(|e| format!("创建 zoom_out 菜单项失败: {}", e))?;
    let zoom_reset_item = MenuItem::with_id(app, "zoom_reset", "重置缩放", true, None::<&str>)
        .map_err(|e| format!("创建 zoom_reset 菜单项失败: {}", e))?;
    let view_separator = PredefinedMenuItem::separator(app)
        .map_err(|e| format!("创建分隔符失败: {}", e))?;
    let toggle_fullscreen_item = MenuItem::with_id(app, "toggle_fullscreen", "切换全屏", true, None::<&str>)
        .map_err(|e| format!("创建 toggle_fullscreen 菜单项失败: {}", e))?;
    view_menu
        .append_items(&[
            &zoom_in_item,
            &zoom_out_item,
            &zoom_reset_item,
            &view_separator,
            &toggle_fullscreen_item,
        ])
        .map_err(|e| format!("追加 View 菜单项失败: {}", e))?;

    // Window 菜单：最小化 / 缩放 / 关闭
    let window_menu = Submenu::new(app, "Window", true)
        .map_err(|e| format!("创建 Window 菜单失败: {}", e))?;
    let minimize_item = MenuItem::with_id(app, "minimize", "最小化", true, None::<&str>)
        .map_err(|e| format!("创建 minimize 菜单项失败: {}", e))?;
    let maximize_item = MenuItem::with_id(app, "maximize", "缩放", true, None::<&str>)
        .map_err(|e| format!("创建 maximize 菜单项失败: {}", e))?;
    let close_item = MenuItem::with_id(app, "close", "关闭", true, None::<&str>)
        .map_err(|e| format!("创建 close 菜单项失败: {}", e))?;
    window_menu
        .append_items(&[&minimize_item, &maximize_item, &close_item])
        .map_err(|e| format!("追加 Window 菜单项失败: {}", e))?;

    // Help 菜单：关于 / 文档 / 报告问题
    let help_menu = Submenu::new(app, "Help", true)
        .map_err(|e| format!("创建 Help 菜单失败: {}", e))?;
    let about_item = MenuItem::with_id(app, "about", "关于 FANDEX", true, None::<&str>)
        .map_err(|e| format!("创建 about 菜单项失败: {}", e))?;
    let docs_item = MenuItem::with_id(app, "docs", "FANDEX 文档", true, None::<&str>)
        .map_err(|e| format!("创建 docs 菜单项失败: {}", e))?;
    let report_issue_item = MenuItem::with_id(app, "report_issue", "报告问题", true, None::<&str>)
        .map_err(|e| format!("创建 report_issue 菜单项失败: {}", e))?;
    help_menu
        .append_items(&[&about_item, &docs_item, &report_issue_item])
        .map_err(|e| format!("追加 Help 菜单项失败: {}", e))?;

    // 顶层菜单栏：聚合所有子菜单
    let menu = Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &window_menu, &help_menu])
        .map_err(|e| format!("创建主菜单失败: {}", e))?;

    Ok(menu)
}

/// 处理菜单点击事件
///
/// - 通过事件 ID 分发到对应行为
/// - 导出笔记、打开文档/报告链接通过 emit 事件交由前端处理（保留扩展点）
/// - 窗口控制（最小化/缩放/关闭/全屏）直接调用窗口 API
/// - 缩放控制：Tauri 2.11 移除了 WebviewWindow::zoom，改由 AppState 维护当前缩放值，
///   通过 emit 事件通知前端使用 CSS zoom 调整（避免 Webview 句柄获取的复杂性）
///
/// Tauri 2.11 API 变更：on_menu_event 回调签名从 `Fn(MenuEvent, &AppHandle)` 改为
/// `Fn(&AppHandle, MenuEvent)`，参数顺序已调整
fn handle_menu_event(app: &tauri::AppHandle, event: MenuEvent) {
    let window = match app.get_webview_window("main") {
        Some(w) => w,
        None => {
            log::warn!("菜单事件触发时主窗口不存在: {:?}", event.id());
            return;
        }
    };

    match event.id().as_ref() {
        "export_notes" => {
            // 通过事件通知前端打开导出对话框（前端持有笔记内容）
            let _ = app.emit("menu-export-notes", ());
        }
        "quit" => {
            app.exit(0);
        }
        "zoom_in" => {
            // Tauri 2.11：WebviewWindow::zoom 已移除
            // 通过 emit 事件通知前端调整 CSS zoom（前端监听 menu-zoom 事件）
            let state = app.state::<AppState>();
            let mut zoom = state.zoom_level.lock().unwrap();
            *zoom = (*zoom + 0.1).min(3.0);
            let new_zoom = *zoom;
            drop(zoom);
            let _ = app.emit("menu-zoom", new_zoom);
        }
        "zoom_out" => {
            // 每次缩小 0.1，下限 0.5
            let state = app.state::<AppState>();
            let mut zoom = state.zoom_level.lock().unwrap();
            *zoom = (*zoom - 0.1).max(0.5);
            let new_zoom = *zoom;
            drop(zoom);
            let _ = app.emit("menu-zoom", new_zoom);
        }
        "zoom_reset" => {
            // 重置为 1.0
            let state = app.state::<AppState>();
            let mut zoom = state.zoom_level.lock().unwrap();
            *zoom = 1.0;
            drop(zoom);
            let _ = app.emit("menu-zoom", 1.0_f64);
        }
        "toggle_fullscreen" => {
            let is_fullscreen = window.is_fullscreen().unwrap_or(false);
            let _ = window.set_fullscreen(!is_fullscreen);
        }
        "minimize" => {
            let _ = window.minimize();
        }
        "maximize" => {
            // Tauri 2.11：toggle_maximize 已移除，改用 is_maximized + maximize/unmaximize
            let is_max = window.is_maximized().unwrap_or(false);
            if is_max {
                let _ = window.unmaximize();
            } else {
                let _ = window.maximize();
            }
        }
        "close" => {
            let _ = window.close();
        }
        "about" => {
            let version = app.package_info().version.to_string();
            let _ = app.emit(
                "menu-about",
                serde_json::json!({
                    "name": "FANDEX",
                    "version": version,
                    "description": "渐进式自学平台桌面版",
                    "author": "fanquanpp",
                    "license": "MIT"
                }),
            );
        }
        "docs" => {
            let _ = app.shell().open("https://github.com/fanquanpp/FANDEX-exe", None);
        }
        "report_issue" => {
            let _ = app
                .shell()
                .open("https://github.com/fanquanpp/FANDEX-exe/issues", None);
        }
        _ => {
            log::debug!("未处理的菜单事件: {:?}", event.id());
        }
    }
}

/// FANDEX 桌面应用入口
///
/// 执行流程：
/// 1. 初始化 env_logger（环境变量 RUST_LOG 控制日志级别）
/// 2. 构建 Tauri 应用，注册全部插件、命令与状态
/// 3. 应用 setup 阶段：载入持久化配置到内存
/// 4. 绑定菜单事件处理器
/// 5. 进入事件循环
fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_secs()
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .manage(AppState {
            config: Mutex::new(HashMap::new()),
            always_on_top: Mutex::new(false),
            zoom_level: Mutex::new(1.0),
        })
        .on_menu_event(handle_menu_event)
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state = app.state::<AppState>();
            load_config(&app_handle, &state);

            // Tauri 2.11：FsExt::scope() 运行时 API 已移除
            // 文件系统访问范围由 src-tauri/capabilities/default.json 静态配置控制
            // 允许的目录在 capability 文件中的 fs scope 部分定义

            // 构建并设置应用菜单（Tauri 2.11 要求菜单构造传入 manager 参数，
            // 因此必须在 setup 中持有 app_handle 后调用）
            match build_menu(&app_handle) {
                Ok(menu) => {
                    if let Err(e) = app_handle.set_menu(menu) {
                        log::error!("设置应用菜单失败: {}", e);
                    }
                }
                Err(e) => {
                    log::error!("构建应用菜单失败: {}", e);
                }
            }

            log::info!("FANDEX 桌面版已启动 v{}", app_handle.package_info().version);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            export_notes,
            read_config,
            write_config,
            get_app_version,
            open_external,
            show_in_folder,
            set_window_title,
            toggle_always_on_top,
        ])
        .run(tauri::generate_context!())
        .expect("FANDEX 启动失败");
}
