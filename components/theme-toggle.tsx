"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme-context";

const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
  { value: "system", icon: Monitor, label: "System theme" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center rounded-md overflow-hidden"
      style={{
        background: "var(--dark-600)",
        border: "1px solid var(--dark-400)",
      }}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {modes.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center justify-center transition-colors cursor-pointer"
            style={{
              width: 28,
              height: 26,
              background: isActive ? "var(--golden-hour-subtle)" : "transparent",
              color: isActive ? "var(--golden-hour)" : "var(--neutral-300)",
            }}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
          >
            <Icon size={14} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}
