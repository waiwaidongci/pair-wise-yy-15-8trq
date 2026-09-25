export type Health = "健康" | "观察中" | "休养";

export const HEALTH_OPTIONS: Health[] = ["健康", "观察中", "休养"];

/** 鸽籍档案：逐羽登记 */
export interface Pigeon {
  id: string;
  ring: string; // 足环号
  bloodline: string; // 血统
  health: Health; // 健康状态
  mateId: string | null; // 当前配偶
}

/** 训放批次 */
export interface Batch {
  id: string;
  route: string; // 线路 / 司放地
  distanceKm: number; // 公里数
  weather: string; // 天气
  releaseAt: string; // 开笼时刻 ISO
  expectedSpeed: number; // 预计分速（米/分），用于推算应归时刻
}

/** 批次内的单羽参赛记录 */
export interface Entry {
  id: string;
  batchId: string;
  pigeonId: string;
  arrivedAt: string | null; // 归巢时刻 ISO，null = 未归
  signal: boolean; // 定位信号
}

export interface LoftState {
  pigeons: Pigeon[];
  batches: Batch[];
  entries: Entry[];
}
