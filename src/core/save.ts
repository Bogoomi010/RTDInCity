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
  round: number,
  countPlay = true // ♾ 무한 모드 종료는 판수·승수 미집계 (40R 승리에서 이미 집계) — 최고 라운드만 갱신
): Promise<Records> {
  const r = await loadRecords();
  if (countPlay) {
    r.plays++;
    if (win) r.wins++;
  }
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

// ---------- 🏆 업적 (판 간 누적) ----------

export async function loadAchievements(): Promise<string[]> {
  return (await get<string[]>("achievements")) ?? [];
}

/** true = 신규 달성 */
export async function addAchievement(id: string): Promise<boolean> {
  const a = await loadAchievements();
  if (a.includes(id)) return false;
  a.push(id);
  await set("achievements", a);
  return true;
}

// ---------- 🎟 다음 판 부스터 (패배 위로 — 히든 확률 가산, 승리 시 리셋) ----------

export async function loadBooster(): Promise<number> {
  return (await get<number>("booster")) ?? 0;
}

export async function saveBooster(v: number): Promise<void> {
  await set("booster", v);
}

// ---------- 통계 (업적 판정용 누적 카운터) ----------

export interface Counters {
  goldenKills: number;
}

export async function loadCounters(): Promise<Counters> {
  return (await get<Counters>("counters")) ?? { goldenKills: 0 };
}

export async function saveCounters(c: Counters): Promise<void> {
  await set("counters", c);
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
