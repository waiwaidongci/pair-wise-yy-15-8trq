import { useEffect, useState } from "react";

/** 每 30 秒刷新一次当前时刻，驱动超时倒计时与待联系排序 */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
