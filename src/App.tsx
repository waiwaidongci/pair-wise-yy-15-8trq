import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { bloodlines, toContact } from "./lib/calc";
import { loadState, saveState } from "./lib/storage";
import type { Batch, Health, LoftState } from "./lib/types";
import BatchesPage from "./pages/Batches";
import ContactPage from "./pages/Contact";
import OverviewPage from "./pages/Overview";
import PigeonsPage from "./pages/Pigeons";
import RankingPage from "./pages/Ranking";

let seq = 0;
const uid = () =>
  `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 页面共用的数据操作；全部经由 setState → useEffect 落盘 */
export interface Ops {
  addPigeon: (input: { ring: string; bloodline: string; health: Health; mateId: string | null }) => void;
  setHealth: (id: string, health: Health) => void;
  setMate: (id: string, mateId: string | null) => void;
  addBatch: (input: Omit<Batch, "id">) => string;
  addEntry: (batchId: string, pigeonId: string) => void;
  removeEntry: (entryId: string) => void;
  setArrival: (entryId: string, iso: string | null) => void;
  setSignal: (entryId: string, signal: boolean) => void;
}

type Tab = "overview" | "batches" | "ranking" | "contact" | "pigeons";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "鸽棚总览" },
  { key: "batches", label: "训放批次" },
  { key: "ranking", label: "成绩排行" },
  { key: "contact", label: "待联系" },
  { key: "pigeons", label: "鸽籍档案" },
];

function App() {
  const [state, setState] = useState<LoftState>(loadState);
  const [tab, setTab] = useState<Tab>("overview");
  const [bloodline, setBloodline] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 保存：任何变更都写入 localStorage，重开仍保留
  useEffect(() => saveState(state), [state]);

  // 每 30 秒刷新一次“当前时刻”，待联系清单随时间推进
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const ops: Ops = useMemo(
    () => ({
      addPigeon: (input) =>
        setState((s) => {
          const id = uid();
          const pigeons = s.pigeons.map((p) => ({ ...p }));
          if (input.mateId) {
            const mate = pigeons.find((p) => p.id === input.mateId);
            if (mate) {
              const occupied = pigeons.find((p) => p.id === mate.mateId);
              if (occupied) occupied.mateId = null;
              mate.mateId = id;
            }
          }
          return { ...s, pigeons: [...pigeons, { id, ...input }] };
        }),
      setHealth: (id, health) =>
        setState((s) => ({
          ...s,
          pigeons: s.pigeons.map((p) => (p.id === id ? { ...p, health } : p)),
        })),
      // 配偶双向绑定：换新配偶时解除双方旧关系
      setMate: (id, mateId) =>
        setState((s) => {
          const pigeons = s.pigeons.map((p) => ({ ...p }));
          const me = pigeons.find((p) => p.id === id);
          if (!me) return s;
          const prev = pigeons.find((p) => p.id === me.mateId);
          if (prev && prev.mateId === id) prev.mateId = null;
          me.mateId = mateId;
          if (mateId) {
            const mate = pigeons.find((p) => p.id === mateId);
            if (mate) {
              const occupied = pigeons.find((p) => p.id === mate.mateId && p.id !== id);
              if (occupied) occupied.mateId = null;
              mate.mateId = id;
            }
          }
          return { ...s, pigeons };
        }),
      addBatch: (input) => {
        const id = uid();
        setState((s) => ({ ...s, batches: [...s.batches, { id, ...input }] }));
        return id;
      },
      addEntry: (batchId, pigeonId) =>
        setState((s) =>
          s.entries.some((e) => e.batchId === batchId && e.pigeonId === pigeonId)
            ? s
            : {
                ...s,
                entries: [
                  ...s.entries,
                  { id: uid(), batchId, pigeonId, arrivedAt: null, signal: true },
                ],
              }
        ),
      removeEntry: (entryId) =>
        setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entryId) })),
      setArrival: (entryId, iso) =>
        setState((s) => ({
          ...s,
          entries: s.entries.map((e) => (e.id === entryId ? { ...e, arrivedAt: iso } : e)),
        })),
      setSignal: (entryId, signal) =>
        setState((s) => ({
          ...s,
          entries: s.entries.map((e) => (e.id === entryId ? { ...e, signal } : e)),
        })),
    }),
    []
  );

  const lines = bloodlines(state);
  const contactCount = toContact(state, now, bloodline).length;

  return (
    <main className="app">
      <header className="panel topbar">
        <div>
          <p className="eyebrow">hxyfront-62014 · 赛鸽训放</p>
          <h1>鸽棚训放台账</h1>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === "contact" && contactCount > 0 && (
                <span className="badge">{contactCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="filterbar">
          <span>血统筛选</span>
          <button
            className={`chip ${bloodline === null ? "active" : ""}`}
            onClick={() => setBloodline(null)}
          >
            全部
          </button>
          {lines.map((l) => (
            <button
              key={l}
              className={`chip ${bloodline === l ? "active" : ""}`}
              onClick={() => setBloodline(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      {tab === "overview" && (
        <OverviewPage
          state={state}
          now={now}
          bloodline={bloodline}
          onOpenContact={() => setTab("contact")}
        />
      )}
      {tab === "batches" && <BatchesPage state={state} now={now} ops={ops} />}
      {tab === "ranking" && <RankingPage state={state} bloodline={bloodline} />}
      {tab === "contact" && (
        <ContactPage state={state} now={now} bloodline={bloodline} ops={ops} />
      )}
      {tab === "pigeons" && <PigeonsPage state={state} ops={ops} />}
    </main>
  );
}

export default App;
