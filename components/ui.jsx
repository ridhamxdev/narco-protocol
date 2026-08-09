"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { cx } from "@/lib/client";

/* ── Section heading (the heading itself speaks ledger) ── */
export function SectionHead({ icon: Icon, title, aside, className }) {
  return (
    <div className={cx("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="ledger-head">
        {Icon && <Icon className="size-3.5 text-golddeep" aria-hidden />}
        {title}
      </h2>
      {aside && <div className="mono-data text-[11px] text-ash">{aside}</div>}
    </div>
  );
}

/* ── The Vault Row — segmented meter, one segment per real unit ── */
export function VaultRow({ segments, size = "md", className, animate = true }) {
  const h = size === "lg" ? "h-3.5" : size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={cx("flex w-full gap-[3px]", className)} role="presentation">
      {segments.map((s, i) => (
        <motion.div
          key={i}
          className={cx("flex-1 rounded-[3px]", h)}
          initial={animate ? { opacity: 0.55, scaleY: 0.5 } : false}
          animate={{
            opacity: 1,
            scaleY: 1,
            backgroundColor: s.danger
              ? "var(--color-blooddim)"
              : s.done
                ? "var(--color-gold)"
                : "#CBC3AF",
          }}
          transition={{
            delay: animate ? Math.min(i * 0.035, 0.9) : 0,
            type: "spring",
            stiffness: 420,
            damping: 30,
          }}
        />
      ))}
    </div>
  );
}

/* ── Animated numeral ── */
export function NumberTicker({ value, className }) {
  const spring = useSpring(value, { stiffness: 120, damping: 22 });
  const display = useTransform(spring, (v) => Math.round(v));
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  return <motion.span className={className}>{display}</motion.span>;
}

/* ── Tick checkbox ── */
export function TickBox({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cx(
        "grid size-[30px] shrink-0 place-items-center rounded-[8px] border transition-colors",
        checked ? "border-gold bg-gold" : "border-linehi bg-panel hover:border-gold",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            key="tick"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="#171106"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0, scale: 0.6 }}
            animate={{ pathLength: 1, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            <motion.path
              d="M4 12.5 9.5 18 20 6.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ── Stepper ── */
export function Stepper({ value, onDelta, unit, min = 0, disabled }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="btn btn-line !min-h-8 !w-8 !p-0"
        onClick={() => onDelta(-1)}
        disabled={disabled || value <= min}
        aria-label="Decrease"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="mono-data min-w-10 text-center text-[13px] text-cream">
        {value}
        {unit ? <span className="text-faint"> {unit}</span> : null}
      </span>
      <button
        type="button"
        className="btn btn-line !min-h-8 !w-8 !p-0"
        onClick={() => onDelta(1)}
        disabled={disabled}
        aria-label="Increase"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/* ── Toggle ── */
export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cx(
        "relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors",
        on ? "border-gold bg-gold/25" : "border-linehi bg-well",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <motion.span
        className={cx(
          "absolute top-[3px] size-[18px] rounded-full",
          on ? "bg-gold" : "bg-faint"
        )}
        animate={{ left: on ? 23 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/* ── Sheet (bottom on mobile, centered on desktop) ── */
export function Sheet({ open, onClose, title, children, wide }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      // keep Tab inside the dialog
      const focusables = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cx(
              "relative max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_16px_48px_rgb(28_25_18/0.18)] outline-none md:max-w-md md:rounded-2xl md:pb-5",
              wide && "md:max-w-xl"
            )}
            initial={{ y: "40%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "30%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="ledger-head">{title}</h2>
              <button type="button" className="btn btn-ghost !min-h-8 !w-8 !p-0" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Two-tap destructive confirm (no browser dialogs) ── */
export function TwoTap({ onConfirm, className, children, confirmText = "Sure?" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2600);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={cx(className, armed && "!border-blood !text-blood")}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? <span className="mono-data text-[11px]">{confirmText}</span> : children}
    </button>
  );
}

/* ── Empty state — an invitation to act ── */
export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-7 text-center">
      {Icon && <Icon className="size-5 text-golddeep" aria-hidden />}
      <p className="text-[13px] font-semibold text-cream">{title}</p>
      {hint && <p className="max-w-[30ch] text-[12.5px] leading-relaxed text-ash">{hint}</p>}
    </div>
  );
}

/* ── Skeleton loader ── */
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card">
      <div className="skeleton mb-4 h-3 w-28" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton mb-2.5 h-9 w-full" style={{ opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}

export function Field({ label, children, className }) {
  return (
    <label className={cx("block", className)}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
