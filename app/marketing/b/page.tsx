"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  Sun,
  Camera,
  CalendarClock,
  Bell,
  Moon,
  CloudSun,
  Thermometer,
  Wind,
  Cloud,
  Quote,
  Check,
  X,
  Zap,
} from "lucide-react";

// ─── Animated Section Wrapper ───

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Score Ring ───

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--dark-600)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--golden-hour)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (circumference * score) / 100 }}
          transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="font-heading font-bold"
          style={{ fontSize: size * 0.28, color: "var(--golden-hour)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
}

// ─── Mock Dashboard ───

function MockDashboard() {
  const miniCards = [
    { icon: Thermometer, label: "Temp", value: "18°C", color: "var(--coral)" },
    { icon: Wind, label: "Wind", value: "8 km/h", color: "var(--teal)" },
    { icon: Cloud, label: "Clouds", value: "32%", color: "var(--blue-hour)" },
  ];

  return (
    <motion.div
      className="rounded-2xl p-6 w-full max-w-[420px]"
      style={{
        background: "var(--dark-800)",
        border: "1px solid var(--dark-600)",
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-2 mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--teal)" }}
        />
        <span
          className="text-[13px]s font-mono"
          style={{ color: "var(--neutral-200)" }}
        >
          Live Light Analysis
        </span>
      </motion.div>

      {/* Score + Label */}
      <div className="flex items-center gap-5 mb-5">
        <ScoreRing score={82} size={100} />
        <div>
          <motion.div
            className="font-heading font-bold text-lg"
            style={{ color: "var(--white)" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            Golden Warm
          </motion.div>
          <motion.div
            className="text-sm"
            style={{ color: "var(--neutral-200)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Golden hour light active
          </motion.div>
        </div>
      </div>

      {/* Mini Weather Cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {miniCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="rounded-lg p-3 text-center"
            style={{
              background: "var(--dark-700)",
              border: "1px solid var(--dark-600)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
          >
            <card.icon
              className="w-4 h-4 mx-auto mb-1.5"
              style={{ color: card.color }}
            />
            <div
              className="text-[13px] mb-0.5"
              style={{ color: "var(--neutral-300)" }}
            >
              {card.label}
            </div>
            <div
              className="font-mono text-sm font-semibold"
              style={{ color: "var(--white)" }}
            >
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <div
          className="text-[13px] font-mono mb-1.5 flex justify-between"
          style={{ color: "var(--neutral-300)" }}
        >
          <span>5:40 AM</span>
          <span>12:00 PM</span>
          <span>8:20 PM</span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ background: "var(--dark-600)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--blue-hour) 0%, var(--golden-hour) 18%, var(--golden-hour-light) 30%, #F0F2F8 50%, var(--golden-hour-light) 70%, var(--golden-hour) 82%, var(--blue-hour) 100%)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, delay: 1.2, ease: "easeOut" }}
          />
        </div>
        {/* Now indicator */}
        <div className="relative h-0">
          <motion.div
            className="absolute -top-3 w-0.5 h-3"
            style={{ background: "var(--white)", left: "72%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Feature Data ───

const features = [
  {
    icon: Sun,
    title: "Light Score",
    description:
      "Real-time scoring of current light quality from 0-100, updated every minute with conditions analysis.",
    color: "var(--golden-hour)",
  },
  {
    icon: Camera,
    title: "Camera Settings",
    description:
      "Instant aperture, shutter speed, ISO, and white balance recommendations based on your gear.",
    color: "var(--golden-hour-light)",
  },
  {
    icon: CalendarClock,
    title: "Shot Planner",
    description:
      "Plan shoots around optimal light windows with a visual timeline of golden and blue hours.",
    color: "var(--blue-hour)",
  },
  {
    icon: Bell,
    title: "Opportunity Alerts",
    description:
      "Get notified before golden hour, rare weather events, and exceptional shooting conditions.",
    color: "var(--coral)",
  },
  {
    icon: Moon,
    title: "Sun/Moon Tracking",
    description:
      "Live azimuth, altitude, and compass direction for sun and moon with rise/set times.",
    color: "var(--violet)",
  },
  {
    icon: CloudSun,
    title: "Weather Integration",
    description:
      "Cloud layers, humidity, wind, visibility, and how each factor affects your photography.",
    color: "var(--teal)",
  },
];

// ─── Testimonials ───

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Landscape Photographer",
    quote:
      "PhotoScout replaced three apps and a spreadsheet. I never miss golden hour anymore - it just tells me exactly when and where to be.",
  },
  {
    name: "Marcus Rivera",
    role: "Wedding Photographer",
    quote:
      "The camera settings recommendations are spot-on. I used to spend the first 10 minutes of every shoot dialing in - now I start shooting immediately.",
  },
  {
    name: "Aiko Tanaka",
    role: "Street Photographer",
    quote:
      "The light score is addictive. Once you see a 90+ alert, you grab your camera and go. I have gotten shots I never would have planned for.",
  },
];

// ─── Page ───

export default function MarketingB() {
  const featureRef = useRef<HTMLDivElement>(null);
  const featureInView = useInView(featureRef, { once: true, margin: "-60px" });

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--dark-900)", color: "var(--white)" }}
    >
      {/* ━━━ Navigation ━━━ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{
          background: "rgba(12, 14, 20, 0.85)",
          borderBottom: "1px solid var(--dark-600)",
        }}
      >
        <div className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-heading font-bold text-lg">
            <span style={{ color: "var(--white)" }}>Photo</span>
            <span style={{ color: "var(--golden-hour)" }}>Scout</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-sm cursor-pointer hidden sm:block"
              style={{ color: "var(--neutral-200)" }}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm cursor-pointer hidden sm:block"
              style={{ color: "var(--neutral-200)" }}
            >
              Pricing
            </a>
            <button
              className="text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer"
              style={{
                background: "var(--golden-hour)",
                color: "var(--dark-900)",
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ━━━ Split Hero ━━━ */}
      <section className="pt-28 pb-20 px-4">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="font-heading font-extrabold text-4xl sm:text-5xl leading-tight mb-5"
              style={{ color: "var(--white)" }}
            >
              Light Intelligence
              <br />
              <span style={{ color: "var(--golden-hour)" }}>
                for Photographers
              </span>
            </h1>
            <p
              className="text-lg mb-8 leading-relaxed max-w-md"
              style={{ color: "var(--neutral-200)" }}
            >
              Stop guessing. PhotoScout analyzes real-time light quality, weather
              conditions, and sun position to give you a single score that tells
              you exactly when, where, and how to shoot.
            </p>
            <div className="flex items-center gap-4">
              <button
                className="font-heading font-bold text-base px-7 py-3.5 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: "var(--golden-hour)",
                  color: "var(--dark-900)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--golden-hour-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--golden-hour)")
                }
              >
                Get Started Free
              </button>
              <a
                href="#features"
                className="text-sm font-semibold cursor-pointer"
                style={{ color: "var(--neutral-200)" }}
              >
                See features &darr;
              </a>
            </div>
          </motion.div>

          {/* Right: Mock Dashboard */}
          <motion.div
            className="flex justify-center md:justify-end"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <MockDashboard />
          </motion.div>
        </div>
      </section>

      {/* ━━━ Feature Grid ━━━ */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="font-heading font-bold text-3xl mb-3">
              Everything you need in{" "}
              <span style={{ color: "var(--golden-hour)" }}>one glance</span>
            </h2>
            <p className="text-base" style={{ color: "var(--neutral-200)" }}>
              Six powerful tools, zero guesswork.
            </p>
          </AnimatedSection>

          <div
            ref={featureRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                className="rounded-xl p-6"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid var(--dark-600)",
                }}
                initial={{ opacity: 0, y: 24 }}
                animate={
                  featureInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 24 }
                }
                transition={{
                  duration: 0.45,
                  delay: i * 0.08,
                  ease: "easeOut",
                }}
              >
                <feat.icon
                  className="w-6 h-6 mb-4"
                  style={{ color: feat.color }}
                />
                <h3
                  className="font-heading font-bold text-base mb-2"
                  style={{ color: "var(--white)" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--neutral-200)" }}>
                  {feat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Comparison ━━━ */}
      <section className="py-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="font-heading font-bold text-3xl">
              The difference is{" "}
              <span style={{ color: "var(--golden-hour)" }}>obvious</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before */}
            <AnimatedSection delay={0.1}>
              <div
                className="rounded-xl p-8 h-full"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid var(--dark-600)",
                }}
              >
                <div
                  className="font-heading font-bold text-lg mb-5 flex items-center gap-2"
                  style={{ color: "var(--neutral-300)" }}
                >
                  <X className="w-5 h-5" style={{ color: "var(--coral)" }} />
                  Before PhotoScout
                </div>
                <ul className="space-y-4">
                  {[
                    "Check 5 different weather apps",
                    "Guess camera settings on location",
                    "Miss golden hour because you lost track of time",
                    "Waste the first 15 minutes dialing in exposure",
                    "Wonder if conditions are even worth going out for",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm"
                      style={{ color: "var(--neutral-300)" }}
                    >
                      <X
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "var(--neutral-300)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>

            {/* After */}
            <AnimatedSection delay={0.2}>
              <div
                className="rounded-xl p-8 h-full"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid rgba(212, 135, 45, 0.3)",
                  boxShadow: "0 0 40px rgba(212, 135, 45, 0.06)",
                }}
              >
                <div
                  className="font-heading font-bold text-lg mb-5 flex items-center gap-2"
                  style={{ color: "var(--golden-hour)" }}
                >
                  <Zap
                    className="w-5 h-5"
                    style={{ color: "var(--golden-hour)" }}
                  />
                  After PhotoScout
                </div>
                <ul className="space-y-4">
                  {[
                    "One glance: light score, weather, and sun position",
                    "Optimal camera settings ready before you arrive",
                    "Timed alerts for golden hour and blue hour windows",
                    "Start shooting immediately with dialed-in exposure",
                    "Know exactly when conditions are worth the trip",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm"
                      style={{ color: "var(--neutral-100)" }}
                    >
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "var(--golden-hour)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ━━━ Testimonials ━━━ */}
      <section className="py-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="font-heading font-bold text-3xl">
              Trusted by photographers{" "}
              <span style={{ color: "var(--golden-hour)" }}>everywhere</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <div
                  className="rounded-xl p-6 h-full flex flex-col"
                  style={{
                    background: "var(--dark-800)",
                    border: "1px solid var(--dark-600)",
                  }}
                >
                  <Quote
                    className="w-6 h-6 mb-4"
                    style={{ color: "var(--golden-hour)" }}
                  />
                  <p
                    className="text-sm leading-relaxed mb-6 flex-1"
                    style={{ color: "var(--neutral-100)" }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <div
                      className="font-heading font-semibold text-sm"
                      style={{ color: "var(--white)" }}
                    >
                      {t.name}
                    </div>
                    <div
                      className="text-[13px]s"
                      style={{ color: "var(--neutral-300)" }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Pricing ━━━ */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <AnimatedSection className="text-center mb-14">
            <h2 className="font-heading font-bold text-3xl mb-3">
              Simple,{" "}
              <span style={{ color: "var(--golden-hour)" }}>transparent</span>{" "}
              pricing
            </h2>
            <p className="text-base" style={{ color: "var(--neutral-200)" }}>
              Choose the plan that fits your workflow.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lifetime */}
            <AnimatedSection delay={0.1}>
              <div
                className="rounded-xl p-8 h-full flex flex-col relative"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid rgba(212, 135, 45, 0.4)",
                  boxShadow: "0 0 50px rgba(212, 135, 45, 0.08)",
                }}
              >
                {/* Badge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[13px]s font-bold font-heading"
                  style={{
                    background: "var(--golden-hour)",
                    color: "var(--dark-900)",
                  }}
                >
                  Recommended
                </div>
                <h3
                  className="font-heading font-bold text-[13px]l mb-1"
                  style={{ color: "var(--golden-hour)" }}
                >
                  Lifetime
                </h3>
                <div
                  className="text-sm mb-6"
                  style={{ color: "var(--neutral-200)" }}
                >
                  One-time purchase
                </div>
                <div className="font-heading font-bold text-4xl mb-6" style={{ color: "var(--white)" }}>
                  $299.00
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "All features, forever",
                    "No recurring fees",
                    "Priority support",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--neutral-200)" }}
                    >
                      <Check
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--golden-hour)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-3 rounded-lg font-heading font-bold text-sm cursor-pointer transition-colors"
                  style={{
                    background: "var(--golden-hour)",
                    color: "var(--dark-900)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--golden-hour-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--golden-hour)")
                  }
                >
                  Buy Lifetime
                </button>
              </div>
            </AnimatedSection>

            {/* Monthly */}
            <AnimatedSection delay={0.2}>
              <div
                className="rounded-xl p-8 h-full flex flex-col"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid var(--dark-600)",
                }}
              >
                <h3
                  className="font-heading font-bold text-[13px]l mb-1"
                  style={{ color: "var(--white)" }}
                >
                  Monthly
                </h3>
                <div
                  className="text-sm mb-6"
                  style={{ color: "var(--neutral-200)" }}
                >
                  Full access to all features
                </div>
                <div className="font-heading font-bold text-4xl mb-6" style={{ color: "var(--white)" }}>
                  $19.99
                  <span
                    className="text-base font-normal ml-1"
                    style={{ color: "var(--neutral-300)" }}
                  >
                    /mo
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Cancel anytime",
                    "Regular updates",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--neutral-200)" }}
                    >
                      <Check
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--teal)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-3 rounded-lg font-heading font-bold text-sm cursor-pointer transition-colors"
                  style={{
                    background: "var(--dark-700)",
                    color: "var(--white)",
                    border: "1px solid var(--dark-600)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--dark-600)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--dark-700)")
                  }
                >
                  Subscribe Monthly
                </button>
              </div>
            </AnimatedSection>

            {/* Per Trip */}
            <AnimatedSection delay={0.3}>
              <div
                className="rounded-xl p-8 h-full flex flex-col"
                style={{
                  background: "var(--dark-800)",
                  border: "1px solid var(--dark-600)",
                }}
              >
                <h3
                  className="font-heading font-bold text-[13px]l mb-1"
                  style={{ color: "var(--white)" }}
                >
                  Per Trip
                </h3>
                <div
                  className="text-sm mb-6"
                  style={{ color: "var(--neutral-200)" }}
                >
                  14-day access pass
                </div>
                <div className="font-heading font-bold text-4xl mb-6" style={{ color: "var(--white)" }}>
                  $59.99
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Perfect for travel photography",
                    "All features included",
                    "No commitment",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--neutral-200)" }}
                    >
                      <Check
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--teal)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-3 rounded-lg font-heading font-bold text-sm cursor-pointer transition-colors"
                  style={{
                    background: "var(--dark-700)",
                    color: "var(--white)",
                    border: "1px solid var(--dark-600)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--dark-600)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--dark-700)")
                  }
                >
                  Buy Trip Pass
                </button>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ━━━ Footer ━━━ */}
      <footer
        className="py-12 px-4"
        style={{ borderTop: "1px solid var(--dark-600)" }}
      >
        <div className="max-w-[960px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="font-heading font-bold text-lg">
            <span style={{ color: "var(--white)" }}>Photo</span>
            <span style={{ color: "var(--golden-hour)" }}>Scout</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-sm cursor-pointer"
              style={{ color: "var(--neutral-200)" }}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm cursor-pointer"
              style={{ color: "var(--neutral-200)" }}
            >
              Pricing
            </a>
            <a
              href="#"
              className="text-sm cursor-pointer"
              style={{ color: "var(--neutral-200)" }}
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm cursor-pointer"
              style={{ color: "var(--neutral-200)" }}
            >
              Terms
            </a>
          </div>
          <div
            className="text-[13px]s"
            style={{ color: "var(--neutral-300)" }}
          >
            &copy; 2026 PhotoScout
          </div>
        </div>
      </footer>
    </main>
  );
}
