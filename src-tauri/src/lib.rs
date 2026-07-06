use std::fs;
use tauri::Manager;

/// 세이브 key 검증 — 경로 조작(`..`, `/`, `\`, 절대경로 등) 차단.
/// 소문자·숫자·언더스코어만 허용하므로 파일명이 항상 앱 데이터 폴더 안에 갇힌다.
fn valid_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 64
        && key
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

/// 세이브 데이터를 앱 데이터 폴더에 JSON으로 저장
#[tauri::command]
fn save_data(app: tauri::AppHandle, key: String, data: String) -> Result<(), String> {
    if !valid_key(&key) {
        return Err("invalid key".into());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(format!("{key}.json")), data).map_err(|e| e.to_string())
}

/// 세이브 데이터 로드 (없으면 None)
#[tauri::command]
fn load_data(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    if !valid_key(&key) {
        return Err("invalid key".into());
    }
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
