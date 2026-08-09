<div align="center">

# NARCO // PROTOCOL

**Personal discipline operating system — one scored ledger per day.**

*The empire is built one day at a time.*

![Next.js](https://img.shields.io/badge/Next.js_15-0C0A07?style=for-the-badge&logo=nextdotjs&logoColor=D9A441)
![React 19](https://img.shields.io/badge/React_19-0C0A07?style=for-the-badge&logo=react&logoColor=D9A441)
![MongoDB](https://img.shields.io/badge/MongoDB-0C0A07?style=for-the-badge&logo=mongodb&logoColor=D9A441)
![Tailwind v4](https://img.shields.io/badge/Tailwind_v4-0C0A07?style=for-the-badge&logo=tailwindcss&logoColor=D9A441)
![JWT](https://img.shields.io/badge/JWT_auth-0C0A07?style=for-the-badge&logo=jsonwebtokens&logoColor=D9A441)

</div>

---

Built for one job: hold the line every single day while hunting for the next role.
Every obligation is a gold bar slotted into the day's vault row — fill them all and the
day is **conquered**.

## What it tracks

| Module | The rule |
|---|---|
| 🎯 **Mission** | 10 job applications a day (company, role, link, source, status pipeline) |
| 🙏 **Worship** | Daily, first thing |
| 🏋️ **Iron** | Gym every day — type, minutes, streaks |
| 🥣 **Fuel** | Oats breakfast + clean, no-oil meals logged all day |
| 📞 **Call-backs** | Miss one and it **emails you every 30 min until you close it** |
| ☑️ **Targets** | Ad-hoc daily to-dos |
| 🎮 **Game leash** | Max 2 h/day — breach marks the day red |
| 😴 **Lights out** | In bed by 00:30 (the day flips at 05:00, so 00:40 still counts for tonight) |
| ❤️ **Quality time** | Time with the people who matter — name + minutes |

Everything is scored into a daily percentage, a perfect-day streak, a 14-week conquest
heatmap, and per-habit streak boards. Custom habits (tick-once or counters) can be added,
scheduled per weekday, and given their own reminder mails from **Settings → Control**.

## The mail line (nodemailer)

- ☀️ **Morning brief** — the day's full protocol at your chosen hour
- ⏰ **Habit reminders** — per-habit, only if still not done
- 📞 **Call nags** — repeat every N minutes until the call is marked done
- 🌙 **Evening summary** — what's still standing between you and 100 % (or a victory mail)
- 🛏️ **Bed warning** — 30 minutes before lights-out

## Quick start

```bash
npm install
npm run demo        # zero setup — throwaway in-memory DB, try everything
```

For real, persistent tracking:

```bash
cp .env.example .env    # then fill it in (see below)
npm run dev             # development
npm run build && npm start   # production
```

Open **http://localhost:3000**, create the first account (signups auto-close after the
first one unless `ALLOW_SIGNUP=true`). The console prints a LAN URL — open it on your
phone on the same Wi-Fi; the app is fully mobile-first and installable (Add to Home Screen).

## Environment

| Var | What |
|---|---|
| `MONGODB_URI` | MongoDB connection string ([Atlas free tier](https://www.mongodb.com/cloud/atlas)) |
| `JWT_SECRET` | Long random string — signs the auth cookies |
| `CRON_SECRET` | Protects `/api/cron/tick` (the scheduler endpoint) |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + **App Password** (Google Account → Security → 2-Step Verification → App passwords) |
| `SMTP_HOST` / `SMTP_PORT` | Optional — any custom SMTP instead of Gmail |
| `PORT` | Local port (default 3000) |
| `ALLOW_SIGNUP` | `true` to keep registrations open |

## Architecture

```
server.js            ← the single local entrypoint: Next.js + node-cron scheduler
lib/                 ← db (Mongoose models) · logic (day scoring engine) · tick (scheduler) · mailer
app/api/…            ← JWT-guarded route handlers (works locally AND on Vercel)
app/(protocol)/…     ← Today · Pipeline · Calls · Ledger · Control
middleware.js        ← auth redirects
```

Locally, `server.js` runs the email scheduler every minute. On **Vercel** there is no
long-lived process, so the same scheduler is exposed at:

```
GET /api/cron/tick        Authorization: Bearer <CRON_SECRET>   (or ?key=<CRON_SECRET>)
```

All sends are windowed + deduplicated, so sparse pings still deliver exactly one mail each.

## Deploy on Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add the env vars above (at minimum `MONGODB_URI`, `JWT_SECRET`, `CRON_SECRET`, `SMTP_USER`, `SMTP_PASS`).
3. For minute-level reminders, point a free pinger ([cron-job.org](https://cron-job.org)) at
   `https://<your-app>.vercel.app/api/cron/tick?key=<CRON_SECRET>` every 5 minutes.
   (Vercel's built-in daily cron also hits it as a fallback for the morning brief.)

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server + scheduler (needs `MONGODB_URI`) |
| `npm run demo` | Dev server with throwaway in-memory MongoDB |
| `npm run build` | Production build |
| `npm start` | Production server + scheduler |

---

<div align="center">

**Ten applications. No excuses. The count is the count.**

</div>
