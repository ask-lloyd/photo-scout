"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, X, Check } from "lucide-react";
import { useGearProfile } from "@/lib/hooks";

/**
 * Quick-edit gear bar for the planner.
 * - Tripod toggle (one tap, persists to profile)
 * - Lens chips for each owned lens, with × to "deactivate" for this session
 * - "+ Add lens" popover lists OWNED lenses currently inactive (not the catalog)
 *
 * Active-lens state is session-only (component state). Removing a lens here
 * does NOT remove it from the gear profile — it just hides it from the planner.
 *
 * Mobile-first: chips wrap, all hit targets ≥ 36px tall.
 */
export function QuickGearBar() {
  const { gear, updateGear, loaded } = useGearProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Session-only active set. Default = all owned lenses.
  // Persisted to localStorage so the planner page can read which lenses
  // are active and recompute settings live when toggled.
  // Stored as Set<string>; null sentinel means "not yet initialized".
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);

  const ACTIVE_KEY = "ps_active_lens_ids";
  const broadcastActive = (ids: Set<string>) => {
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(Array.from(ids)));
      window.dispatchEvent(new CustomEvent("ps:active-lenses-changed"));
    } catch {
      // ignore
    }
  };

  // Initialize / sync active set when profile finishes loading or owned lenses change.
  useEffect(() => {
    if (!loaded) return;
    setActiveIds((prev) => {
      const ownedIds = gear.lenses.map((l) => l.id);
      let next: Set<string>;
      if (prev === null) {
        // Try restoring from storage; otherwise default to all owned
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
        // Drop any active ids that are no longer owned
        next = new Set<string>();
        for (const id of prev) if (ownedIds.includes(id)) next.add(id);
      }
      broadcastActive(next);
      return next;
    });
  }, [loaded, gear.lenses]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Position the popover anchored to the trigger button (portaled to body)
  useEffect(() => {
    if (!pickerOpen || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const width = 288; // w-72
      const margin = 8;
      let left = r.left;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - width - margin);
      }
      setPickerPos({ top: r.bottom + 4, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [pickerOpen]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current && pickerRef.current.contains(target)) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [pickerOpen]);

  const activeLenses = useMemo(
    () => (activeIds ? gear.lenses.filter((l) => activeIds.has(l.id)) : []),
    [gear.lenses, activeIds]
  );
  const inactiveLenses = useMemo(
    () => (activeIds ? gear.lenses.filter((l) => !activeIds.has(l.id)) : []),
    [gear.lenses, activeIds]
  );

  if (!loaded || activeIds === null) return null;

  const cameraName = gear.camera ? `${gear.camera.make} ${gear.camera.model}` : "No camera";

  const deactivateLens = (id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      broadcastActive(next);
      return next;
    });
  };
  const activateLens = (id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      broadcastActive(next);
      return next;
    });
    setPickerOpen(false);
  };
  const toggleTripod = () => {
    updateGear({ hasTripod: !gear.hasTripod });
  };

  return (
    <div className="glass rounded-xl p-3 sm:p-4 mb-6">
      {/* Top row: label + change-gear link */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-[var(--neutral-300)] font-semibold">
          Your Gear
        </span>
        <Link
          href="/gear"
          className="text-orange-500 text-xs hover:text-orange-400 transition-colors cursor-pointer"
        >
          Manage Gear →
        </Link>
      </div>

      {/* Chips row — wraps on mobile */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Camera (read-only here) */}
        <span className="px-3 py-1.5 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs sm:text-sm whitespace-nowrap">
          📷 {cameraName}
        </span>

        {/* Active lens chips */}
        {activeLenses.map((l) => (
          <span
            key={l.id}
            className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs sm:text-sm whitespace-nowrap"
          >
            🔭 {l.make} {l.model}
            <button
              onClick={() => deactivateLens(l.id)}
              className="w-5 h-5 rounded-full hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              aria-label={`Remove ${l.model} from this session`}
              title="Hide from this session"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* + Add lens (only owned, currently-inactive lenses) */}
        {gear.lenses.length > 0 && (
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={() => setPickerOpen((v) => !v)}
              disabled={inactiveLenses.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#262626] hover:bg-[#333] text-[var(--neutral-200)] text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer border border-dashed border-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                inactiveLenses.length === 0
                  ? "All your lenses are already shown"
                  : "Add a lens from your profile"
              }
            >
              <Plus size={14} /> Add lens
            </button>
            {mounted && pickerOpen && pickerPos && inactiveLenses.length > 0 &&
              createPortal(
                <div
                  ref={pickerRef}
                  className="fixed w-72 max-h-64 overflow-y-auto rounded-xl p-1"
                  style={{
                    top: pickerPos.top,
                    left: pickerPos.left,
                    zIndex: 9999,
                    background: "var(--popover, #1a1a1a)",
                    color: "var(--popover-foreground, #fff)",
                    border: "1px solid var(--border, rgba(255,255,255,0.08))",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                  }}
                >
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider opacity-60">
                    Your lenses
                  </div>
                  {inactiveLenses.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => activateLens(l.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      {l.make} {l.model}
                    </button>
                  ))}
                </div>,
                document.body
              )}
          </div>
        )}

        {/* No lenses on profile yet */}
        {gear.lenses.length === 0 && (
          <Link
            href="/gear"
            className="px-3 py-1.5 rounded-full bg-[#262626] text-[var(--neutral-300)] text-xs sm:text-sm whitespace-nowrap border border-dashed border-neutral-600 hover:text-[var(--neutral-200)] transition-colors"
          >
            + Add lenses on Gear page
          </Link>
        )}

        {/* Tripod toggle */}
        <button
          onClick={toggleTripod}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
            gear.hasTripod
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-[#262626] text-[var(--neutral-300)] border border-neutral-600 hover:text-[var(--neutral-200)]"
          }`}
          aria-pressed={gear.hasTripod}
        >
          {gear.hasTripod ? <Check size={14} /> : null}
          🦿 Tripod {gear.hasTripod ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
