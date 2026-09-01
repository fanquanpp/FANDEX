// FANDEX 桌面端应用库
// -----------------------------------------------------------------------------
// 窗口与插件配置的统一入口：
// - window-state 插件在关闭时保存窗口位置/尺寸/最大化状态，启动时恢复，
//   属于桌面端高频使用体验的基础能力
// - 后续增强（全局快捷键呼出、自动更新）在此处按需注册插件
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("FANDEX 桌面端启动失败");
}
