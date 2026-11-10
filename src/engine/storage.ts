import { CODEX_ENTRIES } from '../data/codex';
import { PersistentMeta, SaveSlotData } from '../types/vn';

const META_KEY = 'astral_elegy_meta_v1';
const SAVES_KEY = 'astral_elegy_saves_v1';
const SETTINGS_KEY = 'astral_elegy_settings_v1';

export interface VNSettings {
  textSpeed: number;     // chars per second (15..120, 120 = instant)
  autoDelayMs: number;   // ms after line finishes before auto-advance
  bgmVolume: number;
  sfxVolume: number;
  textTickVolume: number;
  skipUnread: boolean;
}

export const DEFAULT_SETTINGS: VNSettings = {
  textSpeed: 52,
  autoDelayMs: 2100,
  bgmVolume: 0.65,
  sfxVolume: 0.75,
  textTickVolume: 0.25,
  skipUnread: false,
};

export function loadMeta(): PersistentMeta {
  const defaultCodex = CODEX_ENTRIES.filter((c) => c.unlockedByDefault).map((c) => c.id);
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) {
      return {
        unlockedCGs: ['cg_title_keyvisual'],
        unlockedCodex: defaultCodex,
        unlockedEndings: [],
        visitedScenes: [],
        readBeatKeys: [],
      };
    }
    const parsed = JSON.parse(raw) as PersistentMeta;
    return {
      unlockedCGs: Array.from(new Set(['cg_title_keyvisual', ...(parsed.unlockedCGs || [])])),
      unlockedCodex: Array.from(new Set([...defaultCodex, ...(parsed.unlockedCodex || [])])),
      unlockedEndings: parsed.unlockedEndings || [],
      visitedScenes: parsed.visitedScenes || [],
      readBeatKeys: parsed.readBeatKeys || [],
    };
  } catch {
    return {
      unlockedCGs: ['cg_title_keyvisual'],
      unlockedCodex: defaultCodex,
      unlockedEndings: [],
      visitedScenes: [],
      readBeatKeys: [],
    };
  }
}

export function saveMeta(meta: PersistentMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAllSaves(): Record<number, SaveSlotData> {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, SaveSlotData>;
  } catch {
    return {};
  }
}

export function writeSaveSlot(slotId: number, data: SaveSlotData): Record<number, SaveSlotData> {
  const all = loadAllSaves();
  all[slotId] = data;
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch {
    // Ignore
  }
  return all;
}

export function deleteSaveSlot(slotId: number): Record<number, SaveSlotData> {
  const all = loadAllSaves();
  delete all[slotId];
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch {
    // Ignore
  }
  return all;
}

export function loadSettings(): VNSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: VNSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}
