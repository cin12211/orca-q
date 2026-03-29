use std::{fs, path::PathBuf, sync::Mutex};

use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Manager, Runtime, State};

const PERSIST_DIR_NAME: &str = "persist";

#[derive(Default)]
pub struct NativePersistState(pub Mutex<()>);

#[derive(Clone, Copy)]
enum PersistCollection {
    AppConfig,
    AgentState,
    Workspaces,
    WorkspaceState,
    Connections,
    TabViews,
    QuickQueryLogs,
    RowQueryFiles,
    RowQueryFileContents,
}

impl PersistCollection {
    fn file_name(self) -> &'static str {
        match self {
            Self::AppConfig => "app-config.json",
            Self::AgentState => "agent-state.json",
            Self::Workspaces => "workspaces.json",
            Self::WorkspaceState => "workspace-state.json",
            Self::Connections => "connections.json",
            Self::TabViews => "tab-views.json",
            Self::QuickQueryLogs => "quick-query-logs.json",
            Self::RowQueryFiles => "row-query-files.json",
            Self::RowQueryFileContents => "row-query-file-contents.json",
        }
    }
}

impl TryFrom<&str> for PersistCollection {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "appConfig" => Ok(Self::AppConfig),
            "agentState" => Ok(Self::AgentState),
            "workspaces" => Ok(Self::Workspaces),
            "workspaceState" => Ok(Self::WorkspaceState),
            "connections" => Ok(Self::Connections),
            "tabViews" => Ok(Self::TabViews),
            "quickQueryLogs" => Ok(Self::QuickQueryLogs),
            "rowQueryFiles" => Ok(Self::RowQueryFiles),
            "rowQueryFileContents" => Ok(Self::RowQueryFileContents),
            other => Err(format!("unsupported persist collection `{other}`")),
        }
    }
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PersistMatchMode {
    All,
    Any,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistFilter {
    pub field: String,
    pub value: Value,
}

fn with_store_lock<T>(
    state: &State<NativePersistState>,
    operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let _guard = state
        .0
        .lock()
        .map_err(|_| "failed to lock native persist state".to_string())?;

    operation()
}

fn collection_from_name(collection: &str) -> Result<PersistCollection, String> {
    PersistCollection::try_from(collection)
}

fn persist_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?;

    let persist_dir = app_data_dir.join(PERSIST_DIR_NAME);
    fs::create_dir_all(&persist_dir)
        .map_err(|error| format!("failed to create persist directory: {error}"))?;

    Ok(persist_dir)
}

fn collection_path<R: Runtime>(
    app: &AppHandle<R>,
    collection: PersistCollection,
) -> Result<PathBuf, String> {
    Ok(persist_dir(app)?.join(collection.file_name()))
}

fn read_collection<R: Runtime>(
    app: &AppHandle<R>,
    collection: PersistCollection,
) -> Result<Vec<Value>, String> {
    let path = collection_path(app, collection)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read `{}`: {error}", path.display()))?;

    if contents.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str::<Vec<Value>>(&contents)
        .map_err(|error| format!("failed to parse `{}`: {error}", path.display()))
}

fn write_collection<R: Runtime>(
    app: &AppHandle<R>,
    collection: PersistCollection,
    values: &[Value],
) -> Result<(), String> {
    let path = collection_path(app, collection)?;
    let temp_path = path.with_extension("tmp");
    let serialized = serde_json::to_vec_pretty(values)
        .map_err(|error| format!("failed to serialize `{}`: {error}", path.display()))?;

    fs::write(&temp_path, serialized)
        .map_err(|error| format!("failed to write `{}`: {error}", temp_path.display()))?;
    fs::rename(&temp_path, &path)
        .map_err(|error| format!("failed to move `{}` into place: {error}", path.display()))?;

    Ok(())
}

fn record_id(record: &Value) -> Option<&str> {
    record.get("id").and_then(Value::as_str)
}

