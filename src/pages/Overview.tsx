import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNow } from "../hooks/useNow";
import {
  contactList,
  overviewStats,
} from "../lib/calc";
import {
  fmtClock,
  fmtCountdown,
  fmtDate,
  fmtDuration,
  fmtSpeed,
} from "../lib/time";
import { EmptyState, MetricCard, Panel, SignalBadge } from "../components/ui";
import type { Tab } from "../App";

export default function Overview({
  go,
  selectPigeon,
}: {
  go: (tab: Tab) => void;
  selectPigeon: (id: string) => void;
}) {
  const { state } = useStore();
  const now = useNow();
  const stats = useMemo(() => overviewStats(state, now), [state, now]);
  const contacts = useMemo(
    () => contactList(state, now).slice(0, 5),
    [state, now]
  );

  const recentBatches = [...state.batches]
    .sort((a, b) => b.releasedAt - a.releasedAt)
    .slice(0, 4);

  return (
    <div className="page">
      <div className="metrics">
        <MetricCard
          label="在棚赛鸽"
          value={stats.pigeonCount}
          sub={`${stats.observingCount} 羽健康观察中`}
          tone="primary"
        />
        <MetricCard
          label="归巢率"
          value={stats.returnRate === null ? "—" : `${stats.returnRate}%`}
          sub={`已归 ${stats.returnedCount} / 在飞 ${stats.flyingCount} 羽次`}
        />
        <MetricCard
          label="平均分速"
          value={stats.avgSpeed === null ? "—" : stats.avgSpeed.toLocaleString("zh-CN")}
          sub={stats.avgSpeed === null ? "暂无归巢" : "米/分 · 全部归巢记录"}
        />
        <MetricCard
          label="待联系"
          value={stats.contactCount}
          sub={
            stats.urgentCount > 0
              ? `${stats.urgentCount} 羽超时且无信号`
              : "暂无紧急失联"
          }
          tone={stats.urgentCount > 0 ? "danger" : stats.contactCount ? "warn" : "default"}
        />
      </div>

      <div className="two-col">
        <Panel
          title="待联系清单"
          tag={`共 ${contactList(state, now).length} 羽在飞`}
          action={
            <button className="link-btn" onClick={() => go("contacts")}>
              查看全部 →
            </button>
          }
        >
          {contacts.length === 0 ? (
            <EmptyState title="暂无在飞赛鸽" hint="开笼登记后会在此实时跟踪归巢情况" />
          ) : (
            <div className="records">
              {contacts.map((r) => (
                <article
                  key={r.entry.id}
                  className={
                    r.overdue && !r.entry.hasSignal
                      ? "record record-danger"
                      : r.overdue
                        ? "record record-warn"
                        : "record"
                  }
                >
                  <button
                    className="record-main"
                    onClick={() => selectPigeon(r.pigeon.id)}
                  >
                    <h3>{r.pigeon.ring}</h3>
                    <p>
                      {r.batch.route} · {r.batch.distance}km ·{" "}
                      {r.pigeon.bloodline}
                    </p>
                  </button>
                  <div className="record-meta">
                    <SignalBadge hasSignal={r.entry.hasSignal} />
                    <span
                      className={
                        r.overdue ? "countdown countdown-over" : "countdown"
                      }
                    >
                      {fmtCountdown(r.dueInMins)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="近期开笼批次"
          tag={`${stats.batchCount} 个批次`}
          action={
            <button className="link-btn" onClick={() => go("batches")}>
              批次管理 →
            </button>
          }
        >
          {recentBatches.length === 0 ? (
            <EmptyState title="还没有开笼记录" hint="去「开笼批次」新建一批训放" />
          ) : (
            <div className="batch-list">
              {recentBatches.map((b) => {
                const entries = state.entries.filter(
                  (e) => e.batchId === b.id
                );
                const returned = entries.filter(
                  (e) => e.status === "returned"
                ).length;
                return (
                  <div key={b.id} className="batch-row">
                    <div>
                      <h3>{b.route}</h3>
                      <p>
                        {fmtDate(b.releasedAt)} · 开笼 {fmtClock(b.releasedAt)}{" "}
                        · {b.distance}km · {b.weather}
                      </p>
                    </div>
                    <div className="batch-stat">
                      <strong>
                        {returned}/{entries.length}
                      </strong>
                      <span>已归巢 · 预计{fmtDuration(b.expectedMinutes)}</span>
                      <small className="muted">
                        {fmtSpeed(
                          entries
                            .filter((e) => e.speed !== null)
                            .reduce(
                              (acc, e, _i, arr) =>
                                acc + (e.speed as number) / arr.length,
                              0
                            ) || null
                        )}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
