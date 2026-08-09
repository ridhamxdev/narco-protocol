// ── The Protocol engine ─────────────────────────────────────────────
// Composes a day from every tracker, scores it, computes streaks.
// Used by /api/today, /api/stats and the email scheduler.

import {
  Habit,
  HabitLog,
  Application,
  Call,
  Task,
  FoodLog,
  GymLog,
  GameLog,
  SleepLog,
  PersonLog,
  SmokeLog,
} from "./db.js";
import {
  DEFAULT_TZ,
  protocolToday,
  nowIn,
  dowMon0,
  addDays,
  diffDays,
  isBedOnTime,
  tzParts,
} from "./time.js";

export const MEALS = ["breakfast", "lunch", "snacks", "dinner"];

export const QUOTES = [
  "The empire is built on days nobody claps for.",
  "Ten applications. No excuses. The count is the count.",
  "You don't negotiate with the protocol.",
  "Pray like it's given. Work like it's not.",
  "Oats over oil. Fuel, not entertainment.",
  "Every missed call is money left on the table.",
  "Sleep is a weapon. Holster it by half past midnight.",
  "Two hours of play. Not a minute of surrender more.",
  "Streaks are silent wealth.",
  "Show up. Log it. Repeat.",
  "Rejection is volume work. Keep shipping yourself.",
  "Small ticks, massive ledgers.",
  "Nobody is coming. Good — more for you.",
  "Discipline is choosing the same thing every day until it pays.",
];

export const SYSTEM_SEEDS = [
  { kind: "apps", name: "Applications", emoji: "🎯", reminder: "10:30", sort: 1 },
  { kind: "check", name: "Worship", emoji: "🙏", reminder: "07:30", sort: 2 },
  { kind: "gym", name: "Gym", emoji: "🏋️", reminder: "18:00", sort: 3 },
  { kind: "oats", name: "Oats breakfast", emoji: "🥣", reminder: "08:30", sort: 4 },
  { kind: "clean", name: "Clean fuel", emoji: "🥗", reminder: "", sort: 5 },
  { kind: "game", name: "Game discipline", emoji: "🎮", reminder: "", sort: 6 },
  { kind: "sleep", name: "Lights out", emoji: "😴", reminder: "", sort: 7 },
  { kind: "person", name: "Quality time", emoji: "❤️", reminder: "20:30", sort: 8 },
  { kind: "calls", name: "Calls cleared", emoji: "📞", reminder: "", sort: 9 },
];

export async function seedHabitsFor(userId) {
  const docs = SYSTEM_SEEDS.map((s) => ({ ...s, userId, isSystem: true }));
  await Habit.insertMany(docs);
}

export function habitKey(h) {
  const computed = ["apps", "gym", "oats", "clean", "game", "sleep", "person", "calls"];
  return computed.includes(h.kind) ? h.kind : String(h._id);
}

