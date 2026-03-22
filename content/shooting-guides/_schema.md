---
description: Schema definition for shooting guide entries
---
# Shooting Guide Schema
## Frontmatter Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe slug |
| title | string | yes | Guide title |
| category | string | yes | landscape, action, astro, portrait, cityscape |
| difficulty | string | yes | beginner, intermediate, advanced |
| tags | string[] | yes | Topic tags |
## Body
Detailed markdown guide with tips, settings ranges, and technique advice.
