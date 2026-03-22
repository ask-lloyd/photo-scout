"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Film, BarChart3, ScrollText } from "lucide-react";
import { NavHeader } from "@/components/nav-header";

const variations = [
  {
    href: "/marketing/a",
    title: "Variation A",
    subtitle: "Cinematic Hero",
    description:
      "Full-viewport hero with animated gradient, score ring demo, and staggered feature cards.",
    icon: Film,
    accent: "var(--golden-hour)",
  },
  {
    href: "/marketing/b",
    title: "Variation B",
    subtitle: "Data Dashboard Tease",
    description:
      "Lead with live data — score rings, weather cards, and camera settings front and center.",
    icon: BarChart3,
    accent: "var(--blue-hour)",
  },
  {
    href: "/marketing/c",
    title: "Variation C",
    subtitle: "Immersive Scroll",
    description:
      "Scroll-driven storytelling with parallax imagery and progressive reveals.",
    icon: ScrollText,
    accent: "var(--teal)",
  },
];

export default function MarketingHub() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <NavHeader />
      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <h1
          className="font-heading text-3xl font-bold"
          style={{ letterSpacing: "-0.02em" }}
        >
          <span className="text-text-primary">Photo</span>
          <span className="text-golden-hour">Scout</span>
        </h1>
        <p className="mt-2 text-text-tertiary text-sm font-sans">
          Marketing Landing Page Variations
        </p>
      </motion.div>

      {/* Cards grid */}
      <div className="grid gap-6 w-full max-w-3xl sm:grid-cols-3">
        {variations.map((v, i) => (
          <motion.div
            key={v.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link href={v.href} className="cursor-pointer block group">
              <div
                className="rounded-xl p-6 transition-all duration-200 ease-out bg-surface-800 border border-surface-600 group-hover:scale-[1.03] group-hover:border-surface-400 group-hover:shadow-lg"
              >
                <v.icon
                  size={28}
                  style={{ color: v.accent }}
                  className="mb-4"
                />
                <p
                  className="font-mono text-[11px] uppercase tracking-wider mb-1"
                  style={{ color: v.accent }}
                >
                  {v.title}
                </p>
                <h2 className="font-heading text-lg font-semibold text-text-primary mb-2">
                  {v.subtitle}
                </h2>
                <p className="text-text-muted text-sm leading-relaxed font-sans">
                  {v.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
