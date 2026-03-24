"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
} from "motion/react";
import {
  Calendar,
  Bell,
  CloudSun,
  Users,
  Camera,
  Aperture,
  ArrowRight,
  Check,
} from "lucide-react";
import { Sun } from "@/components/animate-ui/icons/sun";
import { MapPin } from "@/components/animate-ui/icons/map-pin";

/* ─── helpers ─── */

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

/* ─── Section 1 · Hero ─── */

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[80vh] flex items-center justify-center overflow-hidden"
    >
      {/* Parallax gradient background */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ y: bgY }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-golden-hour/20 via-surface-900 to-blue-hour/20 animate-[gradientShift_12s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,135,45,0.15),transparent)]" />
      </motion.div>

      <motion.div
        className="relative z-10 max-w-[960px] mx-auto px-6 text-center"
        style={{ opacity }}
      >
        <motion.h1
          className="font-heading font-[800] text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.05] tracking-tight text-text-primary"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          Chase the{" "}
          <span className="text-golden-hour">Golden&nbsp;Hour</span>
        </motion.h1>

        <motion.p
          className="mt-5 text-lg md:text-xl text-text-secondary max-w-xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          Real-time light scoring, camera settings, and opportunity alerts — so
          you never miss the perfect shot.
        </motion.p>

        <motion.a
          href="#cta"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-md bg-golden-hour text-surface-900 font-heading font-semibold cursor-pointer hover:bg-golden-hour-light transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Get Early Access <ArrowRight size={18} />
        </motion.a>
      </motion.div>

      {/* Style for background gradient animation */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(25deg); }
        }
      `}</style>
    </section>
  );
}

/* ─── Section 2 · Score Ring ─── */

function ScoreRingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "-100px" });
  const score = useCountUp(92, inView);
  const ringSize = 152;
  const stroke = 10;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <section
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center px-6"
    >
      <div className="max-w-[960px] mx-auto text-center">
        <motion.div
          className="relative inline-flex items-center justify-center"
          style={{ width: ringSize, height: ringSize }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Conic gradient ring via SVG */}
          <svg
            width={ringSize}
            height={ringSize}
            className="absolute -rotate-90"
          >
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#D4872D" />
                <stop offset="100%" stopColor="#E4A55A" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#1A1E2A"
              strokeWidth={stroke}
            />
            {/* Progress */}
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={
                inView
                  ? { strokeDashoffset: circumference * (1 - 92 / 100) }
                  : {}
              }
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <span className="font-heading font-[800] text-5xl text-text-primary">
            {score}
          </span>
        </motion.div>

        <motion.p
          className="mt-6 text-lg font-heading font-semibold text-golden-hour tracking-wide uppercase"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Light Quality Score
        </motion.p>

        <motion.p
          className="mt-3 text-text-secondary max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          Real-time scoring based on sun angle, cloud cover, and atmospheric
          conditions.
        </motion.p>
      </div>
    </section>
  );
}

/* ─── Section 3 · Camera Settings Build ─── */

const SETTINGS = [
  { label: "Aperture", value: "ƒ/8" },
  { label: "Shutter", value: "1/125" },
  { label: "ISO", value: "400" },
  { label: "Temp", value: "5200K" },
];

function CameraSettingsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center px-6"
    >
      <div className="max-w-[960px] mx-auto w-full">
        <motion.div
          className="bg-surface-800 border border-surface-400/40 rounded-xl p-6 md:p-8 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Camera size={20} className="text-golden-hour" />
            <span className="font-heading font-semibold text-text-primary text-lg">
              Recommended Settings
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SETTINGS.map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-surface-700 rounded-lg p-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.3 + i * 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="block text-xs text-text-muted uppercase tracking-wider mb-1 font-sans">
                  {s.label}
                </span>
                <span className="block font-mono text-2xl font-semibold text-text-primary">
                  {s.value}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Tip banner */}
          <motion.div
            className="mt-6 flex items-start gap-3 rounded-lg bg-golden-hour/10 border border-golden-hour/20 p-4"
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1.05 }}
          >
            <Aperture
              size={18}
              className="text-golden-hour mt-0.5 shrink-0"
            />
            <p className="text-sm text-golden-hour-light leading-relaxed">
              Optimal settings for golden-hour side lighting. Use a tripod for
              sharper results at slower shutter speeds.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Section 4 · Map Preview ─── */

function MapPreviewSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "-100px" });

  /* Sun arc path: a parabolic arc from left to right */
  const arcPath = "M 40 200 Q 200 20, 360 200";

  return (
    <section
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center px-6"
    >
      <div className="max-w-[960px] mx-auto w-full text-center">
        {/* Mock map */}
        <motion.div
          className="relative mx-auto max-w-xl aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-b from-surface-700 to-surface-900 border border-surface-400/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Subtle grid overlay to simulate a map */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(#F0F2F8 1px, transparent 1px), linear-gradient(90deg, #F0F2F8 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Sun arc SVG */}
          <svg
            viewBox="0 0 400 240"
            className="absolute inset-0 w-full h-full"
            fill="none"
          >
            {/* Dashed arc track */}
            <path
              d={arcPath}
              stroke="#3D4358"
              strokeWidth="2"
              strokeDasharray="6 4"
              fill="none"
            />
            {/* Animated filled arc */}
            <motion.path
              d={arcPath}
              stroke="#D4872D"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{ duration: 2, delay: 0.4, ease: "easeInOut" }}
            />
            {/* Golden sun dot that moves along the path */}
            <motion.circle
              r="7"
              fill="#D4872D"
              filter="drop-shadow(0 0 6px rgba(212,135,45,0.6))"
              initial={{ offsetDistance: "0%" }}
              animate={inView ? { offsetDistance: "100%" } : {}}
              transition={{ duration: 2, delay: 0.4, ease: "easeInOut" }}
              style={{
                offsetPath: `path('${arcPath}')`,
              }}
            />
          </svg>

          {/* Horizon line */}
          <div className="absolute bottom-[16.5%] left-0 right-0 h-px bg-text-muted/30" />
        </motion.div>

        <motion.p
          className="mt-8 text-xl font-heading font-semibold text-text-primary"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          Track the sun&apos;s path and plan your shots
        </motion.p>
        <motion.p
          className="mt-2 text-text-secondary max-w-md mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.85 }}
        >
          Visualise sun position, golden hour windows, and blue hour timing for
          any location on the map.
        </motion.p>
      </div>
    </section>
  );
}

/* ─── Section 5 · Feature List ─── */

const FEATURES = [
  {
    icon: Sun,
    title: "Light Score",
    desc: "Know at a glance whether conditions are worth shooting in, scored 0 – 100 in real time.",
    color: "text-golden-hour",
  },
  {
    icon: Calendar,
    title: "Shot Planner",
    desc: "Plan shoots around peak light windows with calendar integration and location scouting.",
    color: "text-blue-hour",
  },
  {
    icon: Bell,
    title: "Opportunity Alerts",
    desc: "Get notified when spectacular light is about to happen near you — sunsets, storms, fog.",
    color: "text-coral",
  },
  {
    icon: MapPin,
    title: "Sun Tracking",
    desc: "Precise sun and moon ephemeris data overlaid on your map for any date and location.",
    color: "text-golden-hour-light",
  },
  {
    icon: CloudSun,
    title: "Weather Integration",
    desc: "Cloud cover, visibility, humidity, and wind speed — all the data that impacts your image.",
    color: "text-teal",
  },
  {
    icon: Users,
    title: "Community Spots",
    desc: "Discover photographer-verified locations with metadata on best times and compositions.",
    color: "text-violet",
  },
];

function FeatureListSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center px-6 py-20"
    >
      <div className="max-w-[960px] mx-auto w-full space-y-16">
        <motion.h2
          className="text-center font-heading font-bold text-3xl md:text-4xl text-text-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Everything you need to{" "}
          <span className="text-golden-hour">shoot smarter</span>
        </motion.h2>

        <div className="space-y-12 md:space-y-16">
          {FEATURES.map((f, i) => {
            const isOdd = i % 2 !== 0;
            return (
              <FeatureRow key={f.title} feature={f} index={i} reverse={isOdd} parentInView={inView} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  feature,
  index,
  reverse,
  parentInView,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  reverse: boolean;
  parentInView: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "-100px" });
  const Icon = feature.icon;
  const active = parentInView || inView;

  return (
    <motion.div
      ref={ref}
      className={`flex flex-col md:flex-row items-center gap-6 md:gap-10 ${
        reverse ? "md:flex-row-reverse" : ""
      }`}
      initial={{ opacity: 0, x: reverse ? 60 : -60 }}
      animate={active ? { opacity: 1, x: 0 } : {}}
      transition={{
        duration: 0.65,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Icon */}
      <div className="shrink-0 w-16 h-16 rounded-xl bg-surface-700 flex items-center justify-center">
        <Icon size={28} className={feature.color} animateOnView />
      </div>

      {/* Text */}
      <div className={`text-center md:text-left ${reverse ? "md:text-right" : ""}`}>
        <h3 className="font-heading font-semibold text-lg text-text-primary">
          {feature.title}
        </h3>
        <p className="mt-1 text-text-secondary leading-relaxed max-w-sm">
          {feature.desc}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Section 6 · Pricing ─── */

const PRICING_TIERS = [
  {
    name: "Lifetime",
    price: "$299",
    decimal: ".00",
    period: null,
    highlight: true,
    badge: "Recommended",
    features: [
      "One-time purchase",
      "All features, forever",
      "No recurring fees",
      "Priority support",
    ],
    cta: "Get Lifetime Access",
  },
  {
    name: "Monthly",
    price: "$19",
    decimal: ".99",
    period: "/mo",
    highlight: false,
    badge: null,
    features: [
      "Full access to all features",
      "Cancel anytime",
      "Regular updates",
    ],
    cta: "Start Monthly",
  },
  {
    name: "Per Trip",
    price: "$59",
    decimal: ".99",
    period: null,
    highlight: false,
    badge: null,
    features: [
      "14-day access pass",
      "Perfect for travel photography",
      "All features included",
      "No commitment",
    ],
    cta: "Buy Trip Pass",
  },
];

function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "-100px" });

  return (
    <section ref={ref} className="min-h-[80vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-[960px] mx-auto w-full">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-text-primary">
            Simple,{" "}
            <span className="text-golden-hour">transparent</span>{" "}
            pricing
          </h2>
          <p className="mt-3 text-text-secondary max-w-md mx-auto">
            One plan for every photographer. No surprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              className={`relative rounded-xl p-8 flex flex-col ${
                tier.highlight
                  ? "bg-surface-800 border border-golden-hour/40 shadow-[0_0_40px_rgba(212,135,45,0.08)]"
                  : "bg-surface-800 border border-surface-600"
              }`}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.15 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold font-heading bg-golden-hour text-surface-900">
                  {tier.badge}
                </div>
              )}

              <h3
                className={`font-heading font-bold text-xl mb-1 ${
                  tier.highlight ? "text-golden-hour" : "text-text-primary"
                }`}
              >
                {tier.name}
              </h3>

              <div className="font-heading font-bold text-4xl text-text-primary mt-2 mb-6">
                {tier.price}
                <span className="text-lg">{tier.decimal}</span>
                {tier.period && (
                  <span className="text-base font-normal text-text-muted ml-1">
                    {tier.period}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <Check
                      size={16}
                      className={`shrink-0 ${
                        tier.highlight ? "text-golden-hour" : "text-teal"
                      }`}
                    />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-lg font-heading font-semibold text-sm cursor-pointer transition-colors ${
                  tier.highlight
                    ? "bg-golden-hour text-surface-900 hover:bg-golden-hour-light"
                    : "bg-surface-700 text-text-primary border border-surface-600 hover:bg-surface-600"
                }`}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section 7 · CTA ─── */

