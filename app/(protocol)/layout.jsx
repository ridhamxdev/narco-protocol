"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, CalendarDays, Briefcase, Phone, BookOpen, Settings2, LogOut } from "lucide-react";
import { api, cx } from "@/lib/client";

const NAV = [
  { href: "/", label: "Today", icon: Crosshair },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/applications", label: "Pipeline", icon: Briefcase },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/progress", label: "Progress", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export default function ProtocolShell({ children }) {
  const pathname = usePathname();

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      location.href = "/login";
    }
  }

  return (
    <div className="min-h-dvh md:pl-56">
      {/* ── desktop rail ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-line bg-panel md:flex">
        <Link href="/" className="px-6 pb-2 pt-7">
          <span className="display-num block text-[24px] leading-none text-cream">
            NARCO<span className="text-gold">.</span>
          </span>
          <span className="text-[10.5px] font-medium tracking-[0.14em] text-ash">PROTOCOL</span>
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors",
                  active ? "bg-panel2 text-goldhi" : "text-ash hover:bg-panel2/60 hover:text-cream"
                )}
              >
                <Icon className={cx("size-[17px]", active ? "text-gold" : "text-faint")} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mx-3 mb-6 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-ash transition-colors hover:bg-panel2/60 hover:text-blood"
        >
          <LogOut className="size-[17px]" aria-hidden />
          Sign out
        </button>
      </aside>

      {/* ── content ── */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-5 md:px-8 md:pb-16 md:pt-8">
        {children}
      </main>

      {/* ── mobile tab bar ── */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around pt-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1.5",
                  active ? "text-goldhi" : "text-faint active:text-ash"
                )}
              >
                <Icon className="size-[19px]" aria-hidden />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
