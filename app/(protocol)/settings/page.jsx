"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Settings2, UserRound, Scale, ListChecks, Mail, LogOut, Plus, PencilLine,
  Trash2, Send, BellRing, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { api, useApi, cx, fmtMin } from "@/lib/client";
import { useToast } from "@/components/providers";
import { SectionHead, Field, Toggle, Stepper, Sheet, TwoTap, CardSkeleton } from "@/components/ui";

const TZS = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney",
];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default function ControlPage() {
  const { data, error, loading, refresh } = useApi("/settings");
  const toast = useToast();

  if (loading) return <div className="grid gap-4 md:grid-cols-2"><CardSkeleton lines={3} /><CardSkeleton lines={4} /><CardSkeleton lines={6} /><CardSkeleton lines={4} /></div>;
  if (error)
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="mono-data text-[13px] text-blood">{error}</p>
        <button className="btn btn-line mt-4" onClick={() => refresh(false)}>Try again</button>
      </div>
    );
  if (!data) return null;

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <IdentityCard data={data} refresh={refresh} />
      <RulesCard data={data} refresh={refresh} />
      <HabitsCard data={data} refresh={refresh} />
      <div className="grid gap-4">
        <MailCard data={data} refresh={refresh} />
        <SessionCard data={data} />
      </div>
    </div>
  );
}

function useSaver(refresh) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (body, msg = "Saved") => {
    setBusy(true);
    try {
      await api("/settings", { method: "PUT", body });
      toast(msg);
      await refresh();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };
  return { save, busy };
}

/* ── identity ── */
function IdentityCard({ data, refresh }) {
  const { save, busy } = useSaver(refresh);
  const [name, setName] = useState(data.user.name);
  const [person, setPerson] = useState(data.settings.personName || "");

  return (
    <section className="card" aria-label="Identity">
      <SectionHead icon={UserRound} title="Identity" />
      <div className="grid gap-3.5">
        <Field label="Your name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Quality-time default person">
          <input className="input" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Maa, best friend, her…" />
        </Field>
        <button
          className="btn btn-gold"
          disabled={busy || !name.trim()}
          onClick={() => save({ name, settings: { personName: person } }, "Identity updated")}
        >
          Save identity
        </button>
      </div>
    </section>
  );
}

/* ── the rules ── */
function RulesCard({ data, refresh }) {
  const { save, busy } = useSaver(refresh);
  const s = data.settings;
  const [apps, setApps] = useState(s.appsTarget);
  const [game, setGame] = useState(s.gameLimit);
  const [bed, setBed] = useState(s.bedTime);
  const [tz, setTz] = useState(s.tz);
  const tzList = useMemo(() => (TZS.includes(tz) ? TZS : [tz, ...TZS]), [tz]);

  return (
    <section className="card" aria-label="The rules">
      <SectionHead icon={Scale} title="The Rules" />
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-cream">Applications per day</p>
            <p className="text-[11.5px] text-faint">The daily quota. No negotiations.</p>
          </div>
          <Stepper value={apps} min={1} onDelta={(d) => setApps((v) => Math.max(1, v + d))} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-cream">Game leash</p>
            <p className="text-[11.5px] text-faint">Play past this and the day marks red.</p>
          </div>
          <Stepper value={game} unit="min" onDelta={(d) => setGame((v) => Math.max(0, v + d * 15))} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-cream">Lights out</p>
            <p className="text-[11.5px] text-faint">Bed by this time counts as on-time.</p>
          </div>
          <input className="input !w-28" type="time" value={bed} onChange={(e) => setBed(e.target.value)} aria-label="Lights out time" />
        </div>
        <Field label="Timezone">
          <select className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
            {tzList.map((z) => <option key={z}>{z}</option>)}
          </select>
        </Field>
        <button
          className="btn btn-gold"
          disabled={busy}
          onClick={() => save({ settings: { appsTarget: apps, gameLimit: game, bedTime: bed, tz } }, "Rules updated")}
        >
          Save rules
        </button>
      </div>
    </section>
  );
}

