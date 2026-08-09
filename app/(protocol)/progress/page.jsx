"use client";

import { useMemo, useState } from "react";
import {
  BookOpen, Flame, Briefcase, Dumbbell, Utensils, Gamepad2, MoonStar, TrendingUp, Download, Table2, Cigarette,
} from "lucide-react";
import { useApi, cx, fmtMin, fmtDay } from "@/lib/client";
import { SectionHead, CardSkeleton } from "@/components/ui";
import { Heatmap, Bars, LineArea, DotStrip, StatRow } from "@/components/viz";

const RANGES = [30, 90, 180];
const shortDay = (d) => d.slice(8) + "/" + d.slice(5, 7);

function weeklySum(days, pick) {
  const buckets = new Map();
  for (const d of days) {
    const [y, m, dd] = d.date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dd));
    const monday = new Date(dt.getTime() - ((dt.getUTCDay() + 6) % 7) * 86400000);
    const key = monday.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + pick(d));
  }
  return [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ label: shortDay(k), value: v }));
}

export default function ProgressPage() {
  const [range, setRange] = useState(90);
  const { data, error, loading, refresh } = useApi(`/stats?days=${range}`);
  const [metric, setMetric] = useState("kcal");

  const days = data?.days || [];
  const daily = days.length <= 35;

  const nutritionSeries = useMemo(
    () => days.map((d) => ({ label: shortDay(d.date), value: d[metric] || 0 })),
    [days, metric]
  );

  if (loading && !data)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><CardSkeleton lines={4} /></div>
        <CardSkeleton lines={3} /><CardSkeleton lines={3} />
      </div>
    );
  if (error)
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="mono-data text-[13px] text-blood">{error}</p>
        <button className="btn btn-line mt-4" onClick={() => refresh(false)}>Try again</button>
      </div>
    );
  if (!data) return null;

  const perfect = data.streaks.find((s) => s.key === "perfect");
  const sleepDays = days.filter((d) => d.sleep !== -1);
  const onTimePct = sleepDays.length ? Math.round((100 * sleepDays.filter((d) => d.sleep === 1).length) / sleepDays.length) : null;
  const cleanDays = days.filter((d) => d.clean !== -1);
  const cleanPct = cleanDays.length ? Math.round((100 * cleanDays.filter((d) => d.clean === 1).length) / cleanDays.length) : null;

  const smoking = data.smoking;
  const trackSmoking = smoking?.track;

  function downloadCsv() {
    const cols = ["date", "pct", "done", "total", "apps", "gymType", "gymMin", "gameMin", "sleepTime", "sleep", "clean", "meals", "kcal", "protein", "carbs", "fat", "tasksDone", "tasksTotal"];
    if (trackSmoking) cols.push("cigs");
    const rows = [cols.join(","), ...days.map((d) => cols.map((c) => `"${String(d[c] ?? "")}"`).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `narco-protocol-${days[0]?.date}-to-${days.at(-1)?.date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {/* range selector */}
      <div className="flex items-center gap-1.5 md:col-span-2">
        {RANGES.map((r) => (
          <button key={r} type="button" className="chip" data-on={range === r} onClick={() => setRange(r)}>
            {r} days
          </button>
        ))}
        <button className="chip ml-auto" onClick={downloadCsv}>
          <Download className="size-3.5" aria-hidden /> CSV
        </button>
      </div>

      {/* score trend */}
      <section className="card md:col-span-2">
        <SectionHead
          icon={TrendingUp}
          title="Day score trend"
          aside={perfect && <span>streak <span className="font-bold text-goldhi">{perfect.current}</span> · best <span className="font-bold text-goldhi">{perfect.best}</span></span>}
        />
        <LineArea
          data={days.map((d) => ({ label: shortDay(d.date), value: d.pct }))}
          maxOverride={110}
          target={100}
          targetLabel="100%"
          unit="%"
        />
      </section>

      {/* conquest map */}
      <section className="card md:col-span-2">
        <SectionHead icon={BookOpen} title={`Conquest map · last ${Math.ceil(days.length / 7)} weeks`} />
        <Heatmap days={days} />
      </section>

      {/* applications */}
      <section className="card">
        <SectionHead icon={Briefcase} title={daily ? "Applications per day" : "Applications per week"} aside={`best day ${data.apps.bestDay} · this week ${data.apps.thisWeek}`} />
        <Bars
          data={daily ? days.map((d) => ({ label: shortDay(d.date), value: d.apps })) : weeklySum(days, (d) => d.apps)}
          unit=" apps"
        />
        <div className="mt-4">
          <StatRow
            stats={[
              { label: "Applied", value: data.apps.total },
              { label: "Replied", value: data.apps.byStatus.replied || 0 },
              { label: "Interview", value: data.apps.byStatus.interview || 0 },
              { label: "Offer", value: data.apps.byStatus.offer || 0 },
              { label: "Rejected", value: data.apps.byStatus.rejected || 0 },
            ]}
          />
        </div>
      </section>

      {/* nutrition */}
      <section className="card">
        <SectionHead icon={Utensils} title="Nutrition" aside={cleanPct != null ? `${cleanPct}% clean days` : null} />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[["kcal", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"]].map(([k, label]) => (
            <button key={k} type="button" className="chip" data-on={metric === k} onClick={() => setMetric(k)}>
              {label}
            </button>
          ))}
        </div>
        <LineArea data={nutritionSeries} unit={metric === "kcal" ? " kcal" : " g"} />
      </section>

      {/* gym */}
      <section className="card">
        <SectionHead icon={Dumbbell} title="Gym sessions per week" aside={`${fmtMin(days.reduce((s, d) => s + d.gymMin, 0))} total`} />
        <Bars data={data.gym.weeks.map((w) => ({ label: w.label, value: w.sessions }))} target={7} targetLabel="7/7" unit=" sessions" />
      </section>

      {/* game */}
      <section className="card">
        <SectionHead icon={Gamepad2} title={daily ? "Game time per day" : "Game time per week"} />
        <Bars
          data={
            daily
              ? days.map((d) => ({ label: shortDay(d.date), value: d.gameMin, over: d.gameMin > data.game.limit }))
              : weeklySum(days, (d) => d.gameMin).map((w) => ({ ...w, over: w.value > data.game.limit * 7 }))
          }
          target={daily ? data.game.limit : data.game.limit * 7}
          targetLabel={fmtMin(daily ? data.game.limit : data.game.limit * 7)}
          unit="m"
        />
        <p className="mono-data mt-2 text-[11.5px] text-faint">red bar = over the limit</p>
      </section>

      {/* quit smoking */}
      {trackSmoking && (
        <section className="card">
          <SectionHead
            icon={Cigarette}
            title="Cigarettes per day"
            aside={<span>{smoking.smokeFreeDays} smoke-free · streak <span className="font-bold text-goldhi">{smoking.cleanStreak}</span></span>}
          />
          <LineArea data={days.map((d) => ({ label: shortDay(d.date), value: d.cigs || 0 }))} unit=" cigs" />
          <div className="mt-4">
            <StatRow
              stats={[
                { label: "This week", value: smoking.thisWeek },
                { label: "Avg / smoking day", value: smoking.perDay },
                { label: "Worst day", value: smoking.worstDay },
                { label: "Smoke-free", value: smoking.smokeFreeDays },
                { label: "Total", value: smoking.total },
              ]}
            />
          </div>
          <p className="mono-data mt-3 text-[11.5px] text-faint">the line trending down is the whole game</p>
        </section>
      )}

      {/* sleep + clean */}
      <section className="card">
        <SectionHead icon={MoonStar} title="Sleep · on time" aside={onTimePct != null ? `${onTimePct}% on time` : null} />
        <DotStrip data={days.slice(-28).map((d) => ({ date: d.date, state: d.sleep }))} onLabel="down on time" offLabel="late night" noneLabel="not logged" />
        <div className="mt-5">
          <SectionHead icon={Utensils} title="Clean eating" aside={cleanPct != null ? `${cleanPct}%` : null} />
          <DotStrip data={days.slice(-28).map((d) => ({ date: d.date, state: d.clean }))} onLabel="clean day" offLabel="broke clean eating" noneLabel="not logged" />
        </div>
        <p className="mono-data mt-3 text-[11.5px] text-faint">amber square = held the line · red ✕ = slipped · dash = no log</p>
      </section>

      {/* streaks */}
      <section className="card">
        <SectionHead icon={Flame} title="Streaks" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.streaks.map((s) => (
            <div key={s.key} className="rounded-xl border border-line bg-well px-3 py-2.5">
              <p className="truncate text-[11.5px] font-medium text-ash">{s.name}</p>
              <p className="display-num mt-1 text-[24px] text-cream">
                {s.current}
                <span className="text-[0.55em] font-semibold text-faint"> now</span>
              </p>
              <p className="mono-data text-[11px] text-faint">best {s.best}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the full track */}
      <section className="card md:col-span-2">
        <SectionHead icon={Table2} title="The full track" aside={`${days.length} days`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] text-ash">
                {["Date", "Score", "Apps", "Gym", "Game", "Sleep", "Clean", "Kcal", "Protein", "Carbs", "Fat", "Targets", ...(trackSmoking ? ["Cigs"] : [])].map((h) => (
                  <th key={h} className="border-b border-line py-2 pr-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="mono-data">
              {[...days].reverse().map((d) => (
                <tr key={d.date} className="text-cream">
                  <td className="border-b border-line/60 py-1.5 pr-3 whitespace-nowrap">{fmtDay(d.date)}</td>
                  <td className={cx("border-b border-line/60 py-1.5 pr-3 font-semibold", d.pct === 100 && d.total > 0 && "text-goldhi")}>
                    {d.total ? d.pct + "%" : "—"}
                  </td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.apps}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3 capitalize">{d.gymMin ? `${d.gymType} ${fmtMin(d.gymMin)}` : "—"}</td>
                  <td className={cx("border-b border-line/60 py-1.5 pr-3", d.gameMin > data.game.limit && "font-semibold text-blood")}>
                    {d.gameMin ? fmtMin(d.gameMin) : "—"}
                  </td>
                  <td className={cx("border-b border-line/60 py-1.5 pr-3", d.sleep === 0 && "text-blood")}>{d.sleepTime || "—"}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.clean === 1 ? "✓" : d.clean === 0 ? "✗" : "—"}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.kcal || "—"}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.protein ? d.protein + "g" : "—"}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.carbs ? d.carbs + "g" : "—"}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.fat ? d.fat + "g" : "—"}</td>
                  <td className="border-b border-line/60 py-1.5 pr-3">{d.tasksTotal ? `${d.tasksDone}/${d.tasksTotal}` : "—"}</td>
                  {trackSmoking && (
                    <td className={cx("border-b border-line/60 py-1.5", d.cigs > 0 && "font-semibold text-blood", d.cigs === 0 && "text-goldhi")}>
                      {d.cigs == null ? "—" : d.cigs}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
