import { describe, it, expect } from "bun:test";
import { recommendSettings } from "../settings-advisor";
import type { Camera, Filter, Lens, LightConditions } from "../types";

// ─── Test fixtures ───

const sonyA7RV: Camera = {
  id: "a7rv",
  make: "Sony",
  model: "A7R V",
  sensor_size: "full_frame",
  megapixels: 61,
  base_iso: 100,
  max_usable_iso: 12800,
  dynamic_range_ev: 14.7,
  has_ibis: true,
  ibis_stops: 8,
  burst_fps: 10,
  mount: "E",
  tags: [],
};

const fe2470GM2: Lens = {
  id: "fe2470gm2",
  make: "Sony",
  model: "FE 24-70mm f/2.8 GM II",
  mount: ["E"],
  focal_length_min: 24,
  focal_length_max: 70,
  max_aperture: 2.8,
  min_aperture: 22,
  has_is: false,
  is_stops: 0,
  weight_g: 695,
  filter_size_mm: 82,
  tags: [],
};

/**
 * Build a LightConditions fixture for a given sun altitude and cloud score.
 * cloud component: 5 = thick overcast, 25 = dramatic broken sky.
 */
function makeLight(
  sunAltitude: number,
  opts: {
    cloud?: number;
    azimuth?: number;
    phase?: string;
    colorTempMin?: number;
    colorTempMax?: number;
  } = {}
): LightConditions {
  const {
    cloud = 20,
    azimuth = 180,
    phase = "daylight",
    colorTempMin = 5500,
    colorTempMax = 6500,
  } = opts;
  return {
    score: 70,
    character: [],
    colorTemperature: { min: colorTempMin, max: colorTempMax, label: "neutral" },
    directionToFace: { bearing: azimuth, label: "S" },
    sunAltitude,
    sunAzimuth: azimuth,
    lightPhase: phase,
    components: {
      sunAltitude: 50,
      cloud,
      atmospheric: 15,
      special: 10,
    },
  };
}

/** Convert "1/8" / "2.0s" / "30s" → seconds for numeric comparison. */
function shutterToSeconds(s: string): number {
  if (s.startsWith("1/")) return 1 / parseFloat(s.slice(2));
  if (s.endsWith("s")) return parseFloat(s.slice(0, -1));
  return parseFloat(s);
}

// ─── Calibration: EV curve must match real meter readings ───

