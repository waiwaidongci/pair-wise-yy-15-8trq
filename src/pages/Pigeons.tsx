import { useState } from "react";
import type { Ops } from "../App";
import { bloodlines, pigeonHistory } from "../lib/calc";
import { fmtDateTime, fmtMinutes, fmtSpeed } from "../lib/format";
import { HEALTH_OPTIONS, type Health, type LoftState, type Pigeon } from "../lib/types";

interface Props {
  state: LoftState;
  ops: Ops;
}

export default function PigeonsPage({ state, ops }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.pigeons.find((p) => p.id === selectedId) ?? null;

  // 逐羽登记表单
  const [ring, setRing] = useState("");
  const [bloodline, setBloodline] = useState("");
  const [health, setHealth] = useState<Health>("健康");
  const [mateId, setMateId] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const r = ring.trim();
    if (!r) return setError("请填写足环号");
    if (state.pigeons.some((p) => p.ring === r)) return setError(`足环号 ${r} 已登记过`);
    if (!bloodline.trim()) return setError("请填写血统");
    ops.addPigeon({ ring: r, bloodline: bloodline.trim(), health, mateId: mateId || null });
    setError("");
    setRing("");
    setBloodline("");
    setHealth("健康");
    setMateId("");
  };

  if (selected) {
    return <PigeonDetail pigeon={selected} state={state} ops={ops} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="heading">
          <div>
            <p>逐羽登记</p>
            <h2>新增赛鸽</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>足环号</span>
            <input value={ring} onChange={(e) => setRing(e.target.value)} placeholder="如：CHN-2025-006666" />
          </label>
          <label className="field">
            <span>血统</span>
            <input list="bloodline-options" value={bloodline} onChange={(e) => setBloodline(e.target.value)} placeholder="如：詹森系" />
            <datalist id="bloodline-options">
              {bloodlines(state).map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>健康状态</span>
            <select value={health} onChange={(e) => setHealth(e.target.value as Health)}>
              {HEALTH_OPTIONS.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>配偶</span>
            <select value={mateId} onChange={(e) => setMateId(e.target.value)}>
              <option value="">暂无</option>
              {state.pigeons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ring} · {p.bloodline}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="error">{error}</p>}
          <div>
            <button className="primary" onClick={submit}>
              登记入册
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>鸽籍</p>
            <h2>在册 {state.pigeons.length} 羽</h2>
          </div>
        </div>
        {state.pigeons.length === 0 ? (
          <div className="empty">还没有登记赛鸽。</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>足环</th>
                  <th>血统</th>
                  <th>健康状态</th>
                  <th>配偶</th>
                  <th>参赛</th>
                  <th>归巢</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.pigeons.map((p) => {
                  const mate = state.pigeons.find((m) => m.id === p.mateId);
                  const es = state.entries.filter((e) => e.pigeonId === p.id);
                  const ret = es.filter((e) => e.arrivedAt).length;
                  return (
                    <tr key={p.id}>
                      <td>{p.ring}</td>
                      <td>{p.bloodline}</td>
                      <td>
                        <select
                          className="inline-select"
                          value={p.health}
                          onChange={(e) => ops.setHealth(p.id, e.target.value as Health)}
                        >
                          {HEALTH_OPTIONS.map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td>{mate ? mate.ring : "—"}</td>
                      <td>{es.length} 场</td>
                      <td>{ret} 次</td>
                      <td>
                        <button className="small" onClick={() => setSelectedId(p.id)}>
                          单羽档案
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PigeonDetail({
  pigeon,
  state,
  ops,
  onBack,
}: {
  pigeon: Pigeon;
  state: LoftState;
  ops: Ops;
  onBack: () => void;
}) {
  const history = pigeonHistory(state, pigeon.id);
  const returned = history.filter((h) => h.entry.arrivedAt);
  const speeds = history.map((h) => h.speed).filter((v): v is number => v != null);
  const mate = state.pigeons.find((m) => m.id === pigeon.mateId) ?? null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="heading">
          <div>
            <p>单羽档案</p>
            <h2>{pigeon.ring}</h2>
          </div>
          <button onClick={onBack}>← 返回鸽籍</button>
        </div>
        <div className="profile">
          <div>
            <small>血统</small>
            <b>{pigeon.bloodline}</b>
          </div>
          <div>
            <small>健康状态</small>
            <select
              className="inline-select"
              value={pigeon.health}
              onChange={(e) => ops.setHealth(pigeon.id, e.target.value as Health)}
            >
              {HEALTH_OPTIONS.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <small>当前配偶</small>
            <select
              className="inline-select"
              value={pigeon.mateId ?? ""}
              onChange={(e) => ops.setMate(pigeon.id, e.target.value || null)}
            >
              <option value="">无</option>
              {state.pigeons
                .filter((p) => p.id !== pigeon.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ring} · {p.bloodline}
                  </option>
                ))}
            </select>
            {mate && <em className="hint">与 {mate.ring} 互为配偶</em>}
          </div>
          <div>
            <small>参赛 / 归巢</small>
            <b>
              {history.length} 场 / {returned.length} 次
            </b>
          </div>
          <div>
            <small>最佳分速</small>
            <b>{speeds.length ? `${fmtSpeed(Math.max(...speeds))} 米/分` : "—"}</b>
          </div>
          <div>
            <small>平均分速</small>
            <b>
              {speeds.length
                ? `${fmtSpeed(speeds.reduce((a, b) => a + b, 0) / speeds.length)} 米/分`
                : "—"}
            </b>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>历次开笼</p>
            <h2>参赛记录（{history.length}）</h2>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="empty">还没有参赛记录，去「训放批次」上笼登记。</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>开笼时刻</th>
                  <th>线路</th>
                  <th>公里数</th>
                  <th>天气</th>
                  <th>归巢时刻</th>
                  <th>飞行分钟</th>
                  <th>分速（米/分）</th>
                  <th>名次</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.entry.id}>
                    <td>{fmtDateTime(h.batch.releaseAt)}</td>
                    <td>{h.batch.route}</td>
                    <td>{h.batch.distanceKm} km</td>
                    <td>{h.batch.weather}</td>
                    <td>{fmtDateTime(h.entry.arrivedAt)}</td>
                    <td>{h.minutes == null ? "—" : fmtMinutes(h.minutes)}</td>
                    <td>{fmtSpeed(h.speed)}</td>
                    <td>
                      {h.entry.arrivedAt ? (
                        h.rank == null ? (
                          <span className="pill warn">观察中 · 不计名次</span>
                        ) : (
                          `第 ${h.rank} 名`
                        )
                      ) : (
                        <span className="pill muted">未归</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
