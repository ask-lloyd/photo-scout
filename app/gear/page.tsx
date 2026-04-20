"use client";

import { useGearProfile, useCameras, useLenses } from "@/lib/hooks";
import { NavHeader } from "@/components/nav-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { Camera } from "@/lib/types";

const SHOOTING_STYLES = [
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
  { id: "action", label: "Action / Sports" },
  { id: "astro", label: "Astrophotography" },
  { id: "street", label: "Street" },
  { id: "wildlife", label: "Wildlife" },
];

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  landscape: { bg: "bg-green-500/20", text: "text-green-400" },
  nature: { bg: "bg-green-500/20", text: "text-green-400" },
  street: { bg: "bg-blue-500/20", text: "text-blue-400" },
  travel: { bg: "bg-blue-500/20", text: "text-blue-400" },
  portrait: { bg: "bg-purple-500/20", text: "text-[13px]urple-400" },
  studio: { bg: "bg-purple-500/20", text: "text-[13px]urple-400" },
  action: { bg: "bg-orange-500/20", text: "text-orange-400" },
  sports: { bg: "bg-orange-500/20", text: "text-orange-400" },
  wildlife: { bg: "bg-orange-500/20", text: "text-orange-400" },
  astro: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  macro: { bg: "bg-teal-500/20", text: "text-teal-400" },
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag] || { bg: "bg-neutral-500/20", text: "text-[var(--neutral-200)]" };
}

function formatSensorSize(s: string) {
  if (s === "full_frame") return "Full Frame";
  if (s === "apsc") return "APS-C";
  if (s === "micro43") return "Micro 4/3";
  return s;
}

