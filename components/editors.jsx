"use client";

// Shared day editors — used by Today (date = undefined → today) and by the
// Calendar day view (date = "YYYY-MM-DD") for full backfill editing.

import { useEffect, useRef, useState } from "react";
import {
  Briefcase, ListChecks, Utensils, Dumbbell, Gamepad2, MoonStar, Heart, Plus,
  Trash2, Wheat, CircleCheck, Circle, ChevronRight, ChevronDown, HandHeart, X, Pencil,
} from "lucide-react";
import { api, cx, fmtMin } from "@/lib/client";
import { useToast } from "@/components/providers";
import { SectionHead, VaultRow, NumberTicker, TickBox, Stepper, TwoTap, EmptyState } from "@/components/ui";

const withDate = (body, date) => (date ? { ...body, date } : body);
const qsDate = (date) => (date ? `&date=${date}` : "");

export const KIND_ICON = {
  apps: Briefcase, gym: Dumbbell, oats: Wheat, clean: Utensils, game: Gamepad2,
  sleep: MoonStar, person: Heart, calls: ListChecks, tasks: ListChecks, check: HandHeart,
};
const KIND_ANCHOR = {
  apps: "mission", gym: "iron", oats: "fuel", clean: "fuel", game: "game",
  sleep: "sleep", person: "people", calls: "callbacks", tasks: "targets",
};

