import nodemailer from "nodemailer";
import { EmailLog } from "./db.js";

let _transport = null;
let _checked = false;

export function getTransport() {
  if (_checked) return _transport;
  _checked = true;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT || 465);
    _transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else if (SMTP_USER && SMTP_PASS) {
    _transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _transport;
}

export function mailReady() {
  return Boolean(getTransport());
}

// ── Branded HTML template (matches the clean light app) ─────────────
const AMBER = "#D9A441";
const AMBER_INK = "#8A5F1B";
const PAPER = "#F2EFE9";
const INK = "#211D15";
const INK2 = "#6E675A";

export function brandEmail({ title, intro = "", rows = [], footer = "" }) {
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 14px;border-bottom:1px solid #EDE9E0;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${r.done ? "#9C947F" : INK};${r.done ? "text-decoration:line-through;" : ""}">
            ${r.emoji ? r.emoji + "&nbsp; " : ""}${escapeHtml(r.text)}
          </span>
          ${r.tag ? `<span style="float:right;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${r.tagColor || AMBER_INK};font-weight:bold;">${escapeHtml(r.tag)}</span>` : ""}
        </td>
      </tr>`
    )
    .join("");

  return `
  <div style="background:${PAPER};padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
      <tr><td style="padding:0 4px 12px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${INK};">NARCO<span style="color:${AMBER};">.</span></span>
      </td></tr>
      <tr><td style="background:#FFFFFF;border:1px solid #E7E3DA;border-radius:12px;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="height:4px;background:${AMBER};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:22px 20px 6px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:22px;line-height:1.2;color:${INK};">${escapeHtml(title)}</div>
            ${intro ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${INK2};padding-top:8px;line-height:1.55;">${escapeHtml(intro)}</div>` : ""}
          </td></tr>
          ${rows.length ? `<tr><td style="padding:14px 8px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table></td></tr>` : ""}
          <tr><td style="padding:16px 20px 20px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${INK2};">${escapeHtml(footer || "Open the dashboard. Log it. Move.")}</span>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:12px 4px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${INK2};">The empire is built one day at a time.</span>
      </td></tr>
    </table>
  </div>`;
}

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendBrand(to, subject, tpl) {
  const t = getTransport();
  if (!t) throw new Error("SMTP not configured");
  await t.sendMail({
    from: { name: "NARCO PROTOCOL", address: process.env.SMTP_USER },
    to,
    subject,
    html: brandEmail(tpl),
  });
}

// Send exactly once per (user, key) — safe under sparse cron ticks
export async function sendOnce(userId, key, to, build) {
  try {
    await EmailLog.create({ userId, key });
  } catch (e) {
    if (e.code === 11000) return false; // already sent
    throw e;
  }
  try {
    const { subject, ...tpl } = await build();
    await sendBrand(to, subject, tpl);
    return true;
  } catch (e) {
    await EmailLog.deleteOne({ userId, key }).catch(() => {});
    throw e;
  }
}