// ── Compose one day into scored items ───────────────────────────────
// ctx: { settings, habits, hlogs, appsCount, gym, food, gameSum, sleep,
//        personCount, tasks:{done,total}, calls:[...], overduePending }
export function composeDay(date, ctx) {
  const { settings, habits } = ctx;
  const dow = dowMon0(date);
  const items = [];

  for (const h of habits) {
    if (!h.active) continue;
    if ((h.days || "1111111")[dow] === "0") continue;
    const base = {
      key: habitKey(h),
      habitId: String(h._id),
      kind: h.kind,
      name: h.name,
      emoji: h.emoji,
      isSystem: !!h.isSystem,
    };
    switch (h.kind) {
      case "apps": {
        const v = ctx.appsCount || 0;
        const t = settings.appsTarget || 10;
        items.push({ ...base, done: v >= t, value: v, target: t });
        break;
      }
      case "gym": {
        items.push({
          ...base,
          done: !!ctx.gym,
          value: ctx.gym?.minutes || 0,
          detail: ctx.gym?.type || "",
        });
        break;
      }
      case "oats": {
        items.push({ ...base, done: !!ctx.food?.breakfast?.oats });
        break;
      }
      case "clean": {
        const meals = MEALS.map((m) => ctx.food?.[m]).filter(Boolean);
        items.push({
          ...base,
          done: meals.length >= 2 && meals.every((m) => m.clean),
          value: meals.filter((m) => m.clean).length,
          target: meals.length || 2,
        });
        break;
      }
      case "game": {
        const v = ctx.gameSum || 0;
        const t = settings.gameLimit ?? 120;
        const logged = (ctx.gameCount || 0) > 0;
        // Log-to-tick: only counts as done once a session is logged AND it's under the leash.
        items.push({ ...base, done: logged && v <= t, value: v, target: t, logged });
        break;
      }
      case "sleep": {
        const l = ctx.sleep;
        items.push({
          ...base,
          done: !!l && isBedOnTime(l.time, settings.bedTime),
          value: l?.time || "",
          target: settings.bedTime || "00:30",
        });
        break;
      }
      case "person": {
        items.push({ ...base, done: (ctx.personCount || 0) > 0, value: ctx.personCount || 0 });
        break;
      }
      case "calls": {
        const list = ctx.calls || [];
        const over = ctx.overduePending || 0;
        if (list.length === 0 && over === 0) break; // no calls that day — not scored
        const doneCount = list.filter((c) => c.status === "done").length;
        items.push({
          ...base,
          done: doneCount === list.length && over === 0,
          value: doneCount,
          target: list.length || doneCount,
        });
        break;
      }
      case "counter": {
        const v = ctx.hlogs?.[String(h._id)]?.value || 0;
        items.push({ ...base, done: v >= (h.target || 1), value: v, target: h.target || 1, unit: h.unit || "" });
        break;
      }
      default: {
        items.push({ ...base, done: !!ctx.hlogs?.[String(h._id)] });
      }
    }
  }

  if ((ctx.tasks?.total || 0) > 0) {
    items.push({
      key: "tasks",
      kind: "tasks",
      name: "Targets",
      emoji: "☑️",
      done: ctx.tasks.done >= ctx.tasks.total,
      value: ctx.tasks.done,
      target: ctx.tasks.total,
    });
  }

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  return { items, done, total, pct: total ? Math.round((100 * done) / total) : 0 };
}

