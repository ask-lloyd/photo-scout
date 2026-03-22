"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";
import { Calendar, Zap, Star as LucideStar, ArrowRight } from "lucide-react";
import { Sun } from "@/components/animate-ui/icons/sun";
import { Star } from "@/components/animate-ui/icons/star";

/* ────────────────────────────────────────────
   Animated counter hook
   ──────────────────────────────────────────── */
function useCounter(target: number, duration = 1.6, delay = 0.4) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(mv, target, {
        duration,
        ease: [0.16, 1, 0.3, 1],
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [mv, target, duration, delay]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setValue(v));
    return unsub;
  }, [rounded]);

  return value;
}

/* ────────────────────────────────────────────
   Score Ring
   ──────────────────────────────────────────── */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const count = useCounter(score, 1.8, 0.6);
  const pct = useTransform(
    useMotionValue(count),
    [0, 100],
    ["0%", "100%"]
  );

  return (
    <div
      className="relative rounded-full"
      style={{ width: size, height: size }}
    >
      {/* Conic gradient ring */}
      <div
        className="absolute inset-0 rounded-full score-ring transition-all duration-100"
        style={{ "--pct": `${count}%` } as React.CSSProperties}
      />
      {/* Inner circle */}
      <div
        className="absolute rounded-full bg-surface-900 flex items-center justify-center"
        style={{
          inset: 8,
        }}
      >
        <span className="font-heading text-3xl font-bold text-golden-hour">
          {count}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Feature Card
   ──────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface-800 border border-surface-600 rounded-xl p-6 md:p-8"
    >
      <div className="w-10 h-10 rounded-lg bg-golden-hour/10 flex items-center justify-center mb-4">
        <Icon size={20} className="text-golden-hour" animateOnView />
      </div>
      <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-tertiary text-sm leading-relaxed font-sans">
        {description}
      </p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Animated Camera Settings
   ──────────────────────────────────────────── */
const PRESETS = [
  { aperture: "ƒ/11", shutter: "1/250", iso: "ISO 200", kelvin: "5600K" },
  { aperture: "ƒ/2.8", shutter: "1/60", iso: "ISO 800", kelvin: "3200K" },
  { aperture: "ƒ/8", shutter: "1/500", iso: "ISO 100", kelvin: "6500K" },
  { aperture: "ƒ/4", shutter: "1/125", iso: "ISO 400", kelvin: "4200K" },
];

function CameraSettingsDemo() {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "100px" });

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % PRESETS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [inView]);

  const preset = PRESETS[idx];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface-800 border border-surface-600 rounded-xl p-6 md:p-8 max-w-md mx-auto"
    >
      <p className="section-label mb-4">Recommended Settings</p>
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ["Aperture", preset.aperture],
            ["Shutter", preset.shutter],
            ["ISO", preset.iso],
            ["White Bal", preset.kelvin],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-surface-700 rounded-lg p-3">
            <p className="text-text-muted text-[11px] font-mono uppercase tracking-wider mb-1">
              {label}
            </p>
            <motion.p
              key={value}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-lg font-semibold text-golden-hour"
            >
              {value}
            </motion.p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Social Proof
   ──────────────────────────────────────────── */
function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Avatar circles */}
      <div className="flex -space-x-3">
        {[
          "bg-blue-hour",
          "bg-golden-hour",
          "bg-teal",
          "bg-coral",
          "bg-violet",
        ].map((bg, i) => (
          <div
            key={i}
            className={`w-9 h-9 rounded-full ${bg} border-2 border-surface-900 flex items-center justify-center text-[11px] font-semibold text-text-primary`}
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>

      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <LucideStar
            key={i}
            size={16}
            className="text-golden-hour fill-golden-hour"
          />
        ))}
      </div>

      <p className="text-text-secondary text-sm font-sans">
        Trusted by{" "}
        <span className="text-text-primary font-semibold">2,400+</span>{" "}
        photographers
      </p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════ */
