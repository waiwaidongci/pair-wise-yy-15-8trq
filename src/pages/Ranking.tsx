import { useState } from "react";
import { batchRanking } from "../lib/calc";
import { fmtDateTime, fmtMinutes, fmtSpeed } from "../lib/format";
import type { LoftState } from "../lib/types";

interface Props {
  state: LoftState;
  bloodline: string | null;
}

export default function RankingPage({ state, bloodline }: Props) {
  const batches = [...state.batches].sort(
    (a, b) => +new Date(b.releaseAt) - +new Date(a.releaseAt)
  );
  const [picked, setPicked] = useState<string | null>(null);
  const batch = batches.find((b) => b.id === picked) ?? batches[0] ?? null;
  const rows = batch ? batchRanking(state, batch.id, bloodline) : [];

  if (!batch) {
    return (
      <section className="panel">
        <div className="empty">还没有训放批次，无法排名。</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>成绩排行{bloodline ? ` · 已筛选：${bloodline}` : ""}</p>
          <h2>
            {batch.route} · {batch.distanceKm}km · {fmtDateTime(batch.releaseAt)} 开笼
          </h2>
        </div>
        <select
          className="batch-picker"
          value={batch.id}
          onChange={(e) => setPicked(e.target.value)}
        >
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {fmtDateTime(b.releaseAt)} · {b.route} {b.distanceKm}km
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="empty">本批暂无归巢成绩{bloodline ? `（${bloodline}）` : ""}。</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>名次</th>
                <th>足环</th>
                <th>血统</th>
                <th>健康</th>
                <th>归巢时刻</th>
                <th>飞行分钟</th>
                <th>分速（米/分）</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.entry.id} className={r.rank == null ? "muted" : ""}>
                  <td>{r.rank == null ? "—" : `第 ${r.rank} 名`}</td>
                  <td>{r.pigeon.ring}</td>
                  <td>{r.pigeon.bloodline}</td>
                  <td>
                    {r.pigeon.health === "观察中" ? (
                      <span className="pill warn">观察中 · 不计名次</span>
                    ) : (
                      r.pigeon.health
                    )}
                  </td>
                  <td>{fmtDateTime(r.entry.arrivedAt)}</td>
                  <td>{fmtMinutes(r.minutes)}</td>
                  <td>{fmtSpeed(r.speed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">健康观察中的赛鸽保留成绩档案，但不占名次。</p>
    </section>
  );
}