// ── Range compose (heatmap, streaks, stats) ─────────────────────────
export async function buildRangeDays(user, settings, habits, daysN) {
  const tz = settings.tz || DEFAULT_TZ;
  const today = protocolToday(tz);
  const seasonStart = startOf(user, settings);
  let from = addDays(today, -(daysN - 1));
  if (diffDays(from, seasonStart) < 0) from = seasonStart;
  if (diffDays(from, today) > 0) return []; // season hasn't started yet
  const userId = user._id;
  const range = { $gte: from, $lte: today };

  const [hlogs, apps, gyms, foods, games, sleeps, persons, tasks, calls, pendingCalls, smokes] =
    await Promise.all([
      HabitLog.find({ userId, date: range }).lean(),
      Application.find({ userId, date: range }, { date: 1 }).lean(),
      GymLog.find({ userId, date: range }).lean(),
      FoodLog.find({ userId, date: range }).lean(),
      GameLog.find({ userId, date: range }).lean(),
      SleepLog.find({ userId, date: range }).lean(),
      PersonLog.find({ userId, date: range }, { date: 1 }).lean(),
      Task.find({ userId, date: range }).lean(),
      Call.find({ userId, date: range }).lean(),
      Call.find({ userId, status: "pending" }).lean(),
      settings.trackSmoking ? SmokeLog.find({ userId, date: range }).lean() : Promise.resolve([]),
    ]);

  const by = (arr) => {
    const m = {};
    for (const x of arr) (m[x.date] ||= []).push(x);
    return m;
  };
  const hlogsBy = by(hlogs);
  const appsBy = by(apps);
  const gymBy = by(gyms);
  const foodBy = by(foods);
  const gameBy = by(games);
  const sleepBy = by(sleeps);
  const personBy = by(persons);
  const taskBy = by(tasks);
  const callBy = by(calls);
  const smokeBy = by(smokes);

  const now = nowIn(tz);
  const overdueNow = pendingCalls.filter(
    (c) => c.date < now.date || (c.date === now.date && c.time <= now.hhmm)
  ).length;

  const out = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const foodMap = {};
    for (const f of foodBy[d] || []) foodMap[f.meal] = f;
    const hlogMap = {};
    for (const l of hlogsBy[d] || []) hlogMap[String(l.habitId)] = l;
    const dayTasks = taskBy[d] || [];
    const isToday = d === today;
    const ctx = {
      settings,
      habits,
      hlogs: hlogMap,
      appsCount: (appsBy[d] || []).length,
      gym: (gymBy[d] || [])[0] || null,
      food: foodMap,
      gameSum: (gameBy[d] || []).reduce((s, g) => s + g.minutes, 0),
      gameCount: (gameBy[d] || []).length,
      sleep: (sleepBy[d] || [])[0] || null,
      personCount: (personBy[d] || []).length,
      tasks: { done: dayTasks.filter((t) => t.done).length, total: dayTasks.length },
      calls: callBy[d] || [],
      overduePending: isToday ? overdueNow : 0,
    };
    const scored = composeDay(d, ctx);
    const itemsByKey = {};
    for (const i of scored.items) itemsByKey[i.key] = i.done;
    out.push({
      date: d,
      pct: scored.pct,
      done: scored.done,
      total: scored.total,
      itemsByKey,
      extras: {
        apps: ctx.appsCount,
        gymMin: ctx.gym?.minutes || 0,
        gymType: ctx.gym?.type || "",
        gymDone: !!ctx.gym,
        mealsLogged: Object.keys(foodMap).length,
        cleanDone: itemsByKey.clean ?? false,
        gameMin: ctx.gameSum,
        cigs: settings.trackSmoking ? (smokeBy[d] || []).reduce((s, x) => s + (x.count || 0), 0) : null,
        sleepState: ctx.sleep ? (isBedOnTime(ctx.sleep.time, settings.bedTime) ? 1 : 0) : -1,
        sleepTime: ctx.sleep?.time || "",
        tasksDone: ctx.tasks.done,
        tasksTotal: ctx.tasks.total,
        kcal: Object.values(foodMap).reduce((s, f) => s + (f.kcal || 0), 0),
        protein: Object.values(foodMap).reduce((s, f) => s + (f.protein || 0), 0),
        carbs: Object.values(foodMap).reduce((s, f) => s + (f.carbs || 0), 0),
        fat: Object.values(foodMap).reduce((s, f) => s + (f.fat || 0), 0),
      },
    });
  }
  return out;
}

export function perfectStreak(days) {
  let best = 0;
  let run = 0;
  for (const d of days) {
    if (d.total > 0 && d.pct === 100) {
      run++;
      if (run > best) best = run;
    } else run = 0;
  }
  let current = 0;
  let i = days.length - 1;
  // today still in progress shouldn't break the chain
  if (i >= 0 && !(days[i].total > 0 && days[i].pct === 100)) i--;
  for (; i >= 0; i--) {
    if (days[i].total > 0 && days[i].pct === 100) current++;
    else break;
  }
  return { current, best };
}

export function keyStreak(days, key) {
  let best = 0;
  let run = 0;
  for (const d of days) {
    const v = d.itemsByKey[key];
    if (v === undefined) continue; // not scheduled that day — neutral
    if (v) {
      run++;
      if (run > best) best = run;
    } else run = 0;
  }
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && d0(days[i])) i--;
  for (; i >= 0; i--) {
    const v = days[i].itemsByKey[key];
    if (v === undefined) continue;
    if (v) current++;
    else break;
  }
  return { current, best };

  function d0(day) {
    const v = day.itemsByKey[key];
    return v === undefined || v === false; // today unfinished doesn't break
  }
}

// Resolve an optional client-supplied date for a write: default today,
// clamp inside [season start, today]
export function clampDate(input, user, settings) {
  const today = protocolToday(settings.tz || DEFAULT_TZ);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input || "")) return today;
  const start = startOf(user, settings);
  if (diffDays(input, start) < 0 || diffDays(input, today) > 0) {
    const err = new Error("Date is outside the season (start date → today)");
    err.status = 400;
    throw err;
  }
  return input;
}

