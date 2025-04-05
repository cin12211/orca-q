#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

use tauri::{Manager, WindowEvent, Window};
use window_ext::WindowExt;

mod window_ext;

// In an event handler:
fn on_window_event(_win: &Window, _event: &WindowEvent) {
    if let WindowEvent::Resized(_) = _event {
        let main_window = _win.get_webview_window("main").unwrap();
        main_window.position_traffic_lights(10.0, 18.0);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .setup(|app_handle| {
            let main_window = app_handle.get_webview_window("main").unwrap();
            #[cfg(target_os = "macos")]
            {
                main_window.position_traffic_lights(10.0, 18.0);
            }
            Ok(())
        })
        .on_window_event(on_window_event)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
