"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { SettingsPanel } from "@/components/settings-panel";
import { useActivity } from "@/lib/activity-context";
import { ACTIVITIES, ACTIVITY_LIST } from "@/lib/activities";

export function NavHeader({ locationName = "Locating…" }: { locationName?: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const { activity, setActivity, openPicker } = useActivity();

  const currentActivity = ACTIVITIES[activity];
  const navItems = currentActivity.nav;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="mx-auto px-4 h-14 flex items-center justify-between" style={{ maxWidth: 960 }}>
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img src="/icons/logomark.svg" alt="ConditionsScout" width={28} height={28} />
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "var(--white)" }}>Conditions</span>
            <span style={{ color: currentActivity.color }}>Scout</span>
          </span>
        </Link>

        {/* Activity switcher */}
        <div className="relative">
          <button
            onClick={() => setActivityMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 12,
              color: "var(--neutral-200)",
            }}
          >
            <span className="text-sm">{currentActivity.icon}</span>
            <span className="hidden sm:inline">{currentActivity.label}</span>
            <ChevronDown size={12} />
          </button>
          {activityMenuOpen && (
            <div
              className="absolute left-0 mt-1 w-56 rounded-xl p-1 z-50"
              style={{
                background: "var(--dark-800, #1a1a1a)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              {ACTIVITY_LIST.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setActivity(a.id);
                    setActivityMenuOpen(false);
                    window.location.href = a.homePath;
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                  style={{
                    background: a.id === activity ? "rgba(255,255,255,0.06)" : "transparent",
                    color: "var(--neutral-200)",
                    fontSize: 13,
                  }}
                >
                  <span className="text-base">{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
              <button
                onClick={() => {
                  setActivityMenuOpen(false);
                  openPicker();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg cursor-pointer"
                style={{ color: "var(--neutral-300)", fontSize: 12 }}
              >
                Show picker again
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  ...(isActive
                    ? {
                        color: currentActivity.color,
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${currentActivity.color}40`,
                      }
                    : {
                        color: "var(--neutral-300)",
                        border: "1px solid transparent",
                      }),
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:block"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--neutral-300)",
            }}
          >
            {locationName}
          </div>
          <SettingsPanel />
          <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-sm text-[var(--neutral-200)]">
            RB
          </div>
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 text-[var(--neutral-300)] hover:text-[var(--white)] transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden"
          style={{
            background: "var(--dark-800)",
            borderTop: "1px solid var(--dark-600)",
          }}
        >
          <div className="mx-auto px-4 py-2 flex flex-col gap-1" style={{ maxWidth: 960 }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg transition-colors"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    ...(isActive
                      ? {
                          color: currentActivity.color,
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${currentActivity.color}40`,
                        }
                      : {
                          color: "var(--neutral-300)",
                          border: "1px solid transparent",
                        }),
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
