"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActivity } from "@/lib/activity-context";
import { ACTIVITY_LIST, ACTIVITIES, ActivityId } from "@/lib/activities";

export function ActivityPickerModal() {
  const router = useRouter();
  const { shouldShowPicker, setActivity, dismissPicker } = useActivity();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hovering, setHovering] = useState<ActivityId | null>(null);

  if (!shouldShowPicker) return null;

  const choose = (id: ActivityId) => {
    setActivity(id);
    dismissPicker(dontShowAgain);
    router.push(ACTIVITIES[id].homePath);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="glass rounded-3xl p-8 max-w-xl w-full overlay-panel-strong"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="text-center mb-6">
          <p
            className="uppercase tracking-widest mb-2"
            style={{ fontSize: 11, color: "var(--neutral-300)" }}
          >
            Welcome to ConditionsScout
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--white)",
            }}
          >
            What are you doing today?
          </h2>
          <p className="mt-2 text-[13px] text-[var(--neutral-300)]">
            Pick your activity — we&apos;ll tailor the forecast, gear, and advice to it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACTIVITY_LIST.map((a) => (
            <button
              key={a.id}
              onClick={() => choose(a.id)}
              onMouseEnter={() => setHovering(a.id)}
              onMouseLeave={() => setHovering(null)}
              className="text-left rounded-2xl p-5 transition-all cursor-pointer surface-subtle"
              style={{
                background: hovering === a.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                border:
                  hovering === a.id
                    ? `1px solid ${a.color}`
                    : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <p className="text-base font-semibold text-[var(--white)]">{a.label}</p>
              <p className="mt-1 text-[13px] text-[var(--neutral-300)]">{a.tagline}</p>
            </button>
          ))}
        </div>

        <label className="mt-6 flex items-center justify-center gap-2 text-[13px] text-[var(--neutral-300)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="accent-orange-400 cursor-pointer"
          />
          Don&apos;t show me this again
        </label>
      </div>
    </div>
  );
}
