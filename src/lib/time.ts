// 时间与数字展示工具

export function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): number {
  return new Date(value).getTime();
}

export function fmtDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function fmtClock(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 128 分钟 → "2小时08分"；74 → "1小时14分"；45 → "45分" */
export function fmtDuration(mins: number | null | undefined): string {
  if (mins === null || mins === undefined) return "—";
  if (mins < 60) return `${mins}分`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}小时${m}分` : `${h}小时`;
}

/** 倒计时式展示：+42分 / -15分（超时） */
export function fmtCountdown(dueInMins: number): string {
  if (dueInMins < 0) return `超时 ${fmtDuration(-dueInMins)}`;
  return `剩余 ${fmtDuration(dueInMins)}`;
}

export function fmtSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined) return "—";
  return `${speed.toLocaleString("zh-CN")} 米/分`;
}
