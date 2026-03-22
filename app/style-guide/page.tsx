"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Moon,
  Camera,
  Cloud,
  MapPin,
  Compass,
  Aperture,
  Clock,
  AlertTriangle,
  Star,
  SlidersHorizontal,
  Search,
  Lightbulb,
  Zap,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "logo", label: "Logo System" },
  { id: "icons", label: "App Icons" },
  { id: "colors", label: "Color System" },
  { id: "typography", label: "Typography" },
  { id: "iconography", label: "Iconography" },
  { id: "components", label: "Components" },
  { id: "ux", label: "UX Guide" },
];

function LogoSVG({ size = 48, full = false }: { size?: number; full?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" fill="#12151E" stroke="#E8A225" strokeWidth="2" />
      <path d="M32 12 L38 24 L32 20 L26 24 Z" fill="#E8A225" opacity="0.9" />
      {full && <path d="M50 22 L44 34 L46 28 L38 24 Z" fill="#E8A225" opacity="0.75" />}
      <circle cx="32" cy="32" r="10" fill="none" stroke="#E8A225" strokeWidth="1.5" strokeDasharray="3 5" />
      <circle cx="32" cy="32" r="5" fill="#E8A225" />
      <circle cx="32" cy="32" r="2.5" fill="#12151E" />
      <line x1="32" y1="6" x2="32" y2="10" stroke="#E8A225" strokeWidth="2" strokeLinecap="round" />
      {full && (
        <>
          <line x1="32" y1="54" x2="32" y2="58" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="6" y1="32" x2="10" y2="32" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="54" y1="32" x2="58" y2="32" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

function LogoMarkSmall({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" fill="#12151E" stroke="#E8A225" strokeWidth="2" />
      <circle cx="32" cy="32" r="5" fill="#E8A225" />
      <circle cx="32" cy="32" r="2.5" fill="#12151E" />
      <line x1="32" y1="6" x2="32" y2="10" stroke="#E8A225" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SectionHeader({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--golden-hour)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{num}</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--white)", margin: "6px 0 4px", letterSpacing: "-0.01em" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--neutral-300)", maxWidth: 560, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

export default function StyleGuidePage() {
  const [activeSection, setActiveSection] = useState("overview");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -75% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={containerRef} style={{ background: "var(--dark-900)", color: "var(--white)", fontFamily: "var(--font-body)", lineHeight: 1.6, WebkitFontSmoothing: "antialiased" }}>
      {/* ═══════════ HEADER ═══════════ */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "14px 32px", background: "rgba(12, 14, 20, 0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--dark-600)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" fill="#12151E" stroke="#E8A225" strokeWidth="2" />
            <path d="M32 12 L38 24 L32 20 L26 24 Z" fill="#E8A225" opacity="0.9" />
            <circle cx="32" cy="32" r="10" fill="none" stroke="#E8A225" strokeWidth="1.5" strokeDasharray="3 5" />
            <circle cx="32" cy="32" r="5" fill="#E8A225" />
            <circle cx="32" cy="32" r="2.5" fill="#12151E" />
            <line x1="32" y1="6" x2="32" y2="10" stroke="#E8A225" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--white)", letterSpacing: "-0.02em" }}>
              Photo<span style={{ color: "var(--golden-hour)" }}>Scout</span>
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 9, color: "var(--neutral-300)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginTop: 1 }}>
              Light Intelligence
            </div>
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--neutral-300)", background: "var(--dark-700)", padding: "4px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--dark-600)" }}>
          Brand Guide v1.0 — March 2026
        </span>
      </header>

      {/* ═══════════ NAV ═══════════ */}
      <nav style={{ padding: "12px 32px", display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--dark-700)", background: "var(--dark-800)", position: "sticky", top: 53, zIndex: 40 }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: activeSection === item.id ? 600 : 400,
              color: activeSection === item.id ? "var(--golden-hour)" : "var(--neutral-300)",
              background: activeSection === item.id ? "var(--golden-hour-subtle)" : "transparent",
              border: activeSection === item.id ? "1px solid rgba(232, 162, 37, 0.2)" : "1px solid transparent",
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "all var(--duration-fast) var(--ease-out)",
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
        {/* ═══════════ 01: OVERVIEW ═══════════ */}
        <section id="overview" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="01" title="Brand Overview" desc="PhotoScout helps photographers find, plan, and capture the perfect light. The brand embodies the intersection of technical precision and natural beauty." />

          <div style={{ padding: 32, borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg, var(--dark-800), var(--dark-700))", border: "1px solid var(--dark-600)", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, transform: "scale(1.3)" }}>
                <LogoSVG size={48} full />
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "var(--white)", letterSpacing: "-0.02em" }}>
                    Photo<span style={{ color: "var(--golden-hour)" }}>Scout</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 9, color: "var(--neutral-300)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginTop: 1 }}>
                    Light Intelligence
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              {[
                { label: "Brand Voice", value: "Confident, precise, inspiring. Like a seasoned photographer sharing a field tip." },
                { label: "Core Metaphor", value: "The golden convergence — where light, weather, and terrain align for the perfect shot." },
                { label: "Audience", value: "Landscape & nature photographers, from enthusiast to professional. Gear-aware, weather-obsessed." },
                { label: "Personality", value: "Expert field guide, not a classroom textbook. Warm authority with technical depth." },
              ].map((attr) => (
                <div key={attr.label}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--golden-hour)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{attr.label}</div>
                  <p style={{ fontSize: 13, color: "var(--neutral-100)", lineHeight: 1.6, marginTop: 6 }}>{attr.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { icon: "◎", title: "Precision First", desc: "Every data point earns its place. No fluff, no vague forecasts." },
              { icon: "◐", title: "Light-Centric", desc: "Light quality is the hero. All UI radiates from this concept." },
              { icon: "⊞", title: "Layered Depth", desc: "Progressive disclosure — simple surface, rich detail beneath." },
              { icon: "◈", title: "Field-Ready", desc: "Optimized for gloved hands, harsh sun, and quick glances." },
            ].map((p) => (
              <div key={p.title} style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--white)", marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-300)", lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ 02: LOGO ═══════════ */}
        <section id="logo" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="02" title="Logo System" desc="The logomark combines a camera aperture with compass cardinal points — the photographer as explorer. The sun at center represents PhotoScout's light-first philosophy." />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
            <div style={{ flex: "1 1 300px", textAlign: "center", padding: 40, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <LogoSVG size={48} full />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--white)", letterSpacing: "-0.02em" }}>
                    Photo<span style={{ color: "var(--golden-hour)" }}>Scout</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--neutral-300)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginTop: 1 }}>Light Intelligence</div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>Primary — Dark Background</div>
            </div>
            <div style={{ flex: "1 1 300px", textAlign: "center", padding: 40, borderRadius: "var(--radius-lg)", background: "#F0F2F8", border: "1px solid #ddd" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <LogoSVG size={48} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "#0C0E14", letterSpacing: "-0.02em" }}>
                    Photo<span style={{ color: "var(--golden-hour)" }}>Scout</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--neutral-300)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginTop: 1 }}>Light Intelligence</div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>Primary — Light Background</div>
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--white)", marginBottom: 8 }}>Usage Rules</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
              {[
                "Minimum clear space: 1× mark height on all sides",
                "Minimum mark size: 24px digital, 8mm print",
                "Minimum wordmark size: 80px wide",
                "Never rotate, stretch, or recolor the mark",
                "On photos: use white wordmark with dark overlay",
                "Favicon uses mark only at ≤32px",
              ].map((rule) => (
                <div key={rule} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--golden-hour)", fontSize: 10, marginTop: 3 }}>●</span>
                  <span style={{ fontSize: 12, color: "var(--neutral-200)", lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ 03: APP ICONS ═══════════ */}
        <section id="icons" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="03" title="App Icon Kit" desc="Consistent icon presence across all platforms. The mark sits on a dark gradient base with a subtle golden radial glow." />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end", justifyContent: "center", marginBottom: 32 }}>
            {[
              { w: 140, r: 31, svgSize: 84, label: "iOS App Store · 1024×1024", full: true },
              { w: 90, r: 20, svgSize: 54, label: "iOS Home · 180×180", full: false },
              { w: 60, r: 14, svgSize: 36, label: "Android · 192×192", full: false },
            ].map((icon) => (
              <div key={icon.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: icon.w, height: icon.w, borderRadius: icon.r,
                  background: "linear-gradient(145deg, var(--dark-800), var(--dark-900))",
                  border: "1px solid rgba(232, 162, 37, 0.2)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, rgba(232,162,37,0.08) 0%, transparent 70%)" }} />
                  <svg width={icon.svgSize} height={icon.svgSize} viewBox="0 0 64 64" fill="none" style={{ position: "relative", zIndex: 1 }}>
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#E8A225" strokeWidth="2" />
                    {icon.full && <path d="M32 12 L38 24 L32 20 L26 24 Z" fill="#E8A225" opacity="0.9" />}
                    {icon.full && <circle cx="32" cy="32" r="10" fill="none" stroke="#E8A225" strokeWidth="1.5" strokeDasharray="3 5" />}
                    <circle cx="32" cy="32" r="5" fill="#E8A225" />
                    <circle cx="32" cy="32" r="2.5" fill="#12151E" />
                    <line x1="32" y1="6" x2="32" y2="10" stroke="#E8A225" strokeWidth="2" strokeLinecap="round" />
                    {icon.full && (
                      <>
                        <line x1="32" y1="54" x2="32" y2="58" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                        <line x1="6" y1="32" x2="10" y2="32" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                        <line x1="54" y1="32" x2="58" y2="32" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                      </>
                    )}
                  </svg>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>{icon.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 6,
                background: "linear-gradient(145deg, var(--dark-800), var(--dark-900))",
                border: "1px solid rgba(232, 162, 37, 0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, rgba(232,162,37,0.08) 0%, transparent 70%)" }} />
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ position: "relative", zIndex: 1 }}>
                  <circle cx="16" cy="16" r="10" fill="none" stroke="#E8A225" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="3.5" fill="#E8A225" />
                  <line x1="16" y1="3" x2="16" y2="6" stroke="#E8A225" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>Favicon · 32×32</span>
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--white)", marginBottom: 8 }}>Export Specifications</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 12 }}>
              {[
                { platform: "iOS", sizes: "1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20" },
                { platform: "Android", sizes: "512 (Play), 192, 144, 96, 72, 48 (mdpi–xxxhdpi)" },
                { platform: "Web/PWA", sizes: "512, 384, 192, 152, 144, 128, 96, 72, 48, 32, 16" },
                { platform: "macOS", sizes: "1024, 512, 256, 128, 64, 32, 16 (2× Retina)" },
              ].map((spec) => (
                <div key={spec.platform} style={{ padding: 16, borderRadius: "var(--radius-default)", background: "var(--dark-700)" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "var(--golden-hour)" }}>{spec.platform}</span>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", marginTop: 4, lineHeight: 1.5 }}>{spec.sizes}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ 04: COLORS ═══════════ */}
        <section id="colors" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="04" title="Color System" desc="A dark-first palette grounded in the photographer's environment. Primary amber from golden hour. Secondary blue from blue hour. Semantic colors map to weather and condition states." />

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Brand Colors</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
            {[
              { color: "#E8A225", name: "Golden Hour", role: "Primary — CTA, highlights, scores" },
              { color: "#3B6FD4", name: "Blue Hour", role: "Secondary — links, info, maps" },
              { color: "#E06848", name: "Alert Coral", role: "Alerts, epic opportunities" },
              { color: "#2DB88A", name: "Scout Teal", role: "Success, optimal conditions" },
              { color: "#8B6CC1", name: "Astro Violet", role: "Night/astro features, pro tier" },
            ].map((s) => (
              <div key={s.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ width: "100%", height: 72, borderRadius: "var(--radius-default)", border: "1px solid rgba(255,255,255,0.06)", background: s.color, boxShadow: `0 4px 24px ${s.color}33` }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "var(--white)" }}>{s.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--neutral-300)" }}>{s.color}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--neutral-200)" }}>{s.role}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Surface &amp; Background</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
            {[
              { color: "#0C0E14", name: "Base" },
              { color: "#12151E", name: "Surface 1" },
              { color: "#1A1E2A", name: "Surface 2" },
              { color: "#242836", name: "Surface 3" },
              { color: "#2E3344", name: "Elevated" },
              { color: "#3D4358", name: "Borders" },
            ].map((s) => (
              <div key={s.name} style={{ flex: "0 0 100px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ width: "100%", height: 52, borderRadius: "var(--radius-default)", border: "1px solid rgba(255,255,255,0.06)", background: s.color }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: "var(--white)" }}>{s.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--neutral-300)" }}>{s.color}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Condition Color Mapping</h3>
          <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { color: "#E8A225", label: "Golden Hour / Warm Light", value: "Light score 70+" },
                { color: "#3B6FD4", label: "Blue Hour / Cool Light", value: "Pre-dawn, post-sunset" },
                { color: "#E06848", label: "Epic Alert / Storm Break", value: "Opportunity score 85+" },
                { color: "#2DB88A", label: "Clear / Optimal", value: "Low cloud, high visibility" },
                { color: "#8B6CC1", label: "Astro Window", value: "Dark sky, Milky Way visible" },
                { color: "#6B7394", label: "Overcast / Flat", value: "Light score < 30" },
              ].map((c) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--dark-700)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: c.color }} />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--white)", fontWeight: 500 }}>{c.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ 05: TYPOGRAPHY ═══════════ */}
        <section id="typography" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="05" title="Typography" desc="Three-font system: Syne for display and brand moments, Figtree for readable body/UI text, IBM Plex Mono for data and technical values." />

          <div style={{ padding: 32, borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg, var(--dark-800), var(--dark-700))", border: "1px solid var(--dark-600)", marginBottom: 24 }}>
            {[
              { label: "Display XL", spec: "Syne · 800 · 36px", style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em" } as React.CSSProperties, text: "Chase the Golden Hour" },
              { label: "Display LG", spec: "Syne · 700 · 28px", style: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.01em" } as React.CSSProperties, text: "Light Quality Score: 87" },
              { label: "Heading", spec: "Syne · 600 · 20px", style: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20 } as React.CSSProperties, text: "Camera Settings Advisor" },
              { label: "Subheading", spec: "Figtree · 600 · 16px", style: { fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 16, color: "var(--neutral-100)" } as React.CSSProperties, text: "Opportunity Scout — 7-Day Forecast" },
              { label: "Body", spec: "Figtree · 400 · 14px", style: { fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, color: "var(--neutral-200)" } as React.CSSProperties, text: "Warm dramatic side-light with broken cumulus creating god rays. Visibility excellent at 32km. Humidity 45% — ideal for saturated color." },
              { label: "Caption", spec: "Figtree · 400 · 12px", style: { fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 12, color: "var(--neutral-300)" } as React.CSSProperties, text: "Updated 3 minutes ago · Data from Open-Meteo" },
              { label: "Data/Value", spec: "IBM Plex Mono · 500 · 14px", style: { fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 14, color: "var(--golden-hour)" } as React.CSSProperties, text: "ƒ/11 · 1/250s · ISO 200 · 5600K" },
              { label: "Label/Tag", spec: "IBM Plex Mono · 400 · 11px", style: { fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: 11, color: "var(--neutral-300)", letterSpacing: "0.06em" } as React.CSSProperties, text: "GOLDEN HOUR · 18:42–19:15 · WEST" },
            ].map((sample, i, arr) => (
              <div key={sample.label} style={{ marginBottom: i < arr.length - 1 ? 20 : 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--golden-hour)", minWidth: 120 }}>{sample.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>{sample.spec}</span>
                </div>
                <p style={sample.style}>{sample.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ 06: ICONOGRAPHY ═══════════ */}
        <section id="iconography" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="06" title="Iconography" desc="Lucide icons (24×24 base, 1.5px stroke) as the icon system. Custom icons follow the same grid and stroke weight." />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { Icon: Sun, name: "Sun" },
              { Icon: Moon, name: "Moon" },
              { Icon: Camera, name: "Camera" },
              { Icon: Cloud, name: "Cloud" },
              { Icon: MapPin, name: "Map Pin" },
              { Icon: Compass, name: "Compass" },
              { Icon: Aperture, name: "Aperture" },
              { Icon: Clock, name: "Clock" },
              { Icon: AlertTriangle, name: "Alert" },
              { Icon: Star, name: "Star" },
              { Icon: SlidersHorizontal, name: "Sliders" },
              { Icon: Search, name: "Search" },
            ].map(({ Icon, name }) => (
              <div key={name} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: 16, borderRadius: "var(--radius-default)",
                background: "var(--dark-700)", border: "1px solid var(--dark-600)", minWidth: 72,
              }}>
                <Icon size={24} strokeWidth={1.5} color="#B4BAD0" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neutral-300)", textAlign: "center" }}>{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ 07: COMPONENTS ═══════════ */}
        <section id="components" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="07" title="UI Components" desc="Core component patterns for the PhotoScout interface. Dark-first palette with golden hour accents for active/important states." />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            {/* Light Score Card */}
            <div style={{ padding: 24, borderRadius: 14, background: "var(--dark-700)", border: "1px solid var(--dark-600)", flex: "1 1 280px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 16 }}>Light Quality Score</span>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "conic-gradient(#E8A225 0deg, #E8A225 313.2deg, #242836 313.2deg)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--dark-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--golden-hour)" }}>87</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--white)" }}>Warm Dramatic Side-Light</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", marginTop: 4 }}>GOLDEN HOUR · 18:42–19:15</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {["God Rays", "Warm", "Dramatic"].map((tag) => (
                      <span key={tag} style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500, color: "var(--golden-hour)", background: "var(--golden-hour-subtle)", padding: "2px 8px", borderRadius: "var(--radius-xs)", border: "1px solid rgba(232, 162, 37, 0.15)", display: "inline-block" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Settings */}
            <div style={{ padding: 24, borderRadius: 14, background: "var(--dark-700)", border: "1px solid var(--dark-600)", flex: "1 1 280px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 16 }}>Camera Settings Card</span>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "ƒ", value: "11" },
                  { label: "SS", value: "1/250" },
                  { label: "ISO", value: "200" },
                  { label: "WB", value: "5600K" },
                ].map((s) => (
                  <div key={s.label} style={{ flex: 1, padding: "8px 4px", borderRadius: "var(--radius-md)", background: "var(--dark-600)", textAlign: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neutral-300)", display: "block" }}>{s.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--white)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--golden-hour-subtle)", border: "1px solid rgba(232,162,37,0.15)", fontSize: 11, color: "var(--golden-hour-light)" }}>
                <Lightbulb className="w-4 h-4 inline mr-1" style={{ color: "var(--golden-hour-light)" }} strokeWidth={1.5} /> Use a polarizer to deepen sky contrast at this sun angle
              </div>
            </div>

            {/* Buttons */}
            <div style={{ padding: 24, borderRadius: 14, background: "var(--dark-700)", border: "1px solid var(--dark-600)", flex: "1 1 280px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 16 }}>Button System</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="btn-primary">Plan This Shot</button>
                <button className="btn-secondary">View on Map</button>
                <button className="btn-outline">Upgrade to Pro</button>
              </div>
            </div>

            {/* Opportunity Alert */}
            <div style={{ padding: 24, borderRadius: 14, background: "var(--dark-700)", border: "1px solid var(--dark-600)", flex: "1 1 280px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 16 }}>Opportunity Alert</span>
              <div style={{ padding: 16, borderRadius: "var(--radius-default)", background: "var(--coral-subtle)", border: "1px solid rgba(224, 104, 72, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: "#E06848", boxShadow: "0 0 8px #E06848" }} />
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#E06848" }}>Epic Sunset Incoming</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--neutral-100)", lineHeight: 1.5, marginBottom: 8 }}>Storm break + mid-level cloud deck clearing from the west. High probability of dramatic color.</p>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>Tomorrow · 18:30–19:10 · Score: 92</span>
              </div>
            </div>

            {/* Astro Window */}
            <div style={{ padding: 24, borderRadius: 14, background: "var(--dark-700)", border: "1px solid var(--dark-600)", flex: "1 1 280px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 16 }}>Astro Window Card</span>
              <div style={{ padding: 16, borderRadius: "var(--radius-default)", background: "var(--violet-subtle)", border: "1px solid rgba(139, 108, 193, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Sparkles className="w-4 h-4" style={{ color: "var(--violet)" }} strokeWidth={1.5} />
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#8B6CC1" }}>Milky Way Window</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#8B6CC1", background: "rgba(139,108,193,0.15)", padding: "2px 6px", borderRadius: 4, marginLeft: "auto" }}>PRO</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--neutral-200)" }}>01:15 – 04:30 · New Moon · Bortle 3</div>
                <div style={{ fontSize: 11, color: "var(--neutral-300)", marginTop: 4 }}>Galactic core rises 35° ESE at peak</div>
              </div>
            </div>

            {/* Input Fields */}
            <div style={{ padding: 24, borderRadius: 14, background: "var(--dark-700)", border: "1px solid var(--dark-600)", flex: "1 1 280px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)", letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 16 }}>Input Field</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--dark-600)", border: "1px solid var(--dark-400)", marginBottom: 10 }}>
                <Search size={16} color="#6B7394" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--neutral-300)" }}>Search locations or coordinates…</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--dark-600)", border: "1.5px solid var(--golden-hour)", boxShadow: "0 0 0 3px var(--golden-hour-subtle)" }}>
                <Search size={16} color="#E8A225" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--white)" }}>Enchanted Rock, TX</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ 08: UX GUIDE ═══════════ */}
        <section id="ux" style={{ padding: "48px 0", borderTop: "1px solid var(--dark-600)" }}>
          <SectionHeader num="08" title="UX Guide" desc="Design principles, interaction patterns, and layout guidelines for a tool that's intuitive in the field and powerful at the desk." />

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Information Architecture</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
            {[
              { icon: "◎", name: "Scout", desc: "Today's conditions, light score, camera settings. The default home view. Glanceable, real-time." },
              { icon: "◐", name: "Map", desc: "Interactive sun/moon/weather map with time scrubber. Mapbox GL with custom dark basemap." },
              { icon: <Zap className="w-4 h-4" style={{ color: "var(--golden-hour)" }} strokeWidth={1.5} />, name: "Opportunities", desc: "7-day forecast scanner. Cards sorted by score. Push notification triggers. Pro feature." },
              { icon: "◈", name: "Planner", desc: "Shot planning timeline. Pick location + date, get minute-by-minute light windows." },
              { icon: "◆", name: "Spots", desc: "Community locations with EXIF data. Browse, save, contribute. Discovery engine." },
            ].map((item) => (
              <div key={item.name} style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>{" "}
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--golden-hour)" }}>{item.name}</span>
                <p style={{ fontSize: 12, color: "var(--neutral-200)", lineHeight: 1.5, marginTop: 8 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Key UX Patterns</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[
              { title: "Progressive Disclosure", desc: "Surface the Light Score and character tag at the top level. Tap to expand the full condition breakdown (cloud layers, humidity, sun angle, etc)." },
              { title: "Glanceable in Field", desc: "Critical info (score, settings, time) visible without scrolling. High contrast, large type for data values. Works with sunglasses on." },
              { title: "Time Scrubber Pattern", desc: "Horizontal scrubber on map and planner views. Dragging updates sun position, shadow casting, light score, and settings in real-time." },
              { title: "Opportunity Cards", desc: "Card-based layout for 7-day opportunities. Color-coded edge by type. Score badge top-right. Swipe to dismiss or save." },
              { title: "Pro Gating", desc: "Free users see blurred previews of pro content with a frosted glass overlay and gentle upgrade prompt. Never block, always tease." },
              { title: "Dark Basemap", desc: "Custom Mapbox style: desaturated terrain, subtle contours, minimal labels. Golden hour warm tint option. Never bright white map." },
            ].map((p) => (
              <div key={p.title} style={{ padding: 16, borderRadius: "var(--radius-default)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--white)" }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-200)", lineHeight: 1.5, marginTop: 6 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Motion &amp; Animation</h3>
          <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--neutral-200)", lineHeight: 2.2, marginBottom: 28 }}>
            <div style={{ color: "var(--neutral-300)" }}>{"/* Easing curves */"}</div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--ease-out: cubic-bezier(0.16, 1, 0.3, 1);"}</div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);"}</div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);"}</div>
            <br />
            <div style={{ color: "var(--neutral-300)" }}>{"/* Duration scale */"}</div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--duration-fast: 120ms;    "}<span style={{ color: "var(--neutral-300)" }}>{"/* hover, toggle */"}</span></div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--duration-normal: 200ms;  "}<span style={{ color: "var(--neutral-300)" }}>{"/* cards, panels */"}</span></div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--duration-slow: 350ms;    "}<span style={{ color: "var(--neutral-300)" }}>{"/* modals, map transitions */"}</span></div>
            <div style={{ color: "var(--golden-hour-light)" }}>{"--duration-map: 800ms;     "}<span style={{ color: "var(--neutral-300)" }}>{"/* map fly-to, sun sweep */"}</span></div>
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--white)", marginBottom: 12 }}>Accessibility Requirements</h3>
          <div style={{ padding: 20, borderRadius: "var(--radius-lg)", background: "var(--dark-800)", border: "1px solid var(--dark-600)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "✓ WCAG 2.1 AA minimum", desc: "All text meets 4.5:1 contrast on dark surfaces. Large text (18px+) meets 3:1." },
                { label: "✓ Touch targets ≥ 44px", desc: "All interactive elements meet minimum touch target for outdoor/gloved use." },
                { label: "✓ Reduce motion support", desc: "Respect prefers-reduced-motion. Disable animations, map transitions become instant." },
                { label: "✓ Screen reader support", desc: "All data visualizations have aria-label with text equivalent." },
                { label: "✓ High contrast mode", desc: "Optional toggle increases border and text contrast." },
                { label: "✓ Color-blind safe", desc: "Never rely on color alone. All conditions have icon + label. Scores use shape + number." },
              ].map((a) => (
                <div key={a.label}>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--teal)", marginBottom: 4 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "var(--neutral-300)", lineHeight: 1.5 }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer style={{ marginTop: 48, padding: "24px 0", borderTop: "1px solid var(--dark-600)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, transform: "scale(0.75)", transformOrigin: "left center" }}>
            <LogoMarkSmall size={24} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--white)", letterSpacing: "-0.02em" }}>
                Photo<span style={{ color: "var(--golden-hour)" }}>Scout</span>
              </div>
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neutral-300)" }}>Brand Guide v1.0 · Confidential · March 2026</span>
        </footer>
      </div>
    </div>
  );
}
