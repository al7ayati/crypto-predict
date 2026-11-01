# Frontend Experience Redesign

## Intent

This release focuses on the experience layer of Crypto Predict. It improves visual hierarchy, navigation clarity, responsive behavior, feedback, and interaction polish while preserving the current application architecture and business behavior.

## Protected behavior

The redesign must not alter:
- Firebase Authentication configuration or sign-in/sign-up flows.
- Market-data provider contracts, request cadence, caching, or source attribution.
- Binance trade-stream handling.
- Prediction and technical-signal calculations.
- Backtest calculations, historical data interpretation, or CSV export behavior.
- Local alert persistence, trigger rules, or browser-notification permissions.
- Existing routes and page-level feature availability.

If a visual improvement appears to require changing one of these areas, keep the existing behavior and adapt the presentation instead.

## Experience principles

1. **Clarity before density** — establish one clear page title, group related information, and distinguish primary actions from secondary controls.
2. **Trust through context** — retain visible data-source, freshness, methodology, and educational-use explanations. Never imply that a deterministic baseline is a validated machine-learning forecast.
3. **Consistent interaction language** — use repeatable spacing, radii, focus indicators, control sizes, hover states, and status treatments.
4. **Responsive by design** — preserve readable hierarchy and usable controls on narrow screens; do not simply scale down desktop layouts.
5. **Motion with purpose** — use short transitions for navigation, state changes, and direct manipulation. Avoid decorative looping motion and respect reduced-motion preferences.
6. **Accessible by default** — use WCAG 2.2 as a design reference for keyboard access, visible focus, target size, contrast, reflow, labels, status messages, and predictable interaction.
7. **Honest feedback** — loading, stale, empty, unavailable, success, and error states must be distinguishable without relying on color alone.

## Visual system

- **Foundation:** light neutral workspace, deep navy navigation, restrained blue primary action, and semantic positive/negative/warning colors.
- **Typography:** existing Inter/system font stack; use weight, size, and spacing to establish hierarchy.
- **Surfaces:** white panels on a subtle cool-gray canvas, fine borders, restrained shadows, and consistent corner radii.
- **Controls:** clear focus-visible rings, minimum 44px primary touch targets where practical, consistent control heights, and visible disabled states.
- **Data:** tabular numerals, clear table headings, readable labels, and preserved source/freshness context.
- **Dialogs:** clear modal hierarchy, backdrop separation, keyboard handling, and focus management.

## Motion guidance

- Fast feedback: approximately 150ms.
- Standard control transitions: approximately 220ms.
- Page entrance: approximately 300–360ms, limited to opacity and small vertical movement.
- Hover elevation is restricted to pointer/hover devices.
- No essential information may depend on animation.
- `prefers-reduced-motion: reduce` disables or minimizes transitions and page entrance effects.

## WCAG 2.2-inspired verification checklist

- [ ] All workflows are operable using a keyboard alone.
- [ ] Focus is visible and not obscured by sticky or fixed UI.
- [ ] Interactive targets are comfortably sized, with 44px as the product target where layout permits.
- [ ] Text and meaningful UI boundaries have sufficient contrast.
- [ ] Content reflows at narrow viewport widths without loss of functionality.
- [ ] Form controls have programmatic labels and understandable error messages.
- [ ] Dialogs manage focus, support Escape where appropriate, and return focus on close.
- [ ] Status and alert changes are announced without requiring color perception.
- [ ] Reduced-motion preferences are respected.
- [ ] Charts retain their underlying textual context and keyboard-accessible interactions.

## Release verification

Before merging or deploying:
1. Run the full unit-test suite and production build.
2. Exercise sign-up, sign-in, sign-out, and refresh/deep-link navigation.
3. Check Dashboard, Historical Data, Predictions, Backtest, CSV export, and alert creation/removal.
4. Verify stale/error/loading states with unavailable network conditions where practical.
5. Test narrow mobile, tablet, and desktop viewport widths.
6. Run automated accessibility checks and a manual keyboard pass.
7. Verify the deployed Firebase Hosting build and confirm no unexpected auth, API, or data-contract changes.

This document describes design intent and verification requirements. It does not claim that manual device, screen-reader, or automated accessibility testing has already been completed.
