import { seedState } from "./seed";
import type { LoftState } from "./types";

const KEY = "hxyfront-62014.loft.v1";

/** 读取本地台账；没有存档时给一份演示数据 */
export function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoftState;
      if (
        parsed &&
        Array.isArray(parsed.pigeons) &&
        Array.isArray(parsed.batches) &&
        Array.isArray(parsed.entries)
      ) {
        return parsed;
      }
    }
  } catch {
    // 本地数据损坏时回退到演示数据
  }
  return seedState();
}

/** 每次变更后落盘，重开仍保留 */
export function saveState(state: LoftState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默失败，不影响页面使用
  }
}
