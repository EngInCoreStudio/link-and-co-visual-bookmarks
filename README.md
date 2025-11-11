# Link & Co — Visual Bookmarks (MV3 Extension)

A visual, container-based multi-tab bookmark board. Organize links inside draggable, resizable containers per tab; export/import your layout; enjoy a generous 6‑month trial and optional one‑time lifetime license.

---
## Features
- Drag & drop links into a central canvas
- Organize with multiple tabs (workspaces)
- Resizable, moveable containers (visual grouping)
- Export / Import JSON backup
- Persistent color theming (page & container backgrounds)
- License system: 6 calendar‑month trial, then optional lifetime key
- Automatic periodic license validation (every 6h) with caching
 - Toolbar icon opens the app in a dedicated browser tab (no popup)

### Free vs PRO
Free tier (during trial or without license):
- View existing containers & links
- Drag/drop links onto the board
- Basic JSON export/import
- Theme/background selection

PRO (trial active counts as PRO until it ends):
- Create new containers (Create button is gated)
- Paste / duplicate containers (Paste button gated)
- Unlimited container creation (no enforced count ceiling)
- Priority for future advanced backup / bulk operations
- Trial period: first 6 calendar months from install behave as PRO automatically

> Current gating is based on the two buttons marked with `data-pro` (`create-container-btn`, `paste-container-btn`). Additional premium actions can be added later.

---
## Installation (Local Development)
1. Clone / download this repository.
2. Open Chrome (or Edge) and visit: `chrome://extensions` (Edge: `edge://extensions`).
3. Enable "Developer mode" (toggle in upper-right).
4. Click "Load unpacked" and select the repository root folder.
5. The extension will appear with its action icon; click to open the popup.

To rebuild the distribution ZIP (for store submission):
```bash
npm install
npm run build:zip
```
Result: `dist/extension.zip`.

---
## Licensing
- 6 calendar‑month trial starts automatically on first install (stored securely in `chrome.storage.sync`).
- During the trial you are treated as PRO (all gated features enabled) until the trial end timestamp.
- After trial expiry, PRO features disable unless a valid lifetime license key is present.
- Lifetime license: one-time purchase (placeholder checkout URL below) — never expires.

