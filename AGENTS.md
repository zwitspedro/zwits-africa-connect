# Architecture decisions

- Use the shared MapLibre/OpenStreetMap map configuration for web and mobile views so custom domains do not depend on a Google browser key.
- Keep customer and provider sign-in email-first; phone OTP endpoints stay unavailable until SMS delivery is enabled so hidden UI cannot be bypassed.
- Keep support contact identity in the shared business metadata so visible details and structured data agree.
- Keep visual tokens in src/design-system and expose them through src/styles.css; one semantic layer prevents page-level visual drift.
- Upgrade existing shadcn and mobile controls rather than add duplicate wrappers; this preserves component contracts and interaction behavior.
- Scope experience themes to presentation shells using the matched route, never auth grants; colors must not change permissions or request behavior.
- Self-host the two brand fonts with swap and no external font requests; preserve the data-light entry route without auth or data imports.
- The entry route may load the existing compact Z mark only; no photographic media, maps, auth or provider data belong on the initial screen.
