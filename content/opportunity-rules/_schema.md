---
description: Schema definition for photography opportunity rule entries
---

# Opportunity Rule Schema

## Frontmatter Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe slug identifier |
| name | string | yes | Human-readable display name |
| type | string | yes | Category of opportunity (sunset, fog, storm, golden, blue_hour, clouds, astro) |
| description | string | yes | Short one-line description |
| score_weight | number | yes | Multiplier for final score calculation (0.0–2.0) |
| time_windows | string[] | yes | Valid windows: golden_hour_am, golden_hour_pm, sunrise, sunset, blue_hour_am, blue_hour_pm, night, midday |
| min_score | number | yes | Minimum composite score (0–100) to trigger the opportunity |
| conditions | object[] | yes | Array of weather condition matchers |

## Condition Object
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| field | string | yes | Weather field: cloudCover, cloudCoverHigh, cloudCoverMid, cloudCoverLow, humidity, visibility, windSpeed, temperature, precipitation |
| operator | string | yes | Comparison: gt, lt, between, eq |
| value | number or number[] | yes | Threshold value; use [min, max] array for `between` |
| weight | number | yes | Weight of this condition in the composite score (all weights should sum to ~1.0) |

## Body
Markdown explaining the rule in natural language — what conditions create this opportunity, what to look for, sample shots, and tips.
