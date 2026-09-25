import type {
  Batch,
  Entry,
  Pigeon,
  RootState,
} from "../types";

// —— 纯计算层：保存逻辑与页面都不在这里，所有函数无副作用、可单测 ——

export const ALL_BLOODLINES = "all";

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** 按里程与预计分速估算默认归巢时长（分钟），基准 650 米/分 */
export function defaultExpectedMinutes(distanceKm: number): number {
  if (!distanceKm || distanceKm <= 0) return 0;
  return Math.round((distanceKm * 1000) / 650);
}

/** 归巢分速：里程(米) / 飞行分钟，数据不合法时返回 null */
export function calcSpeed(
  distanceKm: number,
  releasedAt: number,
  returnedAt: number
): { minutes: number; speed: number } | null {
  const minutes = (returnedAt - releasedAt) / 60000;
  if (!distanceKm || minutes <= 0) return null;
  return {
    minutes: Math.round(minutes),
    speed: Math.round((distanceKm * 1000) / minutes),
  };
}

/** 该批次预计归巢时刻 */
export function expectedReturnAt(batch: Batch): number {
  return batch.releasedAt + batch.expectedMinutes * 60000;
}

/** 是否超时未归（按当前时刻 now 判定） */
export function isOverdue(batch: Batch, now: number): boolean {
  return now > expectedReturnAt(batch);
}

/** 超时分钟数（未超时为 0） */
export function overdueMinutes(batch: Batch, now: number): number {
  return Math.max(0, Math.round((now - expectedReturnAt(batch)) / 60000));
}

/** 剩余分钟数（负数表示已超时） */
export function dueInMinutes(batch: Batch, now: number): number {
  return Math.round((expectedReturnAt(batch) - now) / 60000);
}

export function bloodlineList(pigeons: Pigeon[]): string[] {
  return Array.from(new Set(pigeons.map((p) => p.bloodline))).sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN")
  );
}

export function visiblePigeons(state: RootState): Pigeon[] {
  if (state.bloodlineFilter === ALL_BLOODLINES) return state.pigeons;
  return state.pigeons.filter((p) => p.bloodline === state.bloodlineFilter);
}

export function pigeonMap(
  pigeons: Pigeon[]
): Map<string, Pigeon> {
  return new Map(pigeons.map((p) => [p.id, p]));
}

export function batchMap(batches: Batch[]): Map<string, Batch> {
  return new Map(batches.map((b) => [b.id, b]));
}

export function mateOf(pigeon: Pigeon, pigeons: Pigeon[]): Pigeon | null {
  if (!pigeon.mateId) return null;
  return pigeons.find((p) => p.id === pigeon.mateId) ?? null;
}

export interface ContactRow {
  entry: Entry;
  batch: Batch;
  pigeon: Pigeon;
  overdue: boolean;
  overdueMins: number;
  dueInMins: number;
}

/**
 * 待联系清单：所有在飞（到点未归）的鸽子。
 * 排序：超时且无定位信号 → 超时但有信号 → 未超时（超时时间长的在前，未超时的临近在前）
 */
export function contactList(state: RootState, now: number): ContactRow[] {
  const pMap = pigeonMap(state.pigeons);
  const bMap = batchMap(state.batches);
  const rows: ContactRow[] = [];
  for (const entry of state.entries) {
    if (entry.status !== "flying") continue;
    const pigeon = pMap.get(entry.pigeonId);
    const batch = bMap.get(entry.batchId);
    if (!pigeon || !batch) continue;
    rows.push({
      entry,
      batch,
      pigeon,
      overdue: isOverdue(batch, now),
      overdueMins: overdueMinutes(batch, now),
      dueInMins: dueInMinutes(batch, now),
    });
  }
  return rows.sort((a, b) => {
    const aUrgent = a.overdue && !a.entry.hasSignal ? 0 : a.overdue ? 1 : 2;
    const bUrgent = b.overdue && !b.entry.hasSignal ? 0 : b.overdue ? 1 : 2;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    if (a.overdue && b.overdue) return b.overdueMins - a.overdueMins;
    return a.dueInMins - b.dueInMins;
  });
}

