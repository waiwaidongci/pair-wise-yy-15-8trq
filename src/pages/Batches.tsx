import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNow } from "../hooks/useNow";
import {
  batchMap,
  defaultExpectedMinutes,
} from "../lib/calc";
import {
  fmtClock,
  fmtCountdown,
  fmtDate,
  fmtDuration,
  fmtSpeed,
  fromDatetimeLocal,
  toDatetimeLocal,
} from "../lib/time";
import type { Weather } from "../types";
import {
  EmptyState,
  HealthBadge,
  Panel,
  SignalBadge,
  StatusPill,
} from "../components/ui";

const WEATHERS: Weather[] = ["晴", "多云", "阴", "小雨", "雾", "逆风", "侧风"];

export default function Batches({
  selectPigeon,
}: {
  selectPigeon: (id: string) => void;
}) {
  const { state, dispatch } = useStore();
  const now = useNow();
  const [openBatchId, setOpenBatchId] = useState<string | null>(
    state.batches[0]?.id ?? null
  );

  const batches = useMemo(
    () => [...state.batches].sort((a, b) => b.releasedAt - a.releasedAt),
    [state.batches]
  );
  // 批次被重置/删除后回退到最新一批
  const activeId =
    openBatchId && batches.some((b) => b.id === openBatchId)
      ? openBatchId
      : batches[0]?.id ?? null;
  const active = activeId ? batchMap(state.batches).get(activeId) ?? null : null;

  const entries = active
    ? state.entries
        .filter((e) => e.batchId === active.id)
        .sort((a, b) => {
          if (a.status !== b.status)
            return a.status === "flying" ? -1 : 1;
          return (a.speed ?? 0) - (b.speed ?? 0);
        })
    : [];
  const pMap = useMemo(
    () => new Map(state.pigeons.map((p) => [p.id, p])),
    [state.pigeons]
  );

  return (
    <div className="page">
      <NewBatchForm />

      <Panel title="批次列表" tag={`${batches.length} 个开笼批次`}>
        {batches.length === 0 ? (
          <EmptyState title="还没有开笼批次" />
        ) : (
          <div className="tabs">
            {batches.map((b) => {
              const es = state.entries.filter((e) => e.batchId === b.id);
              const returned = es.filter((e) => e.status === "returned").length;
              const flying = es.length - returned;
              return (
                <button
                  key={b.id}
                  className={`tab ${activeId === b.id ? "tab-on" : ""}`}
                  onClick={() => setOpenBatchId(b.id)}
                >
                  <strong>{b.route}</strong>
                  <span>
                    {fmtDate(b.releasedAt)} · {b.distance}km
                  </span>
                  <span className={flying ? "tab-badge-warn" : "tab-badge-ok"}>
                    {returned}/{es.length} 归巢
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {active && (
        <Panel
          title={`${active.route} · 逐羽归巢登记`}
          tag={`${active.distance}km · ${active.weather} · 开笼 ${fmtClock(
            active.releasedAt
          )} · 预计 ${fmtDuration(active.expectedMinutes)}`}
        >
          {active.note && <p className="batch-note">{active.note}</p>}
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>足环号</th>
                  <th>血统</th>
                  <th>健康</th>
                  <th>状态</th>
                  <th>定位</th>
                  <th>归巢时刻</th>
                  <th>飞行</th>
                  <th>分速</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const p = pMap.get(e.pigeonId);
                  if (!p) return null;
                  const dueIn = Math.round(
                    (active.releasedAt +
                      active.expectedMinutes * 60000 -
                      now) /
                      60000
                  );
                  return (
                    <tr
                      key={e.id}
                      className={
                        e.status === "flying" &&
                        dueIn < 0 &&
                        !e.hasSignal
                          ? "row-danger"
                          : undefined
                      }
                    >
                      <td>
                        <button
                          className="link-btn ring-link"
                          onClick={() => selectPigeon(p.id)}
                        >
                          {p.ring}
                        </button>
                      </td>
                      <td>{p.bloodline}</td>
                      <td>
                        <HealthBadge health={p.health} />
                      </td>
                      <td>
                        <StatusPill flying={e.status === "flying"} />
                        {e.status === "flying" && (
                          <span
                            className={
                              dueIn < 0
                                ? "countdown countdown-over"
                                : "countdown"
                            }
                          >
                            {fmtCountdown(dueIn)}
                          </span>
                        )}
                      </td>
                      <td>
                        {e.status === "flying" ? (
                          <button
                            className="signal-toggle"
                            onClick={() =>
                              dispatch({ type: "toggle_signal", entryId: e.id })
                            }
                            title="点击切换定位脚环信号"
                          >
                            <SignalBadge hasSignal={e.hasSignal} />
                          </button>
                        ) : (
                          <SignalBadge hasSignal={e.hasSignal} />
                        )}
                      </td>
                      <td>{fmtClock(e.returnedAt)}</td>
                      <td>{fmtDuration(e.flightMinutes)}</td>
                      <td>
                        {e.speed !== null ? (
                          <strong>{fmtSpeed(e.speed)}</strong>
                        ) : (
                          "—"
                        )}
                        {p.health === "observing" &&
                          e.status === "returned" && (
                            <small className="muted">观察中·不计名次</small>
                          )}
                      </td>
                      <td>
                        {e.status === "flying" ? (
                          <ReturnControl
                            defaultTime={toDatetimeLocal(now)}
                            onReturn={(t) =>
                              dispatch({
                                type: "mark_returned",
                                entryId: e.id,
                                returnedAt: t,
                              })
                            }
                          />
                        ) : (
                          <button
                            className="btn-ghost"
                            onClick={() =>
                              dispatch({ type: "undo_return", entryId: e.id })
                            }
                          >
                            撤销归巢
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

function ReturnControl({
  defaultTime,
  onReturn,
}: {
  defaultTime: string;
  onReturn: (ts: number) => void;
}) {
  const [time, setTime] = useState(defaultTime);
  return (
    <div className="return-ctrl">
      <input
        type="datetime-local"
        value={time}
        onChange={(ev) => setTime(ev.target.value)}
      />
      <button
        className="primary small"
        onClick={() => {
          const ts = fromDatetimeLocal(time);
          if (!Number.isNaN(ts)) onReturn(ts);
        }}
      >
        归巢登记
      </button>
    </div>
  );
}

function NewBatchForm() {
  const { state, dispatch } = useStore();
  const [route, setRoute] = useState("");
  const [distance, setDistance] = useState("80");
  const [weather, setWeather] = useState<string>("晴");
  const [releasedAt, setReleasedAt] = useState(() =>
    toDatetimeLocal(Date.now())
  );
  const [expected, setExpected] = useState("");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const distanceNum = Number(distance);

  const expectedValue =
    expected.trim() !== "" && Number(expected) > 0
      ? Number(expected)
      : distanceNum > 0
        ? defaultExpectedMinutes(distanceNum)
        : 0;

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    const ts = fromDatetimeLocal(releasedAt);
    if (!route.trim()) return setError("请填写线路 / 训放地点");
    if (!(distanceNum > 0)) return setError("公里数需大于 0");
    if (Number.isNaN(ts)) return setError("请选择开笼时刻");
    if (!(expectedValue > 0)) return setError("预计归巢时长需大于 0");
    if (picked.size === 0) return setError("请至少勾选一羽参赛鸽");
    dispatch({
      type: "add_batch",
      input: {
        route: route.trim(),
        distance: distanceNum,
        weather,
        releasedAt: ts,
        expectedMinutes: expectedValue,
        note: note.trim() || undefined,
      },
      pigeonIds: Array.from(picked),
    });
    setRoute("");
    setDistance("80");
    setWeather("晴");
    setReleasedAt(toDatetimeLocal(Date.now()));
    setExpected("");
    setNote("");
    setPicked(new Set());
    setError("");
  }

  return (
    <Panel title="新开笼批次" tag="线路 · 公里数 · 天气 · 开笼时刻">
      <div className="field-grid">
        <label>
          <span>线路 / 训放地点</span>
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="例：南线 · 南通站"
          />
        </label>
        <label>
          <span>公里数（km）</span>
          <input
            type="number"
            min="1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </label>
        <label>
          <span>天气</span>
          <select value={weather} onChange={(e) => setWeather(e.target.value)}>
            {WEATHERS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>开笼时刻</span>
          <input
            type="datetime-local"
            value={releasedAt}
            onChange={(e) => setReleasedAt(e.target.value)}
          />
        </label>
        <label>
          <span>预计归巢时长（分钟，留空按 650 米/分估算）</span>
          <input
            type="number"
            min="1"
            value={expected}
            placeholder={`自动估算 ${defaultExpectedMinutes(distanceNum || 80)} 分钟`}
            onChange={(e) => setExpected(e.target.value)}
          />
        </label>
        <label>
          <span>批次备注</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="风向、能见度等（可选）"
          />
        </label>
      </div>

      <div className="pick-head">
        <span>逐羽登记参赛鸽（{picked.size} 羽）</span>
        <div className="pick-actions">
          <button
            type="button"
            onClick={() =>
              setPicked(new Set(state.pigeons.map((p) => p.id)))
            }
          >
            全选
          </button>
          <button type="button" onClick={() => setPicked(new Set())}>
            清空
          </button>
        </div>
      </div>
      {state.pigeons.length === 0 ? (
        <EmptyState
          title="鸽棚还没有档案鸽"
          hint="先到「赛鸽档案」登记足环、血统和健康状态"
        />
      ) : (
        <div className="pick-grid">
          {state.pigeons.map((p) => (
            <label
              key={p.id}
              className={`pick-card ${picked.has(p.id) ? "pick-on" : ""} ${
                p.health === "observing" ? "pick-observing" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={picked.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <div>
                <strong>{p.ring}</strong>
                <span>
                  {p.bloodline}
                  {p.health === "observing" && " · 观察中"}
                </span>
              </div>
            </label>
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <div className="form-foot">
        <button className="primary" onClick={submit}>
          保存批次并开笼
        </button>
      </div>
    </Panel>
  );
}