export default function GearPage() {
  const cameras = useCameras();
  const lensDb = useLenses();
  const { gear, updateGear, loaded } = useGearProfile();
  const [addingLens, setAddingLens] = useState(false);
  const [changingCamera, setChangingCamera] = useState(false);

  if (!loaded) return null;

  const selectedCamera = gear.camera;
  const compatibleLenses = selectedCamera
    ? lensDb.filter(
        (l) =>
          l.mount.includes(selectedCamera.mount) ||
          (l.mount.includes("sony_e") && selectedCamera.mount === "sony_e") ||
          selectedCamera.mount === "fixed_lens"
      )
    : lensDb;

  const availableLenses = compatibleLenses.filter(
    (l) => !gear.lenses.some((gl) => gl.id === l.id)
  );

  // Group cameras by make
  const camerasByMake = cameras.reduce<Record<string, Camera[]>>((acc, cam) => {
    acc[cam.make] = acc[cam.make] || [];
    acc[cam.make].push(cam);
    return acc;
  }, {});

  // ISO quality bar breakpoints
  const baseIso = selectedCamera?.base_iso ?? 100;
  const maxIso = selectedCamera?.max_usable_iso ?? 12800;
  const totalRange = Math.log2(maxIso) - Math.log2(baseIso);
  // Excellent: base to ~4x base, Good: to ~16x base, Acceptable: to max usable, Emergency: beyond
  const excellentEnd = Math.min((Math.log2(baseIso * 4) - Math.log2(baseIso)) / totalRange * 80, 35);
  const goodEnd = Math.min((Math.log2(baseIso * 16) - Math.log2(baseIso)) / totalRange * 80, 60);
  const acceptableEnd = 80;

  // Camera subtitle
  const cameraSubtitle = selectedCamera
    ? [
        formatSensorSize(selectedCamera.sensor_size),
        `${selectedCamera.megapixels}MP`,
        selectedCamera.tags?.includes("ai_af") ? "AI AF" : null,
        selectedCamera.has_ibis ? `${selectedCamera.ibis_stops}-stop IBIS` : null,
      ]
        .filter(Boolean)
        .join(" \u00B7 ")
    : "";

  return (
    <>
      <NavHeader />
      <main className="pt-14">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h2 className="text-[13px]l font-bold text-[var(--white)] mb-6">Your Gear</h2>

          {/* Camera Body Card */}
          <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)]">Camera Body</span>
              <button
                onClick={() => setChangingCamera(!changingCamera)}
                className="text-[13px]s text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>

            {selectedCamera && (
              <>
                <p className="text-lg font-bold text-[var(--white)]">
                  {selectedCamera.make} {selectedCamera.model}
                </p>
                <p className="text-[13px]s text-[var(--neutral-200)] mb-4">{cameraSubtitle}</p>
              </>
            )}

            {!selectedCamera && !changingCamera && (
              <p className="text-sm text-[var(--neutral-200)] mb-4">No camera selected</p>
            )}

            {changingCamera && (
              <div className="mb-4">
                <Select
                  value={selectedCamera?.id || ""}
                  onValueChange={(id) => {
                    const cam = cameras.find((c) => c.id === id) || null;
                    updateGear({ camera: cam });
                    setChangingCamera(false);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your camera..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(camerasByMake).map(([make, cams]) => (
                      <div key={make}>
                        <div className="px-2 py-1.5 text-[13px]s font-semibold text-[var(--neutral-300)]">
                          {make}
                        </div>
                        {cams.map((cam) => (
                          <SelectItem key={cam.id} value={cam.id}>
                            {cam.make} {cam.model} — {cam.megapixels}MP{" "}
                            {formatSensorSize(cam.sensor_size)}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCamera && (
              <>
                {/* Stat boxes */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg bg-[#1c1c1c]/50 p-3 text-center">
                    <p className="text-[13px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">Base ISO</p>
                    <p className="text-lg font-bold text-[var(--white)]">{selectedCamera.base_iso}</p>
                  </div>
                  <div className="rounded-lg bg-[#1c1c1c]/50 p-3 text-center">
                    <p className="text-[13px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">Max Usable ISO</p>
                    <p className="text-lg font-bold text-[var(--white)]">{selectedCamera.max_usable_iso.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-[#1c1c1c]/50 p-3 text-center">
                    <p className="text-[13px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">Dynamic Range</p>
                    <p className="text-lg font-bold text-[var(--white)]">{selectedCamera.dynamic_range_ev} EV</p>
                  </div>
                  <div className="rounded-lg bg-[#1c1c1c]/50 p-3 text-center">
                    <p className="text-[13px] uppercase tracking-wider text-[var(--neutral-300)] mb-1">Burst Rate</p>
                    <p className="text-lg font-bold text-[var(--white)]">{selectedCamera.burst_fps} fps</p>
                  </div>
                </div>

                {/* ISO Quality Range bar */}
                <div>
                  <p className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)] mb-3">ISO Quality Range</p>
                  <div className="relative h-6 rounded-full bg-[#262626] overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${excellentEnd}%` }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-green-400 to-yellow-400"
                      style={{ left: `${excellentEnd}%`, width: `${goodEnd - excellentEnd}%` }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-yellow-400 to-red-400"
                      style={{ left: `${goodEnd}%`, width: `${acceptableEnd - goodEnd}%` }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-red-400 to-red-600"
                      style={{ left: `${acceptableEnd}%`, width: `${100 - acceptableEnd}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[13px] text-[var(--neutral-300)]">
                    <span>{baseIso}</span>
                    <span>400</span>
                    <span>1600</span>
                    <span>6400</span>
                    <span>12800</span>
                    <span>32000</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-[13px]">
                    <span className="text-green-400">{"\u2605"} Excellent</span>
                    <span className="text-yellow-400">Good</span>
                    <span className="text-red-400">Acceptable</span>
                    <span className="text-red-600">Emergency only</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Lenses Card */}
          <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)]">Lenses</span>
              <button
                onClick={() => setAddingLens(!addingLens)}
                className="text-[13px]s text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
              >
                + Add Lens
              </button>
            </div>

            {gear.lenses.length === 0 && !addingLens && (
              <p className="text-sm text-[var(--neutral-300)] py-4 text-center">
                No lenses added yet. Tap &quot;+ Add Lens&quot; to get started.
              </p>
            )}

            <div className="space-y-2">
              {gear.lenses.map((lens) => {
                const focalStr =
                  lens.focal_length_min === lens.focal_length_max
                    ? `${lens.focal_length_min}mm`
                    : `${lens.focal_length_min}-${lens.focal_length_max}mm`;
                const lensType =
                  lens.focal_length_min === lens.focal_length_max ? "Prime" : "Zoom";
                return (
                  <div
                    key={lens.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#1c1c1c]/50 border border-white/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--white)]">
                        {lens.make} {lens.model}
                      </p>
                      <p className="text-[13px]s text-[var(--neutral-200)]">
                        {lensType} · {focalStr} f/{lens.max_aperture}
                        {lens.filter_size_mm ? ` · ${lens.filter_size_mm}mm filter` : ""}
                        {lens.has_is ? ` · IS ${lens.is_stops} stops` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {lens.tags?.map((tag) => {
                          const color = getTagColor(tag);
                          return (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded-full text-[13px] font-medium ${color.bg} ${color.text}`}
                            >
                              {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                      <button
                        onClick={() =>
                          updateGear({
                            lenses: gear.lenses.filter((l) => l.id !== lens.id),
                          })
                        }
                        className="text-neutral-600 hover:text-red-400 transition-colors ml-2 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {addingLens && (
              <div className="mt-3">
                <Select
                  onValueChange={(id) => {
                    const lens = lensDb.find((l) => l.id === id);
                    if (lens) {
                      updateGear({ lenses: [...gear.lenses, lens] });
                    }
                    setAddingLens(false);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a lens..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLenses.map((lens) => (
                      <SelectItem key={lens.id} value={lens.id}>
                        {lens.make}{" "}
                        {lens.focal_length_min === lens.focal_length_max
                          ? `${lens.focal_length_min}mm`
                          : `${lens.focal_length_min}-${lens.focal_length_max}mm`}{" "}
                        f/{lens.max_aperture}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Shooting Preferences Card */}
          <div className="glass rounded-2xl p-6">
            <span className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)] block mb-4">
              Shooting Preferences
            </span>

            <div className="grid grid-cols-2 gap-4">
              {/* Primary Style */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">Primary Style</label>
                <Select
                  value={gear.primaryStyle || gear.shootingStyles[0] || ""}
                  onValueChange={(val: string | null) => {
                    if (!val) return;
                    updateGear({
                      primaryStyle: val,
                      shootingStyles: [val, ...gear.shootingStyles.filter((s) => s !== val)],
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOOTING_STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tripod Available */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">Tripod Available</label>
                <Select
                  value={gear.tripodAvailability || (gear.hasTripod ? "always" : "no")}
                  onValueChange={(val: string | null) => {
                    if (!val) return;
                    updateGear({
                      tripodAvailability: val,
                      hasTripod: val !== "no",
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Yes always</SelectItem>
                    <SelectItem value="sometimes">Sometimes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scan Radius */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">Scan Radius</label>
                <Select
                  value={gear.scanRadius || "25"}
                  onValueChange={(val: string | null) => { if (val) updateGear({ scanRadius: val }); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                    <SelectItem value="100">100 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notification Preference */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">Notification Preference</label>
                <Select
                  value={gear.notificationPreference || "push_email"}
                  onValueChange={(val: string | null) => { if (val) updateGear({ notificationPreference: val }); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push_email">Push + Email (score 70+)</SelectItem>
                    <SelectItem value="push">Push only</SelectItem>
                    <SelectItem value="email_digest">Email digest (daily)</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
