# DEVOS Icon Specification

**Product:** DEVOS v1.0.0  
**Version:** 1.0

## Purpose

This specification keeps interface icons consistent across the workspace, Git
controls, terminal, planner, and public site.

## System

- Library: Lucide React, already used by the frontend.
- Base grid: 24 × 24 units.
- Default stroke: 2 units.
- Stroke caps and joins: round.
- Standard sizes: 16, 18, 20, and 24 px.
- Optical padding: at least 2 units inside the 24-unit viewBox.
- Filled icons are reserved for status indicators and selected navigation states.

## Usage

- Use one icon family within a control group.
- Pair unfamiliar icons with visible text or an accessible label.
- Use directional icons consistently: chevrons indicate hierarchy, arrows indicate
  movement, and external-link icons indicate leaving DEVOS.
- Do not use icons as decoration when they compete with the control label.

## Accessibility

- Interactive icon-only controls require an accessible name.
- Decorative icons must use `aria-hidden="true"`.
- Never communicate success, warning, or failure through color alone.
- Maintain at least a 24 × 24 px pointer target for icon-only controls.
- Test icon contrast against its actual background, not the page background.

## Implementation notes

- Reuse existing Lucide icons before introducing a custom SVG.
- Keep custom marks separate from the interface icon system.
- Avoid inline path duplication; use the shared component and token conventions.
- Do not animate icons continuously. Use short transitions only to communicate a
  state change.

