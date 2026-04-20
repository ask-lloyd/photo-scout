"use client";

import { useLocale } from "@/lib/locale-context";
import { Globe } from "lucide-react";

export function LocaleToggle() {
  const { locale, toggleLocale } = useLocale();

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[13px]s transition-colors cursor-pointer"
      style={{
        background: "var(--dark-600)",
        border: "1px solid var(--dark-400)",
        color: locale === "US" ? "var(--golden-hour)" : "var(--blue-hour)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 500,
      }}
      aria-label={`Switch to ${locale === "US" ? "World" : "US"} units`}
      title={locale === "US" ? "Using °F, 12h, miles" : "Using °C, 24h, km"}
    >
      {locale === "US" ? (
        <>US</>
      ) : (
        <><Globe size={12} /> World</>
      )}
    </button>
  );
}
