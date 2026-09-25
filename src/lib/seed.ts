import type { Batch, Entry, LoftState, Pigeon } from "./types";

const H = 3_600_000;
const M = 60_000;
const iso = (t: number) => new Date(t).toISOString();

/**
 * 首次打开的演示数据（相对当前时刻生成，保证待联系清单立即可见）。
 * 一旦有任何改动落盘，之后重开都读取本地保存的数据。
 */
export function seedState(): LoftState {
  const now = Date.now();

  const pigeons: Pigeon[] = [
    { id: "p1", ring: "CHN-2024-001839", bloodline: "詹森系", health: "健康", mateId: "p2" },
    { id: "p2", ring: "CHN-2024-002114", bloodline: "凡龙系", health: "健康", mateId: "p1" },
    { id: "p3", ring: "CHN-2023-008771", bloodline: "慕利门系", health: "观察中", mateId: null },
    { id: "p4", ring: "CHN-2024-003305", bloodline: "詹森系", health: "健康", mateId: "p5" },
    { id: "p5", ring: "CHN-2022-010556", bloodline: "胡本系", health: "健康", mateId: "p4" },
    { id: "p6", ring: "CHN-2024-004218", bloodline: "凡龙系", health: "休养", mateId: null },
  ];

  const batches: Batch[] = [
    // 昨天已结束的 80km
    { id: "b1", route: "石家庄东", distanceKm: 80, weather: "晴", releaseAt: iso(now - 30 * H), expectedSpeed: 1200 },
    // 今早 120km，部分归巢、部分超时未归
    { id: "b2", route: "邢台服务区", distanceKm: 120, weather: "侧风3级", releaseAt: iso(now - 5 * H), expectedSpeed: 1100 },
    // 刚开笼的 60km，还没到应归时刻
    { id: "b3", route: "元氏北", distanceKm: 60, weather: "多云", releaseAt: iso(now - 40 * M), expectedSpeed: 1200 },
  ];

  const b1 = new Date(batches[0].releaseAt).getTime();
  const b2 = new Date(batches[1].releaseAt).getTime();
  const entries: Entry[] = [
    // b1 全部归巢；p3 观察中飞得最快 → 演示"有成绩不进名次"
    { id: "e1", batchId: "b1", pigeonId: "p1", arrivedAt: iso(b1 + 63 * M), signal: true },
    { id: "e2", batchId: "b1", pigeonId: "p2", arrivedAt: iso(b1 + 71 * M), signal: true },
    { id: "e3", batchId: "b1", pigeonId: "p3", arrivedAt: iso(b1 + 58 * M), signal: true },
    { id: "e4", batchId: "b1", pigeonId: "p4", arrivedAt: iso(b1 + 75 * M), signal: true },
    { id: "e5", batchId: "b1", pigeonId: "p5", arrivedAt: iso(b1 + 80 * M), signal: true },
    { id: "e6", batchId: "b1", pigeonId: "p6", arrivedAt: iso(b1 + 92 * M), signal: true },
    // b2 两羽已归，三羽超时未归（p3 无定位信号 → 待联系排最前）
    { id: "e7", batchId: "b2", pigeonId: "p1", arrivedAt: iso(b2 + 112 * M), signal: true },
    { id: "e8", batchId: "b2", pigeonId: "p4", arrivedAt: iso(b2 + 125 * M), signal: true },
    { id: "e9", batchId: "b2", pigeonId: "p2", arrivedAt: null, signal: true },
    { id: "e10", batchId: "b2", pigeonId: "p3", arrivedAt: null, signal: false },
    { id: "e11", batchId: "b2", pigeonId: "p5", arrivedAt: null, signal: true },
    // b3 刚开笼，未到点
    { id: "e12", batchId: "b3", pigeonId: "p1", arrivedAt: null, signal: true },
    { id: "e13", batchId: "b3", pigeonId: "p6", arrivedAt: null, signal: true },
  ];

  return { pigeons, batches, entries };
}
