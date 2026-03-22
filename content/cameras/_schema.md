---
description: Schema definition for camera body entries
---

# Camera Schema

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe slug (e.g., sony-a7rv) |
| make | string | yes | Manufacturer name |
| model | string | yes | Model name |
| sensor_size | enum | yes | full_frame, apsc, or micro43 |
| megapixels | number | yes | Effective megapixels |
| base_iso | number | yes | Native base ISO |
| max_usable_iso | number | yes | Max ISO with acceptable noise for web |
| dynamic_range_ev | number | yes | Dynamic range in EV at base ISO |
| has_ibis | boolean | yes | In-body image stabilization |
| ibis_stops | number | yes | IBIS effectiveness in stops (0 if no IBIS) |
| burst_fps | number | yes | Max burst rate (mechanical or electronic) |
| mount | string | yes | Lens mount system |
| tags | string[] | yes | Category tags |

## Body
Markdown with ## Strengths and ## Settings Notes sections.
