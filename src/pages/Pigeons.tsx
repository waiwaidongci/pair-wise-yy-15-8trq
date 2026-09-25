import { useMemo, useState } from "react";
import { useStore, type PigeonInput } from "../store/store";
import { mateOf, pigeonHistory } from "../lib/calc";
import { fmtClock, fmtDate, fmtDuration, fmtSpeed } from "../lib/time";
import type { HealthStatus, Pigeon } from "../types";
import {
  EmptyState,
  HealthBadge,
  Panel,
  SignalBadge,
  StatusPill,
} from "../components/ui";

const EMPTY_FORM: PigeonInput = {
  ring: "",
  bloodline: "",
  health: "normal",
  mateId: null,
  note: "",
};

export default function Pigeons({
  selectedId,
  selectPigeon,
}: {
  selectedId: string | null;
  selectPigeon: (id: string | null) => void;
}) {
  const { state } = useStore();
  const selected = selectedId
    ? state.pigeons.find((p) => p.id === selectedId) ?? null
    : null;

  if (selected) {
    return <PigeonDetail pigeon={selected} onBack={() => selectPigeon(null)} />;
  }

  return (
    <div className="page">
      <NewPigeonForm />
      <PigeonList onOpen={selectPigeon} />
    </div>
  );
}

function PigeonList({ onOpen }: { onOpen: (id: string) => void }) {
  const { state } = useStore();

  const rows = useMemo(() => {
    const list =
      state.bloodlineFilter === "all"
        ? state.pigeons
        : state.pigeons.filter(
            (p) => p.bloodline === state.bloodlineFilter
          );
    return list.map((p) => {
      const history = pigeonHistory(state, p.id);
      const returned = history.filter(
        (h) => h.entry.status === "returned"
      );
      const avg =
        returned.length &&
        returned.every((h) => h.entry.speed !== null)
          ? Math.round(
              returned.reduce(
                (acc, h) => acc + (h.entry.speed as number),
                0
              ) / returned.length
            )
          : null;
      return {
        pigeon: p,
        mate: mateOf(p, state.pigeons),
        total: history.length,
        returned: returned.length,
        avg,
      };
    });
  }, [state]);

  return (
    <Panel
      title="赛鸽档案"
      tag={`${rows.length} 羽 · 点击足环查看单羽档案`}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="当前血统筛选下没有赛鸽"
          hint="在左侧切换血统，或登记一羽新赛鸽"
        />
      ) : (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>足环号</th>
                <th>血统</th>
                <th>健康</th>
                <th>配偶</th>
                <th>训放</th>
                <th>平均分速</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ pigeon, mate, total, returned, avg }) => (
                <tr key={pigeon.id}>
                  <td>
                    <button
                      className="link-btn ring-link"
                      onClick={() => onOpen(pigeon.id)}
                    >
                      {pigeon.ring}
                    </button>
                  </td>
                  <td>{pigeon.bloodline}</td>
                  <td>
                    <HealthBadge health={pigeon.health} />
                  </td>
                  <td>{mate ? mate.ring : "未配对"}</td>
                  <td>
                    {returned}/{total} 归巢
                  </td>
                  <td>{avg === null ? "—" : fmtSpeed(avg)}</td>
                  <td>
                    <button className="btn-ghost" onClick={() => onOpen(pigeon.id)}>
                      档案
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function NewPigeonForm() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState<PigeonInput>(EMPTY_FORM);
  const [error, setError] = useState("");

  function set<K extends keyof PigeonInput>(key: K, value: PigeonInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.ring.trim()) return setError("请填写足环号");
    if (!form.bloodline.trim()) return setError("请填写血统");
    if (
      state.pigeons.some(
        (p) => p.ring.trim() === form.ring.trim()
      )
    )
      return setError("该足环号已存在，请勿重复登记");
    dispatch({
      type: "add_pigeon",
      input: {
        ...form,
        ring: form.ring.trim(),
        bloodline: form.bloodline.trim(),
        note: form.note?.trim() || undefined,
      },
    });
    setForm(EMPTY_FORM);
    setError("");
  }

  return (
    <Panel title="登记新赛鸽" tag="足环 · 血统 · 健康 · 配偶">
      <div className="field-grid">
        <label>
          <span>足环号</span>
          <input
            value={form.ring}
            onChange={(e) => set("ring", e.target.value)}
            placeholder="例：CHN-25-000123"
          />
        </label>
        <label>
          <span>血统</span>
          <input
            value={form.bloodline}
            onChange={(e) => set("bloodline", e.target.value)}
            placeholder="例：詹森系"
            list="bloodline-options"
          />
          <datalist id="bloodline-options">
            {Array.from(new Set(state.pigeons.map((p) => p.bloodline))).map(
              (b) => (
                <option key={b} value={b} />
              )
            )}
          </datalist>
        </label>
        <label>
          <span>健康状态</span>
          <select
            value={form.health}
            onChange={(e) => set("health", e.target.value as HealthStatus)}
          >
            <option value="normal">健康正常</option>
            <option value="observing">健康观察中（不计名次）</option>
          </select>
        </label>
        <label>
          <span>配偶</span>
          <select
            value={form.mateId ?? ""}
            onChange={(e) => set("mateId", e.target.value || null)}
          >
            <option value="">未配对</option>
            {state.pigeons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ring}（{p.bloodline}）
              </option>
            ))}
          </select>
        </label>
        <label className="field-wide">
          <span>备注</span>
          <input
            value={form.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
            placeholder="体型、性格、用药观察等（可选）"
          />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-foot">
        <button className="primary" onClick={submit}>
          保存赛鸽档案
        </button>
      </div>
    </Panel>
  );
}