// Protocol Day 1 — an explicit start date from Settings, else the signup day
export function startOf(user, settings) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(settings.startDate || "")) return settings.startDate;
  return tzParts(settings.tz || DEFAULT_TZ, new Date(user.createdAt)).date;
}

export function dayNumber(user, settings) {
  return diffDays(protocolToday(settings.tz || DEFAULT_TZ), startOf(user, settings)) + 1;
}

// ── Today payload (dashboard) ───────────────────────────────────────
export async function buildToday(user, settings) {
  const tz = settings.tz || DEFAULT_TZ;
  const today = protocolToday(tz);
  const now = nowIn(tz);
  const userId = user._id;

  const habits = await Habit.find({ userId }).sort({ sort: 1, createdAt: 1 }).lean();
  const activeHabits = habits.filter((h) => h.active);

  const [hlogs, appsCount, recentApps, gym, foods, games, sleep, lastSleep, persons, tasks, pendingCalls, callsToday, smoke] =
    await Promise.all([
      HabitLog.find({ userId, date: today }).lean(),
      Application.countDocuments({ userId, date: today }),
      Application.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      GymLog.findOne({ userId, date: today }).lean(),
      FoodLog.find({ userId, date: today }).lean(),
      GameLog.find({ userId, date: today }).sort({ at: 1 }).lean(),
      SleepLog.findOne({ userId, date: today }).lean(),
      SleepLog.findOne({ userId, date: addDays(today, -1) }).lean(),
      PersonLog.find({ userId, date: today }).sort({ at: 1 }).lean(),
      Task.find({ userId, date: today }).sort({ createdAt: 1 }).lean(),
      Call.find({ userId, status: "pending" }).sort({ date: 1, time: 1 }).lean(),
      Call.find({ userId, date: now.date }).sort({ time: 1 }).lean(),
      settings.trackSmoking ? SmokeLog.findOne({ userId, date: today }).lean() : Promise.resolve(null),
    ]);

  const foodMap = {};
  for (const f of foods) foodMap[f.meal] = f;
  const hlogMap = {};
  for (const l of hlogs) hlogMap[String(l.habitId)] = l;

  const overdue = pendingCalls.filter(
    (c) => c.date < now.date || (c.date === now.date && c.time <= now.hhmm)
  );
  const dueLater = pendingCalls.filter((c) => c.date === now.date && c.time > now.hhmm);
  const upcoming = pendingCalls.filter((c) => c.date > now.date).slice(0, 5);

  const gameSum = games.reduce((s, g) => s + g.minutes, 0);

  const ctx = {
    settings,
    habits: activeHabits,
    hlogs: hlogMap,
    appsCount,
    gym,
    food: foodMap,
    gameSum,
    gameCount: games.length,
    sleep,
    personCount: persons.length,
    tasks: { done: tasks.filter((t) => t.done).length, total: tasks.length },
    calls: callsToday,
    overduePending: overdue.length,
  };
  const scored = composeDay(today, ctx);

  const rangeDays = await buildRangeDays(user, settings, habits, 90);
  const streak = perfectStreak(rangeDays);
  const gymStreak = keyStreak(rangeDays, "gym");
  const last7 = rangeDays.slice(-7);

  const dayNo = dayNumber(user, settings);
  const seasonStart = startOf(user, settings);

  return {
    date: today,
    realDate: now.date,
    hhmm: now.hhmm,
    dayNo,
    preStart: diffDays(today, seasonStart) < 0,
    startsOn: seasonStart,
    quote: QUOTES[(dayNo - 1 + QUOTES.length) % QUOTES.length],
    user: { name: user.name },
    score: { pct: scored.pct, done: scored.done, total: scored.total },
    streak,
    items: scored.items,
    apps: { count: appsCount, target: settings.appsTarget || 10, recent: recentApps },
    calls: { overdue, dueLater, upcoming },
    tasks,
    food: foodMap,
    nutrition: {
      kcal: foods.reduce((s, f) => s + (f.kcal || 0), 0),
      protein: foods.reduce((s, f) => s + (f.protein || 0), 0),
      carbs: foods.reduce((s, f) => s + (f.carbs || 0), 0),
      fat: foods.reduce((s, f) => s + (f.fat || 0), 0),
    },
    gym: {
      today: gym,
      streak: gymStreak.current,
      week: last7.filter((d) => d.extras.gymDone).length,
    },
    game: { minutes: gameSum, limit: settings.gameLimit ?? 120, entries: games },
    smoking: { track: !!settings.trackSmoking, count: smoke?.count || 0 },
    sleep: {
      target: settings.bedTime || "00:30",
      today: sleep ? { time: sleep.time, onTime: isBedOnTime(sleep.time, settings.bedTime) } : null,
      last: lastSleep
        ? { date: lastSleep.date, time: lastSleep.time, onTime: isBedOnTime(lastSleep.time, settings.bedTime) }
        : null,
    },
    person: { default: settings.personName || "", entries: persons },
    settings: {
      bedTime: settings.bedTime,
      gameLimit: settings.gameLimit,
      appsTarget: settings.appsTarget,
      personName: settings.personName,
      tz,
    },
  };
}

