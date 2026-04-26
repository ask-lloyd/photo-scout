"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, X, Check } from "lucide-react";
import { useGearProfile, useLenses } from "@/lib/hooks";
import type { Lens } from "@/lib/types";

/**
 * Quick-edit gear bar for the planner.
 * - Tripod toggle (one tap)
 * - Lens chips with × to remove
 * - "+ Add lens" popover to swap in a lens from the catalog
 *
 * Mobile-first: chips wrap, all hit targets ≥ 36px tall.
 */
export function QuickGearBar() {
  const { gear, updateGear, loaded } = useGearProfile();
  const allLenses = useLenses();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

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
      // Keep within viewport horizontally
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

  if (!loaded) return null;

  const cameraName = gear.camera ? `${gear.camera.make} ${gear.camera.model}` : "No camera";
  const ownedLensIds = new Set(gear.lenses.map((l) => l.id));
  const availableLenses = allLenses
    .filter((l) => !ownedLensIds.has(l.id))
    .sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));

  const removeLens = (id: string) => {
    updateGear({ lenses: gear.lenses.filter((l) => l.id !== id) });
  };
  const addLens = (lens: Lens) => {
    updateGear({ lenses: [...gear.lenses, lens] });
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
          Full Gear →
        </Link>
      </div>

      {/* Chips row — wraps on mobile */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Camera (read-only here) */}
        <span className="px-3 py-1.5 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs sm:text-sm whitespace-nowrap">
          📷 {cameraName}
        </span>

        {/* Lens chips */}
        {gear.lenses.map((l) => (
          <span
            key={l.id}
            className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-[#262626] text-[var(--neutral-200)] text-xs sm:text-sm whitespace-nowrap"
          >
            🔭 {l.make} {l.model}
            <button
              onClick={() => removeLens(l.id)}
              className="w-5 h-5 rounded-full hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              aria-label={`Remove ${l.model}`}
              title="Remove"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* + Add lens */}
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#262626] hover:bg-[#333] text-[var(--neutral-200)] text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer border border-dashed border-neutral-600"
          >
            <Plus size={14} /> Add lens
          </button>
          {mounted && pickerOpen && pickerPos &&
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
                {availableLenses.length === 0 ? (
                  <div className="p-3 text-xs">
                    No more lenses available. Add lenses on the{" "}
                    <Link href="/gear" className="text-orange-500 underline">
                      Gear page
                    </Link>
                    .
                  </div>
                ) : (
                  availableLenses.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => addLens(l)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      {l.make} {l.model}
                    </button>
                  ))
                )}
              </div>,
              document.body
            )}
        </div>

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
