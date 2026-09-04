# DEVOS Typography

**Product:** DEVOS v1.0.0
**Version:** 1.0
## Purpose

This specification defines the readable, technical type hierarchy used by DEVOS
interfaces, documentation, and brand materials.

## Font families

| Context | Preferred family | Fallback |
| --- | --- | --- |
| Interface and body | Inter | Geist, system-ui, sans-serif |
| Code and terminal | JetBrains Mono | ui-monospace, SFMono-Regular, monospace |

Font files must be loaded only from an approved, reliable source or self-hosted with
appropriate licensing. The interface must remain usable when web fonts are
unavailable.

## Type scale

| Style | Size | Weight | Line height | Use |
| --- | ---: | ---: | ---: | --- |
| Display | 48 px | 700 | 1.1 | Marketing hero only |
| H1 | 32 px | 700 | 1.2 | Page titles |
| H2 | 24 px | 650 | 1.3 | Major sections |
| H3 | 20 px | 600 | 1.4 | Panel headings |
| Body | 16 px | 400 | 1.5 | Reading content |
| UI | 14 px | 500 | 1.4 | Controls and navigation |
| Small | 12 px | 500 | 1.4 | Metadata and captions |
| Code | 13 px | 400 | 1.6 | Editor and terminal |

Responsive headings may use a bounded `clamp()` scale, but body text must not fall
below 14 px in primary workflows.

## Spacing and alignment

- Use a 4 px spacing base.
- Keep text blocks at 45–80 characters per line in documentation.
- Align labels and values consistently within panels.
- Use sentence case for interface labels; reserve uppercase for compact status
  metadata.
- Use tabular numerals for metrics and timestamps where supported.

## Accessibility

- Preserve a visible focus indicator independent of font weight or color.
- Do not use font weight alone to communicate status.
- Support browser text zoom to 200% without clipping primary actions.
- Keep line height at least 1.5 for body copy.
- Use real heading levels in document order.

## Implementation notes

- Existing CSS tokens `--font-sans` and `--font-mono` are authoritative for the
  application.
- Avoid adding font dependencies for a single component.
- Do not use light or thin weights for essential information on dark surfaces.
