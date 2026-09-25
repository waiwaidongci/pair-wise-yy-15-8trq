// 数据模型：鸽棚台账分三块 —— 赛鸽档案、开笼批次、归巢记录

export type HealthStatus = "normal" | "observing";

export interface Pigeon {
  id: string;
  ring: string; // 足环号
  bloodline: string; // 血统
  health: HealthStatus; // 健康状态
  mateId: string | null; // 当前配偶
  note?: string;
  createdAt: number;
}

export type Weather = "晴" | "多云" | "阴" | "小雨" | "雾" | "逆风" | "侧风";

export interface Batch {
  id: string;
  route: string; // 线路 / 训放地点
  distance: number; // 公里数
  weather: Weather | string; // 天气
  releasedAt: number; // 开笼时刻（时间戳）
  expectedMinutes: number; // 预计归巢分钟数，用于判定超时
  note?: string;
  createdAt: number;
}

export type EntryStatus = "flying" | "returned";

export interface Entry {
  id: string;
  batchId: string;
  pigeonId: string;
  status: EntryStatus;
  hasSignal: boolean; // 定位脚环是否有信号
  returnedAt: number | null; // 归巢时刻
  flightMinutes: number | null; // 飞行分钟（由里程与归巢时刻算出）
  speed: number | null; // 分速 米/分
  createdAt: number;
}

export interface RootState {
  pigeons: Pigeon[];
  batches: Batch[];
  entries: Entry[];
  bloodlineFilter: string; // "all" 或具体血统
}
