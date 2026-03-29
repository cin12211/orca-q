#![allow(unexpected_cfgs)]

mod persist;

use std::{
    error::Error,
    net::{SocketAddr, TcpListener, TcpStream},
    path::PathBuf,
    process::Command,
    sync::Mutex,
    thread::sleep,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{Manager, Url, WebviewUrl};
#[cfg(target_os = "macos")]
use tauri::{Runtime, WebviewWindow};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

use persist::{
    persist_delete, persist_find, persist_get_all, persist_get_one, persist_replace_all,
    persist_upsert, NativePersistState,
};

const MAIN_WINDOW_LABEL: &str = "main";
const RUNTIME_SIDECAR_NAME: &str = "orcaq-runtime";
const RUNTIME_HOST: &str = "127.0.0.1";
const NATIVE_PERSIST_DIR_NAME: &str = "persist";
// Keep a stable origin for WebKit storage so IndexedDB/localStorage survive app restarts.
const RUNTIME_PORT: u16 = 29092;
const RUNTIME_WAIT_TIMEOUT: Duration = Duration::from_secs(20);
const RUNTIME_POLL_INTERVAL: Duration = Duration::from_millis(200);

type SetupResult<T> = Result<T, Box<dyn Error>>;

#[derive(Default)]
struct RuntimeSidecar(Mutex<Option<CommandChild>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStoragePaths {
    native_data_path: String,
    web_storage_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
enum DesktopStorageTarget {
    NativeData,
    WebStorage,
}

#[cfg(target_os = "macos")]
pub trait WindowExt {
    fn position_traffic_lights(&self, x: f64, y: f64);
}

#[cfg(target_os = "macos")]
#[allow(deprecated, unexpected_cfgs)]
impl<R: Runtime> WindowExt for WebviewWindow<R> {
    fn position_traffic_lights(&self, x: f64, y: f64) {
        use cocoa::appkit::{NSView, NSWindow, NSWindowButton};
        use cocoa::base::{id, nil};
        use cocoa::foundation::NSRect;
        use objc::{msg_send, sel, sel_impl};

        let Ok(window) = self.ns_window() else {
            return;
        };

        let window = window as id;

        unsafe {
            let close = window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
            let miniaturize =
                window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
            let zoom = window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

            if close == nil || miniaturize == nil || zoom == nil {
                return;
            }

            let title_bar_view: id = msg_send![close, superview];
            if title_bar_view == nil {
                return;
            }

            let title_bar_container_view: id = msg_send![title_bar_view, superview];
            if title_bar_container_view == nil {
                return;
            }

            let close_rect: NSRect = msg_send![close, frame];
            let button_height = close_rect.size.height;
            let title_bar_height = button_height + y;

            let mut title_bar_rect = NSView::frame(title_bar_container_view);
            title_bar_rect.size.height = title_bar_height;
            title_bar_rect.origin.y = NSWindow::frame(window).size.height - title_bar_height;
            let _: () = msg_send![title_bar_container_view, setFrame: title_bar_rect];

            let close_frame = NSView::frame(close);
            let miniaturize_frame = NSView::frame(miniaturize);
            let space_between = miniaturize_frame.origin.x - close_frame.origin.x;

            for (index, button) in [close, miniaturize, zoom].into_iter().enumerate() {
                let mut rect = NSView::frame(button);
                rect.origin.x = x + (index as f64 * space_between);
                button.setFrameOrigin(rect.origin);
            }
        }
    }
}

#[tauri::command]
fn ping() -> &'static str {
    "tauri backend ready"
}

fn app_data_dir<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))
}

fn native_data_dir<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(NATIVE_PERSIST_DIR_NAME))
}

fn web_storage_dir<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<Option<PathBuf>, String> {
    #[cfg(target_os = "macos")]
    {
        let home_dir = app
            .path()
            .home_dir()
            .map_err(|error| format!("failed to resolve home directory: {error}"))?;

        return Ok(Some(
            home_dir
                .join("Library")
                .join("WebKit")
                .join(app.config().identifier.clone())
                .join("WebsiteData"),
        ));
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(None)
    }
}

fn open_path_in_file_manager(path: &PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(path);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("explorer");
        command.arg(path);
        command
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(path);
        command
    };

    let status = command
        .status()
        .map_err(|error| format!("failed to launch file manager: {error}"))?;

    if !status.success() {
        return Err(format!("file manager exited with status {status}"));
    }

    Ok(())
}

