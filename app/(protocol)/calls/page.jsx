"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneMissed, PhoneCall, PhoneOutgoing, Plus, PencilLine, Trash2, RotateCcw } from "lucide-react";
import { api, useApi, cx, fmtDay } from "@/lib/client";
import { useToast } from "@/components/providers";
import { SectionHead, Sheet, Field, TwoTap, EmptyState, CardSkeleton } from "@/components/ui";

export default function CallsPage() {
  const { data, error, loading, refresh } = useApi("/calls");
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  async function done(c, value = true) {
    try {
      await api(`/calls/${c._id}`, { method: "PATCH", body: { done: value } });
      toast(value ? `Call to ${c.person} — closed` : `Call to ${c.person} reopened`);
      await refresh();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  const Row = ({ c, tone }) => (
    <li
      className={cx(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3",
        tone === "overdue" ? "overdue-pulse border-blood/50 bg-blood/10" : "border-line bg-well"
      )}
    >
      {tone === "overdue" ? (
        <PhoneMissed className="size-4 shrink-0 text-blood" aria-hidden />
      ) : tone === "done" ? (
        <PhoneOutgoing className="size-4 shrink-0 text-golddeep" aria-hidden />
      ) : (
        <PhoneCall className="size-4 shrink-0 text-golddeep" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className={cx("truncate text-[14px] font-semibold", tone === "done" ? "text-faint line-through" : "text-cream")}>
          {c.person}
        </p>
        <p className="mono-data truncate text-[10.5px] text-ash">
          {fmtDay(c.date)} · {c.time}
          {c.about ? ` · ${c.about}` : ""}
          {tone === "overdue" ? " · nagging you by mail" : ""}
        </p>
      </div>
      {c.phone && tone !== "done" && (
        <a href={`tel:${c.phone}`} className={cx("btn !min-h-8 !px-3.5 !text-[11.5px]", tone === "overdue" ? "btn-red" : "btn-line")}>
          Call now
        </a>
      )}
      {tone === "done" ? (
        <button className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={() => done(c, false)} aria-label={`Reopen call to ${c.person}`}>
          <RotateCcw className="size-4" />
        </button>
      ) : (
        <>
          <button className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={() => setEditing(c)} aria-label={`Edit call to ${c.person}`}>
            <PencilLine className="size-4" />
          </button>
          <button className="btn btn-line !min-h-8 !px-3 !text-[12px]" onClick={() => done(c)}>
            Done
          </button>
        </>
      )}
    </li>
  );

  if (loading) return <div className="grid gap-4"><CardSkeleton lines={4} /><CardSkeleton lines={3} /></div>;
  if (error)
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="mono-data text-[13px] text-blood">{error}</p>
        <button className="btn btn-line mt-4" onClick={() => refresh(false)}>Try again</button>
      </div>
    );

  const { overdue = [], upcoming = [], recent = [] } = data || {};

  return (
    <div className="grid gap-4">
      <section className="card">
        <SectionHead
          icon={Phone}
          title="Call-backs"
          aside={
            <button className="btn btn-gold !min-h-8 !px-3.5 !text-[12px]" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> New call
            </button>
          }
        />
        {overdue.length === 0 && upcoming.length === 0 ? (
          <EmptyState icon={Phone} title="Nothing owed" hint="Schedule follow-ups here. Miss one and the protocol nags your inbox until it's closed." />
        ) : (
          <div className="grid gap-4">
            {overdue.length > 0 && (
              <div>
                <p className="mono-data mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-blood">
                  Overdue — handle these first
                </p>
                <ul className="grid gap-2">{overdue.map((c) => <Row key={c._id} c={c} tone="overdue" />)}</ul>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="mono-data mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ash">Lined up</p>
                <ul className="grid gap-2">{upcoming.map((c) => <Row key={c._id} c={c} tone="upcoming" />)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="card">
          <SectionHead icon={PhoneOutgoing} title="Closed recently" aside={`${recent.length}`} />
          <ul className="grid gap-2">{recent.map((c) => <Row key={c._id} c={c} tone="done" />)}</ul>
        </section>
      )}

      <CallSheet open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} defaultDate={data?.now?.date} />
      <CallSheet call={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} defaultDate={data?.now?.date} />
    </div>
  );
}

function CallSheet({ call, open, onClose, onSaved, defaultDate }) {
  const toast = useToast();
  const isEdit = Boolean(call);
  const [form, setForm] = useState({ person: "", phone: "", about: "", date: "", time: "18:00" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (open) {
      setForm(
        call
          ? { person: call.person, phone: call.phone, about: call.about, date: call.date, time: call.time }
          : { person: "", phone: "", about: "", date: defaultDate || "", time: "18:00" }
      );
    }
  }, [open, call, defaultDate]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isEdit) await api(`/calls/${call._id}`, { method: "PATCH", body: form });
      else await api("/calls", { method: "POST", body: form });
      toast(isEdit ? "Call updated" : `Call to ${form.person} scheduled`);
      onSaved();
    } catch (e2) {
      toast(e2.message, "err");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    try {
      await api(`/calls/${call._id}`, { method: "DELETE" });
      toast("Call removed");
      onSaved();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit call" : "Schedule a call"}>
      <form onSubmit={save} className="grid gap-3.5">
        <Field label="Who">
          <input className="input" value={form.person} onChange={set("person")} required placeholder="HR at Zeta, Rahul bhai…" />
        </Field>
        <Field label="Phone (enables the Call button)">
          <input className="input" value={form.phone} onChange={set("phone")} placeholder="+91…" inputMode="tel" />
        </Field>
        <Field label="About">
          <input className="input" value={form.about} onChange={set("about")} placeholder="Interview follow-up, referral ask…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input className="input" type="date" value={form.date} onChange={set("date")} required />
          </Field>
          <Field label="Time">
            <input className="input" type="time" value={form.time} onChange={set("time")} required />
          </Field>
        </div>
        <div className="mt-1 flex gap-2">
          {isEdit && (
            <TwoTap className="btn btn-line !text-blood" onConfirm={del} confirmText="Delete?">
              <Trash2 className="size-4" /> Delete
            </TwoTap>
          )}
          <button className="btn btn-gold flex-1" disabled={busy || !form.person.trim()}>
            {isEdit ? "Save changes" : "Schedule"}
          </button>
        </div>
        <p className="text-[11.5px] leading-relaxed text-faint">
          Once the time passes, this shows up red on Today and repeats to your inbox every
          nag interval until you mark it done.
        </p>
      </form>
    </Sheet>
  );
}
