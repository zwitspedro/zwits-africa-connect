# Architecture decisions

- Use the shared MapLibre/OpenStreetMap map configuration for web and mobile views so custom domains do not depend on a Google browser key.
- Keep customer and provider sign-in email-first; phone OTP endpoints stay unavailable until SMS delivery is enabled so hidden UI cannot be bypassed.
- Keep support contact identity in the shared business metadata so visible details and structured data agree.