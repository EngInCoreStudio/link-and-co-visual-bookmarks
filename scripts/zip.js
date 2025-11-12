import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
console.log('ZIP SCRIPT FILE:', __filename);
const outPathLog = 'dist/extension.zip';
console.log('ZIP OUTPUT PATH:', outPathLog);

// Step 10b compliant zip build.
fs.mkdirSync('dist', { recursive: true });
const ZIP_PATH = 'dist/extension.zip';
if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

const out = fs.createWriteStream(ZIP_PATH);
const archive = archiver('zip', { zlib: { level: 9 } });
archive.on('error', err => { throw err; });

const allowedRoots = new Set([
  'manifest.json',
  'index.html',
  'styles.css',
  'main.js',
  'license.js',
  'options.html',
  'options.js',
  'sw.js',
  'localStorageUtils.js',
  'containers.js',
  'icons.js',
  'advancedBackup.js',
  'EngInC_logo_ver02.jpg'
]);

archive.on('entry', e => {
  const name = e.name;
  const ok = (
    allowedRoots.has(name) ||
    name.startsWith('icons/') ||
    name.startsWith('src/')
  );
  if (!ok) {
    console.error('ERROR: Disallowed entry in archive:', name);
    process.exit(1);
  }
  console.log('ADD', name);
});
out.on('close', () => {
  console.log(`Created ${ZIP_PATH} (${archive.pointer()} bytes)`);
  // Post-build verification after stream closed
  import('adm-zip').then(mod => {
    const AdmZip = mod.default;
    const zipBuffer = fs.readFileSync(ZIP_PATH);
    const zip = new AdmZip(zipBuffer);
    const configEntry = zip.getEntry('src/config.js');
    if (!configEntry) {
      console.error('ERROR: src/config.js not found in archive after build');
      process.exit(1);
    }
    const configText = configEntry.getData().toString('utf8');
    // Check USE_LEGACY_LICENSE flag
    const useLegacy = /USE_LEGACY_LICENSE\s*=\s*true/.test(configText);
    if (useLegacy) {
      if (!configText.includes('https://lic.example.com/api/license/verify') || configText.includes('localhost')) {
        console.error('ERROR: Packaged config.js does not contain correct production LICENSE_ENDPOINT (legacy license enabled)');
        process.exit(1);
      }
    } else {
      if (configText.includes('localhost')) {
        console.error('ERROR: Packaged config.js contains localhost reference');
        process.exit(1);
      }
    }
    // Strict structure verification (Step 10f)
    const entries = zip.getEntries().map(e => e.entryName).sort((a,b)=>a.localeCompare(b));
    console.log('ZIP ENTRIES (sorted):');
    entries.forEach(e => console.log('  ' + e));

    const REQUIRED = [
      'icons/DWL_EIC_favicon_16x16.png','icons/DWL_EIC_favicon_48x48.png','icons/DWL_EIC_favicon_512x512.png',
      'src/init.js','src/migration.js','src/storage.js','src/backup.js','src/config.js',
      'manifest.json','index.html','styles.css','main.js','license.js','options.html','options.js','sw.js',
      'localStorageUtils.js','containers.js','icons.js','advancedBackup.js',
      'EngInC_logo_ver02.jpg'
    ];
    const FORBIDDEN = [
      'icon16.png','icon48.png','icon128.png',
      'init.js','migration.js','storage.js','backup.js','config.js'
    ];
    const entrySet = new Set(entries);
    const missing = REQUIRED.filter(r => !entrySet.has(r));
    const presentForbidden = FORBIDDEN.filter(f => entrySet.has(f));
    if (missing.length || presentForbidden.length) {
      if (missing.length) console.error('ERROR: Missing REQUIRED entries:', missing.join(', '));
      if (presentForbidden.length) console.error('ERROR: Forbidden root entries present:', presentForbidden.join(', '));
      process.exit(1);
    }
    if (useLegacy) {
      console.log('VERIFY: Packaged src/config.js contains production LICENSE_ENDPOINT and no localhost reference.');
    } else {
      console.log('VERIFY: Packaged src/config.js in ExtPay-only mode (legacy backend disabled).');
    }
    console.log('VERIFY: All REQUIRED entries present and no FORBIDDEN root entries found. PASS');
  }).catch(err => {
    console.error('ERROR reading zip for verification', err);
    process.exit(1);
  });
});

archive.pipe(out);

// Root files only
archive.file('manifest.json', { name: 'manifest.json' });
[
  'index.html','styles.css','main.js','license.js',
  'options.html','options.js','sw.js',
  'localStorageUtils.js','containers.js','icons.js','advancedBackup.js',
  'EngInC_logo_ver02.jpg'
].forEach(f => { if (fs.existsSync(f)) archive.file(f, { name: f }); else console.warn('Missing root file', f); });

// Preserve directories
if (fs.existsSync('icons')) archive.directory('icons/', 'icons');
// Add src directory but filter out any config*.js to replace with prod variant
if (fs.existsSync('src')) {
  archive.directory('src/', 'src', entry => {
    const n = entry.name; // relative inside provided dest (e.g., 'config.js', 'init.js')
    if (n === 'config.js' || n === 'config.dev.js' || n === 'config.prod.js') return false;
    return entry;
  });
}

// Inject production config as src/config.js (single authoritative copy in package)
if (fs.existsSync('src/config.prod.js')) {
  archive.file('src/config.prod.js', { name: 'src/config.js' });
} else {
  console.error('ERROR: Missing src/config.prod.js');
  process.exit(1);
}

// Explicit exclusions handled by NOT adding them (no traversal of other dirs here)
await archive.finalize();
