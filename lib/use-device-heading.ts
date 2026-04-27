"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Device compass heading in degrees (0–360, 0 = north, 90 = east).
 *
 * Returns:
 *   - heading: number | null   — null when unknown / unsupported / not granted
 *   - supported: boolean       — true when DeviceOrientationEvent exists at all
 *   - needsPermission: boolean — iOS Safari requires a user-gesture permission tap
 *   - request(): Promise<void> — call from a click handler to enable on iOS
 *
 * Notes:
 *   - On iOS, `webkitCompassHeading` is already absolute (0 = north). We use
 *     it directly when present. On Android/desktop with `absolute` events we
 *     compute heading from `alpha` accounting for screen orientation.
 *   - Throttled to 10 Hz to avoid excess React renders.
 */
export function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState(false);
  const [granted, setGranted] = useState(false);

  // iOS Safari ≥13 exposes a permission API; assume granted elsewhere.
  const needsPermission =
    typeof window !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
      ?.requestPermission === "function" &&
    !granted;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("DeviceOrientationEvent" in window);
  }, []);

  const attach = useCallback(() => {
    if (typeof window === "undefined") return;

    let last = 0;

    const handler = (ev: DeviceOrientationEvent) => {
      const now = performance.now();
      if (now - last < 100) return; // 10 Hz cap
      last = now;

      // iOS: webkitCompassHeading is degrees clockwise from north (0 = N)
      const webkit = (ev as unknown as { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkit === "number" && !isNaN(webkit)) {
        setHeading(webkit);
        return;
      }

      // Standard: alpha = rotation around z, 0 = device facing east-ish.
      // Convert to compass heading; only trust when "absolute" frame is set.
      const isAbsolute = (ev as DeviceOrientationEvent & { absolute?: boolean }).absolute;
      if (ev.alpha == null) return;
      if (!isAbsolute) return; // relative-only readings aren't a compass

      // Account for screen orientation so heading stays correct in landscape
      let screenAngle = 0;
      const so = (window.screen?.orientation as ScreenOrientation | undefined)?.angle;
      if (typeof so === "number") screenAngle = so;
      else if (typeof window.orientation === "number") screenAngle = window.orientation;

      // alpha is the device's rotation; heading is the negation modulo 360.
      let h = 360 - ev.alpha + screenAngle;
      h = ((h % 360) + 360) % 360;
      setHeading(h);
    };

    window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.addEventListener("deviceorientation", handler, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    if (needsPermission) return; // wait for explicit request()
    return attach();
  }, [supported, needsPermission, attach]);

  const request = useCallback(async () => {
    try {
      const reqFn = (DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }).requestPermission;
      if (typeof reqFn === "function") {
        const res = await reqFn();
        if (res === "granted") {
          setGranted(true);
          attach();
        }
      } else {
        setGranted(true);
        attach();
      }
    } catch {
      // user dismissed or insecure context — leave heading null
    }
  }, [attach]);

  return { heading, supported, needsPermission, request };
}
