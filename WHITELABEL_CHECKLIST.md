# Whitelabel checklist (frontend-only, based on current code)

## Brand inventory (what’s hardcoded today)

- **Logo (admin login)**: `frontend/src/pages/AdminSignin/index.jsx` uses `${process.env.PUBLIC_URL}/GammaSweep_Logo.png` and hardcoded styling + “ICE Barcelona 26 Edition”.
- **Logo (admin sidebar)**: `frontend/src/components/Sidebar/index.jsx` uses `'/GammaSweep_Logo.png'` (absolute path).
- **Logo (affiliate sidebar + VIP fallback avatar)**:
  - `frontend/src/components/AffiliateSidebar/index.jsx` uses `'/logoImage.png'`
  - `frontend/src/pages/VipManagement/components/VipPlayerDetails.jsx` falls back to `'/logoImage.png'`
- **Browser tab title**: `frontend/public/index.html` has `<title>Gamma SWEEP - Casino Backoffice</title>`.
- **Favicon + PWA**: `frontend/public/index.html` references `adminFavicon.png`, `site.webmanifest`, and `manifest.json` (two manifests).
- **PWA names**:
  - `frontend/public/site.webmanifest` → `"Volt React Dashboard"`
  - `frontend/public/manifest.json` → `"Volt React Dashboard"`
- **Theme colors**:
  - core variables in `frontend/src/scss/volt/_variables.scss` (SWEEP turquoise)
  - duplicated overrides in `frontend/src/scss/casino-theme.scss` and `frontend/src/scss/modern-theme.scss`
- **Analytics IDs**: `frontend/public/index.html` hardcodes `UA-141734189-6` and `GTM-THQTXJ7`.
- **Deploy base path**:
  - `frontend/src/index.js` uses `BrowserRouter basename={process.env.PUBLIC_URL}`
  - `frontend/package.json` has `"homepage": "https://amitd-dev.github.io/icebarcatmf"`

## Core whitelabel system checklist (to switch branding fast for demos)

- **Single source of truth for branding**
  - Define a per-client Brand Config containing:
    - `appName`, `titleSuffix`
    - `logoPrimary`, `logoSmall`, `favicon`
    - `themeColors (primary/secondary/...)`
    - `backgroundStyle`
    - `analytics (enabled, GA/GTM ids)`
  - Pick a loading strategy and standardize:
    - build-time (env selects brand)
    - runtime (load JSON from `/public/brands/<client>.json`)
    - URL-based (e.g., `?brand=clientA`) for demo switching

- **Fix asset path consistency (important for subpath demos)**
  - Standardize logo paths to respect `process.env.PUBLIC_URL`
  - Centralize logo + icon references so Admin/Affiliate/VIP fallback all use brand config (not direct `public/` strings)

- **App title + meta theming**
  - Move page title out of hardcoded `public/index.html` to brand config (or inject during build)
  - Set `theme-color` and related meta values per brand (avoid duplicates/conflicts)

- **PWA / icons cleanup**
  - Choose ONE manifest (`site.webmanifest` OR `manifest.json`) and stop linking both
  - Update manifest fields per brand: `name`, `short_name`, `icons`, `theme_color`, `background_color`
  - Fix wrong icon paths in `public/manifest.json` (currently `/docs/4.3/assets/...`)

- **Theme system (biggest whitelabel multiplier)**
  - Decide approach (today `frontend/src/scss/volt.scss` imports both `casino-theme` and `modern-theme`, so styles stack):
    - Option A (recommended): CSS variables (`--primary`, `--secondary`, etc.) + one shared stylesheet; brand swap updates variables
    - Option B: separate compiled CSS per brand
    - Option C: `body.brand-x` class with scoped selectors
  - Remove inline branded styles (e.g., login gradients/drop-shadows) and replace with theme tokens

- **Analytics per client**
  - Gate GA/GTM behind brand config flags; for demos default to off

- **Deployment/demo switching**
  - Avoid hardcoding `homepage` in `frontend/package.json`; use env-based `PUBLIC_URL` per client/demo
  - Verify all static assets work under subpaths (catch absolute `/...` paths)

