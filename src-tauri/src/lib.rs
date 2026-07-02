use std::fs;
use tauri::Manager;

/// 세이브 데이터를 앱 데이터 폴더에 JSON으로 저장
#[tauri::command]
fn save_data(app: tauri::AppHandle, key: String, data: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(format!("{key}.json")), data).map_err(|e| e.to_string())
}

/// 세이브 데이터 로드 (없으면 None)
#[tauri::command]
fn load_data(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join(format!("{key}.json"));
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_data, load_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