export default function MarketingVariationA() {
  return (
    <div className="min-h-screen scroll-smooth">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(232,162,37,0.25), transparent 70%), radial-gradient(ellipse 60% 50% at 70% 60%, rgba(59,111,212,0.2), transparent 60%)",
            animation: "heroGradient 10s ease-in-out infinite alternate",
          }}
        />
        {/* Extra glow layer */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 40% 40% at 30% 50%, rgba(232,162,37,0.3), transparent 60%)",
            animation: "heroGradient 14s ease-in-out infinite alternate-reverse",
          }}
        />

        <style jsx>{`
          @keyframes heroGradient {
            0% {
              transform: scale(1) translate(0, 0);
            }
            100% {
              transform: scale(1.15) translate(2%, -3%);
            }
          }
        `}</style>

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span
              className="font-heading text-base font-bold tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              <span className="text-text-primary">Photo</span>
              <span className="text-golden-hour">Scout</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading font-extrabold text-text-primary leading-[1.05] mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            Know Your Light
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-text-tertiary text-base md:text-lg leading-relaxed font-sans max-w-lg mb-10"
          >
            Real-time light quality scoring, camera settings, and opportunity
            alerts for photographers who chase the perfect shot.
          </motion.p>

          {/* Score ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <ScoreRing score={87} size={128} />
            <p className="mt-3 text-text-muted text-xs font-mono uppercase tracking-wider">
              Light Score
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <button
              className="cursor-pointer inline-flex items-center gap-2 font-sans font-semibold text-sm bg-golden-hour text-surface-900 px-7 py-3.5 rounded-lg hover:bg-golden-hour-light hover:scale-105 transition-all duration-200 shadow-[0_2px_12px_rgba(232,162,37,0.3)]"
            >
              Start Scouting — Free
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-surface-500 flex items-start justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-1 rounded-full bg-text-muted"
            />
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 md:py-32">
        <div className="content-max">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Features</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary">
              Everything you need to shoot with confidence
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <FeatureCard
              icon={Sun}
              title="Light Score"
              description="A single 0–100 number that tells you how good the light is right now. Golden hour, blue hour, cloud diffusion — all factored in."
              delay={0}
            />
            <FeatureCard
              icon={Calendar}
              title="Shot Planner"
              description="Plan your week around optimal light windows. See sunrise, sunset, golden hour, and blue hour times at a glance."
              delay={0.1}
            />
            <FeatureCard
              icon={Zap}
              title="Opportunity Alerts"
              description="Get notified when conditions align for exceptional shots — dramatic skies, rare light, or weather breaks."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── CAMERA SETTINGS DEMO ── */}
      <section className="py-24 md:py-32 bg-surface-800/30">
        <div className="content-max">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Smart Settings</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary">
              Camera settings that adapt to the moment
            </h2>
            <p className="mt-3 text-text-tertiary text-sm font-sans max-w-md mx-auto">
              PhotoScout analyzes current conditions and recommends aperture,
              shutter speed, ISO, and white balance in real time.
            </p>
          </div>

          <CameraSettingsDemo />
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-24 md:py-32">
        <div className="content-max flex flex-col items-center">
          <SocialProof />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-surface-600 py-10">
        <div className="content-max flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/marketing" className="cursor-pointer">
            <span
              className="font-heading text-sm font-bold"
              style={{ letterSpacing: "-0.02em" }}
            >
              <span className="text-text-primary">Photo</span>
              <span className="text-golden-hour">Scout</span>
            </span>
          </Link>

          <nav className="flex gap-6">
            {["Features", "Pricing", "Blog", "Support"].map((label) => (
              <a
                key={label}
                href="#"
                className="cursor-pointer text-text-muted text-sm font-sans hover:text-text-secondary transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <p className="text-text-muted text-xs font-sans">
            &copy; 2026 PhotoScout
          </p>
        </div>
      </footer>
    </div>
  );
}
