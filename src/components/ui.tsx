import type { ReactNode } from "react";
import type { HealthStatus } from "../types";

export function HealthBadge({ health }: { health: HealthStatus }) {
  return health === "observing" ? (
    <span className="pill pill-warn">健康观察</span>
  ) : (
    <span className="pill pill-ok">健康正常</span>
  );
}

export function SignalBadge({ hasSignal }: { hasSignal: boolean }) {
  return hasSignal ? (
    <span className="pill pill-info">定位正常</span>
  ) : (
    <span className="pill pill-danger">无定位信号</span>
  );
}

export function StatusPill({
  flying,
}: {
  flying: boolean;
}) {
  return flying ? (
    <span className="pill pill-info">在飞</span>
  ) : (
    <span className="pill pill-ok">已归巢</span>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "primary" | "warn" | "danger";
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span className="metric-sub">{sub}</span>}
    </article>
  );
}

export function Panel({
  title,
  tag,
  action,
  children,
}: {
  title: string;
  tag?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          {tag && <p className="tag">{tag}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
