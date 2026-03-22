---
description: Schema definition for photography spot entries
---

# Spot Schema

## Frontmatter Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe slug |
| name | string | yes | Display name |
| latitude | number | yes | GPS latitude |
| longitude | number | yes | GPS longitude |
| elevation_ft | number | yes | Elevation in feet |
| facing_direction | number | yes | Primary facing direction in degrees |
| best_time | string[] | yes | Best times: sunrise, golden_morning, midday, golden_evening, sunset, blue_hour, night |
| best_season | string[] | yes | Best seasons: spring, summer, fall, winter |
| tags | string[] | yes | Descriptive tags |
| parking | string | yes | Parking info: free, paid, limited, street |

## Body
Markdown with shooting notes and best compositions.
