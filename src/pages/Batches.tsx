import { useState } from "react";
import type { Ops } from "../App";
import { dueAt, flightMinutes, speedMpm } from "../lib/calc";
import { fmtDateTime, fmtMinutes, fmtSpeed, fromInputValue, toInputValue } from "../lib/format";
import type { Batch, LoftState } from "../lib/types";

const WEATHERS = ["晴", "多云", "阴", "侧风", "雾", "小雨", "雷阵雨"];

interface Props {
  state: LoftState;
  now: number;
  ops: Ops;
}

export default function BatchesPage({ state, now, ops }: Props) {
  const batches = [...state.batches].sort(
    (a, b) => +new Date(b.releaseAt) - +new Date(a.releaseAt)
  );
  const [selectedId, setSelectedId] = useState<string | null>(batches[0]?.id ?? null);
  const selected = batches.find((b) => b.id === selectedId) ?? batches[0] ?? null;

  // 新建批次表单
  const [route, setRoute] = useState("");
  const [distance, setDistance] = useState("");
  const [weather, setWeather] = useState(WEATHERS[0]);
  const [releaseAt, setReleaseAt] = useState(toInputValue(new Date().toISOString()));
  const [expected, setExpected] = useState("1200");
  const [error, setError] = useState("");

  const submit = () => {
    const km = Number(distance);
    const exp = Number(expected);
    const iso = fromInputValue(releaseAt);
    if (!route.trim()) return setError("请填写线路 / 司放地");
    if (!km || km <= 0) return setError("公里数需大于 0");
    if (!iso) return setError("请填写开笼时刻");
    if (!exp || exp <= 0) return setError("预计分速需大于 0");
    const id = ops.addBatch({
      route: route.trim(),
      distanceKm: km,
      weather,
      releaseAt: iso,
      expectedSpeed: exp,
    });
    setError("");
    setRoute("");
    setDistance("");
    setSelectedId(id);
  };

  return (
    <div className="split">
      <div className="stack">
        <section className="panel">
          <div className="heading">
            <div>
              <p>开笼登记</p>
              <h2>新建批次</h2>
            </div>
          </div>
          <div className="form-grid one">
            <label className="field">
              <span>线路 / 司放地</span>
              <input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="如：邢台服务区" />
            </label>
            <label className="field">
              <span>公里数</span>
              <input type="number" min="1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="如：120" />
            </label>
            <label className="field">
              <span>天气</span>
              <select value={weather} onChange={(e) => setWeather(e.target.value)}>
                {WEATHERS.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>开笼时刻</span>
              <input type="datetime-local" value={releaseAt} onChange={(e) => setReleaseAt(e.target.value)} />
            </label>
            <label className="field">
              <span>预计分速（米/分，推算应归时刻）</span>
              <input type="number" min="1" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" onClick={submit}>
              保存批次
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>批次列表</p>
              <h2>共 {batches.length} 批</h2>
            </div>
          </div>
          {batches.length === 0 ? (
            <div className="empty">暂无批次</div>
          ) : (
            <div className="list">
              {batches.map((b) => (
                <button
                  key={b.id}
                  className={`item ${selected?.id === b.id ? "active" : ""}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <b>
                    {b.route} · {b.distanceKm}km
                  </b>
                  <span>
                    {fmtDateTime(b.releaseAt)} 开笼 · {b.weather}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <BatchDetail batch={selected} state={state} now={now} ops={ops} />
      ) : (
        <section className="panel">
          <div className="empty">先新建一个训放批次</div>
        </section>
      )}
    </div>
  );
}

function BatchDetail({
  batch,
  state,
  now,
  ops,
}: {
  batch: Batch;
  state: LoftState;
  now: number;
  ops: Ops;
}) {
  const entries = state.entries.filter((e) => e.batchId === batch.id);
  const [pick, setPick] = useState("");
  const available = state.pigeons.filter((p) => !entries.some((e) => e.pigeonId === p.id));
  const due = dueAt(batch);

  const addEntry = () => {
    if (!pick) return;
    ops.addEntry(batch.id, pick);
    setPick("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>批次详情</p>
          <h2>
            {batch.route} · {batch.distanceKm}km · {batch.weather}
          </h2>
        </div>
      </div>
      <p className="hint">
        开笼 {fmtDateTime(batch.releaseAt)} · 预计分速 {batch.expectedSpeed} 米/分 · 应归{" "}
        {fmtDateTime(new Date(due).toISOString())} · 已归{" "}
        {entries.filter((e) => e.arrivedAt).length}/{entries.length} 羽
      </p>

      <div className="inline-form">
        <select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">选择上笼赛鸽…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ring} · {p.bloodline}
            </option>
          ))}
        </select>
        <button className="primary" onClick={addEntry} disabled={!pick}>
          上笼登记
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="empty">本批还没有上笼赛鸽</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>足环</th>
                <th>血统</th>
                <th>健康</th>
                <th>归巢时刻</th>
                <th>定位信号</th>
                <th>飞行分钟</th>
                <th>分速（米/分）</th>
                <th>状态</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const p = state.pigeons.find((x) => x.id === e.pigeonId);
                if (!p) return null;
                const minutes = flightMinutes(batch, e);
                const speed = speedMpm(batch, e);
                const overdue = !e.arrivedAt && now > due;
                return (
                  <tr key={e.id}>
                    <td>{p.ring}</td>
                    <td>{p.bloodline}</td>
                    <td>
                      <span className={`pill ${p.health === "健康" ? "ok" : p.health === "观察中" ? "warn" : "muted"}`}>
                        {p.health}
                      </span>
                    </td>
                    <td>
                      <div className="arrival-cell">
                        <input
                          type="datetime-local"
                          value={toInputValue(e.arrivedAt)}
                          onChange={(ev) => ops.setArrival(e.id, fromInputValue(ev.target.value))}
                        />
                        {e.arrivedAt ? (
                          <button className="small ghost" onClick={() => ops.setArrival(e.id, null)}>
                            改未归
                          </button>
                        ) : (
                          <button
                            className="small"
                            onClick={() => ops.setArrival(e.id, new Date().toISOString())}
                          >
                            此刻归巢
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={e.signal}
                          onChange={(ev) => ops.setSignal(e.id, ev.target.checked)}
                        />
                        {e.signal ? "有" : "无"}
                      </label>
                    </td>
                    <td>{minutes == null ? "—" : fmtMinutes(minutes)}</td>
                    <td>{e.arrivedAt && speed == null ? "时刻有误" : fmtSpeed(speed)}</td>
                    <td>
                      {e.arrivedAt ? (
                        <span className="pill ok">已归巢</span>
                      ) : overdue ? (
                        <span className="pill danger">超时未归</span>
                      ) : (
                        <span className="pill muted">待归巢</span>
                      )}
                    </td>
                    <td>
                      <button className="small ghost" onClick={() => ops.removeEntry(e.id)}>
                        移除
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
  );
}
