# DEVOS Color Palette

**Product:** DEVOS v1.0.0
**Version:** 1.0
## Purpose

This palette standardizes brand, interface, status, and accessible text colors across
DEVOS. Product CSS tokens remain the implementation source of truth.

## Core colors

| Role | Name | Hex | Primary use |
| --- | --- | --- | --- |
| Brand | Electric Blue | `#2563EB` | Primary actions and brand emphasis |
| Accent | Cyan | `#06B6D4` | Secondary emphasis and information |
| Dark base | Dark Navy | `#0F172A` | Brand dark surface and icon background |
| White | White | `#FFFFFF` | Light surfaces and reversed mark |

## Product surface mapping

| Role | Hex | Use |
| --- | --- | --- |
| Application background | `#0B0F19` | Main dark workspace background |
| Surface | `#111827` | Cards and panels |
| Border | `#1F2937` | Dividers and field boundaries |
| Primary text | `#F8FAFC` | Headings and essential content |
| Secondary text | `#94A3B8` | Supporting content |
| Muted text | `#8494AD` | De-emphasized content |

## Semantic colors

| State | Token | Hex |
| --- | --- | --- |
| Success | Success | `#10B981` |
| Warning | Warning | `#F59E0B` |
| Error | Error | `#EF4444` |
| Information | Info | `#06B6D4` |

## Accessibility

- Use `#2563EB` with white text for primary controls.
- Use `#7DD3FC` or another tested bright accent for text links on dark surfaces.
- `#8494AD` is the minimum muted text token on DEVOS dark surfaces; do not reduce
  contrast by applying opacity to already-muted text.
- Pair every semantic color with text, iconography, or status shape.
- Validate any new color combination with a WCAG contrast checker before release.

## Implementation notes

- Prefer named design tokens over literal colors in product code.
- Do not introduce gradients for essential text or controls.
- Dark mode is the default; light-mode brand applications must preserve the same
  semantic meaning and contrast requirements.