## UI text/content checklist (brand polish)

- Remove event/client-specific tagline: “ICE Barcelona 26 Edition” (`frontend/src/pages/AdminSignin/index.jsx`)
- Standardize brand naming: “Gamma SWEEP”, “SWEEP” (alt texts, comments) to come from config
- Remove “Volt React Dashboard” leftovers from manifests

## QA checklist for whitelabel readiness

- **Brand switch test matrix**
  - Admin login: logo, title, favicon, theme colors, background
  - Sidebar (admin + affiliate): logo renders, collapse state OK
  - VIP player details: fallback avatar image
  - Hosted under subpath: logos/icons load (no absolute `/...` path breaks)
  - PWA: manifest + icons + theme colors valid
  - Analytics disabled: no GA/GTM network calls when off

## Step-by-step workflow for faster brand switches (recommended)

### Goal
Switch branding for demos **without rebuilding** (or with minimal rebuild), while keeping the redesign codebase single-source and clean.

### Workflow (runtime brand JSON + CSS variables)

1. **Create a brand definition per client**
   - Add JSON files under `frontend/public/brands/`:
     - `client-a.json`, `client-b.json`, etc.
   - Each file should include (minimum):
     - `appName`, `title`
     - `assets`: `logoPrimary`, `logoSmall`, `favicon`
     - `colors`: `primary`, `secondary`, `background`, `text`
     - `features`: `analyticsEnabled`
     - `analytics`: `gaId`, `gtmId`

2. **Add a single “brand loader”**
   - On app startup, load the selected brand JSON from `/brands/<brand>.json`.
   - Selection priority (fast demo switching):
     - `?brand=client-a` (URL param for demos)
     - `localStorage.brand` (sticky selection)
     - fallback: `REACT_APP_DEFAULT_BRAND` (env default)

3. **Apply brand to the UI in one place**
   - **Set document title** from the brand JSON (e.g., `document.title = brand.title`).
   - **Set favicon** by swapping the `<link rel="icon">` href dynamically.
   - **Set theme via CSS variables**:
     - Set `:root` variables like `--brand-primary`, `--brand-secondary`, etc.
     - Update your SCSS to consume variables (or map Bootstrap tokens to vars).

4. **Replace hardcoded logo references**
   - Update these components to read from brand config instead of hardcoding:
     - `frontend/src/pages/AdminSignin/index.jsx` (`GammaSweep_Logo.png` + “ICE Barcelona 26 Edition”)
     - `frontend/src/components/Sidebar/index.jsx` (`/GammaSweep_Logo.png`)
     - `frontend/src/components/AffiliateSidebar/index.jsx` (`/logoImage.png`)
     - `frontend/src/pages/VipManagement/components/VipPlayerDetails.jsx` (fallback `/logoImage.png`)
   - Standardize all asset URLs to respect `process.env.PUBLIC_URL` (subpath-safe).

5. **Make analytics optional per brand**
   - For demos: default `analyticsEnabled=false`.
   - Only inject/enable GA/GTM if the brand enables it.
   - Remove/neutralize hardcoded IDs in `frontend/public/index.html` once dynamic gating exists.

6. **Fix PWA/manifest for whitelabel (optional for demos, required for production)**
   - Pick one manifest (`site.webmanifest` OR `manifest.json`).
   - For production per client: generate per-brand manifest + icons (usually requires build-time or hosting separate assets per brand).

7. **Demo switching playbook**
   - To show Client A: open `/?brand=client-a`
   - To show Client B: open `/?brand=client-b`
   - Keep a simple internal “Brand Switcher” dropdown only in non-prod builds (optional).

### “Fastest possible” workflow (build-time only, simplest)

If runtime switching is too much initially:
1. Put per-client assets into `frontend/public/` (or `public/brands/<client>/...`).
2. Use env vars per build:
   - `REACT_APP_BRAND=client-a`
   - `REACT_APP_BRAND_PRIMARY=#...`
   - etc.
3. Build once per client and deploy separate URLs.