// ── One day in full detail (calendar page) ──────────────────────────
export async function buildDayDetail(user, settings, date) {
  const tz = settings.tz || DEFAULT_TZ;
  const today = protocolToday(tz);
  const now = nowIn(tz);
  const userId = user._id;

  const habits = await Habit.find({ userId }).sort({ sort: 1, createdAt: 1 }).lean();
  const [hlogs, apps, gym, foods, games, sleep, persons, tasks, calls, pendingCalls, smoke] =
    await Promise.all([
      HabitLog.find({ userId, date }).lean(),
      Application.find({ userId, date }).sort({ createdAt: 1 }).lean(),
      GymLog.findOne({ userId, date }).lean(),
      FoodLog.find({ userId, date }).lean(),
      GameLog.find({ userId, date }).sort({ at: 1 }).lean(),
      SleepLog.findOne({ userId, date }).lean(),
      PersonLog.find({ userId, date }).sort({ at: 1 }).lean(),
      Task.find({ userId, date }).sort({ createdAt: 1 }).lean(),
      Call.find({ userId, date }).sort({ time: 1 }).lean(),
      date === today ? Call.find({ userId, status: "pending" }).lean() : Promise.resolve([]),
      settings.trackSmoking ? SmokeLog.findOne({ userId, date }).lean() : Promise.resolve(null),
    ]);

  const foodMap = {};
  for (const f of foods) foodMap[f.meal] = f;
  const hlogMap = {};
  for (const l of hlogs) hlogMap[String(l.habitId)] = l;
  const overdue =
    date === today
      ? pendingCalls.filter((c) => c.date < now.date || (c.date === now.date && c.time <= now.hhmm)).length
      : 0;

  const gameSum = games.reduce((s, g) => s + g.minutes, 0);
  const scored = composeDay(date, {
    settings,
    habits: habits.filter((h) => h.active),
    hlogs: hlogMap,
    appsCount: apps.length,
    gym,
    food: foodMap,
    gameSum,
    gameCount: games.length,
    sleep,
    personCount: persons.length,
    tasks: { done: tasks.filter((t) => t.done).length, total: tasks.length },
    calls,
    overduePending: overdue,
  });

  return {
    date,
    isToday: date === today,
    ...scored,
    sleepTarget: settings.bedTime || "00:30",
    personDefault: settings.personName || "",
    appsTarget: settings.appsTarget || 10,
    detail: {
      apps,
      tasks,
      food: foodMap,
      gym,
      game: { entries: games, minutes: gameSum, limit: settings.gameLimit ?? 120 },
      smoking: { track: !!settings.trackSmoking, count: smoke?.count || 0 },
      sleep: sleep ? { time: sleep.time, onTime: isBedOnTime(sleep.time, settings.bedTime) } : null,
      persons,
      calls,
      nutrition: {
        kcal: foods.reduce((s, f) => s + (f.kcal || 0), 0),
        protein: foods.reduce((s, f) => s + (f.protein || 0), 0),
        carbs: foods.reduce((s, f) => s + (f.carbs || 0), 0),
        fat: foods.reduce((s, f) => s + (f.fat || 0), 0),
      },
    },
  };
}

