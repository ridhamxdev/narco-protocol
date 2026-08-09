"use client";

// Chart marks per dataviz method: thin marks, rounded data-ends, 3px surface
// gaps, recessive reference lines, text in text tokens (never series color),
// touch-first readout instead of hover-only tooltips, shape+color for status.

import { useMemo, useState } from "react";
import { cx, fmtDay } from "@/lib/client";

/* ── shared readout line (the "tooltip" — works on touch) ── */
function Readout({ text }) {
  return <div className="mono-data mb-2 min-h-4 text-[12px] font-medium text-ash">{text}</div>;
}

/* ── Daily / weekly bars with optional reference line ── */
export function Bars({
  data, // [{ label, value, over? }]
  target, // reference line value
  targetLabel,
  unit = "",
  height = 110,
  defaultIndex,
}) {
  const [sel, setSel] = useState(defaultIndex ?? data.length - 1);
  const max = Math.max(target || 0, ...data.map((d) => d.value), 1) * 1.12;
  const cur = data[Math.min(sel, data.length - 1)];

  return (
    <div>
      <Readout
        text={
          cur
            ? `${cur.label} — ${cur.value}${unit}${cur.over ? " · OVER LIMIT" : ""}`
            : "No data yet"
        }
      />
      <div className="relative" style={{ height }}>
        {target ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-faint"
            style={{ bottom: `${(target / max) * 100}%` }}
          >
            <span className="mono-data absolute -top-4 right-0 text-[10px] text-faint">
              {targetLabel || target}
            </span>
          </div>
        ) : null}
        <div className="flex h-full items-end gap-[3px]">
          {data.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSel(i)}
              onMouseEnter={() => setSel(i)}
              aria-label={`${d.label}: ${d.value}${unit}${d.over ? ", over limit" : ""}`}
              className="group flex h-full max-w-11 flex-1 items-end rounded-t-[4px]"
            >
              <div
                className={cx(
                  "w-full rounded-t-[4px] transition-colors",
                  d.value === 0
                    ? "bg-linehi"
                    : d.over
                      ? i === sel
                        ? "bg-blood"
                        : "bg-blooddim"
                      : i === sel
                        ? "bg-goldhi"
                        : "bg-gold hover:bg-[#CE9231]"
                )}
                style={{ height: `${Math.max((d.value / max) * 100, 2.5)}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="mono-data text-[10px] text-faint">{data[0]?.label}</span>
        <span className="mono-data text-[10px] text-faint">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ── Conquest heatmap — sequential amber ramp (light→dark = more) ── */
const RAMP = [
  { lt: 1, c: "#EFE6D2" }, // 0% with items — missed
  { lt: 26, c: "#EFD49A" },
  { lt: 51, c: "#E4B45D" },
  { lt: 76, c: "#CE9231" },
  { lt: 100, c: "#A87420" },
  { lt: 101, c: "#7D5A1A" }, // 100 — complete
];
export function rampColor(pct) {
  for (const r of RAMP) if (pct < r.lt) return r.c;
  return RAMP[RAMP.length - 1].c;
}

export function Heatmap({ days }) {
  const [sel, setSel] = useState(null);
  const { cells, weeks } = useMemo(() => {
    if (!days?.length) return { cells: [], weeks: 0 };
    const first = days[0];
    const [y, m, d] = first.date.split("-").map(Number);
    const pad = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
    const cells = [...Array.from({ length: pad }, () => null), ...days];
    return { cells, weeks: Math.ceil(cells.length / 7) };
  }, [days]);

  const selDay = sel != null ? cells[sel] : days?.[days.length - 1];

  return (
    <div>
      <Readout
        text={
          selDay
            ? `${fmtDay(selDay.date)} — ${selDay.total === 0 ? "nothing scheduled" : `${selDay.pct}% closed`}`
            : "The ledger starts today"
        }
      />
      <div className="flex gap-2">
        <div
          className="mono-data grid shrink-0 text-[9px] text-faint"
          style={{ gridTemplateRows: "repeat(7,14px)", rowGap: "3px" }}
          aria-hidden
        >
          <span>M</span>
          <span />
          <span>W</span>
          <span />
          <span>F</span>
          <span />
          <span>S</span>
        </div>
        <div className="overflow-x-auto pb-1" dir="rtl">
          <div
            dir="ltr"
            className="grid grid-flow-col"
            style={{
              gridTemplateRows: "repeat(7,14px)",
              gridAutoColumns: "14px",
              gap: "3px",
            }}
          >
            {cells.map((c, i) =>
              c === null ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSel(i)}
                  onMouseEnter={() => setSel(i)}
                  aria-label={`${fmtDay(c.date)}: ${c.total === 0 ? "nothing scheduled" : c.pct + "% closed"}`}
                  className={cx(
                    "rounded-[3px] border transition-transform hover:scale-110",
                    sel === i ? "border-cream" : "border-black/[0.07]",
                    c.total === 0 && "border-line"
                  )}
                  style={{
                    backgroundColor: c.total === 0 ? "var(--color-well)" : rampColor(c.pct),
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5" aria-hidden>
        <span className="mono-data text-[9.5px] text-faint">0%</span>
        {RAMP.map((r) => (
          <span key={r.c} className="size-2.5 rounded-[2px]" style={{ background: r.c }} />
        ))}
        <span className="mono-data text-[9.5px] text-faint">100%</span>
      </div>
    </div>
  );
}

/* ── Status dot strip — shape + color, never color alone ── */
export function DotStrip({ data, onLabel = "on time", offLabel = "late", noneLabel = "not logged" }) {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {data.map((d, i) => {
        const label = `${fmtDay(d.date)}: ${d.state === 1 ? onLabel : d.state === 0 ? offLabel : noneLabel}`;
        return (
          <span key={i} title={label} aria-label={label} role="img" className="grid size-[18px] place-items-center">
            {d.state === 1 ? (
              <span className="size-[13px] rounded-[3px] bg-gold" />
            ) : d.state === 0 ? (
              <svg viewBox="0 0 14 14" className="size-[13px]" aria-hidden>
                <rect x="1" y="1" width="12" height="12" rx="3" fill="none" stroke="#B3362A" strokeWidth="1.6" />
                <path d="M4.5 4.5 9.5 9.5 M9.5 4.5 4.5 9.5" stroke="#B3362A" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <span className="h-[2.5px] w-[9px] rounded-full bg-linehi" />
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ── Trend line (single series, touch readout, optional reference) ── */
export function LineArea({
  data, // [{ label, value }]
  target,
  targetLabel,
  unit = "",
  height = 130,
  maxOverride,
}) {
  const [sel, setSel] = useState(data.length - 1);
  const n = data.length;
  if (n === 0) return <Readout text="No data yet" />;
  const max = maxOverride ?? Math.max(target || 0, ...data.map((d) => d.value), 1) * 1.1;
  const W = 100;
  const H = 100;
  const x = (i) => (n === 1 ? 50 : (i / (n - 1)) * W);
  const y = (v) => H - (v / max) * H;
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const cur = data[Math.min(sel, n - 1)];

  function pick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setSel(Math.round(frac * (n - 1)));
  }

  return (
    <div>
      <Readout text={cur ? `${cur.label} — ${cur.value}${unit}` : ""} />
      <div
        className="relative touch-pan-y"
        style={{ height }}
        onPointerMove={pick}
        onPointerDown={pick}
        role="img"
        aria-label={`Trend chart, latest ${data[n - 1].value}${unit}`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {target ? (
            <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--color-faint)" strokeWidth="0.7" strokeDasharray="2.5 2.5" vectorEffect="non-scaling-stroke" />
          ) : null}
          <polygon points={`0,${H} ${pts} ${W},${H}`} fill="rgb(217 164 65 / 0.14)" />
          <polyline points={pts} fill="none" stroke="#C98E2E" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <span
          className="pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-goldhi"
          style={{ left: `${x(Math.min(sel, n - 1))}%`, top: `${(y(cur.value) / H) * 100}%` }}
          aria-hidden
        />
        {target ? (
          <span className="mono-data absolute right-0 text-[10px] text-faint" style={{ top: `calc(${(y(target) / H) * 100}% - 14px)` }}>
            {targetLabel || target}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="mono-data text-[10px] text-faint">{data[0]?.label}</span>
        <span className="mono-data text-[10px] text-faint">{data[n - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ── Count tiles (funnel etc.) — numbers wear text tokens ── */
export function StatRow({ stats }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-line bg-well px-3 py-2.5">
          <div className="display-num text-[22px] text-cream">{s.value}</div>
          <div className="mt-0.5 text-[11px] font-medium text-ash">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
