"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/planner", label: "Shot Planner" },
  { href: "/gear", label: "Gear" },
];

export function NavHeader({ locationName = "Georgetown, TX" }: { locationName?: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="mx-auto px-4 h-14 flex items-center justify-between" style={{ maxWidth: 960 }}>
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img src="/icons/logomark.svg" alt="PhotoScout" width={28} height={28} />
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "var(--white)" }}>Photo</span>
            <span style={{ color: "var(--golden-hour)" }}>Scout</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
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
                        color: "var(--golden-hour)",
                        background: "var(--golden-hour-subtle)",
                        border: "1px solid rgba(212, 135, 45, 0.2)",
                      }
                    : {
                        color: "var(--neutral-300)",
                        border: "1px solid transparent",
                      }),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = "var(--golden-hour-light)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = "var(--neutral-300)";
                  }
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
          <ThemeToggle />
          <LocaleToggle />
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
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
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
                          color: "var(--golden-hour)",
                          background: "var(--golden-hour-subtle)",
                          border: "1px solid rgba(212, 135, 45, 0.2)",
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
