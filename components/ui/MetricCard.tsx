import React, { useEffect, useRef, useState } from "react";

interface MetricCardProps {
  label: string;
  value?: number;
  suffix?: string;
  detail: string;
  trend?: string;
  trendPositive?: boolean;
  alert?: boolean;
  icon?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  suffix,
  detail,
  trend,
  trendPositive,
  alert,
  icon,
}: MetricCardProps) {
  return (
    <article className={`premium-metric-card ${alert ? "alert-state" : ""}`}>
      <div className="metric-header">
        <div className="metric-label-group">
          <span className="metric-eyebrow">{label}</span>
          {icon && <span className="metric-icon-wrap">{icon}</span>}
        </div>
        <span className={`signal-light ${value === undefined ? "idle" : alert ? "alert" : "active"}`} />
      </div>

      <div className="metric-number-row">
        <span className="metric-number mono">
          <AnimatedCounter value={value} />
        </span>
        {value !== undefined && suffix && (
          <span className="metric-suffix">{suffix}</span>
        )}
      </div>

      <div className="metric-footer">
        <span className="metric-detail">{detail}</span>
        {trend && (
          <span className={`metric-trend ${trendPositive ? "trend-up" : "trend-neutral"}`}>
            {trend}
          </span>
        )}
      </div>
    </article>
  );
}

export function AnimatedCounter({ value }: { value?: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (value === undefined || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      previous.current = value;
      return;
    }
    const start = previous.current ?? value;
    const started = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / 380);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previous.current = value;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display === undefined ? "—" : display.toLocaleString()}</>;
}
