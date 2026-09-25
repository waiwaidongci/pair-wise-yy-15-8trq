import type { Ops } from "../App";
import { dueAt, toContact } from "../lib/calc";
import { fmtDateTime, fmtMinutes } from "../lib/format";
import type { LoftState } from "../lib/types";

interface Props {
  state: LoftState;
  now: number;
  bloodline: string | null;
  ops: Ops;
}

export default function ContactPage({ state, now, bloodline, ops }: Props) {
  const rows = toContact(state, now, bloodline);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>未归巢提醒{bloodline ? ` · 已筛选：${bloodline}` : ""}</p>
          <h2>待联系清单（{rows.length}）</h2>
        </div>
      </div>
      <p className="hint">到点未归的赛鸽进入清单；超时且无定位信号的排在最前。</p>

      {rows.length === 0 ? (
        <div className="empty">当前没有到点未归的赛鸽。</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>优先级</th>
                <th>足环</th>
                <th>血统</th>
                <th>批次</th>
                <th>开笼时刻</th>
                <th>应归时刻</th>
                <th>已超时</th>
                <th>定位信号</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.entry.id}>
                  <td>
                    {r.entry.signal ? (
                      <span className="pill warn">超时 {i + 1}</span>
                    ) : (
                      <span className="pill danger">无信号 · 优先</span>
                    )}
                  </td>
                  <td>{r.pigeon.ring}</td>
                  <td>{r.pigeon.bloodline}</td>
                  <td>
                    {r.batch.route} · {r.batch.distanceKm}km
                  </td>
                  <td>{fmtDateTime(r.batch.releaseAt)}</td>
                  <td>{fmtDateTime(new Date(dueAt(r.batch)).toISOString())}</td>
                  <td>{fmtMinutes(r.overdueMin)}</td>
                  <td>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={r.entry.signal}
                        onChange={(e) => ops.setSignal(r.entry.id, e.target.checked)}
                      />
                      {r.entry.signal ? "有" : "无"}
                    </label>
                  </td>
                  <td>
                    <button
                      className="small primary"
                      onClick={() => ops.setArrival(r.entry.id, new Date().toISOString())}
                    >
                      登记归巢
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
