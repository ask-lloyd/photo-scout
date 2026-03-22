"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Sunset, CloudFog, Cloud, CloudRain, CloudLightning, Sun, Star, Compass, Camera, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                         */
/* ------------------------------------------------------------------ */

function getNext7Days(): { label: string; date: string }[] {
  const days: { label: string; date: string }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = dayNames[d.getDay()];
    const dateStr = `${dayName} ${d.getDate()}`;
    let label: string;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Tomorrow";
    else label = dayNames[d.getDay()];
    days.push({ label, date: dateStr });
  }
  return days;
}

const days7 = getNext7Days();

const forecastData = [
  { ...days7[0], icon: Sunset, iconColor: "var(--golden-hour)", score: 87, type: "PM sunset", accent: "orange" },
  { ...days7[1], icon: CloudFog, iconColor: "var(--blue-hour)", score: 79, type: "AM fog", accent: "blue" },
  { ...days7[2], icon: Cloud, iconColor: "var(--neutral-300)", score: 38, type: "Overcast", accent: "gray" },
  { ...days7[3], icon: CloudRain, iconColor: "var(--neutral-300)", score: 25, type: "Rain", accent: "gray" },
  { ...days7[4], icon: CloudLightning, iconColor: "var(--coral)", score: 82, type: "Storm break!", accent: "purple" },
  { ...days7[5], icon: Sun, iconColor: "var(--teal)", score: 55, type: "Clear", accent: "gray" },
  { ...days7[6], icon: Star, iconColor: "var(--violet)", score: 74, type: "Astro window", accent: "indigo" },
];

type Opportunity = {
  id: number;
  name: string;
  score: number;
  icon: React.ElementType;
  iconColor: string;
  confidence: string | null;
  confidenceColor: string;
  when: string;
  time: string;
  location: string;
  description: string;
  direction: string;
  settings: string;
  spot: string;
  accent: string;
  timing: string;
  timingColor: string;
  topGlow: boolean;
  type: string;
  distance: number;
};

const opportunities: Opportunity[] = [
  {
    id: 1,
    name: "Epic Sunset",
    score: 87,
    icon: Sunset,
    iconColor: "var(--golden-hour)",
    confidence: "HIGH CONFIDENCE",
    confidenceColor: "green",
    when: "Tonight",
    time: "7:12 \u2013 7:44 PM",
    location: "Georgetown, TX",
    description:
      "High-altitude cirrus clouds combining with low humidity for vivid orange and magenta tones. Best conditions in 2 weeks.",
    direction: "Face WSW (252\u00B0)",
    settings: "f/8 \u00B7 1/250 \u00B7 ISO 200",
    spot: "Bob Wentz Park suggested",
    accent: "orange",
    timing: "In 27 min",
    timingColor: "text-orange-400",
    topGlow: true,
    type: "Sunsets",
    distance: 12,
  },
  {
    id: 2,
    name: "Valley Fog at Sunrise",
    score: 79,
    icon: CloudFog,
    iconColor: "var(--blue-hour)",
    confidence: "MODERATE",
    confidenceColor: "yellow",
    when: "Tomorrow",
    time: "6:15 \u2013 7:30 AM",
    location: "Lake Travis",
    description:
      "Temperature inversion likely to produce valley fog along Lake Travis. Elevated vantage points recommended for layered fog shots.",
    direction: "Face E-SE (110\u00B0)",
    settings: "f/11 \u00B7 1/125 \u00B7 ISO 400",
    spot: "Oasis overlook suggested",
    accent: "blue",
    timing: "Tomorrow AM",
    timingColor: "text-[var(--neutral-200)]",
    topGlow: false,
    type: "Fog",
    distance: 28,
  },
  {
    id: 3,
    name: "Storm Break at Golden Hour",
    score: 82,
    icon: CloudLightning,
    iconColor: "var(--coral)",
    confidence: "MODERATE",
    confidenceColor: "yellow",
    when: "Wednesday",
    time: "6:45 \u2013 7:30 PM",
    location: "Region-wide",
    description:
      "Post-storm clearing expected right at golden hour. Dramatic cloud formations with potential rainbow. Fast-changing conditions.",
    direction: "Face W-NW (285\u00B0)",
    settings: "f/8 \u00B7 1/500 \u00B7 ISO 400",
    spot: "Any western-facing vista",
    accent: "purple",
    timing: "4 days out",
    timingColor: "text-[var(--neutral-200)]",
    topGlow: false,
    type: "Storm",
    distance: 5,
  },
  {
    id: 4,
    name: "Milky Way Window",
    score: 74,
    icon: Star,
    iconColor: "var(--violet)",
    confidence: null,
    confidenceColor: "",
    when: "Friday",
    time: "11:00 PM \u2013 2:30 AM",
    location: "Dark sky sites",
    description:
      "New moon phase with clear skies forecasted. Milky Way core visible low on the southern horizon. Bortle 4 zones within range.",
    direction: "Face S (180\u00B0)",
    settings: "f/1.8 \u00B7 20s \u00B7 ISO 3200",
    spot: "Pedernales Falls SP suggested",
    accent: "indigo",
    timing: "6 days out",
    timingColor: "text-[var(--neutral-200)]",
    topGlow: false,
    type: "Astro",
    distance: 45,
  },
];

