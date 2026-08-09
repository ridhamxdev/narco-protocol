// ────────────────────────────────────────────────────────────────────
//  NARCO PROTOCOL — single server entrypoint
//  Runs the Next.js app + the email reminder scheduler in one process.
//    npm run dev     → dev mode          (needs MONGODB_URI in .env)
//    npm run demo    → in-memory MongoDB (throwaway data, zero setup)
//    npm run start   → production        (after `npm run build`)
//  On Vercel this file is not used — the scheduler runs through
//  GET /api/cron/tick instead (see README).
// ────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { createServer } from "http";
import os from "os";

const args = process.argv.slice(2);
const isProd = args.includes("--prod") || process.env.NODE_ENV === "production";
const useMemory = args.includes("--memory");

const GOLD = "\x1b[38;5;179m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

if (useMemory) {
  console.log(`${GOLD}◆ Starting in-memory MongoDB (demo mode)…${RESET}`);
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri("narco-protocol");
  console.log(`${RED}▲ DEMO MODE — data lives in RAM and dies with this process.${RESET}`);
  console.log(`${DIM}  Set MONGODB_URI in .env for real, persistent tracking.${RESET}`);
}

if (!process.env.MONGODB_URI) {
  console.error(`${RED}✖ MONGODB_URI is not set.${RESET}

  1. Create a free cluster at https://www.mongodb.com/cloud/atlas
  2. Put the connection string in .env →  MONGODB_URI=mongodb+srv://…
  3. Run again:  npm run dev

  Or try it instantly with throwaway data:  npm run demo
`);
  process.exit(1);
}

process.env.NODE_ENV = isProd ? "production" : "development";

const { default: next } = await import("next");
const app = next({ dev: !isProd, dir: import.meta.dirname });
await app.prepare();
const handle = app.getRequestHandler();
const upgrade = app.getUpgradeHandler();

const port = Number(process.env.PORT || 3000);
const server = createServer((req, res) => handle(req, res));
server.on("upgrade", (req, socket, head) => upgrade(req, socket, head));

server.listen(port, "0.0.0.0", () => {
  const nets = os.networkInterfaces();
  let lan = null;
  for (const list of Object.values(nets))
    for (const n of list || []) if (n.family === "IPv4" && !n.internal) lan ||= n.address;

  console.log(`
${GOLD}  ███╗   ██╗ █████╗ ██████╗  ██████╗ ██████╗
  ████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔═══██╗
  ██╔██╗ ██║███████║██████╔╝██║     ██║   ██║
  ██║╚██╗██║██╔══██║██╔══██╗██║     ██║   ██║
  ██║ ╚████║██║  ██║██║  ██║╚██████╗╚██████╔╝
  ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ${RESET}${DIM}PROTOCOL${RESET}

  ${GOLD}◆${RESET} local   http://localhost:${port}
  ${lan ? `${GOLD}◆${RESET} phone   http://${lan}:${port}  ${DIM}(same Wi-Fi)${RESET}` : ""}
  ${GOLD}◆${RESET} mode    ${isProd ? "production" : "development"}${useMemory ? `  ${RED}· DEMO (in-memory data)${RESET}` : ""}
  ${GOLD}◆${RESET} mail    ${process.env.SMTP_USER ? "SMTP configured — reminders armed" : `${DIM}not configured — set SMTP_USER / SMTP_PASS in .env${RESET}`}
`);
});

// ── Email reminder scheduler (every minute) ─────────────────────────
const { default: cron } = await import("node-cron");
let ticking = false;
cron.schedule("* * * * *", async () => {
  if (ticking) return;
  ticking = true;
  try {
    const { runTick } = await import("./lib/tick.js");
    const r = await runTick();
    if (r.sent?.length)
      console.log(`${GOLD}✉${RESET}`, r.sent.map((s) => `${s.kind}→${s.to}`).join(", "));
  } catch (e) {
    console.error("[tick]", e.message);
  } finally {
    ticking = false;
  }
});
