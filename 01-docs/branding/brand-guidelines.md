# DEVOS Brand Guidelines

**Product:** DEVOS v1.0.0
**Full name:** Developer Operating System
**Status:** Brand identity foundation
**Version:** 1.0
## Purpose

This document defines the identity, logo usage, composition, and accessibility rules
for DEVOS across the product, documentation, GitHub, and marketing surfaces.

## Brand character

DEVOS is enterprise-grade, AI-first, developer-focused, minimal, premium, and
trustworthy. Visual decisions should communicate precision and calm rather than
decoration or novelty.

## Logo concept

The DEVOS mark is a symmetrical hexagonal shield containing neural-circuit geometry
and a hidden `D` monogram. The mark is specified on an 8 px construction grid:

- Artboard: 256 × 256 units.
- Shield outer points: `(128, 16)`, `(224, 80)`, `(224, 176)`,
  `(128, 240)`, `(32, 176)`, `(32, 80)`.
- Inner shield inset: 24 units from the outer contour.
- Circuit stroke: 8 units, round caps and joins.
- Circuit nodes: 12-unit diameter circles centered on grid intersections.
- Monogram counter: a 32-unit radius semicircular negative-space construction.
- Optical corrections must preserve bilateral symmetry around the vertical centerline.

The specification is vector-ready. It does not assert that a final logo artwork file
exists.

## Clear space and sizing

- Clear space: at least the mark's 1/4 shield width on every side.
- Wordmark clear space: at least the cap height of the `D`.
- Minimum digital mark size: 16 px.
- Minimum print mark size: 8 mm.
- Do not place the mark on photographic detail, low-contrast gradients, or textured
  backgrounds.

## Approved variants

- **Dark mode:** Electric Blue and Cyan mark on Dark Navy or DEVOS background.
- **Light mode:** Electric Blue mark on White or a neutral light surface.
- **Monochrome:** one solid color only; use white on dark surfaces and Dark Navy on
  light surfaces.

Do not stretch, rotate, add effects, redraw the circuit, change the shield geometry,
or combine the mark with unapproved slogans.

## Accessibility

- Body text must meet WCAG 2.2 AA contrast (4.5:1 normal text, 3:1 large text).
- Do not rely on color alone to communicate state.
- Provide a text label or accessible name whenever the mark is interactive.
- Keep the mark at least 24 px when used as the sole navigation affordance.

## Implementation notes

- Existing product assets remain authoritative until reviewed replacement artwork is
  approved.
- Use SVG for master artwork and transparent PNG exports only where a platform
  requires raster input.
- Preserve the `viewBox`; do not bake display dimensions into the SVG master.
- Keep brand assets in `01-docs/assets/` and web exports in
  `02-frontend/public/`.