function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "-100px" });

  return (
    <section
      id="cta"
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center px-6"
    >
      <div className="max-w-[960px] mx-auto text-center">
        <motion.h2
          className="font-heading font-bold text-3xl md:text-4xl text-text-primary"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Join{" "}
          <span className="text-golden-hour">2,400+</span>{" "}
          photographers
        </motion.h2>

        <motion.p
          className="mt-3 text-text-secondary max-w-md mx-auto"
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          Sign up for early access and start making every golden hour count.
        </motion.p>

        <motion.form
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="you@email.com"
            className="w-full sm:flex-1 rounded-md bg-surface-600 border border-surface-400 px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-golden-hour/60 transition-shadow"
          />
          <button
            type="submit"
            className="w-full sm:w-auto whitespace-nowrap cursor-pointer rounded-md bg-golden-hour px-6 py-3 font-heading font-semibold text-surface-900 hover:bg-golden-hour-light transition-colors"
          >
            Get Early Access
          </button>
        </motion.form>

        {/* Footer links */}
        <motion.div
          className="mt-16 flex items-center justify-center gap-6 text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <a href="#" className="cursor-pointer hover:text-text-secondary transition-colors">
            Privacy
          </a>
          <span className="text-surface-400">·</span>
          <a href="#" className="cursor-pointer hover:text-text-secondary transition-colors">
            Terms
          </a>
          <span className="text-surface-400">·</span>
          <a href="#" className="cursor-pointer hover:text-text-secondary transition-colors">
            Twitter
          </a>
        </motion.div>

        {/* Wordmark */}
        <div className="mt-8">
          <span className="font-heading font-bold text-lg text-text-primary">
            Photo
          </span>
          <span className="font-heading font-bold text-lg text-golden-hour">
            Scout
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ─── */

export default function MarketingVariantC() {
  return (
    <main className="bg-surface-900 text-text-primary scroll-smooth">
      <HeroSection />
      <ScoreRingSection />
      <CameraSettingsSection />
      <MapPreviewSection />
      <FeatureListSection />
      <PricingSection />
      <CTASection />
    </main>
  );
}
