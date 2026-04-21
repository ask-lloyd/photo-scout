"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { ActivityId, ACTIVITIES } from "./activities";

const ACTIVITY_KEY = "conditionsscout-activity";
const SUPPRESS_PICKER_KEY = "conditionsscout-suppress-picker";

interface ActivityContextValue {
  activity: ActivityId;
  setActivity: (id: ActivityId) => void;
  loaded: boolean;
  // Picker modal control
  shouldShowPicker: boolean;
  dismissPicker: (dontShowAgain: boolean) => void;
  openPicker: () => void;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activity, setActivityState] = useState<ActivityId>("photography");
  const [loaded, setLoaded] = useState(false);
  const [shouldShowPicker, setShouldShowPicker] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVITY_KEY) as ActivityId | null;
      const suppressed = localStorage.getItem(SUPPRESS_PICKER_KEY) === "1";
      if (stored && stored in ACTIVITIES) {
        setActivityState(stored);
      }
      // Show picker on first visit OR whenever not suppressed and no stored activity
      if (!suppressed && !stored) {
        setShouldShowPicker(true);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const setActivity = useCallback((id: ActivityId) => {
    setActivityState(id);
    try {
      localStorage.setItem(ACTIVITY_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const dismissPicker = useCallback((dontShowAgain: boolean) => {
    setShouldShowPicker(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem(SUPPRESS_PICKER_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, []);

  const openPicker = useCallback(() => setShouldShowPicker(true), []);

  return (
    <ActivityContext.Provider
      value={{ activity, setActivity, loaded, shouldShowPicker, dismissPicker, openPicker }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) {
    throw new Error("useActivity must be used inside ActivityProvider");
  }
  return ctx;
}
