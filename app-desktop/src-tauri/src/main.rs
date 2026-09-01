// FANDEX Windows 桌面端入口
// -----------------------------------------------------------------------------
// 功能：
// - 内嵌 app-web 静态站点（tauri.conf.json -> frontendDist），完全离线可用
// - tauri-plugin-window-state：记住窗口位置与尺寸，下次启动自动恢复
// - 发布构建隐藏控制台窗口（windows_subsystem）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    fandex_desktop_lib::run()
}
