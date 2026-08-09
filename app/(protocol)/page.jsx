"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crosshair, Briefcase, Phone, PhoneMissed, PhoneCall, ListChecks, Utensils,
  Dumbbell, Gamepad2, MoonStar, Heart, Plus, Flame,
} from "lucide-react";
import { api, useApi, cx, fmtMin, fmtDay } from "@/lib/client";
import { useToast } from "@/components/providers";
import { SectionHead, VaultRow, NumberTicker, EmptyState, CardSkeleton } from "@/components/ui";
import {
  ChecklistEditor, AppsQuickAdd, MealEditor, GymEditor, GameEditor, SleepEditor,
  PeopleEditor, TargetsEditor,
} from "@/components/editors";

const MEALS = ["breakfast", "lunch", "snacks", "dinner"];

export default function TodayPage() {
  const { data, error, loading, refresh } = useApi("/today");

  if (loading)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><CardSkeleton lines={2} /></div>
        <CardSkeleton lines={6} /><CardSkeleton lines={4} /><CardSkeleton lines={4} /><CardSkeleton lines={3} />
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

  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DayLedger data={data} />

      <div className="grid gap-4">
        <section className="card" aria-label="Today's protocol">
          <ChecklistEditor
            items={data.items}
            refresh={refresh}
            anchors
            aside={`${data.score.done}/${data.score.total}`}
          />
        </section>
        <section id="targets" className="card scroll-mt-4" aria-label="Today's targets">
          <SectionHead icon={ListChecks} title="Targets today" aside={data.tasks.length ? `${data.tasks.filter((t) => t.done).length}/${data.tasks.length}` : null} />
          <TargetsEditor tasks={data.tasks} refresh={refresh} />
        </section>
      </div>

      <div className="grid gap-4">
        <section id="mission" className="card scroll-mt-4" aria-label="Job applications">
          <SectionHead icon={Briefcase} title="Applications" aside={<a href="/applications" className="font-semibold text-goldhi hover:underline">pipeline →</a>} />
          <AppsQuickAdd count={data.apps.count} target={data.apps.target} recent={data.apps.recent} refresh={refresh} />
        </section>
        <CallsCard data={data} refresh={refresh} />
        <section id="people" className="card scroll-mt-4" aria-label="Quality time">
          <SectionHead icon={Heart} title="Quality time" aside={data.person.entries.length ? `${fmtMin(data.person.entries.reduce((s, p) => s + p.minutes, 0))} today` : null} />
          <PeopleEditor entries={data.person.entries} defaultPerson={data.person.default} refresh={refresh} />
        </section>
      </div>

      <div className="grid gap-4">
        <section id="fuel" className="card scroll-mt-4" aria-label="Food log">
          <SectionHead
            icon={Utensils}
            title="Food log"
            aside={
              data.nutrition.kcal > 0
                ? `${data.nutrition.kcal} kcal · ${data.nutrition.protein}g protein`
                : `${MEALS.filter((m) => data.food[m]).length}/4 meals`
            }
          />
          <div className="flex flex-col gap-2">
            {MEALS.map((m) => (
              <MealEditor key={m} meal={m} log={data.food[m]} refresh={refresh} />
            ))}
          </div>
          {data.nutrition.kcal > 0 && (
            <p className="mono-data mt-3 text-[11.5px] text-ash">
              Today: {data.nutrition.kcal} kcal · P {data.nutrition.protein}g · C {data.nutrition.carbs}g · F {data.nutrition.fat}g
            </p>
          )}
        </section>

        <section id="iron" className="card scroll-mt-4" aria-label="Gym log">
          <SectionHead icon={Dumbbell} title="Gym" aside={`${data.gym.streak}d streak · ${data.gym.week}/7 this week`} />
          <GymEditor log={data.gym.today} refresh={refresh} />
        </section>

        <section id="game" className="card scroll-mt-4" aria-label="Game time">
          <SectionHead icon={Gamepad2} title="Game time" aside={data.game.minutes > data.game.limit ? <span className="stamp">Over limit</span> : `${fmtMin(data.game.minutes)} / ${fmtMin(data.game.limit)}`} />
          <GameEditor game={data.game} refresh={refresh} />
        </section>

        <section id="sleep" className="card scroll-mt-4" aria-label="Sleep log">
          <SectionHead icon={MoonStar} title={`Sleep · in bed by ${data.sleep.target}`} aside={data.sleep.last ? `last night ${data.sleep.last.time}` : null} />
          <SleepEditor log={data.sleep.today} target={data.sleep.target} refresh={refresh} />
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
            Logging after midnight still counts for tonight — the day flips at 05:00.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ── Day ledger header ── */
function DayLedger({ data }) {
  const { score, items, streak, dayNo } = data;
  const conquered = score.total > 0 && score.pct === 100;

  return (
    <section className="card !p-5 md:col-span-2 xl:col-span-3 md:!p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <h1 className="display-num text-[34px] text-cream md:text-[42px]">
              {data.preStart ? "Day 0" : `Day ${dayNo}`}
            </h1>
            {streak.current > 0 && (
              <span className="chip pointer-events-none" data-on="true" title="Perfect-day streak">
                <Flame className="size-3.5" aria-hidden /> {streak.current} day{streak.current > 1 ? "s" : ""}
              </span>
            )}
            <AnimatePresence>
              {conquered && !data.preStart && (
                <motion.span
                  className="stamp stamp-gold shrink-0"
                  initial={{ opacity: 0.4, scale: 1.15 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                >
                  Day complete
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-1.5 text-[13px] text-ash">
            {fmtDay(data.date)} · {score.done} of {score.total} closed · best streak {streak.best}
          </p>
        </div>
        <div className="text-right">
          <div className={cx("display-num text-[44px] leading-none md:text-[56px]", conquered ? "text-goldhi" : "text-cream")}>
            <NumberTicker value={score.pct} />
            <span className="text-[0.5em] font-semibold text-ash">%</span>
          </div>
        </div>
      </div>

      <VaultRow
        className="mt-4"
        size="lg"
        segments={items.map((i) => ({
          done: i.done,
          danger: !i.done && ((i.kind === "calls" && data.calls.overdue.length > 0) || (i.kind === "game" && i.value > i.target)),
        }))}
      />

      {data.preStart && (
        <p className="mt-3 text-[13px] font-medium text-goldhi">
          The protocol begins {fmtDay(data.startsOn)} — today is a warm-up, nothing counts yet.
        </p>
      )}
    </section>
  );
}

/* ── Call-backs (page-specific, add form collapsed) ── */
function CallsCard({ data, refresh }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [person, setPerson] = useState("");
  const [time, setTime] = useState("18:00");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const { overdue, dueLater, upcoming } = data.calls;
  const count = overdue.length + dueLater.length + upcoming.length;

  async function add(e) {
    e.preventDefault();
    if (!person.trim()) return;
    setBusy(true);
    try {
      await api("/calls", { method: "POST", body: { person, time, about } });
      toast(`Call to ${person.trim()} scheduled ${time}`);
      setPerson(""); setAbout(""); setAdding(false);
      await refresh();
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  async function done(c) {
    try {
      await api(`/calls/${c._id}`, { method: "PATCH", body: { done: true } });
      toast(`Call to ${c.person} — closed`);
      await refresh();
    } catch (e) { toast(e.message, "err"); }
  }

  const Row = ({ c, tone }) => (
    <li className={cx("flex items-center gap-2.5 rounded-xl border px-3 py-2.5", tone === "overdue" ? "overdue-pulse border-blood/50 bg-blood/10" : "border-line bg-well")}>
      {tone === "overdue" ? <PhoneMissed className="size-4 shrink-0 text-blood" aria-hidden /> : <PhoneCall className="size-4 shrink-0 text-goldhi" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-cream">{c.person}</p>
        <p className="mono-data truncate text-[11.5px] text-ash">
          {tone === "upcoming" ? `${fmtDay(c.date)} · ` : ""}{c.time}{c.about ? ` · ${c.about}` : ""}
        </p>
      </div>
      {c.phone && (
        <a href={`tel:${c.phone}`} className={cx("btn !min-h-8 !px-3 !text-[11.5px]", tone === "overdue" ? "btn-red" : "btn-line")}>
          Call
        </a>
      )}
      <button className="btn btn-line !min-h-8 !px-3 !text-[12px]" onClick={() => done(c)}>
        Done
      </button>
    </li>
  );

  return (
    <section id="callbacks" className="card scroll-mt-4" aria-label="Call-backs">
      <SectionHead
        icon={Phone}
        title="Call-backs"
        aside={overdue.length > 0 ? <span className="font-bold text-blood">{overdue.length} overdue</span> : count ? `${count} lined up` : <a href="/calls" className="font-semibold text-goldhi hover:underline">all calls →</a>}
      />
      {count === 0 ? (
        <EmptyState icon={Phone} title="No calls owed" hint="Miss one and the mails won't let you forget." />
      ) : (
        <ul className="flex flex-col gap-2">
          {overdue.map((c) => <Row key={c._id} c={c} tone="overdue" />)}
          {dueLater.map((c) => <Row key={c._id} c={c} tone="today" />)}
          {upcoming.map((c) => <Row key={c._id} c={c} tone="upcoming" />)}
        </ul>
      )}
      {adding ? (
        <form onSubmit={add} className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input className="input" autoFocus placeholder="Who to call" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Who to call" />
            <input className="input !w-28 shrink-0" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
          </div>
          <div className="flex gap-2">
            <input className="input" placeholder="About (HR follow-up, referral…)" value={about} onChange={(e) => setAbout(e.target.value)} aria-label="About" />
            <button className="btn btn-gold shrink-0" disabled={busy || !person.trim()}>Add</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-line mt-3 w-full" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Schedule a call
        </button>
      )}
    </section>
  );
}
