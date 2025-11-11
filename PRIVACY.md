# Privacy Policy — Link & Co — Visual Bookmarks

**Ultimo aggiornamento**: 8 Novembre 2025  
**Versione**: 1.0.1

---

## Introduzione
La tua privacy è importante. Questa estensione è progettata per mantenere i tuoi dati **locali e privati**.

---

## Dati raccolti e archiviazione

### Dati dell'utente
L'estensione **NON raccoglie, NON trasmette, NON condivide** i seguenti dati:
- ❌ Cronologia di navigazione
- ❌ Dati personali (nome, email, indirizzo)
- ❌ Informazioni di pagamento
- ❌ Statistiche d'uso o analytics
- ❌ Cookie di tracciamento

### Dove vengono salvati i tuoi dati
Tutti i link, contenitori e preferenze sono salvati **esclusivamente** in:
- `chrome.storage.local` — Archiviazione locale del browser (non sincronizzata)
- `chrome.storage.sync` — Archiviazione sincronizzata del browser (solo metadati licenza: timestamp trial, chiave licenza)

**I tuoi dati NON lasciano mai il tuo dispositivo**, eccetto nei seguenti casi limitati:

## Outbound Network Requests
The Extension makes a single type of outbound request: license verification.
- Endpoint: Your configured licensing server (default placeholder: `https://lic.example.com/api/license/verify`).
- Payload: `{ key: <licenseKey>, device: <extensionId> }`.
- Purpose: Confirm validity (active trial, lifetime license, or expiration) and receive an optional expiry timestamp.
- Frequency Control: Debounced (minimum 5 minutes between remote validations for the same key) and scheduled every 6 hours.

No other analytics, telemetry, or tracking calls are made.

## No Third-Party Analytics or Ads
The Extension contains no ad networks, tracking pixels, or analytics libraries.

## Permissions Justification
- `storage`: Persist user layout and license metadata.
- `alarms`: Periodic background license validation (lightweight, infrequent).
- Host permission (`https://lic.example.com/*`): Needed solely for license validation fetch calls.

## Security Measures
- No remote code execution; all scripts are static MV3 modules.
- No inline scripts (CSP-compliant with MV3 defaults).
- License key stored unencrypted (Chrome storage) but only transmitted via HTTPS to the license endpoint.

## Data Retention and Removal
All data is retained locally until you remove the Extension or clear extension storage manually (Developer Tools → Application → Storage → Clear). Removing the Extension deletes local storage. License server records (if any) are outside the scope of this client policy.

## Children’s Privacy
Not directed to children under 13; no personal data is collected.

## Changes
Material changes will bump the version and update this date.

## Contact
Per domande su privacy o gestione dati:

**Email supporto**: info@engincore.it  
**Privacy policy URL**: https://engincore.it/legal/privacy.html
