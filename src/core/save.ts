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

// ---------- 도감 (발견한 조합 키 목록, 판을 넘어 누적) ----------

export async function loadDex(): Promise<string[]> {
  return (await get<string[]>("dex")) ?? [];
}

export async function addDex(key: string): Promise<void> {
  const d = await loadDex();
  if (!d.includes(key)) {
    d.push(key);
    await set("dex", d);
  }
}

// ---------- 스토리 존 (챕터·보스 HP — 판을 넘어 유지) ----------

export interface StoryState {
  chapter: number;
  hp: number; // 남은 보스 HP
}

export async function loadStory(): Promise<StoryState | null> {
  return await get<StoryState>("story");
}

export async function saveStory(s: StoryState): Promise<void> {
  await set("story", s);
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
