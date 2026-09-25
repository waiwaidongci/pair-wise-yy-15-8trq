import type { Batch, Entry, Pigeon, RootState } from "../types";
import { calcSpeed, defaultExpectedMinutes } from "./calc";

// 初始台账：真实可用的演示数据，首次打开后所有增删改都落到 localStorage

function seed(now: number): RootState {
  const DAY = 86400000;

  const pigeons: Pigeon[] = [
    {
      id: "p_1839",
      ring: "CHN-24-001839",
      bloodline: "詹森系",
      health: "normal",
      mateId: "p_8771",
      note: "短距离爆发好，晴天发挥稳定。",
      createdAt: now - 200 * DAY,
    },
    {
      id: "p_2114",
      ring: "CHN-24-002114",
      bloodline: "凡龙系",
      health: "normal",
      mateId: null,
      note: "中距离耐翔，侧风天容易偏航。",
      createdAt: now - 190 * DAY,
    },
    {
      id: "p_1052",
      ring: "CHN-24-003052",
      bloodline: "胡本系",
      health: "normal",
      mateId: null,
      note: "长距离型，续航佳。",
      createdAt: now - 180 * DAY,
    },
    {
      id: "p_7720",
      ring: "CHN-23-007720",
      bloodline: "詹森系",
      health: "normal",
      mateId: "p_6608",
      note: "种赛两用，归巢稳定。",
      createdAt: now - 400 * DAY,
    },
    {
      id: "p_6608",
      ring: "CHN-23-006608",
      bloodline: "凡龙系",
      health: "normal",
      mateId: "p_7720",
      createdAt: now - 380 * DAY,
    },
    {
      id: "p_8771",
      ring: "CHN-23-008771",
      bloodline: "胡本系",
      health: "observing",
      mateId: "p_1839",
      note: "呼吸道观察中，归巢后需隔离复查；观察期成绩不计名次。",
      createdAt: now - 360 * DAY,
    },
  ];

  // 上一批：120km 已全部归巢
  const oldReleasedAt = now - 6 * DAY - 3 * 3600000;
  const oldBatch: Batch = {
    id: "b_old",
    route: "东线 · 盐城站",
    distance: 120,
    weather: "侧风",
    releasedAt: oldReleasedAt,
    expectedMinutes: defaultExpectedMinutes(120),
    note: "西风 3 级，早晨有薄雾。",
    createdAt: now - 6 * DAY,
  };

  const oldReturnMins: Record<string, number> = {
    p_1839: 102,
    p_7720: 111,
    p_1052: 118,
    p_6608: 126,
    p_2114: 141,
    p_8771: 134, // 观察鸽：有成绩但不进名次
  };
  const oldEntries: Entry[] = pigeons.map((p, i) => {
    const mins = oldReturnMins[p.id]!;
    const result = calcSpeed(120, oldReleasedAt, oldReleasedAt + mins * 60000)!;
    return {
      id: `e_old_${i}`,
      batchId: oldBatch.id,
      pigeonId: p.id,
      status: "returned",
      hasSignal: true,
      returnedAt: oldReleasedAt + mins * 60000,
      flightMinutes: result.minutes,
      speed: result.speed,
      createdAt: oldBatch.createdAt,
    };
  });

  // 本批：80km 今早开笼，部分在飞，制造超时无信号的待联系场景
  const releasedAt = now - 150 * 60000; // 2.5 小时前开笼
  const activeBatch: Batch = {
    id: "b_active",
    route: "南线 · 南通站",
    distance: 80,
    weather: "晴",
    releasedAt,
    expectedMinutes: defaultExpectedMinutes(80), // 约 123 分钟 → 此刻已超时
    note: "晴，微风，能见度良好。",
    createdAt: now - 5 * 3600000,
  };

  const activePlan: Record<
    string,
    { status: "returned"; mins: number } | { status: "flying"; signal: boolean }
  > = {
    p_1839: { status: "returned", mins: 64 },
    p_7720: { status: "returned", mins: 71 },
    p_1052: { status: "returned", mins: 79 },
    p_2114: { status: "flying", signal: false }, // 超时且无定位 → 待联系最前
    p_6608: { status: "flying", signal: true },
    p_8771: { status: "flying", signal: true }, // 健康观察中
  };
  const activeEntries: Entry[] = pigeons.map((p, i) => {
    const plan = activePlan[p.id]!;
    if (plan.status === "returned") {
      const result = calcSpeed(
        80,
        releasedAt,
        releasedAt + plan.mins * 60000
      )!;
      return {
        id: `e_act_${i}`,
        batchId: activeBatch.id,
        pigeonId: p.id,
        status: "returned",
        hasSignal: true,
        returnedAt: releasedAt + plan.mins * 60000,
        flightMinutes: result.minutes,
        speed: result.speed,
        createdAt: activeBatch.createdAt,
      };
    }
    return {
      id: `e_act_${i}`,
      batchId: activeBatch.id,
      pigeonId: p.id,
      status: "flying",
      hasSignal: plan.signal,
      returnedAt: null,
      flightMinutes: null,
      speed: null,
      createdAt: activeBatch.createdAt,
    };
  });

  return {
    pigeons,
    batches: [activeBatch, oldBatch],
    entries: [...activeEntries, ...oldEntries],
    bloodlineFilter: "all",
  };
}

export function makeSeed(): RootState {
  return seed(Date.now());
}