#[tauri::command]
fn desktop_storage_paths<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<DesktopStoragePaths, String> {
    Ok(DesktopStoragePaths {
        native_data_path: native_data_dir(&app)?.display().to_string(),
        web_storage_path: web_storage_dir(&app)?.map(|path| path.display().to_string()),
    })
}

#[tauri::command]
fn open_desktop_storage_path<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    target: DesktopStorageTarget,
) -> Result<(), String> {
    let path = match target {
        DesktopStorageTarget::NativeData => native_data_dir(&app)?,
        DesktopStorageTarget::WebStorage => web_storage_dir(&app)?
            .ok_or_else(|| "web storage path is not available on this platform".to_string())?,
    };

    if matches!(target, DesktopStorageTarget::NativeData) {
        std::fs::create_dir_all(&path)
            .map_err(|error| format!("failed to create native data directory: {error}"))?;
    }

    open_path_in_file_manager(&path)
}

fn main_window_config<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> SetupResult<tauri::utils::config::WindowConfig> {
    app.config()
        .app
        .windows
        .iter()
        .find(|window| window.label == MAIN_WINDOW_LABEL)
        .cloned()
        .ok_or_else(|| format!("missing `{MAIN_WINDOW_LABEL}` window configuration").into())
}

fn create_main_window<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    url_override: Option<WebviewUrl>,
) -> SetupResult<()> {
    let mut window_config = main_window_config(app)?;

    if let Some(url) = url_override {
        window_config.url = url;
    }

    let window = tauri::WebviewWindowBuilder::from_config(app, &window_config)?.build()?;

    #[cfg(target_os = "macos")]
    window.position_traffic_lights(14.0, 18.0);

    Ok(())
}

fn allocate_runtime_port() -> SetupResult<u16> {
    let listener = TcpListener::bind((RUNTIME_HOST, RUNTIME_PORT))
        .map_err(|error| format!("desktop runtime port {RUNTIME_PORT} is unavailable: {error}"))?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

fn wait_for_runtime_server(port: u16) -> SetupResult<()> {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let deadline = Instant::now() + RUNTIME_WAIT_TIMEOUT;

    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&address, RUNTIME_POLL_INTERVAL).is_ok() {
            return Ok(());
        }

        sleep(RUNTIME_POLL_INTERVAL);
    }

    Err(
        format!("timed out waiting for desktop runtime server at http://{RUNTIME_HOST}:{port}")
            .into(),
    )
}

fn stop_runtime_sidecar<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(child) = app
        .state::<RuntimeSidecar>()
        .0
        .lock()
        .ok()
        .and_then(|mut child| child.take())
    {
        let _ = child.kill();
    }
}

fn spawn_runtime_sidecar<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> SetupResult<Url> {
    let port = allocate_runtime_port()?;
    let (_events, child) = app
        .shell()
        .sidecar(RUNTIME_SIDECAR_NAME)?
        .env("HOST", RUNTIME_HOST)
        .env("PORT", port.to_string())
        .env("NITRO_HOST", RUNTIME_HOST)
        .env("NITRO_PORT", port.to_string())
        .spawn()?;

    if let Ok(mut runtime_sidecar) = app.state::<RuntimeSidecar>().0.lock() {
        *runtime_sidecar = Some(child);
    } else {
        let _ = child.kill();
        return Err("failed to store desktop runtime sidecar handle".into());
    }

    if let Err(error) = wait_for_runtime_server(port) {
        stop_runtime_sidecar(app);
        return Err(error);
    }

    Ok(Url::parse(&format!("http://{RUNTIME_HOST}:{port}"))?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(NativePersistState::default())
        .manage(RuntimeSidecar::default())
        .setup(|app| {
            let app_handle = app.handle();

            if cfg!(dev) {
                create_main_window(&app_handle, None)?;
                return Ok(());
            }

            let runtime_url = spawn_runtime_sidecar(&app_handle)?;

            if let Err(error) =
                create_main_window(&app_handle, Some(WebviewUrl::External(runtime_url)))
            {
                stop_runtime_sidecar(&app_handle);
                return Err(error);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            desktop_storage_paths,
            open_desktop_storage_path,
            persist_get_all,
            persist_get_one,
            persist_find,
            persist_upsert,
            persist_delete,
            persist_replace_all
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            stop_runtime_sidecar(app_handle);
        }
    });
}