/* ------------------------------------------------------------------ */
/*  Accent color helpers                                              */
/* ------------------------------------------------------------------ */

function accentClasses(accent: string) {
  const map: Record<string, { border: string; bg: string; text: string; borderHover: string; glow: string }> = {
    orange: {
      border: "border-orange-500/20",
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      borderHover: "hover:border-orange-500/40",
      glow: "shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]",
    },
    blue: {
      border: "border-blue-500/20",
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      borderHover: "hover:border-blue-500/40",
      glow: "",
    },
    purple: {
      border: "border-purple-500/20",
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      borderHover: "hover:border-purple-500/40",
      glow: "",
    },
    indigo: {
      border: "border-indigo-500/20",
      bg: "bg-indigo-500/20",
      text: "text-indigo-400",
      borderHover: "hover:border-indigo-500/40",
      glow: "",
    },
    gray: {
      border: "border-neutral-700/30",
      bg: "bg-neutral-700/20",
      text: "text-[var(--neutral-200)]",
      borderHover: "hover:border-neutral-600/40",
      glow: "",
    },
  };
  return map[accent] ?? map.gray;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-orange-400";
  if (score >= 50) return "text-blue-400";
  return "text-[var(--neutral-200)]";
}

function forecastBorder(accent: string) {
  const map: Record<string, string> = {
    orange: "border-orange-500/40 bg-orange-500/10",
    blue: "border-blue-500/40 bg-blue-500/10",
    purple: "border-purple-500/40 bg-purple-500/10",
    indigo: "border-indigo-500/40 bg-indigo-500/10",
    gray: "border-white/5 bg-white/5",
  };
  return map[accent] ?? map.gray;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function OpportunitiesPage() {
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [minScore, setMinScore] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (typeFilter !== "All Types" && opp.type !== typeFilter) return false;
      if (opp.score < minScore) return false;
      if (opp.distance > maxDistance) return false;
      return true;
    });
  }, [typeFilter, minScore, maxDistance]);

  return (
    <>
      <NavHeader />
      <main className="pt-14">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* ---- Header + Filters ---- */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-[var(--white)]">Opportunities</h1>
              <p className="text-sm text-[var(--neutral-300)]">
                Next 7 days &middot; Within {maxDistance} miles of Georgetown, TX
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={typeFilter} onValueChange={(val: string | null) => { if (val) setTypeFilter(val); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Types">All Types</SelectItem>
                  <SelectItem value="Sunsets">Sunsets</SelectItem>
                  <SelectItem value="Fog">Fog</SelectItem>
                  <SelectItem value="Storm">Storm</SelectItem>
                  <SelectItem value="Astro">Astro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(minScore)} onValueChange={(val: string | null) => { if (val) setMinScore(Number(val)); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Score</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="70">70+</SelectItem>
                  <SelectItem value="80">80+</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(maxDistance)} onValueChange={(val: string | null) => { if (val) setMaxDistance(Number(val)); }}>
                <SelectTrigger>
                  <SelectValue placeholder="50 miles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ---- 7-Day Light Forecast Strip ---- */}
          <div className="glass rounded-xl p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-[var(--neutral-300)] mb-3">
              7-Day Light Forecast
            </p>
            <div className="grid grid-cols-7 gap-2 min-w-[560px] sm:min-w-0 overflow-x-auto">
              {forecastData.map((day, i) => {
                const fb = forecastBorder(day.accent);
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-2 text-center transition-colors ${fb}`}
                  >
                    <p className="text-[11px] font-medium text-[var(--neutral-200)]">{day.label}</p>
                    <p className="text-[10px] text-[var(--neutral-300)]">{day.date}</p>
                    <div className="flex justify-center my-1"><day.icon className="w-6 h-6" style={{ color: day.iconColor }} strokeWidth={1.5} /></div>
                    <p className={`text-xl font-bold ${scoreColor(day.score)}`}>{day.score}</p>
                    <p className="text-[10px] text-[var(--neutral-300)] mt-0.5">{day.type}</p>
                  </div>
                );
              })}
            </div>
            {/* Horizontal scroll wrapper for mobile */}
            <style jsx>{`
              @media (max-width: 640px) {
                .grid.grid-cols-7 {
                  display: flex;
                  overflow-x: auto;
                  -webkit-overflow-scrolling: touch;
                }
                .grid.grid-cols-7 > div {
                  min-width: 90px;
                  flex-shrink: 0;
                }
              }
            `}</style>
          </div>

          {/* ---- Opportunity Cards ---- */}
          <div className="space-y-4">
            {filteredOpportunities.length === 0 && (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-[var(--neutral-300)]">No opportunities match your filters.</p>
              </div>
            )}
            {filteredOpportunities.map((opp) => {
              const ac = accentClasses(opp.accent);
              return (
                <div
                  key={opp.id}
                  className={`glass rounded-xl p-5 border ${ac.border} ${opp.topGlow ? ac.glow : ""} cursor-pointer ${ac.borderHover} transition-all`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                    {/* Left: emoji + score */}
                    <div className="flex-shrink-0 text-center flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                      <div className="sm:mb-1"><opp.icon className="w-8 h-8" style={{ color: opp.iconColor }} strokeWidth={1.5} /></div>
                      <div
                        className={`w-14 h-14 rounded-xl ${ac.bg} flex items-center justify-center`}
                      >
                        <span className={`text-2xl font-bold ${ac.text}`}>{opp.score}</span>
                      </div>
                    </div>

                    {/* Middle: details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[var(--white)] text-lg">{opp.name}</h3>
                        {opp.confidence && (
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-full ${
                              opp.confidenceColor === "green"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {opp.confidence}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--neutral-200)] mb-2">
                        {opp.when} &middot; {opp.time} &middot; {opp.location}
                      </p>
                      <p className="text-sm text-[var(--neutral-200)] mb-3">{opp.description}</p>
                      <div className="flex items-center gap-4 text-xs text-[var(--neutral-300)] flex-wrap">
                        <span><Compass className="w-4 h-4 inline mr-1" />{opp.direction}</span>
                        <span><Camera className="w-4 h-4 inline mr-1" />{opp.settings}</span>
                        <span><MapPin className="w-4 h-4 inline mr-1" />{opp.spot}</span>
                      </div>
                    </div>

                    {/* Right: timing + button */}
                    <div className="flex-shrink-0 sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                      <div className={`text-sm font-semibold ${opp.timingColor}`}>
                        {opp.timing}
                      </div>
                      <Link
                        href="/planner"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          opp.topGlow
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "bg-white/10 text-[var(--neutral-200)] hover:bg-white/20"
                        }`}
                      >
                        Plan Shot
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
