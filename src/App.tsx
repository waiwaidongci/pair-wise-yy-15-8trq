import { useEffect, useState } from "react";
import "./styles.css";
import { StoreProvider, useStore } from "./store/store";
import { useNow } from "./hooks/useNow";
import { bloodlineList, contactList, ALL_BLOODLINES } from "./lib/calc";
import Overview from "./pages/Overview";
import Batches from "./pages/Batches";
import Ranking from "./pages/Ranking";
import Contacts from "./pages/Contacts";
import Pigeons from "./pages/Pigeons";

export type Tab = "overview" | "batches" | "ranking" | "contacts" | "pigeons";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "鸽棚总览", icon: "🏠" },
  { key: "batches", label: "开笼批次", icon: "🕊️" },
  { key: "ranking", label: "成绩排行", icon: "🏆" },
  { key: "contacts", label: "待联系", icon: "📡" },
  { key: "pigeons", label: "赛鸽档案", icon: "📇" },
];

function Shell() {
  const { state, dispatch } = useStore();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("overview");
  const [pigeonId, setPigeonId] = useState<string | null>(null);

  const bloodlines = bloodlineList(state.pigeons);
  // 存档里选中的血统被删掉后回退到全部
  useEffect(() => {
    if (
      state.bloodlineFilter !== ALL_BLOODLINES &&
      !bloodlines.includes(state.bloodlineFilter)
    ) {
      dispatch({ type: "set_filter", bloodline: ALL_BLOODLINES });
    }
  }, [bloodlines, state.bloodlineFilter, dispatch]);

  const contactCount = contactList(state, now).length;

  function go(next: Tab) {
    setPigeonId(null);
    setTab(next);
  }

  function selectPigeon(id: string | null) {
    setPigeonId(id);
    if (id) setTab("pigeons");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>鸽棚台账</h1>
          <p>开笼 · 归巢 · 分速 · 配对</p>
        </div>

        <nav className="nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`nav-item ${tab === t.key ? "nav-on" : ""}`}
              onClick={() => go(t.key)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
              {t.key === "contacts" && contactCount > 0 && (
                <span className="nav-badge">{contactCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="filter-box">
          <h2>血统筛选</h2>
          <p className="filter-hint">总览、排行、待联系数量同步更新</p>
          <div className="chips">
            <button
              className={
                state.bloodlineFilter === ALL_BLOODLINES ? "chip-on" : ""
              }
              onClick={() =>
                dispatch({ type: "set_filter", bloodline: ALL_BLOODLINES })
              }
            >
              全部血统
            </button>
            {bloodlines.map((b) => (
              <button
                key={b}
                className={state.bloodlineFilter === b ? "chip-on" : ""}
                onClick={() => dispatch({ type: "set_filter", bloodline: b })}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-foot">
          <button
            className="reset-btn"
            onClick={() => {
              if (
                window.confirm("清空当前全部记录并恢复演示数据？此操作不可撤销。")
              ) {
                dispatch({ type: "reset" });
                setPigeonId(null);
                setTab("overview");
              }
            }}
          >
            恢复演示数据
          </button>
          <p>数据保存在本机浏览器，重开不丢失</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h2>{TABS.find((t) => t.key === tab)?.label}</h2>
            {state.bloodlineFilter !== ALL_BLOODLINES && (
              <span className="filter-tag">
                血统：{state.bloodlineFilter}
                <button
                  onClick={() =>
                    dispatch({ type: "set_filter", bloodline: ALL_BLOODLINES })
                  }
                >
                  ✕ 清除
                </button>
              </span>
            )}
          </div>
          <span className="clock">
            {new Date(now).toLocaleString("zh-CN", { hour12: false })}
          </span>
        </header>

        {tab === "overview" && (
          <Overview go={go} selectPigeon={selectPigeon} />
        )}
        {tab === "batches" && <Batches selectPigeon={selectPigeon} />}
        {tab === "ranking" && <Ranking selectPigeon={selectPigeon} />}
        {tab === "contacts" && <Contacts selectPigeon={selectPigeon} />}
        {tab === "pigeons" && (
          <Pigeons selectedId={pigeonId} selectPigeon={selectPigeon} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
