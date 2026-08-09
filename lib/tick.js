// ── The scheduler tick ──────────────────────────────────────────────
// Runs every minute locally (node-cron in server.js) and via
// GET /api/cron/tick on Vercel (external pinger / Vercel cron).
// All sends are "at-or-after with window + sent-once", so sparse
// ticks (every 5–10 min) still deliver exactly one email each.

import { dbConnect, User, Settings, Habit, Call, SleepLog } from "./db.js";
import { buildToday } from "./logic.js";
import { nowIn, protocolToday, minutesOf, nightMinutes } from "./time.js";
import { mailReady, sendBrand, sendOnce } from "./mailer.js";

export async function runTick() {
  await dbConnect();
  if (!mailReady()) return { ok: true, skipped: "smtp-not-configured" };

  const users = await User.find().lean();
  const sent = [];

  for (const user of users) {
    try {
      const n = await tickUser(user);
      sent.push(...n);
    } catch (e) {
      console.error("[tick]", user.email, e.message);
    }
  }
  return { ok: true, sent };
}

async function tickUser(user) {
  const sent = [];
  const settings = await Settings.findOne({ userId: user._id }).lean();
  if (!settings || !settings.emailEnabled) return sent;
  const to = settings.remindEmail || user.email;
  if (!to) return sent;

  const tz = settings.tz || "Asia/Kolkata";
  const now = nowIn(tz);
  const pdate = protocolToday(tz);
  const nm = now.minutes;
  const uid = user._id;

  let _today = null;
  const getToday = async () => (_today ||= await buildToday(user, settings));
  const within = (startMin, span) => startMin != null && nm >= startMin && nm <= startMin + span;
  const note = (kind) => sent.push({ kind, to });

  // 1) Morning brief
  if (within(minutesOf(settings.morningTime), 180)) {
    const did = await sendOnce(uid, `brief:${now.date}`, to, async () => {
      const t = await getToday();
      return {
        subject: `☀️ Day ${t.dayNo} — the protocol is live`,
        title: `Day ${t.dayNo}. ${t.quote}`,
        intro: `Here is today's protocol. ${t.apps.target} applications. No negotiations.`,
        rows: t.items.map((i) => ({ emoji: i.emoji, text: i.name + (i.target && i.kind !== "sleep" ? ` — ${i.value || 0}/${i.target}` : ""), done: i.done })),
        footer: "Morning brief · sent by your own orders",
      };
    });
    if (did) note("brief");
  }

  // 2) Per-habit reminders (only if still not done)
  const remHabits = await Habit.find({ userId: uid, active: true, reminder: { $nin: ["", null] } }).lean();
  for (const h of remHabits) {
    const r = minutesOf(h.reminder);
    if (!within(r, 120)) continue;
    const t = await getToday();
    const item = t.items.find((i) => i.habitId === String(h._id));
    if (!item || item.done) continue;
    const did = await sendOnce(uid, `habit:${h._id}:${pdate}`, to, async () => ({
      subject: `⏰ ${h.emoji} ${h.name} — it's time`,
      title: `${h.emoji} ${h.name}. Now.`,
      intro:
        h.kind === "apps"
          ? `You're at ${item.value}/${item.target} applications. The count is the count.`
          : `Scheduled for ${h.reminder}. Still open on today's ledger.`,
      rows: [],
      footer: `Day ${t.dayNo} · ${t.score.done}/${t.score.total} complete`,
    }));
    if (did) note(`habit:${h.name}`);
  }

  // 3) Evening summary (remaining items — or victory)
  if (within(minutesOf(settings.eveningTime), 240)) {
    const did = await sendOnce(uid, `evening:${now.date}`, to, async () => {
      const t = await getToday();
      const remaining = t.items.filter((i) => !i.done);
      if (remaining.length === 0) {
        return {
          subject: `👑 Day ${t.dayNo} conquered — 100%`,
          title: "PROTOCOL COMPLETE.",
          intro: `Every line on Day ${t.dayNo}'s ledger is closed. Streak: ${t.streak.current + 1} day(s). Sleep well — by ${t.sleep.target}.`,
          rows: [],
          footer: "Victory log · see you at dawn",
        };
      }
      return {
        subject: `🌙 ${remaining.length} item${remaining.length > 1 ? "s" : ""} standing between you and 100%`,
        title: `${remaining.length} open item${remaining.length > 1 ? "s" : ""} on the ledger.`,
        intro: `The day isn't closed yet. Finish the list, log it, then lights out by ${t.sleep.target}.`,
        rows: remaining.map((i) => ({
          emoji: i.emoji,
          text: i.name + (i.target && typeof i.value === "number" ? ` — ${i.value}/${i.target}` : ""),
          tag: "OPEN",
          tagColor: "#C6453A",
        })),
        footer: `Day ${t.dayNo} · currently ${t.score.pct}%`,
      };
    });
    if (did) note("evening");
  }

  // 4) Bed warning (30 min before lights-out, if bedtime not logged)
  {
    const bed = nightMinutes(settings.bedTime || "00:30");
    const warn = bed - 30;
    const nmAdj = nm < 300 ? nm + 1440 : nm;
    if (nmAdj >= warn && nmAdj <= bed + 90) {
      const slept = await SleepLog.findOne({ userId: uid, date: pdate }).lean();
      if (!slept) {
        const did = await sendOnce(uid, `bed:${pdate}`, to, async () => ({
          subject: `🛏️ 30 minutes to lights out`,
          title: "Wind down. Lights out soon.",
          intro: `Target is ${settings.bedTime}. Log your bedtime on the dashboard when you're down. Sleep is a weapon.`,
          rows: [],
          footer: "Night watch",
        }));
        if (did) note("bed");
      }
    }
  }

  // 5) Call-back nags — repeat every nagMin until the call is done
  {
    const pending = await Call.find({ userId: uid, status: "pending" }).lean();
    const overdue = pending.filter(
      (c) => c.date < now.date || (c.date === now.date && c.time <= now.hhmm)
    );
    const nagEvery = Math.max(5, settings.nagMin || 30) * 60000;
    for (const c of overdue) {
      if (Date.now() - (c.lastNag || 0) < nagEvery) continue;
      await sendBrand(to, `📞 CALL ${c.person.toUpperCase()} BACK — overdue`, {
        title: `Call ${c.person}. It's overdue.`,
        intro: `${c.about ? c.about + " · " : ""}was due ${c.date} at ${c.time}${c.phone ? " · " + c.phone : ""}. This email repeats every ${settings.nagMin || 30} min until you mark it done.`,
        rows: [],
        footer: "Missed calls are money on the table",
      });
      await Call.updateOne({ _id: c._id }, { $set: { lastNag: Date.now() } });
      note(`nag:${c.person}`);
    }
  }

  return sent;
}
