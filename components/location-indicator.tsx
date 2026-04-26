"use client";

import { useState } from "react";
import { MapPin, AlertTriangle, X, Edit3 } from "lucide-react";
import { useGeolocation } from "@/lib/hooks";

const PRESETS: { label: string; lat: number; lng: number; name: string }[] = [
  { label: "Dolomites (Cortina)", lat: 46.5377, lng: 12.1357, name: "Cortina d'Ampezzo, Italy" },
  { label: "Lago di Braies", lat: 46.6948, lng: 12.0857, name: "Lago di Braies, Italy" },
  { label: "Val di Funes", lat: 46.6411, lng: 11.7178, name: "Val di Funes, Italy" },
  { label: "Alpe di Siusi", lat: 46.5436, lng: 11.6253, name: "Alpe di Siusi, Italy" },
  { label: "Georgetown, TX", lat: 30.6280, lng: -97.6781, name: "Georgetown, TX" },
];

export function LocationIndicator() {
  const {
    locationName,
    coords,
    error,
    loading,
    usingFallback,
    manualOverride,
    setManualLocation,
    clearManualLocation,
  } = useGeolocation();
  const [editing, setEditing] = useState(false);
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [customName, setCustomName] = useState("");

  const showWarning = usingFallback || error;

  const submitCustom = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng)) return;
    setManualLocation(lat, lng, customName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
    setEditing(false);
    setCustomLat("");
    setCustomLng("");
    setCustomName("");
  };

  return (
    <div
      className={`glass rounded-xl p-3 sm:p-4 mb-6 ${
        showWarning ? "ring-1 ring-amber-500/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 min-w-0">
          {showWarning ? (
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
          ) : (
            <MapPin size={18} className="text-emerald-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider opacity-60 mb-0.5">
              {manualOverride ? "Manual Location" : "Detected Location"}
            </div>
            <div className="text-sm font-medium break-words">
              {loading ? "Locating…" : locationName}
            </div>
            {coords && (
              <div className="text-[11px] opacity-60 font-mono mt-0.5">
                {coords.lat.toFixed(4)}°{coords.lat >= 0 ? "N" : "S"},{" "}
                {coords.lng.toFixed(4)}°{coords.lng >= 0 ? "E" : "W"}
              </div>
            )}
            {showWarning && !manualOverride && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Geolocation denied or unavailable. Using fallback. Set your location below.
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {manualOverride && (
            <button
              onClick={clearManualLocation}
              className="text-[11px] px-2 py-1 rounded border border-current/20 hover:bg-current/5 flex items-center gap-1"
              title="Clear manual override and use device location"
            >
              <X size={12} /> Auto
            </button>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-[11px] px-2 py-1 rounded border border-current/20 hover:bg-current/5 flex items-center gap-1"
          >
            <Edit3 size={12} /> {editing ? "Cancel" : "Set"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-current/10 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1.5">
              Quick presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setManualLocation(p.lat, p.lng, p.name);
                    setEditing(false);
                  }}
                  className="text-[11px] px-2 py-1 rounded-full border border-current/20 hover:bg-current/5"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1.5">
              Custom coordinates
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Lat (e.g. 46.54)"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="text-xs px-2 py-1.5 rounded border border-current/20 bg-transparent"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Lng (e.g. 12.14)"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="text-xs px-2 py-1.5 rounded border border-current/20 bg-transparent"
              />
            </div>
            <input
              type="text"
              placeholder="Label (optional)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-current/20 bg-transparent w-full mt-2"
            />
            <button
              onClick={submitCustom}
              disabled={!customLat || !customLng}
              className="mt-2 text-xs px-3 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Use this location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
