---
description: Schema definition for filter entries (CPL, ND, Variable ND, GND, UV, etc.)
---

# Filter Schema

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe slug |
| make | string | yes | Manufacturer (Promaster, B+W, Hoya, etc.) |
| model | string | yes | Full model / product name |
| type | string | yes | One of: cpl, nd, variable_nd, gnd, uv, diffusion, mist |
| filter_size_mm | number | yes | Thread diameter in mm (e.g., 67, 77, 82) |
| nd_stops | number | no | For fixed ND: stops of light reduction (e.g., 3, 6, 10) |
| nd_stops_min | number | no | For variable ND: minimum stops |
| nd_stops_max | number | no | For variable ND: maximum stops |
| tags | string[] | yes | Category tags |

## Body
Markdown with ## Strengths and ## Best For sections.