/* ══ Checklist (habits) ══ */
export function ChecklistEditor({ items, date, refresh, anchors = false, title = "The protocol", aside }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  async function toggle(item) {
    setBusyId(item.habitId);
    try {
      const r = await api(`/habits/${item.habitId}/log`, { method: "POST", body: withDate({ toggle: true }, date) });
      if (r.done) toast(`${item.name} — closed`);
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusyId(null); }
  }
  async function step(item, delta) {
    setBusyId(item.habitId);
    try {
      await api(`/habits/${item.habitId}/log`, { method: "POST", body: withDate({ delta }, date) });
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusyId(null); }
  }

  return (
    <div>
      {title && <SectionHead icon={CircleCheck} title={title} aside={aside} />}
      <ul className="flex flex-col">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind] || CircleCheck;
          const interactive = item.kind === "check";
          const counter = item.kind === "counter";
          return (
            <li key={item.key} className="flex min-h-11 items-center gap-3 border-b border-line/60 py-1.5 last:border-0">
              {interactive ? (
                <TickBox checked={item.done} disabled={busyId === item.habitId} onChange={() => toggle(item)} label={item.name} />
              ) : (
                <span className={cx("grid size-[30px] shrink-0 place-items-center rounded-[8px] border", item.done ? "border-gold bg-gold/15 text-goldhi" : "border-linehi text-faint")} aria-hidden>
                  {item.done ? <CircleCheck className="size-4" /> : <Circle className="size-3.5" />}
                </span>
              )}
              <Icon className={cx("size-4 shrink-0", item.done ? "text-golddeep" : "text-ash")} aria-hidden />
              <button
                type="button"
                className={cx("flex-1 truncate text-left text-[14px] font-medium", item.done ? "struck" : "text-cream")}
                onClick={() => {
                  if (interactive) return toggle(item);
                  if (anchors) document.getElementById(KIND_ANCHOR[item.kind])?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              {anchors && !interactive && !counter && <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ══ Applications quick add ══ */
export function AppsQuickAdd({ count, target, recent = [], date, refresh, showMeter = true }) {
  const toast = useToast();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  async function add(e) {
    e.preventDefault();
    if (!company.trim()) return;
    setBusy(true);
    try {
      await api("/applications", { method: "POST", body: withDate({ company, role }, date) });
      toast(`${company.trim()} logged`);
      setCompany(""); setRole("");
      ref.current?.focus();
      await refresh();
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div>
      {showMeter && (
        <>
          <div className="flex items-end justify-between">
            <div className="display-num text-[36px] text-cream">
              <NumberTicker value={count} />
              <span className="text-[0.55em] font-semibold text-ash">/{target}</span>
            </div>
            {count >= target && <span className="stamp stamp-gold">Quota met</span>}
          </div>
          <VaultRow className="mt-3" segments={Array.from({ length: target }, (_, i) => ({ done: i < count }))} />
        </>
      )}
      <form onSubmit={add} className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <input ref={ref} className="input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" />
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
    </div>
  );
}

/* ══ Meals (collapsible rows) ══ */
const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", snacks: "Snacks", dinner: "Dinner" };

export function MealEditor({ meal, log, date, refresh }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(log?.items || "");
  const [clean, setClean] = useState(log ? log.clean : true);
  const [oats, setOats] = useState(log?.oats || false);
  const [macros, setMacros] = useState({ kcal: log?.kcal || "", protein: log?.protein || "", carbs: log?.carbs || "", fat: log?.fat || "" });
  const [busy, setBusy] = useState(false);
  const logged = Boolean(log);

  useEffect(() => {
    setItems(log?.items || "");
    setClean(log ? log.clean : true);
    setOats(log?.oats || false);
    setMacros({ kcal: log?.kcal || "", protein: log?.protein || "", carbs: log?.carbs || "", fat: log?.fat || "" });
  }, [log?.items, log?.clean, log?.oats, log?.kcal, log?.protein, log?.carbs, log?.fat, logged, date]);

  async function save(next = {}) {
    setBusy(true);
    try {
      await api("/food", {
        method: "POST",
        body: withDate({ meal, items, clean, oats, kcal: macros.kcal, protein: macros.protein, carbs: macros.carbs, fat: macros.fat, ...next }, date),
      });
      toast(`${MEAL_LABELS[meal]} logged`);
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function clear() {
    setBusy(true);
    try {
      await api(`/food?meal=${meal}${qsDate(date)}`, { method: "DELETE" });
      toast(`${MEAL_LABELS[meal]} cleared`);
      setOpen(false);
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div className={cx("rounded-xl border transition-colors", logged ? "border-gold/50 bg-gold/[0.05]" : "border-line bg-well")}>
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="w-20 shrink-0 text-[13px] font-semibold text-cream">{MEAL_LABELS[meal]}</span>
        <span className={cx("min-w-0 flex-1 truncate text-[12.5px]", logged ? "text-ash" : "text-faint")}>
          {logged ? log.items || "logged" : "not logged"}
        </span>
        {logged && log.kcal > 0 && (
          <span className="mono-data shrink-0 text-[11px] text-ash">{log.kcal} kcal · {log.protein || 0}g P</span>
        )}
        {logged && (
          <span className={cx("shrink-0 text-[11px] font-semibold", log.clean ? "text-goldhi" : "text-blood")}>
            {log.clean ? "clean" : "oily"}{log.oats ? " · oats" : ""}
          </span>
        )}
        <ChevronDown className={cx("size-4 shrink-0 text-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-line/60 px-3.5 py-3">
          <div className="flex flex-wrap gap-1.5">
            {meal === "breakfast" && (
              <button type="button" className="chip" data-on={oats} onClick={() => setOats((v) => !v)}>
                <Wheat className="size-3" aria-hidden /> Oats
              </button>
            )}
            <button type="button" className="chip" data-on={clean} onClick={() => setClean(true)}>Clean</button>
            <button type="button" className={cx("chip", !clean && "!border-blood/60 !bg-blood/10 !text-blood")} onClick={() => setClean(false)}>Oily</button>
          </div>
          <form className="mt-2.5 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <input
              className="input !min-h-9"
              placeholder={meal === "breakfast" ? "Oats, banana, black coffee…" : "What did you eat?"}
              value={items}
              onChange={(e) => setItems(e.target.value)}
              aria-label={`${MEAL_LABELS[meal]} items`}
            />
            <div className="grid grid-cols-4 gap-1.5">
              {[["kcal", "kcal"], ["protein", "protein g"], ["carbs", "carbs g"], ["fat", "fat g"]].map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-0.5 block text-[10px] font-medium text-faint">{label}</span>
                  <input
                    className="input !min-h-8 !px-2 text-center"
                    inputMode="numeric"
                    placeholder="0"
                    value={macros[k]}
                    onChange={(e) => setMacros((m) => ({ ...m, [k]: e.target.value.replace(/\D/g, "") }))}
                    aria-label={`${MEAL_LABELS[meal]} ${label}`}
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-gold !min-h-9 flex-1 !text-[12.5px]" disabled={busy}>
                {logged ? "Update" : "Log"}
              </button>
              {logged && (
                <TwoTap className="btn btn-ghost !min-h-9 !w-9 shrink-0 !p-0" confirmText="✕" onConfirm={clear}>
                  <Trash2 className="size-4" aria-hidden />
                </TwoTap>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ══ Gym ══ */
const GYM_TYPES = ["push", "pull", "legs", "cardio", "full", "sport", "rest"];

export function GymEditor({ log, date, refresh }) {
  const toast = useToast();
  const [open, setOpen] = useState(!log);
  const [type, setType] = useState(log?.type || "full");
  const [minutes, setMinutes] = useState(log?.minutes ?? 60);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (log) { setType(log.type); setMinutes(log.minutes); setOpen(false); }
    else setOpen(true);
  }, [log?.type, log?.minutes, date]);

  async function save() {
    setBusy(true);
    try {
      await api("/gym", { method: "POST", body: withDate({ type, minutes }, date) });
      toast(type === "rest" ? "Recovery logged" : `Iron paid — ${type}, ${fmtMin(minutes)}`);
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function clear() {
    setBusy(true);
    try {
      await api(`/gym?x=1${qsDate(date)}`, { method: "DELETE" });
      toast("Session removed");
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  if (log && !open)
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/50 bg-gold/[0.05] px-3.5 py-2.5">
        <p className="text-[13px] font-medium capitalize text-cream">
          {log.type} · {fmtMin(log.minutes)}
        </p>
        <div className="flex gap-1">
          <button className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={() => setOpen(true)} aria-label="Edit session">
            <Pencil className="size-3.5" />
          </button>
          <TwoTap className="btn btn-ghost !min-h-8 !w-8 !p-0" confirmText="✕" onConfirm={clear}>
            <Trash2 className="size-3.5" aria-hidden />
          </TwoTap>
        </div>
      </div>
    );

  return (
    <div>
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
    </div>
  );
}

/* ══ Game ══ */
export function GameEditor({ game, date, refresh }) {
  const toast = useToast();
  const [custom, setCustom] = useState("");
  const { minutes, limit, entries } = game;
  const over = minutes > limit;
  const slots = Math.max(4, Math.ceil(limit / 15));
  const filled = Math.ceil(Math.min(minutes, limit) / 15);

  async function add(min) {
    try {
      await api("/game", { method: "POST", body: withDate({ minutes: min }, date) });
      toast(`${fmtMin(min)} of play logged`);
      await refresh();
    } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <VaultRow segments={Array.from({ length: slots }, (_, i) => ({ done: i < filled && !over, danger: over }))} />
      {over && <p className="mt-2 text-[12px] font-medium text-blood">{fmtMin(minutes - limit)} past the limit.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {[15, 30, 60].map((m) => (
          <button key={m} type="button" className="chip" onClick={() => add(m)}>+{fmtMin(m)}</button>
        ))}
        <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); const v = Number(custom); if (v > 0) { add(v); setCustom(""); } }}>
          <input className="input !min-h-8 !w-20 !rounded-full !px-3" placeholder="min" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} aria-label="Custom minutes" />
          <button className="chip !min-h-8" disabled={!custom}>add</button>
        </form>
      </div>
      {entries.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {entries.map((g) => (
            <li key={g._id}>
              <TwoTap className="chip !min-h-8" confirmText="Remove?" onConfirm={async () => {
                try { await api(`/game?id=${g._id}`, { method: "DELETE" }); await refresh(); } catch (e) { toast(e.message, "err"); }
              }}>
                {fmtMin(g.minutes)} <X className="size-3" aria-hidden />
              </TwoTap>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ══ Sleep ══ */
export function SleepEditor({ log, target, date, refresh }) {
  const toast = useToast();
  const [time, setTime] = useState("23:45");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await api("/sleep", { method: "POST", body: withDate({ time }, date) });
      toast(r.onTime ? "Down on time. Discipline." : "Logged — late night.", r.onTime ? "ok" : "err");
      await refresh();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function clear() {
    try {
      await api(`/sleep?x=1${qsDate(date)}`, { method: "DELETE" });
      toast("Bedtime cleared");
      await refresh();
    } catch (e) { toast(e.message, "err"); }
  }

  if (log)
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="mono-data text-[13.5px] font-medium text-cream">In bed at {log.time}</p>
        <div className="flex items-center gap-1.5">
          <span className={cx("stamp", log.onTime && "stamp-gold")}>{log.onTime ? "On time" : "Late"}</span>
          <TwoTap className="btn btn-ghost !min-h-8 !w-8 !p-0" confirmText="✕" onConfirm={clear}>
            <Trash2 className="size-3.5" aria-hidden />
          </TwoTap>
        </div>
      </div>
    );

  return (
    <div className="flex items-center gap-2">
      <input className="input !w-32" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Bedtime" />
      <button className="btn btn-gold flex-1" onClick={save} disabled={busy}>
        Log bedtime <span className="font-normal opacity-70">· by {target}</span>
      </button>
    </div>
  );
}

/* ══ Quality time ══ */
export function PeopleEditor({ entries, defaultPerson, date, refresh }) {
  const toast = useToast();
  const [person, setPerson] = useState(defaultPerson || "");
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!person.trim()) return;
    setBusy(true);
    try {
      await api("/person", { method: "POST", body: withDate({ person, minutes }, date) });
      toast(`${fmtMin(minutes)} with ${person.trim()} — logged`);
      await refresh();
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div>
      {entries.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {entries.map((p) => (
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
        <input className="input" placeholder={defaultPerson || "Who matters today?"} value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Person" />
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
    </div>
  );
}

/* ══ Targets ══ */
export function TargetsEditor({ tasks, date, refresh, emptyHint = "DSA sheet, portfolio fix, follow-up mail — write it, then hunt it." }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api("/tasks", { method: "POST", body: withDate({ title }, date) });
      setTitle("");
      await refresh();
    } catch (e2) { toast(e2.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div>
      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No targets set" hint={emptyHint} />
      ) : (
        <ul className="flex flex-col">
          {tasks.map((t) => (
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
        <input className="input" placeholder="Add a target" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="New target" />
        <button className="btn btn-line shrink-0" disabled={busy || !title.trim()} aria-label="Add target">
          <Plus className="size-4" />
        </button>
      </form>
    </div>
  );
}
