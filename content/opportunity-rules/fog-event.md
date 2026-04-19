---
id: fog-event
name: Fog Event
type: fog
description: High humidity and calm winds create ground fog ideal for moody, layered landscape shots
score_weight: 1.0
time_windows: [golden_hour_am, sunrise]
min_score: 65
conditions:
  - field: humidity
    operator: gt
    value: 85
    weight: 0.35
  - field: windSpeed
    operator: lt
    value: 8
    weight: 0.25
  - field: temperature
    operator: lt
    value: 12
    weight: 0.2
  - field: cloudCoverLow
    operator: between
    value: [40, 100]
    weight: 0.2
---

# Fog Event

## What Creates This Opportunity

Radiation fog forms when the ground cools overnight under relatively calm conditions, chilling the air to its dew point. High humidity (>85%) means the air is already close to saturation; low wind speeds (<8 km/h) prevent mixing that would disperse the fog layer; and cool temperatures (<12°C) help the air reach condensation quickly.

Valleys, lakesides, and river corridors are prime locations because cold air pools in low terrain and water bodies supply additional moisture. The fog is typically thickest in the hour before and after sunrise.

## What to Look For

- **Valleys filling with fog** while hilltops remain clear — get above it for a "cloud inversion" effect
- **Fog threading through trees** creating depth and layered compositions
- **Sunbeams (crepuscular rays)** punching through fog in forested areas
- **Fog burning off** as the sun warms the ground — the transition period is highly photogenic

## Sample Shots

- Elevated viewpoint looking down on fog-filled valleys at sunrise
- Intimate forest scenes with shafts of light penetrating the mist
- Lone subjects (trees, barns, piers) emerging from the fog
- Reflections on still water with fog hovering above the surface

## Tips

- Check the dew point spread the evening before — if air temperature and dew point are within 2–3°C, fog is very likely by morning
- Arrive before first light; fog often dissipates within 1–2 hours of sunrise
- Use longer focal lengths to compress fog layers and exaggerate depth
- Protect your front element from condensation; bring a lens cloth
- Slight underexposure can preserve the mood — fog tricks meters into overexposing
