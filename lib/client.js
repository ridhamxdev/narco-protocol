"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export async function api(path, opts = {}) {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined" && location.pathname !== "/login") {
    location.href = "/login";
    throw new Error("Signed out");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const refresh = useCallback(
    async (silent = true) => {
      if (!silent) setLoading(true);
      try {
        const d = await api(path);
        if (alive.current) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive.current) setError(e.message);
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [path]
  );

  useEffect(() => {
    alive.current = true;
    refresh(false);
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  return { data, error, loading, refresh, setData };
}

export function fmtMin(min) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fmtDay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export const cx = (...parts) => parts.filter(Boolean).join(" ");
