import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { ranking } from "../lib/calc";
import { fmtClock, fmtDate, fmtDuration, fmtSpeed } from "../lib/time";
import { EmptyState, HealthBadge, Panel } from "../components/ui";

export default function Ranking({
  selectPigeon,
}: {
  selectPigeon: (id: string) => void;
}) {
  const { state } = useStore();
  const batches = useMemo(
    () => [...state.batches].sort((a, b) => b.releasedAt - a.releasedAt),
    [state.batches]
  );
  const [batchId, setBatchId] = useState<string | "all">(
    batches[0]?.id ?? "all"
  );
  const effectiveBatch =
    batchId === "all" || state.batches.some((b) => b.id === batchId)
      ? batchId
      : batches[0]?.id ?? "all";

  const { ranked, observing } = ranking(
    state,
    effectiveBatch === "all" ? null : effectiveBatch
  );

  return (
    <Panel
      title="归巢成绩排行"
      tag="按分速（米/分）排序，健康观察鸽不计名次"
      action={
        <select
          className="batch-select"
          value={effectiveBatch}
          onChange={(e) => setBatchId(e.target.value)}
        >
          <option value="all">全部批次汇总</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {fmtDate(b.releasedAt)} · {b.route}（{b.distance}km）
            </option>
          ))}
        </select>
      }
    >
      {ranked.length === 0 && observing.length === 0 ? (
        <EmptyState
          title="当前筛选下暂无归巢成绩"
          hint="完成归巢登记，或调整左侧血统筛选后再看"
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="ledger rank-table">
              <thead>
                <tr>
                  <th className="col-rank">名次</th>
                  <th>足环号</th>
                  <th>血统</th>
                  <th>批次 / 线路</th>
                  <th>开笼</th>
                  <th>归巢</th>
                  <th>飞行</th>
                  <th>分速</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.entry.id} className={i < 3 ? `rank-top rank-${i + 1}` : undefined}>
                    <td>
                      <span className={`rank-badge rank-badge-${i + 1}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td>
                      <button
                        className="link-btn ring-link"
                        onClick={() => selectPigeon(r.pigeon.id)}
                      >
                        {r.pigeon.ring}
                      </button>
                    </td>
                    <td>{r.pigeon.bloodline}</td>
                    <td>
                      {r.batch.route} · {r.batch.distance}km · {r.batch.weather}
                    </td>
                    <td>{fmtClock(r.batch.releasedAt)}</td>
                    <td>{fmtClock(r.entry.returnedAt)}</td>
                    <td>{fmtDuration(r.entry.flightMinutes)}</td>
                    <td>
                      <strong className="speed-cell">
                        {fmtSpeed(r.entry.speed)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {observing.length > 0 && (
            <div className="observing-block">
              <h3>健康观察中 · 有成绩但不进名次（{observing.length} 羽次）</h3>
              <div className="table-wrap">
                <table className="ledger dim-table">
                  <thead>
                    <tr>
                      <th>足环号</th>
                      <th>血统 / 状态</th>
                      <th>批次 / 线路</th>
                      <th>飞行</th>
                      <th>分速</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observing.map((r) => (
                      <tr key={r.entry.id}>
                        <td>
                          <button
                            className="link-btn ring-link"
                            onClick={() => selectPigeon(r.pigeon.id)}
                          >
                            {r.pigeon.ring}
                          </button>
                        </td>
                        <td>
                          {r.pigeon.bloodline} <HealthBadge health={r.pigeon.health} />
                        </td>
                        <td>
                          {r.batch.route} · {r.batch.distance}km
                        </td>
                        <td>{fmtDuration(r.entry.flightMinutes)}</td>
                        <td>{fmtSpeed(r.entry.speed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
