import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNow } from "../hooks/useNow";
import { contactList } from "../lib/calc";
import { fmtClock, fmtCountdown, fmtDuration } from "../lib/time";
import { EmptyState, HealthBadge, Panel, SignalBadge } from "../components/ui";

export default function Contacts({
  selectPigeon,
}: {
  selectPigeon: (id: string) => void;
}) {
  const { state, dispatch } = useStore();
  const now = useNow();
  const rows = useMemo(() => contactList(state, now), [state, now]);

  const urgent = rows.filter((r) => r.overdue && !r.entry.hasSignal);
  const overdue = rows.filter(
    (r) => r.overdue && r.entry.hasSignal
  );
  const waiting = rows.filter((r) => !r.overdue);

  const groups: {
    key: string;
    title: string;
    desc: string;
    rows: typeof rows;
  }[] = [
    {
      key: "urgent",
      title: "超时且无定位信号",
      desc: "优先电话联系周边鸽友、核查脚环",
      rows: urgent,
    },
    {
      key: "overdue",
      title: "超时 · 定位正常",
      desc: "信号仍在移动，持续关注轨迹",
      rows: overdue,
    },
    {
      key: "waiting",
      title: "未到预计归巢时间",
      desc: "正常飞行中，到点未归自动升级",
      rows: waiting,
    },
  ];

  return (
    <Panel
      title="待联系清单"
      tag={`${rows.length} 羽在飞 · ${urgent.length} 羽紧急`}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="目前没有在飞的鸽子"
          hint="所有登记的赛鸽都已归巢，或还没有新开笼批次"
        />
      ) : (
        <div className="contact-groups">
          {groups
            .filter((g) => g.rows.length > 0)
            .map((g) => (
              <div key={g.key} className={`contact-group group-${g.key}`}>
                <div className="group-head">
                  <h3>
                    {g.title}
                    <span className="group-count">{g.rows.length}</span>
                  </h3>
                  <p>{g.desc}</p>
                </div>
                <div className="records">
                  {g.rows.map((r) => (
                    <article
                      key={r.entry.id}
                      className={
                        g.key === "urgent"
                          ? "record record-danger"
                          : g.key === "overdue"
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
                          {r.pigeon.bloodline} · {r.batch.route} ·{" "}
                          {r.batch.distance}km · {r.batch.weather}
                        </p>
                      </button>
                      <div className="record-meta">
                        {r.pigeon.health === "observing" && (
                          <HealthBadge health={r.pigeon.health} />
                        )}
                        <SignalBadge hasSignal={r.entry.hasSignal} />
                        <span className="muted">
                          开笼 {fmtClock(r.batch.releasedAt)} · 预计{" "}
                          {fmtDuration(r.batch.expectedMinutes)}
                        </span>
                        <span
                          className={
                            r.overdue
                              ? "countdown countdown-over"
                              : "countdown"
                          }
                        >
                          {fmtCountdown(r.dueInMins)}
                        </span>
                        <button
                          className="btn-ghost"
                          onClick={() =>
                            dispatch({
                              type: "toggle_signal",
                              entryId: r.entry.id,
                            })
                          }
                        >
                          {r.entry.hasSignal ? "标记失联" : "恢复信号"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </Panel>
  );
}
