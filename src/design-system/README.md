# Zwits Design System v1

Presentation only: preserve routes, permissions, mutations, lifecycle rules and generated integrations.

- `tokens.css`: exact brand palette plus accessible semantic light/dark aliases. Use `primary-text` for text links, `primary-foreground` on primary fills. Semantic state surfaces are declared in each theme to avoid inherited light backgrounds.
- `typography.css`: local Archivo Black display and variable Manrope interface fonts, with swap; centralized fixed breakpoint scale, never viewport-scaled text.
- `spacing.css`: 4–96px spacing and 8/12/16/24px radii.
- `motion.css`: 150/220/350ms motion and reduced-motion overrides.
- `src/styles.css`: Tailwind v4 mapping and legacy compatibility utilities; no parallel color system.
- Existing Button/Input/Select/Textarea/Card/Badge/Dialog primitives remain authoritative. Standard buttons are 48px; large/mobile primary controls 56px. Do not override down to smaller targets.
- Status is presentation-only, combines icon and text, and must never decide business transitions.
- Experience shells apply customer ivory, provider Ubuntu/obsidian, driver lime/obsidian and neutral admin themes. Role colors never confer permissions.
- Existing Z mark remains unchanged. Entry stays static and data-light; marketing remains on /home.

## Rollout checks
Run public and authenticated browser checks with service workers blocked to avoid stale cached route chunks. Also verify real PWA update behavior separately; do not confuse a cached screen with current source.
Automated WCAG checks supplement, not replace, keyboard and screen-reader review. Do not claim full app conformance based on sampled screens.
