# DEVOS Social and GitHub Banner Specification

**Product:** DEVOS v1.0.0  
**Version:** 1.0

## Purpose

These specifications define consistent, legible brand compositions for repository
previews, professional profiles, and social sharing.

## Export dimensions

| Surface | Dimensions | Safe area |
| --- | ---: | ---: |
| GitHub repository social preview | 1280 × 640 px | 64 px all sides |
| Open Graph image | 1200 × 630 px | 60 px all sides |
| GitHub profile avatar | 460 × 460 px | 64 px all sides |
| LinkedIn personal/company banner | 1584 × 396 px | 96 px all sides |
| X profile banner | 1500 × 500 px | 120 px left/right, 72 px top/bottom |
| X post image | 1600 × 900 px | 80 px all sides |

## Composition

- Use Dark Navy or the DEVOS dark background as the base.
- Place the shield mark in the safe area with sufficient breathing room.
- Use Electric Blue for the primary focal element and Cyan sparingly for secondary
  circuitry or dividers.
- Keep the DEVOS wordmark and tagline away from platform crop zones.
- Use no more than one headline and one supporting line.
- Minimum supporting text size: 24 px at the final export dimensions.

## Accessibility

- Preserve contrast for all text and marks against the selected background.
- Do not put essential information only in the image; repeat it in surrounding
  page metadata or post text.
- Review both desktop and mobile crops before publishing.
- Avoid rapid visual patterns or animated content in static banner derivatives.

## Implementation notes

- Export PNG for social platforms and retain an editable SVG or design source.
- Use sRGB color space and metadata-free web exports where accepted.
- Use the existing `01-docs/assets/devos-banner.svg` as the current reference asset;
  do not imply that new social artwork exists until it has been designed and
  reviewed.
- Store future approved marketing exports under `01-docs/assets/marketing/`.

