import type { Batch, Entry, LoftState, Pigeon } from "./types";

export const MINUTE_MS = 60_000;

/** 飞行分钟 = 归巢时刻 - 开笼时刻；未归或时刻异常返回 null */
export function flightMinutes(batch: Batch, entry: Entry): number | null {
  if (!entry.arrivedAt) return null;
  const ms = new Date(entry.arrivedAt).getTime() - new Date(batch.releaseAt).getTime();
  return ms > 0 ? ms / MINUTE_MS : null;
}

/** 分速（米/分）= 公里数 × 1000 ÷ 飞行分钟 */
export function speedMpm(batch: Batch, entry: Entry): number | null {
  const minutes = flightMinutes(batch, entry);
  if (minutes == null) return null;
  return (batch.distanceKm * 1000) / minutes;
}

/** 应归时刻 = 开笼时刻 + 公里数 ÷ 预计分速 */
export function dueAt(batch: Batch): number {
  return (
    new Date(batch.releaseAt).getTime() +
    ((batch.distanceKm * 1000) / batch.expectedSpeed) * MINUTE_MS
  );
}

/** 全部血统（用于筛选） */
export function bloodlines(state: LoftState): string[] {
  return [...new Set(state.pigeons.map((p) => p.bloodline))].sort((a, b) =>
    a.localeCompare(b, "zh")
  );
}

export interface RankingRow {
  entry: Entry;
  pigeon: Pigeon;
  minutes: number;
  speed: number;
  rank: number | null; // null = 健康观察中：有成绩档案但不进名次
}

/** 单批次排行：按分速降序；观察中的鸽子不占名次，可按血统筛选 */
export function batchRanking(
  state: LoftState,
  batchId: string,
  bloodline: string | null
): RankingRow[] {
  const batch = state.batches.find((b) => b.id === batchId);
  if (!batch) return [];
  const rows: RankingRow[] = [];
  for (const entry of state.entries) {
    if (entry.batchId !== batchId) continue;
    const pigeon = state.pigeons.find((p) => p.id === entry.pigeonId);
    const minutes = flightMinutes(batch, entry);
    const speed = speedMpm(batch, entry);
    if (!pigeon || minutes == null || speed == null) continue;
    if (bloodline && pigeon.bloodline !== bloodline) continue;
    rows.push({ entry, pigeon, minutes, speed, rank: null });
  }
  rows.sort((a, b) => b.speed - a.speed);
  let rank = 0;
  for (const row of rows) {
    if (row.pigeon.health === "观察中") {
      row.rank = null; // 保留成绩档案，不占名次
    } else {
      rank += 1;
      row.rank = rank;
    }
  }
  return rows;
}

export interface ContactRow {
  entry: Entry;
  pigeon: Pigeon;
  batch: Batch;
  overdueMin: number;
}

/** 待联系清单：到点未归；无定位信号的排最前，其余按超时长短降序 */
export function toContact(
  state: LoftState,
  now: number,
  bloodline: string | null
): ContactRow[] {
  const rows: ContactRow[] = [];
  for (const entry of state.entries) {
    if (entry.arrivedAt) continue;
    const batch = state.batches.find((b) => b.id === entry.batchId);
    const pigeon = state.pigeons.find((p) => p.id === entry.pigeonId);
    if (!batch || !pigeon) continue;
    if (bloodline && pigeon.bloodline !== bloodline) continue;
    const overdueMin = (now - dueAt(batch)) / MINUTE_MS;
    if (overdueMin <= 0) continue; // 未到应归时刻不进清单
    rows.push({ entry, pigeon, batch, overdueMin });
  }
  return rows.sort((a, b) => {
    if (a.entry.signal !== b.entry.signal) return a.entry.signal ? 1 : -1;
    return b.overdueMin - a.overdueMin;
  });
}

export interface OverviewStats {
  pigeonCount: number;
  observingCount: number;
  entryCount: number;
  returnedCount: number;
  returnRate: number | null; // %
  avgSpeed: number | null;
  bestSpeed: number | null;
  contactCount: number;
}

/** 总览指标，随血统筛选联动 */
export function overviewStats(
  state: LoftState,
  now: number,
  bloodline: string | null
): OverviewStats {
  const pigeons = state.pigeons.filter(
    (p) => !bloodline || p.bloodline === bloodline
  );
  const ids = new Set(pigeons.map((p) => p.id));
  const entries = state.entries.filter((e) => ids.has(e.pigeonId));
  const returned = entries.filter((e) => e.arrivedAt);
  const speeds = returned
    .map((e) => {
      const batch = state.batches.find((b) => b.id === e.batchId);
      return batch ? speedMpm(batch, e) : null;
    })
    .filter((v): v is number => v != null);
  return {
    pigeonCount: pigeons.length,
    observingCount: pigeons.filter((p) => p.health === "观察中").length,
    entryCount: entries.length,
    returnedCount: returned.length,
    returnRate: entries.length ? (returned.length / entries.length) * 100 : null,
    avgSpeed: speeds.length
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length
      : null,
    bestSpeed: speeds.length ? Math.max(...speeds) : null,
    contactCount: toContact(state, now, bloodline).length,
  };
}

export interface HistoryRow {
  batch: Batch;
  entry: Entry;
  minutes: number | null;
  speed: number | null;
  rank: number | null; // null = 未归或观察中不计名次
}

/** 单羽档案：历次开笼记录（按开笼时刻倒序） */
export function pigeonHistory(state: LoftState, pigeonId: string): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const entry of state.entries) {
    if (entry.pigeonId !== pigeonId) continue;
    const batch = state.batches.find((b) => b.id === entry.batchId);
    if (!batch) continue;
    const minutes = flightMinutes(batch, entry);
    const speed = speedMpm(batch, entry);
    let rank: number | null = null;
    if (entry.arrivedAt) {
      const hit = batchRanking(state, batch.id, null).find(
        (r) => r.entry.id === entry.id
      );
      rank = hit?.rank ?? null;
    }
    rows.push({ batch, entry, minutes, speed, rank });
  }
  return rows.sort(
    (a, b) => +new Date(b.batch.releaseAt) - +new Date(a.batch.releaseAt)
  );
}
