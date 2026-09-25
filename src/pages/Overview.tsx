import { dueAt, overviewStats } from "../lib/calc";
import { fmtDateTime, fmtSpeed } from "../lib/format";
import type { LoftState } from "../lib/types";

interface Props {
  state: LoftState;
  now: number;
  bloodline: string | null;
  onOpenContact: () => void;
}

export default function OverviewPage({ state, now, bloodline, onOpenContact }: Props) {
  const m = overviewStats(state, now, bloodline);
  const ids = new Set(
    state.pigeons.filter((p) => !bloodline || p.bloodline === bloodline).map((p) => p.id)
  );
  const batches = [...state.batches].sort(
    (a, b) => +new Date(b.releaseAt) - +new Date(a.releaseAt)
  );

  return (
    <>
      <section className="metrics">
        <article>
          <small>在册赛鸽{bloodline ? ` · ${bloodline}` : ""}</small>
          <strong>{m.pigeonCount}</strong>
          <em>健康观察中 {m.observingCount} 羽</em>
        </article>
        <article>
          <small>归巢率</small>
          <strong>{m.returnRate == null ? "—" : `${m.returnRate.toFixed(1)}%`}</strong>
          <em>
            {m.returnedCount}/{m.entryCount} 羽次归巢
          </em>
        </article>
        <article>
          <small>平均分速（米/分）</small>
          <strong>{fmtSpeed(m.avgSpeed)}</strong>
          <em>最佳 {fmtSpeed(m.bestSpeed)} 米/分</em>
        </article>
        <article className="warn clickable" onClick={onOpenContact}>
          <small>待联系</small>
          <strong>{m.contactCount}</strong>
          <em>到点未归，点击前往处理</em>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>训放批次</p>
            <h2>近期开笼</h2>
          </div>
        </div>
        {batches.length === 0 ? (
          <div className="empty">还没有训放批次，去「训放批次」新建一条。</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>线路</th>
                  <th>开笼时刻</th>
                  <th>公里数</th>
                  <th>天气</th>
                  <th>应归时刻</th>
                  <th>已归/参赛</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const es = state.entries.filter(
                    (e) => e.batchId === b.id && ids.has(e.pigeonId)
                  );
                  const ret = es.filter((e) => e.arrivedAt).length;
                  let status = { text: "未登记", cls: "muted" };
                  if (es.length > 0 && ret === es.length) status = { text: "全部归巢", cls: "ok" };
                  else if (es.length > 0 && now > dueAt(b))
                    status = { text: `超时未归 ${es.length - ret}`, cls: "danger" };
                  else if (es.length > 0) status = { text: "训放中", cls: "warn" };
                  return (
                    <tr key={b.id}>
                      <td>{b.route}</td>
                      <td>{fmtDateTime(b.releaseAt)}</td>
                      <td>{b.distanceKm} km</td>
                      <td>{b.weather}</td>
                      <td>{fmtDateTime(new Date(dueAt(b)).toISOString())}</td>
                      <td>
                        {ret}/{es.length}
                      </td>
                      <td>
                        <span className={`pill ${status.cls}`}>{status.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
