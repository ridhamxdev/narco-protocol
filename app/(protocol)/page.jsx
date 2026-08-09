"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crosshair, Briefcase, Phone, PhoneMissed, PhoneCall, ListChecks, Utensils,
  Dumbbell, Gamepad2, MoonStar, Heart, Plus, Trash2, Flame,
  Wheat, CircleCheck, Circle, ChevronRight, HandHeart, X,
} from "lucide-react";
import { api, useApi, cx, fmtMin, fmtDay } from "@/lib/client";
import { useToast } from "@/components/providers";
import {
  SectionHead, VaultRow, NumberTicker, TickBox, Stepper, TwoTap, EmptyState, CardSkeleton,
} from "@/components/ui";

const KIND_ICON = {
  apps: Briefcase, gym: Dumbbell, oats: Wheat, clean: Utensils, game: Gamepad2,
  sleep: MoonStar, person: Heart, calls: Phone, tasks: ListChecks, check: HandHeart,
};
const KIND_ANCHOR = {
  apps: "mission", gym: "iron", oats: "fuel", clean: "fuel", game: "game",
  sleep: "sleep", person: "people", calls: "callbacks", tasks: "targets",
};

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
        <LedgerList data={data} refresh={refresh} />
        <TargetsCard data={data} refresh={refresh} />
      </div>
      <div className="grid gap-4">
        <MissionCard data={data} refresh={refresh} />
        <CallsCard data={data} refresh={refresh} />
        <PeopleCard data={data} refresh={refresh} />
      </div>
      <div className="grid gap-4">
        <FuelCard data={data} refresh={refresh} />
        <IronCard data={data} refresh={refresh} />
        <GameCard data={data} refresh={refresh} />
        <SleepCard data={data} refresh={refresh} />
      </div>
    </div>
  );
}

