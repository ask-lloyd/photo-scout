---
id: blue-hour-calm
name: Blue Hour Calm
type: blue_hour
description: Calm conditions during blue hour for cityscapes, long exposures, and twilight serenity
score_weight: 0.9
time_windows: [blue_hour_am, blue_hour_pm]
min_score: 60
conditions:
  - field: windSpeed
    operator: lt
    value: 10
    weight: 0.3
  - field: cloudCover
    operator: lt
    value: 40
    weight: 0.3
  - field: visibility
    operator: gt
    value: 12
    weight: 0.2
  - field: humidity
    operator: between
    value: [25, 75]
    weight: 0.2
---

# Blue Hour Calm

## What Creates This Opportunity

Blue hour occurs when the sun is 4–8° below the horizon. The atmosphere scatters short-wavelength blue light, bathing the world in a cool, even illumination. Calm wind (<10 km/h) is essential for long-exposure work — water becomes glass-smooth and any movement in the frame is minimized.

Low to moderate cloud cover (<40%) ensures the blue gradient dominates the sky. Partly cloudy skies can work well, with clouds picking up residual pink or purple tones that contrast beautifully against the blue. Good visibility (>12 km) keeps distant subjects sharp and city skylines crisp.

## What to Look For

- **The sky matching artificial light intensity** — this is the magic window when ambient and electric light balance perfectly
- **Still water** for mirror reflections of lit buildings or landscapes
- **A gradient sky** transitioning from deep blue overhead to pale blue/pink near the horizon
- **City lights turning on** while the sky retains detail and color

## Sample Shots

- City skyline reflections in harbor or river water
- Illuminated landmarks against a deep blue sky
- Long-exposure seascapes with silky water
- Light trails from vehicles on winding roads
- Bridges and architecture with balanced ambient/artificial lighting

## Tips

- Blue hour lasts only 20–40 minutes — arrive early with compositions pre-planned
- A sturdy tripod is mandatory; exposures will range from 1s to 30s+
- Use a remote shutter release or 2-second timer to eliminate camera shake
- Shoot in RAW to preserve the subtle blue-to-pink gradient in post
- For cityscapes, the sweet spot is roughly 15–25 minutes after sunset (or before sunrise) when sky brightness matches building lights
- Bracket exposures for HDR if the dynamic range between lit windows and dark buildings is extreme