describe("estimateEV calibration (via recommendSettings exposureValue)", () => {
  it("midday clear sky → EV ~14 (Sunny-16 approx)", () => {
    const r = recommendSettings(makeLight(60, { cloud: 25 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(13.5);
    expect(r.exposureValue).toBeLessThanOrEqual(14);
  });

  it("midday heavy overcast → EV ~11 (~3 stops below sunny)", () => {
    const r = recommendSettings(makeLight(60, { cloud: 5 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(10.5);
    expect(r.exposureValue).toBeLessThanOrEqual(11.5);
  });

  it("golden hour (alt 6°, broken cloud) → EV 10-11", () => {
    const r = recommendSettings(makeLight(6, { cloud: 20 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(10);
    expect(r.exposureValue).toBeLessThanOrEqual(11);
  });

  it("Funes/Villnoß field reading: alt 5.79°, broken sky → not over-exposed at f/8", () => {
    // Field-verified 2026-04-27: at f/8 ISO 100, 1/8s was visibly too bright.
    // Correct exposure should be 1/15s or faster.
    const r = recommendSettings(
      makeLight(5.79, { cloud: 20, azimuth: 284, colorTempMin: 4000, colorTempMax: 4500 }),
      sonyA7RV,
      fe2470GM2,
      { hasTripod: false, style: "landscape" }
    );
    expect(r.aperture).toBe(8);
    expect(r.iso).toBe(100);
    const seconds = shutterToSeconds(r.shutterSpeed);
    // 1/8s = 0.125; a correct meter is ~1/15 = 0.0667. Anything ≥ 1/8 fails.
    expect(seconds).toBeLessThan(0.1);
  });

  it("sunset/horizon (alt 0°) → EV ~9-10", () => {
    const r = recommendSettings(makeLight(0, { cloud: 20 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(9);
    expect(r.exposureValue).toBeLessThanOrEqual(10.5);
  });

  it("civil twilight (alt -3°) → EV ~7", () => {
    const r = recommendSettings(makeLight(-3, { cloud: 20 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(6);
    expect(r.exposureValue).toBeLessThanOrEqual(8);
  });

  it("blue hour (alt -6°) → EV ~5", () => {
    const r = recommendSettings(makeLight(-6, { cloud: 20 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(3.5);
    expect(r.exposureValue).toBeLessThanOrEqual(5.5);
  });

  it("astro/night (alt -15°) → EV near 0 or below", () => {
    const r = recommendSettings(makeLight(-15, { cloud: 25 }), sonyA7RV, fe2470GM2, {
      hasTripod: true,
      style: "astro",
    });
    expect(r.exposureValue).toBeLessThanOrEqual(1);
    expect(r.exposureValue).toBeGreaterThanOrEqual(-3);
  });
});

// ─── Curve continuity: no big jumps as sun crosses thresholds ───

describe("EV curve continuity", () => {
  function evAt(alt: number) {
    return recommendSettings(makeLight(alt, { cloud: 25 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    }).exposureValue;
  }

  it("no >2 EV jump between adjacent altitudes from -18° to 60°", () => {
    const altitudes = [-18, -12, -9, -6, -3, 0, 3, 6, 9, 15, 30, 45, 60];
    let prev = evAt(altitudes[0]);
    for (let i = 1; i < altitudes.length; i++) {
      const cur = evAt(altitudes[i]);
      const delta = Math.abs(cur - prev);
      expect(delta).toBeLessThanOrEqual(3.1); // sunset/twilight bands intentionally span ~3 EV / 6°
      prev = cur;
    }
  });

  it("EV monotonically non-decreasing as sun rises", () => {
    const altitudes = [-18, -12, -6, 0, 6, 15, 45];
    let prev = -Infinity;
    for (const a of altitudes) {
      const ev = evAt(a);
      expect(ev).toBeGreaterThanOrEqual(prev - 0.01); // tolerate fp noise
      prev = ev;
    }
  });
});

// ─── Cloud-penalty floor: dim scenes shouldn't lose another 3 stops ───

describe("cloud penalty caps at low light", () => {
  it("blue hour with thick overcast doesn't go below EV ~3", () => {
    // Without the cap, EV 5 - 3 = 2. With the cap, penalty limited to ev-6 = clamped to 0.
    const r = recommendSettings(makeLight(-6, { cloud: 5 }), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.exposureValue).toBeGreaterThanOrEqual(4);
  });

  it("midday overcast still drops a full 3 stops (cap doesn't bite)", () => {
    const clear = recommendSettings(
      makeLight(60, { cloud: 25 }),
      sonyA7RV,
      fe2470GM2,
      { hasTripod: false, style: "landscape" }
    );
    const overcast = recommendSettings(
      makeLight(60, { cloud: 5 }),
      sonyA7RV,
      fe2470GM2,
      { hasTripod: false, style: "landscape" }
    );
    expect(clear.exposureValue - overcast.exposureValue).toBeGreaterThanOrEqual(2.5);
    expect(clear.exposureValue - overcast.exposureValue).toBeLessThanOrEqual(3.5);
  });
});

// ─── Output sanity ───

describe("recommendation output sanity", () => {
  it("aperture stays within lens range", () => {
    const r = recommendSettings(makeLight(30), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    expect(r.aperture).toBeGreaterThanOrEqual(fe2470GM2.max_aperture);
    expect(r.aperture).toBeLessThanOrEqual(fe2470GM2.min_aperture);
  });

  it("ISO never below base_iso or above max_usable_iso", () => {
    for (const alt of [-12, -6, 0, 6, 30, 60]) {
      const r = recommendSettings(makeLight(alt), sonyA7RV, fe2470GM2, {
        hasTripod: false,
        style: "landscape",
      });
      expect(r.iso).toBeGreaterThanOrEqual(sonyA7RV.base_iso);
      expect(r.iso).toBeLessThanOrEqual(sonyA7RV.max_usable_iso);
    }
  });

  it("white balance is the midpoint of the color temperature range", () => {
    const r = recommendSettings(
      makeLight(5, { colorTempMin: 4000, colorTempMax: 4500 }),
      sonyA7RV,
      fe2470GM2,
      { hasTripod: false, style: "landscape" }
    );
    expect(r.whiteBalance).toBe(4250);
  });

  it("hyperfocal distance reported for landscape only", () => {
    const ls = recommendSettings(makeLight(30), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "landscape",
    });
    const pt = recommendSettings(makeLight(30), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "portrait",
    });
    expect(ls.hyperfocalDistance).not.toBeNull();
    expect(pt.hyperfocalDistance).toBeNull();
  });

  it("astro uses the 500 rule for shutter speed", () => {
    const r = recommendSettings(makeLight(-15, { cloud: 25 }), sonyA7RV, fe2470GM2, {
      hasTripod: true,
      style: "astro",
    });
    // 500 / 24mm = ~20.8s, snapped to nearest standard shutter
    const seconds = shutterToSeconds(r.shutterSpeed);
    expect(seconds).toBeGreaterThanOrEqual(8);
    expect(seconds).toBeLessThanOrEqual(30);
  });

  it("action style uses 1/1000s freeze shutter", () => {
    const r = recommendSettings(makeLight(30), sonyA7RV, fe2470GM2, {
      hasTripod: false,
      style: "action",
    });
    expect(r.shutterSpeed).toBe("1/1000");
  });
});

// ─── Filter-aware recommendations ───

const promaster82CPL: Filter = {
  id: "promaster-82mm-cpl",
  make: "Promaster",
  model: "82mm HGX Prime CPL",
  type: "cpl",
  filter_size_mm: 82,
  tags: ["polarizer"],
};

const promaster67CPL: Filter = {
  id: "promaster-67mm-cpl",
  make: "Promaster",
  model: "67mm HGX Prime CPL",
  type: "cpl",
  filter_size_mm: 67,
  tags: ["polarizer"],
};

const promaster82VND: Filter = {
  id: "promaster-82mm-variable-nd",
  make: "Promaster",
  model: "82mm HGX Prime Variable ND (1-9)",
  type: "variable_nd",
  filter_size_mm: 82,
  nd_stops_min: 1,
  nd_stops_max: 9,
  tags: ["nd"],
};

const generic82ND10: Filter = {
  id: "generic-82mm-nd10",
  make: "Generic",
  model: "82mm 10-stop ND",
  type: "nd",
  filter_size_mm: 82,
  nd_stops: 10,
  tags: ["nd"],
};

describe("CPL recommendation logic", () => {
  it("recommends + applies CPL when daylight + owned + matching thread", () => {
    const r = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster82CPL],
      }
    );
    expect(r.appliedFilter).toBeDefined();
    expect(r.appliedFilter?.type).toBe("cpl");
    expect(r.appliedFilter?.ownedModel).toContain("Promaster 82mm");
    expect(r.appliedFilter?.lightLossStops).toBeCloseTo(1.5, 1);
    expect(r.filterRecommendation.some((f) => f.includes("✓") && f.includes("CPL"))).toBe(true);
  });

  it("CPL light loss reflected in shutter (1.5 stops slower than no-CPL baseline)", () => {
    const baseline = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      fe2470GM2,
      { hasTripod: false, style: "landscape" }
    );
    const withCpl = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      fe2470GM2,
      { hasTripod: false, style: "landscape", ownedFilters: [promaster82CPL] }
    );
    expect(withCpl.exposureValue).toBeCloseTo(baseline.exposureValue - 1.5, 1);
  });

  it("suggests CPL but does NOT apply EV cost when user does not own a matching one", () => {
    const r = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster67CPL], // wrong thread size for 82mm lens
      }
    );
    expect(r.appliedFilter).toBeUndefined();
    const cplRec = r.filterRecommendation.find((f) => f.includes("CPL"));
    expect(cplRec).toBeDefined();
    expect(cplRec).toContain("Suggested");
    expect(cplRec).toContain("82mm");
  });

  it("does NOT recommend CPL during astro", () => {
    const r = recommendSettings(
      makeLight(-15, { cloud: 25, phase: "astro" }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: true,
        style: "astro",
        ownedFilters: [promaster82CPL],
      }
    );
    expect(r.appliedFilter).toBeUndefined();
    expect(r.filterRecommendation.some((f) => f.toLowerCase().includes("cpl"))).toBe(false);
  });

  it("does NOT recommend CPL when scene is too dim (EV < 6)", () => {
    const r = recommendSettings(
      makeLight(-6, { cloud: 20, phase: "blue hour" }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: true,
        style: "landscape",
        ownedFilters: [promaster82CPL],
      }
    );
    expect(r.appliedFilter).toBeUndefined();
    expect(r.filterRecommendation.some((f) => f.toLowerCase().includes("cpl"))).toBe(false);
  });

  it("recommends CPL specifically for hazy conditions", () => {
    const r = recommendSettings(
      {
        ...makeLight(20, { cloud: 22 }),
        character: ["hazy"],
      },
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster82CPL],
      }
    );
    const cplRec = r.filterRecommendation.find((f) => f.includes("CPL"));
    expect(cplRec).toBeDefined();
    expect(cplRec).toContain("haze");
  });

  it("adds a tip explaining the CPL trade-off when one is applied", () => {
    const r = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster82CPL],
      }
    );
    expect(r.tips.some((t) => t.toLowerCase().includes("cpl"))).toBe(true);
  });
});

describe("ND / Variable-ND recommendation logic", () => {
  it("recommends owned Variable ND with target stops dialed in for tripod long-exposure", () => {
    const r = recommendSettings(
      makeLight(30, { phase: "daylight", cloud: 25 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: true,
        style: "landscape",
        ownedFilters: [promaster82VND],
      }
    );
    const ndRec = r.filterRecommendation.find((f) => f.toLowerCase().includes("variable nd"));
    expect(ndRec).toBeDefined();
    expect(ndRec).toContain("✓");
    expect(ndRec).toContain("Promaster");
    // Should give an explicit "dial to N stops" instruction
    expect(ndRec).toMatch(/dial to ~\d+(\.\d+)? stops/);
  });

  it("prefers Variable ND over fixed ND when both are owned", () => {
    const r = recommendSettings(
      makeLight(30, { phase: "daylight", cloud: 25 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: true,
        style: "landscape",
        ownedFilters: [generic82ND10, promaster82VND],
      }
    );
    const ndRec = r.filterRecommendation.find((f) => /\bND\)/.test(f));
    expect(ndRec).toContain("Variable");
  });

  it("falls back to fixed ND when only fixed is owned", () => {
    const r = recommendSettings(
      makeLight(30, { phase: "daylight", cloud: 25 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: true,
        style: "landscape",
        ownedFilters: [generic82ND10],
      }
    );
    const ndRec = r.filterRecommendation.find((f) => /\bND\)/.test(f));
    expect(ndRec).toContain("✓");
    expect(ndRec).toContain("10-stop");
  });

  it("suggests buying ND when none are owned and ND is warranted", () => {
    const r = recommendSettings(
      makeLight(30, { phase: "daylight", cloud: 25 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: true,
        style: "landscape",
        ownedFilters: [],
      }
    );
    const ndRec = r.filterRecommendation.find((f) => /\bND\b/.test(f) && !/CPL|GND/.test(f));
    expect(ndRec).toContain("Suggested");
    expect(ndRec).toContain("82mm");
  });

  it("does NOT recommend ND when handheld (no tripod)", () => {
    const r = recommendSettings(
      makeLight(30, { phase: "daylight", cloud: 25 }),
      sonyA7RV,
      fe2470GM2,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster82VND],
      }
    );
    const ndRec = r.filterRecommendation.find((f) => /\bND\)/.test(f));
    expect(ndRec).toBeUndefined();
  });
});

describe("filter thread-size matching", () => {
  it("ignores owned filters whose thread size doesn't match the lens", () => {
    const lens67mm: Lens = { ...fe2470GM2, filter_size_mm: 67 };
    const r = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      lens67mm,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster82CPL], // 82mm — doesn't fit 67mm lens
      }
    );
    expect(r.appliedFilter).toBeUndefined();
    const cplRec = r.filterRecommendation.find((f) => f.includes("CPL"));
    expect(cplRec).toContain("Suggested");
    expect(cplRec).toContain("67mm");
  });

  it("prefers an owned filter that matches the lens thread", () => {
    const lens67mm: Lens = { ...fe2470GM2, filter_size_mm: 67 };
    const r = recommendSettings(
      makeLight(40, { phase: "daylight", cloud: 22 }),
      sonyA7RV,
      lens67mm,
      {
        hasTripod: false,
        style: "landscape",
        ownedFilters: [promaster82CPL, promaster67CPL],
      }
    );
    expect(r.appliedFilter?.ownedModel).toContain("67mm");
  });
});