function PigeonDetail({
  pigeon,
  onBack,
}: {
  pigeon: Pigeon;
  onBack: () => void;
}) {
  const { state, dispatch } = useStore();
  const history = useMemo(
    () => pigeonHistory(state, pigeon.id),
    [state, pigeon.id]
  );
  const mate = mateOf(pigeon, state.pigeons);
  const [editing, setEditing] = useState(false);

  const returned = history.filter((h) => h.entry.status === "returned");
  const avg = returned.length
    ? Math.round(
        returned.reduce((acc, h) => acc + (h.entry.speed ?? 0), 0) /
          returned.length
      )
    : null;

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>
        ← 返回赛鸽档案
      </button>

      <Panel
        title={pigeon.ring}
        tag={`入档 ${fmtDate(pigeon.createdAt)}`}
        action={
          <div className="head-actions">
            <HealthBadge health={pigeon.health} />
            <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? "收起编辑" : "编辑档案"}
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    `删除 ${pigeon.ring}？其全部训放记录将一并移除，且不可恢复。`
                  )
                ) {
                  dispatch({ type: "delete_pigeon", id: pigeon.id });
                  onBack();
                }
              }}
            >
              删除
            </button>
          </div>
        }
      >
        {editing && <EditPigeonForm pigeon={pigeon} onDone={() => setEditing(false)} />}

        <div className="detail-grid">
          <div className="detail-item">
            <span>血统</span>
            <strong>{pigeon.bloodline}</strong>
          </div>
          <div className="detail-item">
            <span>当前配偶</span>
            <strong>{mate ? mate.ring : "未配对"}</strong>
            {mate && <small>{mate.bloodline}</small>}
          </div>
          <div className="detail-item">
            <span>累计开笼</span>
            <strong>{history.length} 次</strong>
            <small>{returned.length} 次归巢</small>
          </div>
          <div className="detail-item">
            <span>历史平均分速</span>
            <strong>{avg ? `${avg.toLocaleString("zh-CN")} 米/分` : "—"}</strong>
            {pigeon.health === "observing" && (
              <small className="muted">观察期成绩不进排行</small>
            )}
          </div>
        </div>
        {pigeon.note && <p className="detail-note">{pigeon.note}</p>}
      </Panel>

      <Panel title="历次开笼记录" tag={`${history.length} 次训放`}>
        {history.length === 0 ? (
          <EmptyState title="这羽赛鸽还没有参加过训放" />
        ) : (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>线路</th>
                  <th>里程</th>
                  <th>天气</th>
                  <th>开笼</th>
                  <th>状态 / 信号</th>
                  <th>归巢</th>
                  <th>飞行</th>
                  <th>分速</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ entry, batch }) => (
                  <tr key={entry.id}>
                    <td>{fmtDate(batch.releasedAt)}</td>
                    <td>{batch.route}</td>
                    <td>{batch.distance}km</td>
                    <td>{batch.weather}</td>
                    <td>{fmtClock(batch.releasedAt)}</td>
                    <td>
                      <StatusPill flying={entry.status === "flying"} />
                      <SignalBadge hasSignal={entry.hasSignal} />
                    </td>
                    <td>{fmtClock(entry.returnedAt)}</td>
                    <td>{fmtDuration(entry.flightMinutes)}</td>
                    <td>
                      {entry.speed !== null ? (
                        fmtSpeed(entry.speed)
                      ) : (
                        "—"
                      )}
                      {pigeon.health === "observing" &&
                        entry.status === "returned" && (
                          <small className="muted">不计名次</small>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function EditPigeonForm({
  pigeon,
  onDone,
}: {
  pigeon: Pigeon;
  onDone: () => void;
}) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState<PigeonInput>({
    ring: pigeon.ring,
    bloodline: pigeon.bloodline,
    health: pigeon.health,
    mateId: pigeon.mateId,
    note: pigeon.note ?? "",
  });
  const [error, setError] = useState("");

  function submit() {
    if (!form.ring.trim()) return setError("足环号不能为空");
    if (!form.bloodline.trim()) return setError("血统不能为空");
    if (
      state.pigeons.some(
        (p) => p.id !== pigeon.id && p.ring.trim() === form.ring.trim()
      )
    )
      return setError("该足环号已被其他赛鸽占用");
    dispatch({
      type: "update_pigeon",
      id: pigeon.id,
      input: { ...form, note: form.note?.trim() || undefined },
    });
    setError("");
    onDone();
  }

  return (
    <div className="edit-box">
      <div className="field-grid">
        <label>
          <span>足环号</span>
          <input
            value={form.ring}
            onChange={(e) => setForm((f) => ({ ...f, ring: e.target.value }))}
          />
        </label>
        <label>
          <span>血统</span>
          <input
            value={form.bloodline}
            onChange={(e) =>
              setForm((f) => ({ ...f, bloodline: e.target.value }))
            }
          />
        </label>
        <label>
          <span>健康状态</span>
          <select
            value={form.health}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                health: e.target.value as HealthStatus,
              }))
            }
          >
            <option value="normal">健康正常</option>
            <option value="observing">健康观察中（不计名次）</option>
          </select>
        </label>
        <label>
          <span>配偶（双向绑定）</span>
          <select
            value={form.mateId ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, mateId: e.target.value || null }))
            }
          >
            <option value="">未配对</option>
            {state.pigeons
              .filter((p) => p.id !== pigeon.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ring}（{p.bloodline}）
                </option>
              ))}
          </select>
        </label>
        <label className="field-wide">
          <span>备注</span>
          <input
            value={form.note ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-foot">
        <button className="primary" onClick={submit}>
          保存修改
        </button>
        <button onClick={onDone}>取消</button>
      </div>
    </div>
  );
}
