"use client";

/**
 * SettingsPanel — single nav-bar button that opens a popover containing:
 *   - Theme toggle (light / dark / system)
 *   - Locale toggle (US / World)
 *   - Quick gear: Tripod on/off + active lens chips (with add/remove)
 *
 * Replaces the old standalone ThemeToggle + LocaleToggle in the nav so
 * users can flip tripod/lens from any page (not just /planner).
 *
 * Broadcasts the SAME `ps:active-lenses-changed` event the planner listens
 * for, and writes to the same `ps_active_lens_ids` localStorage key, so
 * settings on /planner /dashboard etc. recompute live.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Settings as SettingsIcon, Sun, Moon, Monitor, Check, X, Plus } from "lucide-react";
import Link from "next/link";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { useLocale } from "@/lib/locale-context";
import { useGearProfile } from "@/lib/hooks";

const ACTIVE_KEY = "ps_active_lens_ids";

const themeModes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const { locale, toggleLocale } = useLocale();
  const { gear, updateGear, loaded } = useGearProfile();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize/sync active-lens set from localStorage + owned lenses
  useEffect(() => {
    if (!loaded) return;
    setActiveIds((prev) => {
      const ownedIds = gear.lenses.map((l) => l.id);
      let next: Set<string>;
      if (prev === null) {
        try {
          const raw = localStorage.getItem(ACTIVE_KEY);
          if (raw) {
            const arr = JSON.parse(raw) as string[];
            next = new Set(arr.filter((id) => ownedIds.includes(id)));
            if (next.size === 0) next = new Set(ownedIds);
          } else {
            next = new Set(ownedIds);
          }
        } catch {
          next = new Set(ownedIds);
        }
      } else {
        next = new Set<string>();
        for (const id of prev) if (ownedIds.includes(id)) next.add(id);
      }
      return next;
    });
  }, [loaded, gear.lenses]);

  // Listen for changes from QuickGearBar so this stays in sync
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(ACTIVE_KEY);
        if (raw) {
          const arr = JSON.parse(raw) as string[];
          setActiveIds(new Set(arr));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("ps:active-lenses-changed", handler);
    return () => window.removeEventListener("ps:active-lenses-changed", handler);
  }, []);

  const broadcastActive = (ids: Set<string>) => {
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(Array.from(ids)));
      window.dispatchEvent(new CustomEvent("ps:active-lenses-changed"));
    } catch {
      // ignore
    }
  };

  // Position popover anchored to the trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const margin = 8;
      const right = Math.max(margin, window.innerWidth - r.right);
      setPos({ top: r.bottom + 6, right });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeLenses = useMemo(
    () => (activeIds ? gear.lenses.filter((l) => activeIds.has(l.id)) : []),
    [gear.lenses, activeIds]
  );
  const inactiveLenses = useMemo(
    () => (activeIds ? gear.lenses.filter((l) => !activeIds.has(l.id)) : []),
    [gear.lenses, activeIds]
  );

  const toggleLens = (id: string, activate: boolean) => {
    setActiveIds((prev) => {
      const next = new Set(prev ?? []);
      if (activate) next.add(id);
      else next.delete(id);
      broadcastActive(next);
      return next;
    });
  };

  const toggleTripod = () => {
    updateGear({ hasTripod: !gear.hasTripod });
  };

  // Compact "indicator" on the trigger so users can see tripod state at a glance
  const indicatorText = `${gear.hasTripod ? "🦿" : ""}${activeLenses.length || "—"}`.trim();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer"
        style={{
          background: open ? "var(--golden-hour-subtle, rgba(255,180,80,0.15))" : "var(--dark-600)",
          border: "1px solid var(--dark-400)",
          color: open ? "var(--golden-hour)" : "var(--neutral-200)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
        aria-label="Open settings"
        aria-expanded={open}
        title="Settings, theme, units, gear"
      >
        <SettingsIcon size={13} strokeWidth={1.6} />
        <span className="hidden sm:inline">{indicatorText}</span>
      </button>

      {mounted && open && pos &&
        createPortal(
          <div
            ref={panelRef}
            className="rounded-xl p-3 w-[280px] sm:w-[320px]"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 9999,
              background: "var(--dark-800, #1a1a1a)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              color: "var(--neutral-100)",
            }}
          >
            {/* Theme */}
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1.5">
                Theme
              </div>
              <div
                className="flex items-center rounded-md overflow-hidden"
                style={{
                  background: "var(--dark-600)",
                  border: "1px solid var(--dark-400)",
                }}
                role="radiogroup"
              >
                {themeModes.map(({ value, icon: Icon, label }) => {
                  const isActive = theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className="flex-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      style={{
                        height: 30,
                        background: isActive ? "var(--golden-hour-subtle, rgba(255,180,80,0.15))" : "transparent",
                        color: isActive ? "var(--golden-hour)" : "var(--neutral-300)",
                        fontSize: 11,
                      }}
                      role="radio"
                      aria-checked={isActive}
                      aria-label={label}
                    >
                      <Icon size={12} strokeWidth={1.5} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Units */}
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1.5">
                Units
              </div>
              <button
                onClick={toggleLocale}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-colors cursor-pointer"
                style={{
                  background: "var(--dark-600)",
                  border: "1px solid var(--dark-400)",
                  fontSize: 12,
                  color: locale === "US" ? "var(--golden-hour)" : "var(--blue-hour)",
                }}
                title="Tap to switch"
              >
                <span>{locale === "US" ? "US — °F · 12h · miles" : "World — °C · 24h · km"}</span>
                <span className="opacity-50 text-[10px]">tap to switch</span>
              </button>
            </div>

            {/* Gear */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-wider opacity-60">
                  Gear
                </div>
                <Link
                  href="/gear"
                  onClick={() => setOpen(false)}
                  className="text-[10px] underline opacity-70 hover:opacity-100"
                >
                  Manage
                </Link>
              </div>

              {/* Tripod */}
              <button
                onClick={toggleTripod}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-colors cursor-pointer mb-2"
                style={{
                  background: gear.hasTripod
                    ? "var(--golden-hour-subtle, rgba(255,180,80,0.15))"
                    : "var(--dark-600)",
                  border: `1px solid ${gear.hasTripod ? "var(--golden-hour, #f59e0b)" : "var(--dark-400)"}`,
                  fontSize: 12,
                  color: gear.hasTripod ? "var(--golden-hour)" : "var(--neutral-300)",
                }}
                aria-pressed={gear.hasTripod}
                title="Toggle tripod for shutter/ISO recommendations"
              >
                <span className="flex items-center gap-1.5">
                  {gear.hasTripod ? <Check size={13} /> : null}
                  🦿 Tripod {gear.hasTripod ? "On" : "Off"}
                </span>
                <span className="opacity-60 text-[10px]">
                  {gear.hasTripod ? "long exposures OK" : "handheld speeds"}
                </span>
              </button>

              {/* Active lenses */}
              <div className="text-[10px] opacity-60 mb-1">Active lenses</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {activeLenses.length === 0 && (
                  <span className="text-[11px] opacity-50 italic">None active</span>
                )}
                {activeLenses.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => toggleLens(l.id, false)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] cursor-pointer"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--neutral-100)",
                    }}
                    title="Click to deactivate for this session"
                  >
                    <span>{`${l.make} ${l.model}`.trim() || `${l.focal_length_min}-${l.focal_length_max}mm`}</span>
                    <X size={10} className="opacity-60" />
                  </button>
                ))}
              </div>

              {/* Inactive lenses */}
              {inactiveLenses.length > 0 && (
                <>
                  <div className="text-[10px] opacity-60 mb-1">Inactive (tap to activate)</div>
                  <div className="flex flex-wrap gap-1">
                    {inactiveLenses.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => toggleLens(l.id, true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] cursor-pointer"
                        style={{
                          background: "transparent",
                          border: "1px dashed rgba(255,255,255,0.2)",
                          color: "var(--neutral-400)",
                        }}
                      >
                        <Plus size={10} />
                        <span>{`${l.make} ${l.model}`.trim() || `${l.focal_length_min}-${l.focal_length_max}mm`}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
