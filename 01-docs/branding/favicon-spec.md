# DEVOS Favicon and App Icon Specification

**Product:** DEVOS v1.0.0  
**Version:** 1.0

## Purpose

This document defines browser favicon, PWA, and app-icon exports derived from the
approved shield mark.

## Master artwork

- Master format: SVG with a square `viewBox`.
- Master construction: 256 × 256 units on the 8 px grid.
- Artwork safe area: 24 units on every edge.
- No text in favicon artwork; use the shield mark and hidden `D` geometry only.
- Export against transparent background unless the platform requires a solid tile.

## Favicon exports

| File | Dimensions | Format | Use |
| --- | ---: | --- | --- |
| Master | scalable | SVG | Modern browsers and source artwork |
| Small | 16 × 16 | PNG | Legacy browser tabs |
| Standard | 32 × 32 | PNG | Browser tabs and bookmarks |
| Large | 48 × 48 | PNG | Desktop shortcuts |
| Large | 64 × 64 | PNG | High-density legacy surfaces |

Use lossless PNG export, integer scaling, and no resampling blur. Inspect each export
at 100% and at native browser size.

## App icon

- Master: 1024 × 1024 px.
- Artwork safe area: 160 px minimum on all sides.
- Adaptive icon foreground: keep the mark inside the platform safe zone.
- Rounded corners are applied by the platform; do not bake a second corner radius
  into the foreground artwork.
- Suggested exports: 180, 192, 256, 384, 512, and 1024 px.

## Accessibility and contrast

- Use the dark-mode mark on light browser chrome and the light mark on dark chrome.
- Maintain a strong silhouette at 16 × 16 px.
- Avoid thin circuit details that disappear after rasterization.
- The favicon is supplementary; page titles and accessible names remain required.

## Implementation notes

- Existing files in `02-frontend/public/` remain the current deployed favicon and PWA
  assets until replacement artwork is approved.
- Keep filenames stable when updating production assets.
- Verify manifest references and HTML `<link>` elements together.

