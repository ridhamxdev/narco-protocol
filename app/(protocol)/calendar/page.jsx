"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Briefcase, ListChecks, Utensils,
  Dumbbell, Gamepad2, MoonStar, Heart, Phone, Cigarette, CircleCheck, Circle, Lock,
} from "lucide-react";
import { api, useApi, cx, fmtMin, fmtDay } from "@/lib/client";
import { SectionHead, VaultRow, CardSkeleton } from "@/components/ui";
import { rampColor, StatRow } from "@/components/viz";
import {
  ChecklistEditor, AppsQuickAdd, MealEditor, GymEditor, GameEditor, SleepEditor,
  PeopleEditor, TargetsEditor, SmokingEditor, TimeRangeTag,
} from "@/components/editors";

const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", snacks: "Snacks", dinner: "Dinner" };

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MEALS = ["breakfast", "lunch", "snacks", "dinner"];

function monthDates(ym) {
  const [y, m] = ym.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const dowMon0 = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};

export default function CalendarPage() {
  const stats = useApi("/stats?days=180");
  const [ym, setYm] = useState(null);
  const [selected, setSelected] = useState(null);

  const { byDate, today } = useMemo(() => {
    const map = {};
    for (const d of stats.data?.days || []) map[d.date] = d;
    return { byDate: map, today: stats.data?.days?.at(-1)?.date || null };
  }, [stats.data]);

  useEffect(() => {
    if (today && !ym) {
      setYm(today.slice(0, 7));
      setSelected(today);
    }
  }, [today, ym]);

  if (stats.loading && !stats.data)
    return <div className="grid gap-4 lg:grid-cols-2"><CardSkeleton lines={5} /><CardSkeleton lines={6} /></div>;
  if (stats.error)
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="mono-data text-[13px] text-blood">{stats.error}</p>
        <button className="btn btn-line mt-4" onClick={() => stats.refresh(false)}>Try again</button>
      </div>
    );

  const curYm = ym || (today ? today.slice(0, 7) : "");
  const dates = curYm ? monthDates(curYm) : [];
  const pad = dates.length ? dowMon0(dates[0]) : 0;
  const [yy, mm] = curYm ? curYm.split("-").map(Number) : [0, 1];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
      <section className="card lg:sticky lg:top-6" aria-label="Calendar">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="ledger-head">
            <CalendarDays className="size-3.5 text-golddeep" aria-hidden />
            {MONTHS[mm - 1]} {yy}
          </h2>
          <div className="flex gap-1">
            <button className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={() => setYm(shiftMonth(curYm, -1))} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </button>
            <button className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={() => setYm(shiftMonth(curYm, 1))} aria-label="Next month">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5" role="grid">
          {WEEK.map((w, i) => (
            <div key={i} className="pb-1 text-center text-[10.5px] font-semibold text-faint" aria-hidden>{w}</div>
          ))}
          {Array.from({ length: pad }).map((_, i) => <span key={"p" + i} />)}
          {dates.map((d) => {
            const day = byDate[d];
            const inSeason = Boolean(day);
            const isToday = d === today;
            const isSel = d === selected;
            return (
              <button
                key={d}
                type="button"
                disabled={!inSeason}
                onClick={() => setSelected(d)}
                aria-label={inSeason ? `${fmtDay(d)} — ${day.total ? day.pct + "% closed" : "nothing scheduled"}` : fmtDay(d)}
                aria-current={isToday ? "date" : undefined}
                className={cx(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-[13px] transition-colors",
                  inSeason ? "border-line bg-well font-semibold text-cream hover:border-gold" : "border-transparent text-faint/60",
                  isToday && "border-cream",
                  isSel && "!border-gold ring-2 ring-gold/25"
                )}
              >
                {Number(d.slice(8))}
                {inSeason ? (
                  <span className="h-[4px] w-5 rounded-full" style={{ backgroundColor: day.total ? rampColor(day.pct) : "var(--color-linehi)" }} aria-hidden />
                ) : (
                  <span className="h-[4px] w-5" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {(stats.data?.days || []).length === 0 && (
          <p className="mt-4 text-[12.5px] text-ash">The season hasn't started yet — days appear here from your start date onward.</p>
        )}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden>
          <span className="text-[10.5px] text-faint">0%</span>
          {[0, 30, 55, 80, 99, 100].map((p) => (
            <span key={p} className="size-2.5 rounded-[2px]" style={{ background: rampColor(p) }} />
          ))}
          <span className="text-[10.5px] text-faint">100%</span>
        </div>
        <p className="mt-3 text-[11.5px] text-faint">Tap a day to open it — today is editable, past days are a locked record.</p>
      </section>

      <DayEditorPanel date={selected} onChanged={() => stats.refresh()} />
    </div>
  );
}

/* ── Full editable day ── */
function DayEditorPanel({ date, onChanged }) {
  const [day, setDay] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDay = useCallback(async () => {
    if (!date) return;
    try {
      const d = await api(`/day?date=${date}`);
      setDay(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [date]);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    fetchDay().finally(() => setLoading(false));
  }, [date, fetchDay]);

  const refresh = useCallback(async () => {
    await fetchDay();
    onChanged();
  }, [fetchDay, onChanged]);

  if (!date) return null;
  if (loading && !day) return <CardSkeleton lines={8} />;
  if (error)
    return (
      <section className="card"><p className="mono-data text-[13px] text-blood">{error}</p></section>
    );
  if (!day || day.date !== date) return <CardSkeleton lines={8} />;

  const { detail } = day;
  const n = detail.nutrition;

  // Past days are a locked history — you can review everything, but not rewrite it.
  if (!day.isToday) return <DayHistory day={day} />;

  return (
    <div className="grid gap-4">
      <section className="card" aria-label={`Ledger for ${fmtDay(day.date)}`}>
        <SectionHead
          icon={CalendarDays}
          title={`${fmtDay(day.date)}${day.isToday ? " · today" : ""}`}
          aside={
            day.total > 0 ? (
              <span><span className="display-num text-[15px] text-cream">{day.pct}%</span> · {day.done}/{day.total} closed</span>
            ) : ("nothing scheduled")
          }
        />
        {day.items.length > 0 && <VaultRow className="mb-4" segments={day.items.map((i) => ({ done: i.done }))} animate={false} />}
        <ChecklistEditor items={day.items} date={date} refresh={refresh} title={null} />
      </section>

      <section className="card" aria-label="Applications this day">
        <SectionHead icon={Briefcase} title="Applications" aside={`${detail.apps.length}/${day.appsTarget}`} />
        {detail.apps.length > 0 && (
          <ul className="mb-1 flex flex-col gap-1.5">
            {detail.apps.map((a) => (
              <li key={a._id} className="flex items-center gap-2 text-[12.5px]">
                <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                <span className="truncate font-medium text-cream">{a.company}</span>
                {a.role && <span className="truncate text-faint">· {a.role}</span>}
                <span className="ml-auto shrink-0 text-[11px] font-medium capitalize text-ash">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
        <AppsQuickAdd count={detail.apps.length} target={day.appsTarget} date={date} refresh={refresh} showMeter={false} />
        <p className="mt-2 text-[11.5px] text-faint">Edit or delete individual applications on the Pipeline page.</p>
      </section>

      <section className="card" aria-label="Targets">
        <SectionHead icon={ListChecks} title="Targets" aside={detail.tasks.length ? `${detail.tasks.filter((t) => t.done).length}/${detail.tasks.length}` : null} />
        <TargetsEditor tasks={detail.tasks} date={date} refresh={refresh} emptyHint="Nothing was set for this day — add one to backfill." />
      </section>

      <section className="card" aria-label="Food">
        <SectionHead
          icon={Utensils}
          title="Food"
          aside={n.kcal > 0 ? `${n.kcal} kcal · ${n.protein}g protein` : null}
        />
        <div className="flex flex-col gap-2">
          {MEALS.map((m) => <MealEditor key={m} meal={m} log={detail.food[m]} date={date} refresh={refresh} />)}
        </div>
        {n.kcal > 0 && (
          <p className="mono-data mt-3 text-[11.5px] text-ash">
            Day: {n.kcal} kcal · P {n.protein}g · C {n.carbs}g · F {n.fat}g
          </p>
        )}
      </section>

      <section className="card" aria-label="Gym">
        <SectionHead icon={Dumbbell} title="Gym" />
        <GymEditor log={detail.gym} date={date} refresh={refresh} />
      </section>

      <section className="card" aria-label="Game time">
        <SectionHead icon={Gamepad2} title="Game time" aside={`${fmtMin(detail.game.minutes)} / ${fmtMin(detail.game.limit)}`} />
        <GameEditor game={detail.game} date={date} refresh={refresh} />
      </section>

      <section className="card" aria-label="Sleep">
        <SectionHead icon={MoonStar} title={`Sleep · in bed by ${day.sleepTarget}`} />
        <SleepEditor log={detail.sleep} target={day.sleepTarget} date={date} refresh={refresh} />
      </section>

      <section className="card" aria-label="Quality time">
        <SectionHead icon={Heart} title="Quality time" />
        <PeopleEditor entries={detail.persons} defaultPerson={day.personDefault} date={date} refresh={refresh} />
      </section>

      {detail.smoking?.track && (
        <section className="card" aria-label="Quit smoking">
          <SectionHead icon={Cigarette} title="Quit smoking" aside={detail.smoking.count === 0 ? "clean" : `${detail.smoking.count} today`} />
          <SmokingEditor count={detail.smoking.count} date={date} refresh={refresh} />
        </section>
      )}

      {detail.calls.length > 0 && (
        <section className="card" aria-label="Calls">
          <SectionHead icon={Phone} title="Calls" aside={<a href="/calls" className="font-semibold text-goldhi hover:underline">manage →</a>} />
          <ul className="flex flex-col gap-1.5">
            {detail.calls.map((c) => (
              <li key={c._id} className="flex items-center gap-2 text-[13px]">
                <Phone className="size-3.5 shrink-0 text-golddeep" aria-hidden />
                <span className="truncate text-cream">{c.person} · {c.time}</span>
                <span className={cx("ml-auto text-[11px] font-medium", c.status === "done" ? "text-goldhi" : "text-blood")}>
                  {c.status === "done" ? "closed" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ── Read-only history for a past day (the ledger is closed) ── */
function DayHistory({ day }) {
  const { detail } = day;
  const n = detail.nutrition;
  const meals = ["breakfast", "lunch", "snacks", "dinner"].map((m) => detail.food[m]).filter(Boolean);
  const g = detail.game;
  const gover = g.minutes > g.limit;
  const gslots = Math.max(4, Math.ceil(g.limit / 15));
  const gfilled = Math.ceil(Math.min(g.minutes, g.limit) / 15);

  const tiles = [
    { label: "Applications", value: detail.apps.length },
    { label: "Gym", value: detail.gym ? fmtMin(detail.gym.minutes) : "—" },
    { label: "Game", value: g.minutes ? fmtMin(g.minutes) : "—" },
    { label: "Sleep", value: detail.sleep ? detail.sleep.time : "—" },
    { label: "Targets", value: detail.tasks.length ? `${detail.tasks.filter((t) => t.done).length}/${detail.tasks.length}` : "—" },
  ];
  if (detail.smoking?.track) tiles.push({ label: "Cigarettes", value: detail.smoking.count });

  return (
    <div className="grid gap-4">
      <section className="card" aria-label={`History for ${fmtDay(day.date)}`}>
        <SectionHead
          icon={CalendarDays}
          title={fmtDay(day.date)}
          aside={
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3 text-faint" aria-hidden />
              {day.total > 0 ? <><span className="display-num text-[15px] text-cream">{day.pct}%</span> · {day.done}/{day.total}</> : "nothing scheduled"}
            </span>
          }
        />
        {day.items.length > 0 && <VaultRow className="mb-4" segments={day.items.map((i) => ({ done: i.done, danger: !i.done && i.kind === "game" && i.value > i.target }))} animate={false} />}
        <StatRow stats={tiles} />
        {n.kcal > 0 && (
          <p className="mono-data mt-3 text-[11.5px] text-ash">Day: {n.kcal} kcal · P {n.protein}g · C {n.carbs}g · F {n.fat}g</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-faint">
          <Lock className="size-3" aria-hidden /> The past is locked — this is a read-only record.
        </p>
      </section>

      {/* the protocol, as it closed */}
      <section className="card" aria-label="Protocol result">
        <SectionHead icon={CircleCheck} title="The protocol" aside={day.total ? `${day.done}/${day.total}` : null} />
        <ul className="flex flex-col">
          {day.items.map((i) => (
            <li key={i.key} className="flex min-h-10 items-center gap-3 border-b border-line/60 py-1.5 last:border-0">
              <span className={cx("grid size-[26px] shrink-0 place-items-center rounded-[7px] border", i.done ? "border-gold bg-gold/15 text-goldhi" : "border-linehi text-faint")} aria-hidden>
                {i.done ? <CircleCheck className="size-3.5" /> : <Circle className="size-3" />}
              </span>
              <span className={cx("flex-1 truncate text-[13.5px] font-medium", i.done ? "struck" : "text-cream")}>{i.emoji} {i.name}</span>
              <span className="mono-data shrink-0 text-[11.5px] text-ash">
                {i.kind === "apps" && `${i.value}/${i.target}`}
                {i.kind === "game" && `${fmtMin(i.value)} / ${fmtMin(i.target)}`}
                {i.kind === "sleep" && (i.value || `by ${i.target}`)}
                {i.kind === "calls" && `${i.value}/${i.target}`}
                {i.kind === "clean" && `${i.value ?? 0}/${i.target ?? 0}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {detail.apps.length > 0 && (
        <section className="card" aria-label="Applications">
          <SectionHead icon={Briefcase} title="Applications" aside={`${detail.apps.length}`} />
          <ul className="flex flex-col gap-1.5">
            {detail.apps.map((a) => (
              <li key={a._id} className="flex items-center gap-2 text-[12.5px]">
                <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                <span className="truncate font-medium text-cream">{a.company}</span>
                {a.role && <span className="truncate text-faint">· {a.role}</span>}
                <span className="ml-auto shrink-0 text-[11px] font-medium capitalize text-ash">{a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.tasks.length > 0 && (
        <section className="card" aria-label="Targets">
          <SectionHead icon={ListChecks} title="Targets" aside={`${detail.tasks.filter((t) => t.done).length}/${detail.tasks.length}`} />
          <ul className="flex flex-col">
            {detail.tasks.map((t) => (
              <li key={t._id} className="flex min-h-9 items-center gap-2.5 border-b border-line/60 py-1.5 last:border-0">
                <span className={cx("grid size-[22px] shrink-0 place-items-center rounded-[6px] border", t.done ? "border-gold bg-gold/15 text-goldhi" : "border-linehi text-faint")} aria-hidden>
                  {t.done ? <CircleCheck className="size-3" /> : <Circle className="size-2.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <span className={cx("block truncate text-[13px]", t.done ? "struck" : "text-cream")}>{t.title}</span>
                  {t.start && t.end && <TimeRangeTag start={t.start} end={t.end} className="mt-0.5" />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {meals.length > 0 && (
        <section className="card" aria-label="Food">
          <SectionHead icon={Utensils} title="Food" aside={n.kcal > 0 ? `${n.kcal} kcal · ${n.protein}g P` : null} />
          <ul className="flex flex-col gap-1.5">
            {["breakfast", "lunch", "snacks", "dinner"].map((m) => {
              const f = detail.food[m];
              if (!f) return null;
              return (
                <li key={m} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-16 shrink-0 font-semibold text-cream">{MEAL_LABELS[m]}</span>
                  <span className="min-w-0 flex-1 truncate text-ash">{f.items || "logged"}</span>
                  <span className={cx("shrink-0 text-[11px] font-semibold", f.clean ? "text-goldhi" : "text-blood")}>
                    {f.clean ? "clean" : "oily"}{f.oats ? " · oats" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {detail.gym && (
        <section className="card" aria-label="Gym">
          <SectionHead icon={Dumbbell} title="Gym" />
          <p className="text-[13px] font-medium capitalize text-cream">{detail.gym.type} · {fmtMin(detail.gym.minutes)}</p>
          {detail.gym.start && detail.gym.end && <TimeRangeTag start={detail.gym.start} end={detail.gym.end} className="mt-1" />}
        </section>
      )}

      {(g.entries.length > 0 || g.minutes > 0) && (
        <section className="card" aria-label="Game time">
          <SectionHead icon={Gamepad2} title="Game time" aside={`${fmtMin(g.minutes)} / ${fmtMin(g.limit)}`} />
          <VaultRow segments={Array.from({ length: gslots }, (_, i) => ({ done: i < gfilled && !gover, danger: gover }))} animate={false} />
          {gover && <p className="mt-2 text-[12px] font-medium text-blood">{fmtMin(g.minutes - g.limit)} past the limit.</p>}
          {g.entries.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {g.entries.map((e) => (
                <li key={e._id} className="chip pointer-events-none !min-h-8">
                  {e.start && e.end ? `${e.start}–${e.end} · ${fmtMin(e.minutes)}` : fmtMin(e.minutes)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {detail.persons.length > 0 && (
        <section className="card" aria-label="Quality time">
          <SectionHead icon={Heart} title="Quality time" />
          <ul className="flex flex-wrap gap-1.5">
            {detail.persons.map((p) => (
              <li key={p._id} className="chip pointer-events-none">
                <Heart className="size-3 text-goldhi" aria-hidden /> {p.person} · {fmtMin(p.minutes)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.smoking?.track && (
        <section className="card" aria-label="Quit smoking">
          <SectionHead icon={Cigarette} title="Quit smoking" />
          <p className={cx("display-num text-[26px]", detail.smoking.count === 0 ? "text-goldhi" : "text-blood")}>
            {detail.smoking.count}
            <span className="text-[0.5em] font-semibold text-ash"> {detail.smoking.count === 0 ? "smoke-free" : "cigarettes"}</span>
          </p>
        </section>
      )}

      {detail.calls.length > 0 && (
        <section className="card" aria-label="Calls">
          <SectionHead icon={Phone} title="Calls" />
          <ul className="flex flex-col gap-1.5">
            {detail.calls.map((c) => (
              <li key={c._id} className="flex items-center gap-2 text-[13px]">
                <Phone className="size-3.5 shrink-0 text-golddeep" aria-hidden />
                <span className="truncate text-cream">{c.person} · {c.time}</span>
                <span className={cx("ml-auto text-[11px] font-medium", c.status === "done" ? "text-goldhi" : "text-blood")}>
                  {c.status === "done" ? "closed" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
