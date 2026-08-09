"use client";

import { BookOpen, Flame, Briefcase, Dumbbell, Utensils, Gamepad2, MoonStar } from "lucide-react";
import { useApi, fmtMin } from "@/lib/client";
import { SectionHead, CardSkeleton } from "@/components/ui";
import { Heatmap, Bars, DotStrip, StatRow } from "@/components/viz";

export default function LedgerPage() {
  const { data, error, loading, refresh } = useApi("/stats?days=98");

  if (loading)
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
  const shortDay = (d) => d.slice(8) + "/" + d.slice(5, 7);

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {/* ── conquest map ── */}
      <section className="card md:col-span-2">
        <SectionHead
          icon={BookOpen}
          title="Last 14 weeks"
          aside={perfect && <span>streak <span className="font-bold text-goldhi">{perfect.current}</span> · best <span className="font-bold text-goldhi">{perfect.best}</span></span>}
        />
        <Heatmap days={data.days} />
      </section>

      {/* ── streak board ── */}
      <section className="card md:col-span-2">
        <SectionHead icon={Flame} title="Streaks" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* ── mission volume ── */}
      <section className="card">
        <SectionHead icon={Briefcase} title="Applications per day" aside={`best day ${data.apps.bestDay} · this week ${data.apps.thisWeek}`} />
        <Bars
          data={data.apps.byDay.map((d) => ({ label: shortDay(d.date), value: d.count }))}
          target={undefined}
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

      {/* ── iron ── */}
      <section className="card">
        <SectionHead icon={Dumbbell} title="Gym sessions per week" />
        <Bars
          data={data.gym.weeks.map((w) => ({ label: w.label, value: w.sessions }))}
          target={7}
          targetLabel="7/7"
          unit=" sessions"
        />
        <p className="mono-data mt-2 text-[10.5px] text-faint">
          {data.gym.weeks.reduce((s, w) => s + w.minutes, 0) > 0
            ? `${fmtMin(data.gym.weeks.reduce((s, w) => s + w.minutes, 0))} under the bar in ${data.gym.weeks.length} weeks`
            : "No sessions on record yet — today is a fine day to start"}
        </p>
      </section>

      {/* ── game leash ── */}
      <section className="card">
        <SectionHead icon={Gamepad2} title="Game time · last 14 days" />
        <Bars
          data={data.game.byDay.map((d) => ({
            label: shortDay(d.date),
            value: d.min,
            over: d.min > data.game.limit,
          }))}
          target={data.game.limit}
          targetLabel={fmtMin(data.game.limit)}
          unit="m"
        />
        <p className="mono-data mt-2 text-[11.5px] text-faint">red bar = over the limit</p>
      </section>

      {/* ── fuel & lights out ── */}
      <section className="card">
        <SectionHead icon={Utensils} title="Clean eating · last 7 days" />
        <DotStrip data={data.clean} onLabel="clean day" offLabel="broke clean eating" noneLabel="not logged" />
        <div className="mt-5">
          <SectionHead icon={MoonStar} title="Sleep · last 14 nights" />
          <DotStrip data={data.sleep} onLabel="down on time" offLabel="late night" noneLabel="not logged" />
        </div>
        <p className="mono-data mt-3 text-[11.5px] text-faint">
          amber square = held the line · red ✕ = slipped · dash = no log
        </p>
      </section>
    </div>
  );
}