// ── Stats payload (progress page) ───────────────────────────────────
export async function buildStats(user, settings, daysN = 98) {
  const userId = user._id;
  const habits = await Habit.find({ userId }).sort({ sort: 1, createdAt: 1 }).lean();
  const days = await buildRangeDays(user, settings, habits, daysN);

  const [appsTotal, byStatusRaw] = await Promise.all([
    Application.countDocuments({ userId }),
    Application.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
  ]);
  const byStatus = {};
  for (const s of byStatusRaw) byStatus[s._id] = s.n;

  const streaks = [];
  streaks.push({ key: "perfect", name: "Perfect days", emoji: "👑", ...perfectStreak(days) });
  for (const h of habits.filter((x) => x.active)) {
    streaks.push({ key: habitKey(h), name: h.name, emoji: h.emoji, ...keyStreak(days, habitKey(h)) });
  }

  // gym weeks (last 8, Monday-start)
  const weeks = [];
  {
    const buckets = new Map();
    for (const d of days) {
      const monday = addDays(d.date, -dowMon0(d.date));
      if (!buckets.has(monday)) buckets.set(monday, { label: monday.slice(5), sessions: 0, minutes: 0 });
      const b = buckets.get(monday);
      if (d.extras.gymDone) {
        b.sessions++;
        b.minutes += d.extras.gymMin;
      }
    }
    const keys = [...buckets.keys()].sort();
    for (const k of keys.slice(-8)) weeks.push(buckets.get(k));
  }

  const last7 = days.slice(-7);

  // Quit-smoking summary (only when tracking is on)
  let smoking = { track: false };
  if (settings.trackSmoking) {
    const logged = days.filter((d) => d.extras.cigs != null);
    const withData = logged.filter((d) => d.extras.cigs > 0);
    const total = logged.reduce((s, d) => s + (d.extras.cigs || 0), 0);
    smoking = {
      track: true,
      total,
      thisWeek: last7.reduce((s, d) => s + (d.extras.cigs || 0), 0),
      smokeFreeDays: logged.filter((d) => d.extras.cigs === 0).length,
      worstDay: Math.max(0, ...logged.map((d) => d.extras.cigs || 0)),
      perDay: withData.length ? Math.round((10 * total) / withData.length) / 10 : 0,
      cleanStreak: smokeFreeStreak(logged),
    };
  }

  return {
    // full per-day track — powers the trend charts, the data table and CSV export
    days: days.map((d) => ({
      date: d.date,
      pct: d.pct,
      done: d.done,
      total: d.total,
      apps: d.extras.apps,
      gymMin: d.extras.gymMin,
      gymType: d.extras.gymType,
      gameMin: d.extras.gameMin,
      cigs: d.extras.cigs,
      sleep: d.extras.sleepState,
      sleepTime: d.extras.sleepTime,
      clean: d.extras.mealsLogged === 0 ? -1 : d.extras.cleanDone ? 1 : 0,
      meals: d.extras.mealsLogged,
      tasksDone: d.extras.tasksDone,
      tasksTotal: d.extras.tasksTotal,
      kcal: d.extras.kcal,
      protein: d.extras.protein,
      carbs: d.extras.carbs,
      fat: d.extras.fat,
    })),
    apps: {
      total: appsTotal,
      byStatus,
      bestDay: Math.max(0, ...days.map((d) => d.extras.apps)),
      thisWeek: last7.reduce((s, d) => s + d.extras.apps, 0),
    },
    streaks,
    gym: { weeks },
    game: { limit: settings.gameLimit ?? 120 },
    smoking,
  };
}

// Current run of consecutive most-recent smoke-free days (0 cigarettes)
function smokeFreeStreak(loggedDays) {
  let run = 0;
  for (let i = loggedDays.length - 1; i >= 0; i--) {
    if (loggedDays[i].extras.cigs === 0) run++;
    else break;
  }
  return run;
}
