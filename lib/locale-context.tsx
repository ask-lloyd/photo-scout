"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type LocaleMode = "US" | "World";

interface LocaleContextType {
  locale: LocaleMode;
  setLocale: (locale: LocaleMode) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "US",
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleMode>("US");

  useEffect(() => {
    const stored = localStorage.getItem("photoscout-locale") as LocaleMode | null;
    if (stored === "US" || stored === "World") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (newLocale: LocaleMode) => {
    setLocaleState(newLocale);
    localStorage.setItem("photoscout-locale", newLocale);
  };

  const toggleLocale = () => {
    setLocale(locale === "US" ? "World" : "US");
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
