# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2025-11-18

### Published
- **First version published on Chrome Web Store** 🎉

### Changed
- **Monetization**: Switched to ExtPay-only model (legacy license backend disabled)
- **License checks**: Reduced frequency from 6 hours to 7 days (weekly alarm)
- **Badge overlay**: Disabled PRO/TRIAL badge on toolbar icon for cleaner UI
- **Host permissions**: Removed lic.example.com, kept extensionpay.com only
- **Documentation**: Updated all store listing docs to reflect ExtPay-only model

### Added
- Enhanced instant refresh with CHECK_LICENSE_NOW message handling
- Modified build scripts to skip LICENSE_ENDPOINT validation when legacy disabled

---

## [1.0.1] - 2025-11-08 (Initial Development)

### Added
- **ExtPay integration** for secure off-platform payments (Stripe backend via ExtensionPay)
- **Content script** (`src/extpay_onpaid_cs.js`) to handle `onPaid` event from ExtensionPay checkout
- **PRO/TRIAL gating system** with dynamic UI updates (badge shows "PRO" or "TRIAL", upgrade button auto-hides when paid)
- **Global app config** (`src/app_config.js`) for CSP-compliant EXTPAY_ID exposure (no inline scripts)
- **ExtPay client** (`src/extpayClient.js`) with `isPaidViaExtPay()` and `openExtPayCheckout()` helper functions
- **Refresh status button** (`#refreshStatus`) to manually update license/payment state
- **Hamburger menu** (`#menu-btn`) with upgrade option, theme selectors, and export/import
- **Dual licensing logic**: Combines local trial/license system with ExtPay paid status (PRO if either is active)
- **SHA256 checksum generation** script (`scripts/checksum.js`) for release artifact verification
- **Preflight validation** script (`scripts/preflight.js`) to enforce version sync and packaging rules
- **ZIP structure verifier** with REQUIRED/FORBIDDEN file checks (prevents legacy icons in production)
- **Store listing documentation** (STORE-LISTING.md, EDGE_README.md, PRIVACY.md, TERMS.md) in Italian

### Changed
- **Icon naming**: Migrated from `icon*.png` to `DWL_EIC_favicon_*.png` (16/32/48/128 in manifest, 512 for store)
- **Packaging**: `scripts/zip.js` now injects `src/config.prod.js` as `src/config.js` in production build (automatic endpoint swap)
- **Badge behavior**: Shows "PRO" when ExtPay paid (lifetime), "TRIAL" with days remaining during 6-month trial
- **Upgrade button visibility**: Hidden when user has active ExtPay subscription (not just during trial)
- **Event binding**: Consolidated all DOMContentLoaded handlers in `main.js` to avoid duplicate bindings
- **Gating poll**: 30-second polling loop after page load to catch late ExtPay script initialization
- **License validation**: Now debounced (minimum 5 minutes between remote calls) to prevent abuse

### Fixed
- **Duplicate hamburger bindings** causing menu toggle malfunction (consolidated into single handler)
- **Duplicate imports** in `main.js` (removed redundant `isPro`/`getTrialInfo` import statement)
- **Indentation issues** in try/catch blocks across multiple files
- **Content script import path**: Normalized to lowercase `'./extpay.js'` for consistency
- **Config endpoint verification**: Post-build check ensures no `localhost` references in packaged `src/config.js`
- **EXTPAY_ID consistency**: Synchronized across `config.dev.js`, `config.prod.js`, `app_config.js`, `extpay_onpaid_cs.js`

### Security
- **CSP compliance**: No inline scripts, all code in external modules (manifest.json CSP-safe)
- **Storage migration**: One-time migration from localStorage to chrome.storage.local (MV3 compatible, prevents data loss)
- **Debounced license validation**: Minimum 5 minutes between remote calls prevents server abuse
- **Dev flags isolation**: `DEV_FORCE_PRO` and `DEV_MAGIC_KEY` only in dev config, stripped from production build

### Infrastructure
- MV3 packaging finalized with strict ZIP structure verifier
- 6-month trial + lifetime license logic stabilized (calendar-month safe with `addMonthsUTC`)
- Storage migration to chrome.storage (local for data, sync for license metadata)
- Badge + alarms scheduling for periodic license verification (every 6 hours)
- Options page for license key entry & instant UI refresh
- Build-time production config injection (dev/prod endpoint separation via `config.prod.js`)

### Build
- Release artifact SHA256: `46a1d263f1b85efe57409e90302b6c1bfafec27ff65af986a587e4ed861c9428`
- Package size: 1,195,720 bytes
- Preflight: **PASS** (0 errors)
- Version: 1.0.1 (synced across package.json and manifest.json)

---

## [1.0.0] - 2025-09-30

### Added
- Initial MV3 extension baseline
- Visual bookmark system with drag-and-drop icons (favicon auto-fetch from Google)
- Resizable/draggable containers for organizing links (grid-snapping at 80px)
- Multi-tab workspace support (unlimited tabs, drag-to-reorder, inline rename)
- JSON import/export for backup/restore (full workspace data)
- 6-month calendar trial system (automatic on first install, stored in chrome.storage.sync)
- Lifetime license validation via backend endpoint (`LICENSE_ENDPOINT`)
- Theme customization (page and container backgrounds, 8 color options)
- Periodic license validation via alarms (every 6 hours, debounced)
- Options page for license key management (instant validation trigger)
- Badge update on PRO status change (shows "PRO" or blank)
- Container copy/paste across tabs (clipboard-based workflow)
- Editable link names and custom icon upload
- localStorage to chrome.storage migration (one-time, automatic)

### Infrastructure
- Manifest V3 service worker architecture (`sw.js` as module)
- chrome.storage.local for user data (tabs, containers, links, colors)
- chrome.storage.sync for license metadata (trial timestamps, license key, validation cache)
- Build scripts: `zip.js` (packaging), `checksum.js` (SHA256), `preflight.js` (validation)
- Dev/prod config separation (`config.dev.js` vs `config.prod.js`)
- REQUIRED/FORBIDDEN file whitelist enforcement in ZIP build

### Build
- Release artifact SHA256: `e4bb1f68228da0b8717b83bb98800839f3e0bf1999fdbc330050bc8db5cd8637`
- Initial internal baseline (pre-verifier, pre-ExtPay)

---

## [Unreleased]

### Planned
- Cloud sync for cross-device bookmark sharing (optional, user-controlled)
- Advanced search/filter for links (fuzzy search, tag-based filtering)
- Browser history integration (suggest frequently visited sites)
- Custom icon upload improvements (drag-and-drop, paste from clipboard)
- Keyboard shortcuts (create container: Ctrl+Shift+C, add link: Ctrl+Shift+L)
- Dark/light mode auto-detection (respect OS preference)
- Bulk operations (select multiple links, batch move/delete)
- Export to other formats (HTML bookmarks, CSV, Markdown)

---

## Legend
- **Added** — New features
- **Changed** — Changes in existing functionality
- **Deprecated** — Soon-to-be removed features
- **Removed** — Removed features
- **Fixed** — Bug fixes
- **Security** — Security fixes/improvements
- **Infrastructure** — Build/dev tooling changes