/* ── habits manager ── */
function HabitsCard({ data, refresh }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  async function toggleActive(h) {
    try {
      await api(`/habits/${h._id}`, { method: "PATCH", body: { active: !h.active } });
      toast(h.active ? `${h.name} switched off` : `${h.name} back on the ledger`);
      await refresh();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <section className="card md:col-span-1" aria-label="Habits">
      <SectionHead
        icon={ListChecks}
        title="Habits on the ledger"
        aside={
          <button className="btn btn-gold !min-h-8 !px-3 !text-[12px]" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> New habit
          </button>
        }
      />
      <ul className="flex flex-col">
        {data.habits.map((h) => (
          <li key={h._id} className={cx("flex items-center gap-3 border-b border-line/60 py-2.5 last:border-0", !h.active && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-cream">
                {h.name}
                {h.isSystem && <span className="ml-2 text-[10px] font-medium text-golddeep">system</span>}
              </p>
              <p className="mono-data truncate text-[11.5px] text-ash">
                {h.kind === "counter" ? `counter · target ${h.target}${h.unit ? " " + h.unit : ""}` : h.kind}
                {h.reminder ? ` · mail at ${h.reminder}` : " · no reminder"}
                {h.days !== "1111111" ? ` · ${h.days.split("").map((d, i) => (d === "1" ? DAY_LETTERS[i] : "")).join("")}` : ""}
              </p>
            </div>
            <button className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={() => setEditing(h)} aria-label={`Edit ${h.name}`}>
              <PencilLine className="size-4" />
            </button>
            <Toggle on={h.active} onChange={() => toggleActive(h)} label={`${h.name} active`} />
          </li>
        ))}
      </ul>
      <HabitSheet open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />
      <HabitSheet habit={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
    </section>
  );
}

function HabitSheet({ habit, open, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(habit);
  const [form, setForm] = useState({ name: "", kind: "check", target: 1, unit: "", reminder: "", days: "1111111" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (open) {
      setForm(
        habit
          ? { name: habit.name, kind: habit.kind, target: habit.target || 1, unit: habit.unit || "", reminder: habit.reminder || "", days: habit.days || "1111111" }
          : { name: "", kind: "check", target: 1, unit: "", reminder: "", days: "1111111" }
      );
    }
  }, [open, habit]);

  const isSystem = habit?.isSystem;
  const isCustomKind = form.kind === "check" || form.kind === "counter";

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isEdit) await api(`/habits/${habit._id}`, { method: "PATCH", body: form });
      else await api("/habits", { method: "POST", body: form });
      toast(isEdit ? "Habit updated" : `${form.name} added to the ledger`);
      onSaved();
    } catch (e2) {
      toast(e2.message, "err");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    try {
      await api(`/habits/${habit._id}`, { method: "DELETE" });
      toast("Habit removed");
      onSaved();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit habit" : "New habit"}>
      <form onSubmit={save} className="grid gap-3.5">
        <Field label="Name">
          <input className="input" value={form.name} onChange={set("name")} required placeholder="Read 20 pages, LeetCode, water…" />
        </Field>
        {!isEdit && (
          <Field label="Type">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-well p-1">
              {[["check", "Tick once"], ["counter", "Count up"]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, kind: k }))}
                  className={cx("rounded-lg py-2 text-[12.5px] font-semibold transition-colors", form.kind === k ? "bg-gold text-[#171106]" : "text-ash hover:text-cream")}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}
        {form.kind === "counter" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Daily target">
              <input className="input" type="number" min="1" value={form.target} onChange={set("target")} />
            </Field>
            <Field label="Unit">
              <input className="input" value={form.unit} onChange={set("unit")} placeholder="glasses, pages…" />
            </Field>
          </div>
        )}
        <Field label="Reminder mail (leave empty for none)">
          <input className="input" type="time" value={form.reminder} onChange={set("reminder")} />
        </Field>
        <Field label="Days on duty">
          <div className="flex gap-1.5">
            {DAY_LETTERS.map((L, i) => {
              const on = form.days[i] === "1";
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Day ${i + 1}`}
                  onClick={() => setForm((f) => ({ ...f, days: f.days.slice(0, i) + (on ? "0" : "1") + f.days.slice(i + 1) }))}
                  className={cx("grid size-9 place-items-center rounded-full border text-[12px] font-bold transition-colors", on ? "border-gold bg-gold/20 text-goldhi" : "border-line text-faint hover:border-linehi")}
                >
                  {L}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="mt-1 flex gap-2">
          {isEdit && !isSystem && (
            <TwoTap className="btn btn-line !text-blood" onConfirm={del} confirmText="Delete + logs?">
              <Trash2 className="size-4" /> Delete
            </TwoTap>
          )}
          <button className="btn btn-gold flex-1" disabled={busy || !form.name.trim()}>
            {isEdit ? "Save habit" : "Add to the ledger"}
          </button>
        </div>
        {isSystem && (
          <p className="text-[11.5px] leading-relaxed text-faint">
            System habits track themselves from their own logs — you can rename them, change
            reminders and days, or switch them off, but not delete them.
          </p>
        )}
      </form>
    </Sheet>
  );
}

/* ── mail line ── */
function MailCard({ data, refresh }) {
  const { save, busy } = useSaver(refresh);
  const toast = useToast();
  const s = data.settings;
  const [enabled, setEnabled] = useState(s.emailEnabled);
  const [email, setEmail] = useState(s.remindEmail || data.user.email);
  const [morning, setMorning] = useState(s.morningTime);
  const [evening, setEvening] = useState(s.eveningTime);
  const [nag, setNag] = useState(s.nagMin);
  const [testing, setTesting] = useState(false);
  const configured = data.mail.configured;

  async function test() {
    setTesting(true);
    try {
      const r = await api("/settings/test-email", { method: "POST" });
      toast(`Test mail sent to ${r.to}`);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card" aria-label="Reminder mails">
      <SectionHead
        icon={Mail}
        title="The mail line"
        aside={
          configured ? (
            <span className="flex items-center gap-1.5 font-semibold text-goldhi"><ShieldCheck className="size-3.5" aria-hidden /> armed</span>
          ) : (
            <span className="flex items-center gap-1.5 text-blood"><ShieldAlert className="size-3.5" aria-hidden /> not configured</span>
          )
        }
      />
      {!configured && (
        <p className="mb-4 rounded-lg border border-blood/30 bg-blood/[0.07] px-3 py-2.5 text-[12.5px] font-medium leading-relaxed text-blood">
          Set SMTP_USER and SMTP_PASS in .env (Gmail app password), then restart. Until then no
          reminders go out.
        </p>
      )}
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-cream">Reminder mails</p>
            <p className="text-[11.5px] text-faint">Briefs, nags and the evening summary.</p>
          </div>
          <Toggle on={enabled} onChange={() => setEnabled((v) => !v)} label="Reminder mails" />
        </div>
        <Field label="Send to">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Morning brief">
            <input className="input" type="time" value={morning} onChange={(e) => setMorning(e.target.value)} />
          </Field>
          <Field label="Evening summary">
            <input className="input" type="time" value={evening} onChange={(e) => setEvening(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-cream">Missed-call nag interval</p>
            <p className="text-[11.5px] text-faint">Repeats until the call is marked done.</p>
          </div>
          <Stepper value={nag} unit="min" min={5} onDelta={(d) => setNag((v) => Math.max(5, v + d * 5))} />
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-gold flex-1"
            disabled={busy}
            onClick={() => save({ settings: { emailEnabled: enabled, remindEmail: email, morningTime: morning, eveningTime: evening, nagMin: nag } }, "Mail line updated")}
          >
            <BellRing className="size-4" /> Save mail settings
          </button>
          <button className="btn btn-line" onClick={test} disabled={testing || !configured}>
            <Send className="size-4" /> {testing ? "Sending…" : "Test"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── session ── */
function SessionCard({ data }) {
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      location.href = "/login";
    }
  }
  return (
    <section className="card" aria-label="Session">
      <SectionHead icon={Settings2} title="Session" />
      <p className="text-[13px] text-ash">
        Signed in as <span className="font-semibold text-cream">{data.user.email}</span>
      </p>
      <button className="btn btn-line mt-4 w-full !text-blood" onClick={logout}>
        <LogOut className="size-4" /> Sign out
      </button>
    </section>
  );
}
