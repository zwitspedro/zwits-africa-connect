# Zwits Mobile — Android build guide

One codebase → one PWA + three Android apps. Nothing here changes the web app.

## What ships where

| App | Package (appId) | Boots into | Android project |
| --- | --- | --- | --- |
| Zwits (Customer) | `zw.co.zwits.customer` | `/m/customer` | `android/customer` |
| Zwits Provider | `zw.co.zwits.provider` | `/m/provider` | `android/provider` |
| Zwits Driver | `zw.co.zwits.driver` | `/m/driver` | `android/driver` |

All three share the same backend, auth, API layer, query cache, and UI kit
(`src/mobile/*`). The only difference is the `VITE_ZWITS_APP` build flag, which
`src/mobile/app-target.ts` reads to pick the entry portal.

## Progressive Web App

The website itself is installable and works offline:

- `public/manifest.webmanifest` — name, icons, `display: standalone`, Zwits green theme.
- `src/lib/pwa.ts` — the single guarded service-worker registration. It never
  registers in dev, inside an iframe, or on Lovable preview hosts, and `?sw=off`
  unregisters it. Offline behaviour is only testable on the **published** site.

To install on Android: open the published site in Chrome → menu → *Install app*.

## Prerequisites (one-time, on your own machine)

- Node 20+ and Bun
- Android Studio (Giraffe or newer) with the Android SDK + Platform Tools
- JDK 17 (`JAVA_HOME` set)

## First-time setup per app

```bash
bun install
bunx cap add android --config capacitor.customer.config.ts
bunx cap add android --config capacitor.provider.config.ts
bunx cap add android --config capacitor.driver.config.ts
```

That creates `android/customer`, `android/provider`, `android/driver`.

## Build + run

```bash
# sync the latest web build into a native project
bun run customer:sync      # or provider:sync / driver:sync

# open in Android Studio and hit Run
bun run customer:open
```

Install a debug build straight onto a connected device:

```bash
bun run customer:sync
cd android/customer && ./gradlew installDebug
```

## Release APK (sideload / direct install)

```bash
bun run customer:apk
# → android/customer/app/build/outputs/apk/release/app-release.apk
adb install -r android/customer/app/build/outputs/apk/release/app-release.apk
```

## Play Store AAB

```bash
bun run customer:aab
# → android/customer/app/build/outputs/bundle/release/app-release.aab
```

### Signing

Create a keystore once per app and reference it from
`android/<app>/app/build.gradle`:

```bash
keytool -genkey -v -keystore zwits-customer.keystore \
  -alias zwits -keyalg RSA -keysize 2048 -validity 10000
```

```gradle
android {
  signingConfigs {
    release {
      storeFile file("../../zwits-customer.keystore")
      storePassword System.getenv("ZWITS_STORE_PASSWORD")
      keyAlias "zwits"
      keyPassword System.getenv("ZWITS_KEY_PASSWORD")
    }
  }
  buildTypes { release { signingConfig signingConfigs.release } }
}
```

Then upload the signed `.aab` to the Play Console — one listing per package id.

## Brand colours

Every surface (web, PWA, all three Android apps, admin) reads the same tokens in
`src/styles.css`: Zwits Green `#16A34A` (primary/active), Zwits Blue `#2563EB`
(accent/info/navigation), Zwits Black `#0B0F0D` (headings/dark surfaces), plus
white, `#F5F7F6`, `#6B7280` and `#E5E7EB` neutrals. Change them there and they
change everywhere.
