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
- `chrome.storage.sync` — Archiviazione sincronizzata del browser (solo metadati licenza: timestamp trial)

**I tuoi dati NON lasciano mai il tuo dispositivo**, eccetto nei seguenti casi limitati:

## Outbound Network Requests
The Extension makes outbound requests only for payment processing via ExtensionPay:
- Endpoint: `https://extensionpay.com/*` (payment checkout and subscription status verification).
- Purpose: Secure payment processing via ExtensionPay/Stripe (PCI-DSS compliant) and verification of lifetime PRO status after purchase.
- Frequency: On-demand during checkout flow and periodic status verification (every 7 days).
- Data transmitted: No personal information; only extension ID and payment session tokens managed by ExtensionPay.

No analytics, telemetry, or tracking calls are made.

## No Third-Party Analytics or Ads
The Extension contains no ad networks, tracking pixels, or analytics libraries.

## Permissions Justification
- `storage`: Persist user layout and license metadata.
- `alarms`: Periodic background PRO status verification (every 7 days).
- Host permission (`https://extensionpay.com/*`): Required for payment checkout and subscription status verification.

## Security Measures
- No remote code execution; all scripts are static MV3 modules.
- No inline scripts (CSP-compliant with MV3 defaults).
- Payment processing handled entirely by ExtensionPay/Stripe (PCI-DSS Level 1 compliant).
- Trial metadata stored locally (Chrome storage) and never transmitted.

## Data Retention and Removal
All data is retained locally until you remove the Extension or clear extension storage manually (Developer Tools → Application → Storage → Clear). Removing the Extension deletes local storage. ExtensionPay payment records are governed by their privacy policy.

## Children’s Privacy
Not directed to children under 13; no personal data is collected.

## Changes
Material changes will bump the version and update this date.

## Contact
Per domande su privacy o gestione dati:

**Email supporto**: info@engincore.it  
**Privacy policy URL**: https://engincore.it/legal/privacy.html
