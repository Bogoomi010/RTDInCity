import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

/**
 * 저장소 추상화 — Tauri에선 앱 데이터 폴더의 JSON 파일,
 * 브라우저(개발 중)에선 localStorage를 사용한다.
 */
async function set(key: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  try {
    if (isTauri()) {
      await invoke("save_data", { key, data: json });
    } else {
      localStorage.setItem(key, json);
    }
  } catch (e) {
    console.warn("save failed:", e);
  }
}

async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = isTauri()
      ? await invoke<string | null>("load_data", { key })
      : localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ---------- 기록 ----------

export interface Records {
  bestRound: number;
  wins: number;
  plays: number;
}

export async function loadRecords(): Promise<Records> {
  return (await get<Records>("records")) ?? { bestRound: 0, wins: 0, plays: 0 };
}

export async function updateRecords(
  win: boolean,
  round: number
): Promise<Records> {
  const r = await loadRecords();
  r.plays++;
  if (win) r.wins++;
  r.bestRound = Math.max(r.bestRound, round);
  await set("records", r);
  return r;
}

// ---------- 설정 ----------

export interface Settings {
  volume: number; // 0 ~ 1
  fullscreen: boolean;
}

export async function loadSettings(): Promise<Settings> {
  return (await get<Settings>("settings")) ?? { volume: 0.5, fullscreen: false };
}

export async function saveSettings(s: Settings): Promise<void> {
  await set("settings", s);
}