/* ════ DAY LEDGER — the signature ════ */
function DayLedger({ data }) {
  const { score, items, streak, dayNo } = data;
  const conquered = score.total > 0 && score.pct === 100;

  return (
    <section className="card !p-5 md:col-span-2 xl:col-span-3 md:!p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <h1 className="display-num text-[34px] text-cream md:text-[42px]">Day {dayNo}</h1>
            {streak.current > 0 && (
              <span className="chip pointer-events-none" data-on="true" title="Perfect-day streak">
                <Flame className="size-3.5" aria-hidden /> {streak.current} day{streak.current > 1 ? "s" : ""}
              </span>
            )}
            <AnimatePresence>
              {conquered && (
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

      <p className="mt-3 text-[12.5px] text-faint">{data.quote}</p>
    </section>
  );
}

/* ════ THE LEDGER — checklist ════ */
function LedgerList({ data, refresh }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  async function toggle(item) {
    setBusyId(item.habitId);
    try {
      const r = await api(`/habits/${item.habitId}/log`, { method: "POST", body: { toggle: true } });
      if (r.done) toast(`${item.name} — closed`);
      await refresh();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusyId(null);
    }
  }

  async function step(item, delta) {
    setBusyId(item.habitId);
    try {
      await api(`/habits/${item.habitId}/log`, { method: "POST", body: { delta } });
      await refresh();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card" aria-label="Today's protocol">
      <SectionHead icon={Crosshair} title="The protocol" aside={`${data.score.done}/${data.score.total}`} />
      <ul className="flex flex-col">
        {data.items.map((item, idx) => {
          const Icon = KIND_ICON[item.kind] || CircleCheck;
          const interactive = item.kind === "check";
          const counter = item.kind === "counter";
          return (
            <motion.li
              key={item.key}
              initial={{ x: -10, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: Math.min(idx * 0.04, 0.5) }}
              className={cx("flex min-h-12 items-center gap-3 border-b border-line/60 py-2 last:border-0")}
            >
              {interactive ? (
                <TickBox checked={item.done} disabled={busyId === item.habitId} onChange={() => toggle(item)} label={item.name} />
              ) : (
                <span className={cx("grid size-[26px] shrink-0 place-items-center rounded-[7px] border", item.done ? "border-gold bg-gold/15 text-goldhi" : "border-linehi text-faint")} aria-hidden>
                  {item.done ? <CircleCheck className="size-4" /> : <Circle className="size-3.5" />}
                </span>
              )}
              <Icon className={cx("size-4 shrink-0", item.done ? "text-golddeep" : "text-ash")} aria-hidden />
              <button
                type="button"
                className={cx("flex-1 truncate text-left text-[14px] font-medium", item.done ? "struck" : "text-cream")}
                onClick={() => {
                  if (interactive) return toggle(item);
                  const el = document.getElementById(KIND_ANCHOR[item.kind]);
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {item.name}
              </button>
              {counter ? (
                <Stepper value={item.value} unit={item.unit} onDelta={(d) => step(item, d)} disabled={busyId === item.habitId} />
              ) : (
                <span className="mono-data shrink-0 text-[12px] text-ash">
                  {item.kind === "apps" && `${item.value}/${item.target}`}
                  {item.kind === "game" && `${fmtMin(item.value)} / ${fmtMin(item.target)}`}
                  {item.kind === "sleep" && (item.value || `by ${item.target}`)}
                  {item.kind === "calls" && `${item.value}/${item.target}`}
                  {item.kind === "gym" && (item.done ? item.detail : "")}
                </span>
              )}
              {!interactive && !counter && <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/* ════ MISSION — 10 applications ════ */
function MissionCard({ data, refresh }) {
  const toast = useToast();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const companyRef = useRef(null);
  const { count, target, recent } = data.apps;

  async function add(e) {
    e.preventDefault();
    if (!company.trim()) return;
    setBusy(true);
    try {
      const r = await api("/applications", { method: "POST", body: { company, role } });
      toast(`${r.todayCount}/${target} — ${company.trim()} logged`);
      setCompany(""); setRole("");
      companyRef.current?.focus();
      await refresh();
    } catch (e2) {
      toast(e2.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="mission" className="card scroll-mt-4" aria-label="Job applications">
      <SectionHead icon={Briefcase} title="Applications" aside={<a href="/applications" className="font-semibold text-goldhi hover:underline">pipeline →</a>} />
      <div className="flex items-end justify-between">
        <div className="display-num text-[36px] text-cream">
          <NumberTicker value={count} />
          <span className="text-[0.55em] font-semibold text-ash">/{target}</span>
        </div>
        {count >= target && <span className="stamp stamp-gold">Quota met</span>}
      </div>
      <VaultRow className="mt-3" segments={Array.from({ length: target }, (_, i) => ({ done: i < count }))} />
      <form onSubmit={add} className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <input ref={companyRef} className="input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" />
          <input className="input" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" />
        </div>
        <button className="btn btn-gold" disabled={busy || !company.trim()}>
          <Plus className="size-4" /> Log application
        </button>
      </form>
      {recent.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {recent.slice(0, 3).map((a) => (
            <li key={a._id} className="flex items-center gap-2 text-[12.5px]">
              <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
              <span className="truncate font-medium text-cream">{a.company}</span>
              {a.role && <span className="truncate text-faint">· {a.role}</span>}
              <span className="ml-auto shrink-0 text-[11px] font-medium capitalize text-ash">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ════ CALLBACKS ════ */
function CallsCard({ data, refresh }) {
  const toast = useToast();
  const [person, setPerson] = useState("");
  const [time, setTime] = useState("18:00");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const { overdue, dueLater, upcoming } = data.calls;

  async function add(e) {
    e.preventDefault();
    if (!person.trim()) return;
    setBusy(true);
    try {
      await api("/calls", { method: "POST", body: { person, time, about } });
      toast(`Call to ${person.trim()} scheduled ${time}`);
      setPerson(""); setAbout("");
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
      <SectionHead icon={Phone} title="Call-backs" aside={overdue.length > 0 ? <span className="font-bold text-blood">{overdue.length} overdue</span> : `${dueLater.length + upcoming.length} lined up`} />
      {overdue.length + dueLater.length + upcoming.length === 0 ? (
        <EmptyState icon={Phone} title="No calls owed" hint="Add one below — miss it and the mails won't let you forget." />
      ) : (
        <ul className="flex flex-col gap-2">
          {overdue.map((c) => <Row key={c._id} c={c} tone="overdue" />)}
          {dueLater.map((c) => <Row key={c._id} c={c} tone="today" />)}
          {upcoming.map((c) => <Row key={c._id} c={c} tone="upcoming" />)}
        </ul>
      )}
      <form onSubmit={add} className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <input className="input" placeholder="Who to call" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Who to call" />
          <input className="input !w-28 shrink-0" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="About (HR follow-up, referral…)" value={about} onChange={(e) => setAbout(e.target.value)} aria-label="About" />
          <button className="btn btn-line shrink-0" disabled={busy || !person.trim()} aria-label="Add call">
            <Plus className="size-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

/* ════ TARGETS ════ */
function TargetsCard({ data, refresh }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api("/tasks", { method: "POST", body: { title } });
      setTitle("");
      await refresh();
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  const doneCount = data.tasks.filter((t) => t.done).length;

  return (
    <section id="targets" className="card scroll-mt-4" aria-label="Today's targets">
      <SectionHead icon={ListChecks} title="Targets today" aside={data.tasks.length ? `${doneCount}/${data.tasks.length}` : null} />
      {data.tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No targets set" hint="DSA sheet, portfolio fix, follow-up mail — write it, then hunt it." />
      ) : (
        <ul className="flex flex-col">
          {data.tasks.map((t) => (
            <li key={t._id} className="group flex min-h-11 items-center gap-3 border-b border-line/60 py-1.5 last:border-0">
              <TickBox checked={t.done} label={t.title} onChange={async () => {
                try { await api(`/tasks/${t._id}`, { method: "PATCH", body: { done: !t.done } }); await refresh(); }
                catch (e) { toast(e.message, "err"); }
              }} />
              <span className={cx("flex-1 text-[14px]", t.done ? "struck" : "text-cream")}>{t.title}</span>
              <TwoTap className="btn btn-ghost !min-h-8 !w-8 !p-0 opacity-60 group-hover:opacity-100" onConfirm={async () => {
                try { await api(`/tasks/${t._id}`, { method: "DELETE" }); await refresh(); }
                catch (e) { toast(e.message, "err"); }
              }}>
                <Trash2 className="size-3.5" aria-hidden />
              </TwoTap>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input className="input" placeholder="Add a target for today" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="New target" />
        <button className="btn btn-line shrink-0" disabled={busy || !title.trim()} aria-label="Add target">
          <Plus className="size-4" />
        </button>
      </form>
    </section>
  );
}

/* ════ FUEL — food log ════ */
const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", snacks: "Snacks", dinner: "Dinner" };

function MealRow({ meal, log, refresh }) {
  const toast = useToast();
  const [items, setItems] = useState(log?.items || "");
  const [clean, setClean] = useState(log ? log.clean : true);
  const [oats, setOats] = useState(log?.oats || false);
  const [busy, setBusy] = useState(false);
  const logged = Boolean(log);

  useEffect(() => {
    setItems(log?.items || "");
    setClean(log ? log.clean : true);
    setOats(log?.oats || false);
  }, [log?.items, log?.clean, log?.oats, logged]);

  async function save(next = {}) {
    setBusy(true);
    try {
      await api("/food", { method: "POST", body: { meal, items, clean, oats, ...next } });
      toast(`${MEAL_LABELS[meal]} logged`);
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div className={cx("rounded-xl border px-3 py-2.5", logged ? "border-golddeep/50 bg-gold/[0.06]" : "border-line bg-well")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-cream">{MEAL_LABELS[meal]}</span>
        <div className="flex gap-1.5">
          {meal === "breakfast" && (
            <button type="button" className="chip !min-h-8 !text-[11px]" data-on={oats} onClick={() => { const v = !oats; setOats(v); save({ oats: v }); }}>
              <Wheat className="size-3" aria-hidden /> Oats
            </button>
          )}
          <button type="button" className="chip !min-h-8 !text-[11px]" data-on={clean} onClick={() => { setClean(true); save({ clean: true }); }}>
            Clean
          </button>
          <button type="button" className={cx("chip !min-h-8 !text-[11px]", !clean && "!border-blood/60 !bg-blood/10 !text-blood")} onClick={() => { setClean(false); save({ clean: false }); }}>
            Oily
          </button>
        </div>
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <input
          className="input !min-h-9"
          placeholder={meal === "breakfast" ? "Oats, banana, black coffee…" : "What did you eat?"}
          value={items}
          onChange={(e) => setItems(e.target.value)}
          aria-label={`${MEAL_LABELS[meal]} items`}
        />
        <button className="btn btn-line !min-h-9 shrink-0 !px-3 !text-[12px]" disabled={busy}>
          {logged ? "Update" : "Log"}
        </button>
      </form>
    </div>
  );
}

function FuelCard({ data, refresh }) {
  const meals = ["breakfast", "lunch", "snacks", "dinner"];
  const loggedCount = meals.filter((m) => data.food[m]).length;
  const allClean = loggedCount >= 2 && meals.every((m) => !data.food[m] || data.food[m].clean);
  return (
    <section id="fuel" className="card scroll-mt-4" aria-label="Food log">
      <SectionHead icon={Utensils} title="Food log" aside={allClean ? <span className="font-semibold text-goldhi">running clean</span> : `${loggedCount}/4 meals`} />
      <div className="flex flex-col gap-2">
        {meals.map((m) => <MealRow key={m} meal={m} log={data.food[m]} refresh={refresh} />)}
      </div>
    </section>
  );
}

/* ════ IRON — gym ════ */
const GYM_TYPES = ["push", "pull", "legs", "cardio", "full", "sport", "rest"];

function IronCard({ data, refresh }) {
  const toast = useToast();
  const log = data.gym.today;
  const [type, setType] = useState(log?.type || "full");
  const [minutes, setMinutes] = useState(log?.minutes ?? 60);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (log) { setType(log.type); setMinutes(log.minutes); }
  }, [log?.type, log?.minutes]);

  async function save() {
    setBusy(true);
    try {
      await api("/gym", { method: "POST", body: { type, minutes } });
      toast(type === "rest" ? "Recovery logged" : `Iron paid — ${type}, ${fmtMin(minutes)}`);
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <section id="iron" className="card scroll-mt-4" aria-label="Gym log">
      <SectionHead icon={Dumbbell} title="Gym" aside={`${data.gym.streak}d streak · ${data.gym.week}/7 this week`} />
      {log && (
        <p className="mb-3 rounded-lg border border-gold/50 bg-gold/[0.08] px-3 py-2 text-[12.5px] font-medium text-goldhi">
          Logged — {log.type} · {fmtMin(log.minutes)}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {GYM_TYPES.map((t) => (
          <button key={t} type="button" className="chip capitalize" data-on={type === t} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Stepper value={minutes} unit="min" onDelta={(d) => setMinutes((m) => Math.max(0, m + d * 15))} />
        <button className="btn btn-gold flex-1" onClick={save} disabled={busy}>
          {log ? "Update session" : "Log session"}
        </button>
      </div>
    </section>
  );
}

/* ════ GAME — the leash ════ */
function GameCard({ data, refresh }) {
  const toast = useToast();
  const [custom, setCustom] = useState("");
  const { minutes, limit, entries } = data.game;
  const over = minutes > limit;
  const slots = Math.max(4, Math.ceil(limit / 15));
  const filled = Math.ceil(Math.min(minutes, limit) / 15);

  async function add(min) {
    try {
      await api("/game", { method: "POST", body: { minutes: min } });
      toast(`${fmtMin(min)} of play logged`);
      await refresh();
    } catch (e) { toast(e.message, "err"); }
  }

  return (
    <section id="game" className="card scroll-mt-4" aria-label="Game time">
      <SectionHead icon={Gamepad2} title="Game time" aside={over ? <span className="stamp">Over limit</span> : `${fmtMin(minutes)} / ${fmtMin(limit)}`} />
      <VaultRow
        segments={Array.from({ length: slots }, (_, i) => ({ done: i < filled && !over, danger: over }))}
      />
      {over && (
        <p className="mt-2 text-[12px] font-medium text-blood">
          {fmtMin(minutes - limit)} past the limit. Put it down.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {[15, 30, 60].map((m) => (
          <button key={m} type="button" className="chip" onClick={() => add(m)}>+{fmtMin(m)}</button>
        ))}
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => { e.preventDefault(); const v = Number(custom); if (v > 0) { add(v); setCustom(""); } }}
        >
          <input className="input !min-h-8 !w-20 !rounded-full !px-3" placeholder="min" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} aria-label="Custom minutes" />
          <button className="chip !min-h-8" disabled={!custom}>add</button>
        </form>
      </div>
      {entries.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {entries.map((g) => (
            <li key={g._id}>
              <TwoTap className="chip !min-h-8 !cursor-pointer" confirmText="Remove?" onConfirm={async () => {
                try { await api(`/game?id=${g._id}`, { method: "DELETE" }); await refresh(); } catch (e) { toast(e.message, "err"); }
              }}>
                {fmtMin(g.minutes)} <X className="size-3" aria-hidden />
              </TwoTap>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ════ LIGHTS OUT — sleep ════ */
function SleepCard({ data, refresh }) {
  const toast = useToast();
  const [time, setTime] = useState("23:45");
  const [busy, setBusy] = useState(false);
  const s = data.sleep;

  async function log() {
    setBusy(true);
    try {
      const r = await api("/sleep", { method: "POST", body: { time } });
      toast(r.onTime ? "Down on time. Discipline." : "Logged — late night.", r.onTime ? "ok" : "err");
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <section id="sleep" className="card scroll-mt-4" aria-label="Sleep log">
      <SectionHead icon={MoonStar} title={`Sleep · in bed by ${s.target}`} aside={s.last ? `last night ${s.last.time}` : null} />
      {s.today ? (
        <div className="flex items-center justify-between">
          <p className="mono-data text-[13.5px] font-medium text-cream">In bed at {s.today.time}</p>
          <span className={cx("stamp", s.today.onTime && "stamp-gold")}>
            {s.today.onTime ? "On time" : "Late"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input className="input !w-32" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Bedtime" />
          <button className="btn btn-gold flex-1" onClick={log} disabled={busy}>Log bedtime</button>
        </div>
      )}
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
        Logging after midnight still counts for tonight — the day flips at 05:00.
      </p>
    </section>
  );
}

/* ════ PEOPLE — quality time ════ */
function PeopleCard({ data, refresh }) {
  const toast = useToast();
  const [person, setPerson] = useState(data.person.default || "");
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!person.trim()) return;
    setBusy(true);
    try {
      await api("/person", { method: "POST", body: { person, minutes } });
      toast(`${fmtMin(minutes)} with ${person.trim()} — logged`);
      await refresh();
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  return (
    <section id="people" className="card scroll-mt-4" aria-label="Quality time">
      <SectionHead icon={Heart} title="Quality time" aside={data.person.entries.length ? `${fmtMin(data.person.entries.reduce((s, p) => s + p.minutes, 0))} today` : null} />
      {data.person.entries.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {data.person.entries.map((p) => (
            <li key={p._id}>
              <TwoTap className="chip" confirmText="Remove?" onConfirm={async () => {
                try { await api(`/person?id=${p._id}`, { method: "DELETE" }); await refresh(); } catch (e) { toast(e.message, "err"); }
              }}>
                <Heart className="size-3 text-goldhi" aria-hidden /> {p.person} · {fmtMin(p.minutes)}
              </TwoTap>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-col gap-2">
        <input className="input" placeholder={data.person.default ? data.person.default : "Who matters today?"} value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Person" />
        <div className="flex items-center gap-2">
          {[15, 30, 60].map((m) => (
            <button key={m} type="button" className="chip" data-on={minutes === m} onClick={() => setMinutes(m)}>
              {fmtMin(m)}
            </button>
          ))}
          <button className="btn btn-line ml-auto" disabled={busy || !person.trim()}>
            <Plus className="size-4" /> Log
          </button>
        </div>
      </form>
    </section>
  );
}
