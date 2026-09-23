use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_window_state::{StateFlags, WindowExt};

// 窗口状态仅保存/恢复几何信息：VISIBLE 一旦在隐藏（Ctrl+Alt+F）状态下被
// 保存，下次启动会被还原为隐藏，表现为「应用已运行但窗口不出现」；
// DECORATIONS 无恢复价值。
fn window_state_flags() -> StateFlags {
    StateFlags::SIZE
        .union(StateFlags::POSITION)
        .union(StateFlags::MAXIMIZED)
        .union(StateFlags::FULLSCREEN)
}

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

fn raise_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else { return };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            raise_main_window(app);
        }))
        // 见 window_state_flags 注释：仅保存几何状态。
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(window_state_flags())
                .build(),
        )
        .setup(|app| {
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("FANDEX")
                .inner_size(1280.0, 800.0)
                .min_inner_size(960.0, 640.0)
                .center()
                .disable_drag_drop_handler()
                .initialization_script(KEYBOARD_INIT_SCRIPT)
                .build()?;
            window.restore_state(window_state_flags())?;

            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
                let plugin = tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            toggle_main_window(app);
                        }
                    })
                    .build();
                match app.handle().plugin(plugin) {
                    Ok(()) => {
                        if let Err(err) = app.global_shortcut().register("ctrl+alt+f") {
                            eprintln!(
                                "全局快捷键 Ctrl+Alt+F 注册失败（可能被其他程序占用），全局呼出已禁用：{err}"
                            );
                        }
                    }
                    Err(err) => eprintln!("global-shortcut 插件初始化失败，全局呼出已禁用：{err}"),
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("FANDEX 桌面端启动失败");
}
