---
description: Schema definition for lens entries
---

# Lens Schema

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe slug |
| make | string | yes | Manufacturer |
| model | string | yes | Full model name |
| mount | string[] | yes | Compatible mount(s) |
| focal_length_min | number | yes | Minimum focal length in mm |
| focal_length_max | number | yes | Maximum focal length in mm |
| max_aperture | number | yes | Maximum aperture (widest, e.g., 2.8) |
| min_aperture | number | yes | Minimum aperture (e.g., 22) |
| has_is | boolean | yes | Has image stabilization |
| is_stops | number | yes | IS effectiveness (0 if none) |
| weight_g | number | yes | Weight in grams |
| filter_size_mm | number | yes | Filter thread diameter (0 if none) |
| tags | string[] | yes | Category tags |

## Body
Markdown with ## Strengths and ## Best For sections.