/** 在血统筛选范围内的条目 */
export function entriesInScope(state: RootState): Entry[] {
  if (state.bloodlineFilter === ALL_BLOODLINES) return state.entries;
  const ids = new Set(visiblePigeons(state).map((p) => p.id));
  return state.entries.filter((e) => ids.has(e.pigeonId));
}

export interface OverviewStats {
  pigeonCount: number;
  observingCount: number;
  batchCount: number;
  flyingCount: number;
  returnedCount: number;
  returnRate: number | null; // 百分比
  avgSpeed: number | null; // 米/分，按所有已归巢条目
  contactCount: number;
  urgentCount: number;
  bloodlineCount: number;
}

/** 总览统计（随血统筛选联动） */
export function overviewStats(state: RootState, now: number): OverviewStats {
  const pigeons = visiblePigeons(state);
  const pIds = new Set(pigeons.map((p) => p.id));
  const entries = state.entries.filter((e) => pIds.has(e.pigeonId));
  const returned = entries.filter((e) => e.status === "returned");
  const speeds = returned
    .map((e) => e.speed)
    .filter((s): s is number => typeof s === "number");
  const contacts = contactList(state, now).filter((r) =>
    pIds.has(r.pigeon.id)
  );
  return {
    pigeonCount: pigeons.length,
    observingCount: pigeons.filter((p) => p.health === "observing").length,
    batchCount: new Set(entries.map((e) => e.batchId)).size,
    flyingCount: entries.length - returned.length,
    returnedCount: returned.length,
    returnRate: entries.length
      ? Math.round((returned.length / entries.length) * 1000) / 10
      : null,
    avgSpeed: speeds.length
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
      : null,
    contactCount: contacts.length,
    urgentCount: contacts.filter(
      (r) => r.overdue && !r.entry.hasSignal
    ).length,
    bloodlineCount: bloodlineList(pigeons).length,
  };
}

export interface RankRow {
  entry: Entry;
  batch: Batch;
  pigeon: Pigeon;
  observing: boolean;
}

/**
 * 成绩排行：健康观察中的鸽子有档案但不进名次，单列在后面。
 * batchId 为 null 时汇总全部批次。
 */
export function ranking(
  state: RootState,
  batchId: string | null
): { ranked: RankRow[]; observing: RankRow[] } {
  const pMap = pigeonMap(state.pigeons);
  const bMap = batchMap(state.batches);
  const rows: RankRow[] = entriesInScope(state)
    .filter((e) => e.status === "returned" && e.speed !== null)
    .filter((e) => (batchId ? e.batchId === batchId : true))
    .map((entry) => {
      const pigeon = pMap.get(entry.pigeonId)!;
      const batch = bMap.get(entry.batchId)!;
      return {
        entry,
        batch,
        pigeon,
        observing: pigeon.health === "observing",
      };
    });
  const ranked = rows
    .filter((r) => !r.observing)
    .sort((a, b) => (b.entry.speed ?? 0) - (a.entry.speed ?? 0));
  const observing = rows
    .filter((r) => r.observing)
    .sort((a, b) => (b.entry.speed ?? 0) - (a.entry.speed ?? 0));
  return { ranked, observing };
}

export interface HistoryRow {
  entry: Entry;
  batch: Batch;
}

/** 单羽赛鸽：历次开笼记录，新到旧 */
export function pigeonHistory(
  state: RootState,
  pigeonId: string
): HistoryRow[] {
  const bMap = batchMap(state.batches);
  return state.entries
    .filter((e) => e.pigeonId === pigeonId)
    .map((entry) => ({ entry, batch: bMap.get(entry.batchId)! }))
    .filter((r) => r.batch)
    .sort((a, b) => b.batch.releasedAt - a.batch.releasedAt);
}
