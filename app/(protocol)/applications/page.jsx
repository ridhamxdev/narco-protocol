"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, ExternalLink, Search, PencilLine, Trash2 } from "lucide-react";
import { api, useApi, cx, fmtDay } from "@/lib/client";
import { useToast } from "@/components/providers";
import { SectionHead, VaultRow, Sheet, Field, TwoTap, EmptyState, CardSkeleton, NumberTicker } from "@/components/ui";
import { StatRow } from "@/components/viz";

const STATUSES = ["applied", "replied", "interview", "offer", "rejected"];
const STATUS_TONE = {
  applied: "text-ash border-line",
  replied: "text-goldhi border-gold/60",
  interview: "text-goldhi border-gold bg-gold/10",
  offer: "text-[#211D15] !bg-gold border-gold font-bold",
  rejected: "text-blood border-blood/50",
};
const SOURCES = ["LinkedIn", "Naukri", "Referral", "Company site", "Wellfound", "Other"];

export default function PipelinePage() {
  const { data, error, loading, refresh } = useApi("/applications");
  const today = useApi("/today");
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const apps = data?.apps || [];
  const counts = useMemo(() => {
    const c = { all: apps.length };
    for (const s of STATUSES) c[s] = apps.filter((a) => a.status === s).length;
    return c;
  }, [apps]);

  const shown = useMemo(() => {
    let list = apps;
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((a) => (a.company + " " + a.role).toLowerCase().includes(needle));
    }
    return list;
  }, [apps, filter, q]);

  async function setStatus(app, status) {
    try {
      await api(`/applications/${app._id}`, { method: "PATCH", body: { status } });
      toast(`${app.company} → ${status}`);
      await refresh();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  const t = today.data;

  return (
    <div className="grid gap-4">
      <section className="card">
        <SectionHead
          icon={Briefcase}
          title="Pipeline"
          aside={
            t && (
              <span>
                today <span className="font-bold text-goldhi">{t.apps.count}/{t.apps.target}</span>
              </span>
            )
          }
        />
        {t && (
          <VaultRow
            className="mb-4"
            segments={Array.from({ length: t.apps.target }, (_, i) => ({ done: i < t.apps.count }))}
          />
        )}
        <StatRow
          stats={[
            { label: "All time", value: apps.length },
            { label: "Replied", value: counts.replied },
            { label: "Interview", value: counts.interview },
            { label: "Offers", value: counts.offer },
            { label: "Rejected", value: counts.rejected },
          ]}
        />
        <button className="btn btn-gold mt-4 w-full sm:w-auto" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Log application
        </button>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {["all", ...STATUSES].map((s) => (
              <button key={s} type="button" className="chip capitalize" data-on={filter === s} onClick={() => setFilter(s)}>
                {s} <span className="text-faint">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
          <label className="relative ml-auto block w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
            <input className="input !pl-9" placeholder="Search company or role" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search applications" />
          </label>
        </div>

        {loading ? (
          <CardSkeleton lines={5} />
        ) : error ? (
          <p className="mono-data text-[13px] text-blood">{error}</p>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={apps.length === 0 ? "The pipeline is empty" : "Nothing matches"}
            hint={apps.length === 0 ? "Ten a day. Log the first one and the empire starts moving." : "Clear the search or pick another status."}
          />
        ) : (
          <ul className="flex flex-col">
            {shown.map((a) => (
              <li key={a._id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/60 py-3 last:border-0">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate text-[14.5px] font-semibold text-cream">
                    {a.company}
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noreferrer" className="ml-2 inline-block align-middle text-faint hover:text-gold" aria-label={`Open ${a.company} posting`}>
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="mono-data truncate text-[12px] text-ash">
                    {a.role || "—"} {a.source ? `· ${a.source}` : ""} · {fmtDay(a.date)}
                  </p>
                </div>
                <select
                  className={cx("input !min-h-8 !w-auto shrink-0 !rounded-full !border !bg-panel !py-1 !pl-3 !pr-8 !text-[12px] font-semibold capitalize", STATUS_TONE[a.status])}
                  value={a.status}
                  onChange={(e) => setStatus(a, e.target.value)}
                  aria-label={`Status of ${a.company}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button className="btn btn-ghost !min-h-8 !w-8 shrink-0 !p-0 opacity-60 group-hover:opacity-100" onClick={() => setEditing(a)} aria-label={`Edit ${a.company}`}>
                  <PencilLine className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AppSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => { setAdding(false); refresh(); today.refresh(); }}
      />
      <AppSheet
        app={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh(); }}
      />
    </div>
  );
}

function AppSheet({ app, open, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(app);
  const [form, setForm] = useState({ company: "", role: "", link: "", source: "LinkedIn", notes: "", status: "applied" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // seed form when opening
  useEffect(() => {
    if (open) {
      setForm(
        app
          ? { company: app.company, role: app.role, link: app.link, source: app.source || "LinkedIn", notes: app.notes, status: app.status }
          : { company: "", role: "", link: "", source: "LinkedIn", notes: "", status: "applied" }
      );
    }
  }, [open, app]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isEdit) await api(`/applications/${app._id}`, { method: "PATCH", body: form });
      else await api("/applications", { method: "POST", body: form });
      toast(isEdit ? "Application updated" : `${form.company} logged`);
      onSaved();
    } catch (e2) {
      toast(e2.message, "err");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    try {
      await api(`/applications/${app._id}`, { method: "DELETE" });
      toast("Application removed");
      onSaved();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit application" : "Log application"}>
      <form onSubmit={save} className="grid gap-3.5">
        <Field label="Company">
          <input className="input" value={form.company} onChange={set("company")} required placeholder="Company" />
        </Field>
        <Field label="Role">
          <input className="input" value={form.role} onChange={set("role")} placeholder="SDE-1, Full-stack…" />
        </Field>
        <Field label="Posting link">
          <input className="input" value={form.link} onChange={set("link")} placeholder="https://…" inputMode="url" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <select className="input" value={form.source} onChange={set("source")}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input capitalize" value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input min-h-20 resize-y py-2.5" value={form.notes} onChange={set("notes")} placeholder="Referral name, salary range, follow-up date…" />
        </Field>
        <div className="mt-1 flex gap-2">
          {isEdit && (
            <TwoTap className="btn btn-line !text-blood" onConfirm={del} confirmText="Delete for good?">
              <Trash2 className="size-4" /> Delete
            </TwoTap>
          )}
          <button className="btn btn-gold flex-1" disabled={busy || !form.company.trim()}>
            {isEdit ? "Save changes" : "Log it"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