fn ensure_record_id(record: Value, id: &str) -> Result<Value, String> {
    match record {
        Value::Object(mut object) => {
            object.insert("id".to_string(), Value::String(id.to_string()));
            Ok(Value::Object(object))
        }
        _ => Err("persist record must be a JSON object".to_string()),
    }
}

fn matches_filters(
    record: &Value,
    filters: &[PersistFilter],
    match_mode: PersistMatchMode,
) -> bool {
    if filters.is_empty() {
        return false;
    }

    let mut matches = filters.iter().map(|filter| {
        record
            .get(&filter.field)
            .map(|value| value == &filter.value)
            .unwrap_or(false)
    });

    match match_mode {
        PersistMatchMode::All => matches.all(|is_match| is_match),
        PersistMatchMode::Any => matches.any(|is_match| is_match),
    }
}

#[tauri::command]
pub fn persist_get_all<R: Runtime>(
    app: AppHandle<R>,
    state: State<NativePersistState>,
    collection: String,
) -> Result<Vec<Value>, String> {
    with_store_lock(&state, || {
        read_collection(&app, collection_from_name(&collection)?)
    })
}

#[tauri::command]
pub fn persist_get_one<R: Runtime>(
    app: AppHandle<R>,
    state: State<NativePersistState>,
    collection: String,
    id: String,
) -> Result<Option<Value>, String> {
    with_store_lock(&state, || {
        let values = read_collection(&app, collection_from_name(&collection)?)?;
        Ok(values
            .into_iter()
            .find(|record| record_id(record) == Some(id.as_str())))
    })
}

#[tauri::command]
pub fn persist_find<R: Runtime>(
    app: AppHandle<R>,
    state: State<NativePersistState>,
    collection: String,
    filters: Vec<PersistFilter>,
    match_mode: PersistMatchMode,
) -> Result<Vec<Value>, String> {
    with_store_lock(&state, || {
        let values = read_collection(&app, collection_from_name(&collection)?)?;
        Ok(values
            .into_iter()
            .filter(|record| matches_filters(record, &filters, match_mode))
            .collect())
    })
}

#[tauri::command]
pub fn persist_upsert<R: Runtime>(
    app: AppHandle<R>,
    state: State<NativePersistState>,
    collection: String,
    id: String,
    value: Value,
) -> Result<Value, String> {
    with_store_lock(&state, || {
        let collection = collection_from_name(&collection)?;
        let mut values = read_collection(&app, collection)?;
        let normalized = ensure_record_id(value, &id)?;

        if let Some(existing) = values
            .iter_mut()
            .find(|record| record_id(record) == Some(id.as_str()))
        {
            *existing = normalized.clone();
        } else {
            values.push(normalized.clone());
        }

        write_collection(&app, collection, &values)?;

        Ok(normalized)
    })
}

#[tauri::command]
pub fn persist_delete<R: Runtime>(
    app: AppHandle<R>,
    state: State<NativePersistState>,
    collection: String,
    filters: Vec<PersistFilter>,
    match_mode: PersistMatchMode,
) -> Result<Vec<Value>, String> {
    with_store_lock(&state, || {
        let collection = collection_from_name(&collection)?;
        let values = read_collection(&app, collection)?;
        let mut deleted = Vec::new();
        let mut retained = Vec::new();

        for value in values {
            if matches_filters(&value, &filters, match_mode) {
                deleted.push(value);
            } else {
                retained.push(value);
            }
        }

        if !deleted.is_empty() {
            write_collection(&app, collection, &retained)?;
        }

        Ok(deleted)
    })
}

#[tauri::command]
pub fn persist_replace_all<R: Runtime>(
    app: AppHandle<R>,
    state: State<NativePersistState>,
    collection: String,
    values: Vec<Value>,
) -> Result<(), String> {
    with_store_lock(&state, || {
        write_collection(&app, collection_from_name(&collection)?, &values)
    })
}
