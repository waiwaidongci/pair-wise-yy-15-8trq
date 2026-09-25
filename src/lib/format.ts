const pad = (n: number) => String(n).padStart(2, "0");

/** ISO -> "9月25日 06:30" */
export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 分速显示："1,180" */
export function fmtSpeed(v: number | null): string {
  return v == null ? "—" : Math.round(v).toLocaleString("zh-CN");
}

/** 分钟 -> "1小时23分" / "45分" */
export function fmtMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} 小时` : `${h} 小时 ${rest} 分`;
}

/** ISO -> datetime-local 输入框值（本地时区） */
export function toInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 输入框值 -> ISO；空或非法返回 null */
export function fromInputValue(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
