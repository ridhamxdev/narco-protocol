"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/client";
import { Field } from "@/components/ui";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: form,
      });
      location.href = "/";
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <motion.div
        className="w-full max-w-sm"
        initial={{ y: 14 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        <div className="mb-7 text-center">
          <p className="display-num text-[30px] text-cream">
            NARCO<span className="text-gold">.</span>
          </p>
          <p className="mt-1 text-[13px] text-ash">
            One scored ledger per day. The empire is built one day at a time.
          </p>
        </div>

        <form onSubmit={submit} className="card !p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-well p-1">
            {[
              ["login", "Sign in"],
              ["register", "Create account"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setMode(k);
                  setError("");
                }}
                className={
                  "rounded-lg py-2 text-[13px] font-semibold transition-colors " +
                  (mode === k ? "bg-panel text-cream shadow-sm" : "text-ash hover:text-cream")
                }
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <Field label="Name" className="mb-3.5">
              <input
                className="input"
                value={form.name}
                onChange={set("name")}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </Field>
          )}
          <Field label="Email" className="mb-3.5">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password" className="mb-5">
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              minLength={6}
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-blood/30 bg-blood/[0.07] px-3 py-2 text-[12.5px] font-medium text-blood"
            >
              {error}
            </p>
          )}

          <button className="btn btn-gold w-full" disabled={busy}>
            {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-[12px] text-faint">
          {mode === "login"
            ? "First time here? Switch to Create account."
            : "Your data stays in your own database."}
        </p>
      </motion.div>
    </main>
  );
}
