// FANDEX 桌面端应用库
// -----------------------------------------------------------------------------
// 窗口与插件配置的统一入口：
// - 主窗口改为 Rust 侧构建，便于注入初始化脚本，提供桌面端快捷键：
//   F11 全屏切换、Escape 退出全屏、Alt+左/右方向键后退/前进（对齐浏览器习惯）
// - window-state 插件在关闭时保存窗口位置/尺寸/最大化状态，启动时恢复
// - global-shortcut 插件注册 Ctrl+Alt+F 全局呼出/隐藏主窗口（应用处于后台时仍可触发）
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/* 页面内快捷键注入脚本：初始化脚本会在每次页面导航后重新注入，多页文档站行为稳定。
   前提：tauri.conf.json 开启 withGlobalTauri，注入脚本通过全局 __TAURI__ 桥接窗口 API */
const KEYBOARD_INIT_SCRIPT: &str = r#"
(function () {
  if (window.__fandexDesktopKeys) return;
  window.__fandexDesktopKeys = true;
  window.addEventListener('keydown', function (event) {
    var tauriApi = window.__TAURI__;
    if (!tauriApi || !tauriApi.window) return;
    var win = tauriApi.window.getCurrentWindow();
    if (event.key === 'F11') {
      event.preventDefault();
      win.isFullscreen().then(function (full) { win.setFullscreen(!full); });
      return;
    }
    if (event.key === 'Escape') {
      win.isFullscreen().then(function (full) { if (full) win.setFullscreen(false); });
      return;
    }
    if (event.altKey && event.key === 'ArrowLeft') { history.back(); return; }
    if (event.altKey && event.key === 'ArrowRight') { history.forward(); }
  });
})();
"#;

/* 全局快捷键 Ctrl+Alt+F：切换主窗口显隐。
   - 窗口可见且获得焦点 -> 隐藏（快速收纳）
   - 其余情况（隐藏 / 最小化 / 失焦）-> 取消最小化、显示并聚焦（快速呼出） */
fn toggle_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else { return };
    let visible = window.is_visible().unwrap_or(false);
    let focused = window.is_focused().unwrap_or(false);
    if visible && focused {
        let _ = window.hide();
    } else {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            /* 主窗口：不再由 tauri.conf.json 声明，统一在此构建以注入快捷键脚本 */
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("FANDEX")
                .inner_size(1280.0, 800.0)
                .min_inner_size(960.0, 640.0)
                .center()
                .disable_drag_drop_handler()
                .initialization_script(KEYBOARD_INIT_SCRIPT)
                .build()?;
            /* 显式恢复窗口状态：与 window-state 插件的自动恢复互为兜底 */
            {
                use tauri_plugin_window_state::{StateFlags, WindowExt};
                window.restore_state(StateFlags::all())?;
            }

            /* 全局快捷键（仅桌面端）：Ctrl+Alt+F 呼出/隐藏主窗口 */
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(|app, _shortcut, event| {
                            if event.state() == ShortcutState::Pressed {
                                toggle_main_window(app);
                            }
                        })
                        .build(),
                )?;
                app.global_shortcut().register("ctrl+alt+f")?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("FANDEX 桌面端启动失败");
}