### Entering / Managing Your License
1. Open the extension popup.
2. Click "Enter License Key" (or right-click icon → Options, or go to chrome://extensions → Details → Options).
3. Paste your key and Save. The service worker triggers a validation; UI updates instantly.

### Buying a License (Placeholder)
Checkout URL: `https://lic.example.com/checkout` (Replace with production commerce URL when available.)

### Validation & Caching
- The service worker validates at install and then every 6 hours via an alarm.
- A manual validation occurs when you save a key (or click the Upgrade button while offline — queued on next connectivity if needed).
- Validation is debounced (minimum 5 minutes between remote calls for the same key).

### Offline Behavior
- If previously validated (or within trial), you retain PRO gating while offline until the cached validity or trial end.
- No forced background calls while disconnected.

---
## Data Storage
- All board & container data: `chrome.storage.local`.
- License/trial metadata: `chrome.storage.sync`.
- No localStorage is used at runtime (a one‑time migration exists for legacy installs).

---
## Privacy Summary
See `PRIVACY.md` for full text. Briefly: data remains local, no analytics or ads, single outbound call only for license verification sending (license key + extension id) — nothing else.

---
## Troubleshooting
| Issue | Explanation | Resolution |
|-------|-------------|------------|
| Badge not updating | Service worker may not have run recent validation | Open Options and re-save key, or reload extension; alarm triggers every 6h |
| Trial expired message | 6-month window has elapsed | Purchase lifetime license and enter key |
| Buttons disabled (Create / Paste) | Gated features when not PRO | Enter a license key or if within 6 months verify system time correctness |
| Export empty | No containers/links stored yet | Create (PRO/trial) or import JSON |
| Lost data after update | Possibly using a different browser profile | Confirm profile, check `chrome.storage.local` via DevTools Application tab |
| Network errors on validation | Offline or license server unreachable | UI uses cached status; retry later |
| Logs / debugging | Want to see license or storage logs | Open popup DevTools or service worker logs via chrome://extensions → Service Worker console |

---
## Development Notes
- Manifest V3 service worker: `sw.js` (module) handles license checks + badge.
- License logic: pure module `license.js` (no DOM side-effects).
- Storage abstraction + migration under `src/`.
- Packaging script: `scripts/zip.js` (enforces whitelist & directory structure).

---
## Planned Enhancements
- Additional PRO-only productivity features (bulk link operations, advanced export filters)
- Improved container styling & theming presets
- Optional checksum & reproducible build metadata
- Automated backend license tests

---
## Contributing
Currently closed for external contributions while licensing stabilizes. Feel free to open issues for bugs or feature suggestions.

---
## Disclaimer
This software is provided "as is" without warranties. Use at your own risk. See `TERMS.md` for details.

---
## Free vs PRO (Reference Copy)
Free:
- View existing layout
- Drag/drop links
- Basic export/import
- Theme changes

PRO / Trial:
- Create containers (Create button)
- Paste / duplicate containers (Paste button)
- Unlimited container count
- Future advanced backup enhancements

---
## Support
If you encounter issues: open the extension popup → Options page (license form) or file an issue with reproduction steps.

---
## Releases
Latest: 1.0.1  
SHA256 (dist/extension.zip): e4bb1f68228da0b8717b83bb98800839f3e0bf1999fdbc330050bc8db5cd8637


---
## Local Testing (MV3)

## Dev Mode (No Backend Required)
For rapid local UI work you can bypass any backend:

Option A – Force PRO:
1. Edit `src/config.dev.js`
2. Set `DEV_FORCE_PRO = true`
3. Reload the unpacked extension → all `[data-pro]` features enabled, banner hidden.

Option B – Magic Key:
1. Leave `DEV_FORCE_PRO = false`
2. Open Options page, enter `DEV-LOCAL-OK` as the license key, click Save
3. Gating lifts instantly without any network fetch.

Safety: The production build replaces `src/config.js` with `config.prod.js` (dev flags cleared) and `preflight` fails if a packaged config contains dev override values.


### 1) Load Unpacked
- Chrome: `chrome://extensions` → Enable **Developer mode** → **Load unpacked** → select the project folder (NOT the ZIP).
- Edge: `edge://extensions` → Enable **Developer mode** → **Load unpacked** → select the project folder.

### 2) First-Run Checks
1. Click the toolbar icon to open the popup.
2. Expected: badge is initially blank; service worker starts; badge remains blank unless trial/valid license condition triggers a badge text (future enhancement). No errors in console.

### 3) Trial / UI Gating
When no key is set:
- Banner text: `Trial ends in X days...` (or `Trial expired...` after trialEndsAt)
- Elements with `[data-pro]` disabled + `aria-disabled="true"`.
- `body.preload` class removed after first license state application.
Current gated elements (observed):
- `#create-container-btn` (Create new container)
- `#paste-container-btn` (Paste / duplicate container)

### 4) Enter Key & Live Refresh
1. Click **Enter License Key** (or open Options via extension details).
2. Enter any dummy string and Save.
3. Options script sends `{ type: "CHECK_LICENSE_NOW" }` → popup listener re-applies gating instantly.
4. (With a real validating server) badge/UI would reflect PRO state; removing the key reverts gating after another message dispatch.

### 5) Offline Behavior
1. While PRO (trial active) or with a recently validated license, disable network.
2. Reopen popup: PRO gating persists; no blocking network call required.
3. Reconnect: state unchanged; next periodic check resumes as scheduled.

### 6) Alarm / Periodic Check (Dev Only)
1. Temporarily edit `sw.js` alarm registration: set `periodInMinutes: 1` instead of 360.
2. Reload extension and observe console: license validation every ~1 minute.
3. Revert to 360 before committing.

### 7) Console Diagnostics
- Open `chrome://extensions` → Find extension → **Service worker**: Click *Inspect*.
- Check for: fetch errors, storage exceptions, alarm logs.
- Popup DevTools: Right-click popup → Inspect.

### 8) Packaging Sanity
1. Run: `npm run build:zip`.
2. Expected: `dist/extension.zip` exists.
3. Contents must include only root files + `icons/*` + `src/*` (see packaging whitelist). No stray root `icon16.png` or `init.js`.

### 9) Resetting State
- Clear `chrome.storage.local` & `chrome.storage.sync` via DevTools (Application tab) to simulate a fresh install and re-test trial logic.

### 10) Common Pitfalls
- Badge not changing: Normal (badge currently minimal); rely on banner + button enabled state.
- Buttons still enabled after trial expiry: Confirm system clock accuracy & that service worker alarm fired (check logs).
- License not sticking: Ensure no rapid successive submissions (debounce: 5 min) — try again after waiting or clear `licenseCheckedAtUTC` in sync storage for dev.

---
End of local testing guide.
