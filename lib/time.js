// ── Time & timezone helpers ─────────────────────────────────────────
// All "protocol days" flip at 05:00 local time, not midnight — so logging
// your bedtime at 00:40 still counts toward the day you're closing.

const PROTOCOL_SHIFT_MS = 5 * 3600 * 1000;
export const DEFAULT_TZ = "Asia/Kolkata";

export function tzParts(tz = DEFAULT_TZ, d = new Date()) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
  const parts = {};
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hhmm = `${parts.hour}:${parts.minute}`;
  return { date, hhmm, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// The date of "today" for protocol purposes (flips at 05:00 local)
export function protocolToday(tz) {
  return tzParts(tz, new Date(Date.now() - PROTOCOL_SHIFT_MS)).date;
}

// Real local calendar date + clock (for reminders & call due times)
export function nowIn(tz) {
  return tzParts(tz);
}

// Monday = 0 … Sunday = 6 (for habit day masks)
export function dowMon0(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
  return (day + 6) % 7;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * 86400000);
  return t.toISOString().slice(0, 10);
}

export function diffDays(a, b) {
  const toMs = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(a) - toMs(b)) / 86400000);
}

export function minutesOf(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Bedtimes between 00:00–04:59 count as "late night of the previous day":
// map them past midnight so 00:30 (1470) compares after 23:00 (1380).
export function nightMinutes(hhmm) {
  const m = minutesOf(hhmm);
  if (m == null) return null;
  return m < 300 ? m + 1440 : m;
}

export function isBedOnTime(loggedHHMM, targetHHMM) {
  const l = nightMinutes(loggedHHMM);
  const t = nightMinutes(targetHHMM || "00:30");
  if (l == null || t == null) return false;
  return l <= t;
}

export function fmtDateLong(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}
