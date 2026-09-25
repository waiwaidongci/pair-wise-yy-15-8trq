import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  Batch,
  Entry,
  HealthStatus,
  Pigeon,
  RootState,
} from "../types";
import { calcSpeed, uid } from "../lib/calc";
import { makeSeed } from "../lib/seed";

// —— 保存层：所有增删改经 reducer，自动持久化到 localStorage，重开仍保留 ——

const STORAGE_KEY = "loft-ledger-v1";

function load(): RootState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RootState;
      if (
        parsed &&
        Array.isArray(parsed.pigeons) &&
        Array.isArray(parsed.batches) &&
        Array.isArray(parsed.entries)
      ) {
        return {
          pigeons: parsed.pigeons,
          batches: parsed.batches,
          entries: parsed.entries,
          bloodlineFilter: parsed.bloodlineFilter ?? "all",
        };
      }
    }
  } catch {
    // 存档损坏时回退到演示数据
  }
  return makeSeed();
}

export interface PigeonInput {
  ring: string;
  bloodline: string;
  health: HealthStatus;
  mateId: string | null;
  note?: string;
}

export interface BatchInput {
  route: string;
  distance: number;
  weather: string;
  releasedAt: number;
  expectedMinutes: number;
  note?: string;
}

type Action =
  | { type: "add_pigeon"; input: PigeonInput }
  | { type: "update_pigeon"; id: string; input: PigeonInput }
  | { type: "delete_pigeon"; id: string }
  | { type: "add_batch"; input: BatchInput; pigeonIds: string[] }
  | {
      type: "mark_returned";
      entryId: string;
      returnedAt: number;
    }
  | { type: "undo_return"; entryId: string }
  | { type: "toggle_signal"; entryId: string }
  | { type: "set_filter"; bloodline: string }
  | { type: "reset" };

function setMate(
  pigeons: Pigeon[],
  targetId: string,
  mateId: string | null
): Pigeon[] {
  return pigeons.map((p) => {
    if (p.id === targetId) return { ...p, mateId };
    // 解除旧配对
    if (p.mateId === targetId && mateId !== p.id)
      return { ...p, mateId: null };
    // 新配偶原来的配对让位，并双向绑定
    if (mateId && p.id === mateId)
      return { ...p, mateId: targetId };
    return p;
  });
}

function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    case "add_pigeon": {
      const pigeon: Pigeon = {
        id: uid("p"),
        createdAt: Date.now(),
        ...action.input,
      };
      return {
        ...state,
        pigeons: setMate([...state.pigeons, pigeon], pigeon.id, pigeon.mateId),
      };
    }
    case "update_pigeon": {
      const target = state.pigeons.find((p) => p.id === action.id);
      const mateId =
        action.input.mateId === action.id ? null : action.input.mateId;
      let pigeons = state.pigeons.map((p) =>
        p.id === action.id ? { ...p, ...action.input, mateId } : p
      );
      pigeons = pigeons.map((p) => {
        if (p.id === action.id) return p;
        // 目标改配后，原配偶若仍指向目标则解除
        if (
          target?.mateId &&
          p.id === target.mateId &&
          mateId !== p.id &&
          p.mateId === action.id
        ) {
          return { ...p, mateId: null };
        }
        return p;
      });
      pigeons = setMate(pigeons, action.id, mateId);
      return { ...state, pigeons };
    }
    case "delete_pigeon": {
      return {
        ...state,
        pigeons: state.pigeons
          .filter((p) => p.id !== action.id)
          .map((p) =>
            p.mateId === action.id ? { ...p, mateId: null } : p
          ),
        entries: state.entries.filter((e) => e.pigeonId !== action.id),
      };
    }
    case "add_batch": {
      const batch: Batch = {
        id: uid("b"),
        createdAt: Date.now(),
        ...action.input,
      };
      const entries: Entry[] = action.pigeonIds.map((pigeonId) => ({
        id: uid("e"),
        batchId: batch.id,
        pigeonId,
        status: "flying" as const,
        hasSignal: true,
        returnedAt: null,
        flightMinutes: null,
        speed: null,
        createdAt: Date.now(),
      }));
      return {
        ...state,
        batches: [batch, ...state.batches],
        entries: [...entries, ...state.entries],
      };
    }
    case "mark_returned": {
      return {
        ...state,
        entries: state.entries.map((e) => {
          if (e.id !== action.entryId || e.status === "returned") return e;
          const batch = state.batches.find((b) => b.id === e.batchId);
          if (!batch) return e;
          const result = calcSpeed(
            batch.distance,
            batch.releasedAt,
            action.returnedAt
          );
          return {
            ...e,
            status: "returned",
            returnedAt: action.returnedAt,
            flightMinutes: result?.minutes ?? null,
            speed: result?.speed ?? null,
          };
        }),
      };
    }
    case "undo_return": {
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.entryId
            ? {
                ...e,
                status: "flying",
                returnedAt: null,
                flightMinutes: null,
                speed: null,
              }
            : e
        ),
      };
    }
    case "toggle_signal": {
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.entryId && e.status === "flying"
            ? { ...e, hasSignal: !e.hasSignal }
            : e
        ),
      };
    }
    case "set_filter":
      return { ...state, bloodlineFilter: action.bloodline };
    case "reset":
      return makeSeed();
    default:
      return state;
  }
}

interface Store {
  state: RootState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储空间不足等情况静默失败
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore 必须在 StoreProvider 内使用");
  return ctx;
}
