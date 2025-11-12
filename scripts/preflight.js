import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

const errors = [];
const warns = [];
function err(msg){ errors.push(msg); console.error('ERROR:', msg); }
function info(msg){ console.log(msg); }

// 1) Load manifest
const manifestPath = 'manifest.json';
if(!fs.existsSync(manifestPath)) err('manifest.json missing');
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));

// Version sync check (Step 18)
try {
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  if(pkg.version !== manifest.version){
    err(`Version mismatch: package.json (${pkg.version}) != manifest.json (${manifest.version})`);
  } else {
    info(`Version sync OK: ${pkg.version}`);
  }
} catch(e){ err('Failed reading package.json for version sync: '+e.message); }

// manifest checks
if(manifest.manifest_version !== 3) err('manifest_version must be 3');
if(!manifest.background || manifest.background.service_worker !== 'sw.js') err('background.service_worker must be sw.js');
if(!fs.existsSync('sw.js')) err('sw.js file missing');
if(!manifest.options_ui || manifest.options_ui.page !== 'options.html') err('options_ui.page must be options.html');
if(!fs.existsSync('options.html')) err('options.html file missing');

// icons checks using IHDR (custom DWL_EIC_favicon set)
const iconExpect = [
  { file:'icons/DWL_EIC_favicon_16x16.png',  w:16,  h:16,  mode:'exact' },
  { file:'icons/DWL_EIC_favicon_32x32.png',  w:32,  h:32,  mode:'exact' },
  { file:'icons/DWL_EIC_favicon_48x48.png',  w:48,  h:48,  mode:'exact' },
  { file:'icons/DWL_EIC_favicon_512x512.png', w:128, h:128, mode:'min' } // treat as fulfilling 128 slot if >=128
];
for(const spec of iconExpect){
  const p = spec.file;
  if(!fs.existsSync(p)) { err(p+' missing'); continue; }
  const buf = fs.readFileSync(p);
  if(buf.slice(0,8).toString('hex') !== '89504e470d0a1a0a') { err(p+' not a PNG signature'); continue; }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if(spec.mode === 'exact') {
    if(width !== spec.w || height !== spec.h) err(`${p} expected ${spec.w}x${spec.h} got ${width}x${height}`);
  } else {
    if(width < spec.w || height < spec.h) err(`${p} expected at least ${spec.w}x${spec.h} got ${width}x${height}`);
  }
}

// 2) Ensure NO 'localhost' in critical runtime sources
const scanFiles = [
  'license.js','main.js','options.js','sw.js','manifest.json'
];
// add all src/*.js
if(fs.existsSync('src')) {
  for(const f of fs.readdirSync('src')) if(f.endsWith('.js')) {
    if(f === 'config.dev.js') continue; // ignore dev config for localhost scan
    scanFiles.push(path.join('src', f));
  }
}
for(const f of scanFiles){
  if(!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f,'utf8');
  if(/localhost/i.test(txt)) err(`localhost reference found in ${f}`);
}

// 3) Ensure dist/extension.zip exists
const zipPath = 'dist/extension.zip';
if(!fs.existsSync(zipPath)) err('dist/extension.zip missing (run build:zip first)');

// 4) Inspect packaged src/config.js
if(fs.existsSync(zipPath)){
  try {
    const zip = new AdmZip(fs.readFileSync(zipPath));
    const cfg = zip.getEntry('src/config.js');
    if(!cfg) err('Packaged src/config.js missing');
    else {
      const txt = cfg.getData().toString('utf8');
      // Check USE_LEGACY_LICENSE flag
      const useLegacy = /USE_LEGACY_LICENSE\s*=\s*true/.test(txt);
      if(useLegacy){
        if(!txt.includes('https://lic.example.com/api/license/verify')) err('Packaged config.js missing production endpoint (legacy license enabled)');
      }
      if(/localhost/i.test(txt)) err('Packaged config.js contains localhost');
      if(/DEV_FORCE_PRO\s*=\s*true/.test(txt)) err('Packaged config.js contains DEV_FORCE_PRO = true');
      if(/DEV_MAGIC_KEY\s*=\s*'DEV-LOCAL-OK'/.test(txt)) err('Packaged config.js contains DEV_MAGIC_KEY dev value');
      // ExtPay validations (only if USE_EXTPAY true in packaged config)
      const useExtPay = /USE_EXTPAY\s*=\s*true/.test(txt);
      if(useExtPay){
        if(/EXTPAY_ID\s*=\s*''/.test(txt)) err('ExtPay enabled but EXTPAY_ID is empty in packaged config.js');
        // Ensure extpay runtime files are packaged
        const extpayEntry = zip.getEntry('src/extpay.js');
        if(!extpayEntry) err('ExtPay enabled but src/extpay.js missing in ZIP');
        const extpayClientEntry = zip.getEntry('src/extpayClient.js');
        if(!extpayClientEntry) err('ExtPay enabled but src/extpayClient.js missing in ZIP');
        // Ensure onPaid content script file is present
        const onPaidEntry = zip.getEntry('src/extpay_onpaid_cs.js');
        if(!onPaidEntry) err('ExtPay enabled but src/extpay_onpaid_cs.js missing in ZIP');
        // Validate manifest has the content_script entry
        try {
          const manifestEntry = zip.getEntry('manifest.json');
          if(manifestEntry){
            const mTxt = manifestEntry.getData().toString('utf8');
            const hasCS = /"content_scripts"/i.test(mTxt);
            const hasMatch = /https:\/\/extensionpay\.com\/*/i.test(mTxt);
            const hasFile = /extpay_onpaid_cs\.js/i.test(mTxt);
            if(!(hasCS && hasMatch && hasFile)){
              err('ExtPay enabled but manifest.json in ZIP missing required content_script for extensionpay.com');
            }
          } else {
            err('manifest.json missing inside ZIP while validating ExtPay content script');
          }
        } catch(e){ err('Failed to validate manifest content_scripts for ExtPay: '+e.message); }
        // Soft check for always-visible Upgrade control in index.html
        const indexEntry = zip.getEntry('index.html');
        if(indexEntry){
          const idxTxt = indexEntry.getData().toString('utf8');
          if(!/id="btnUpgrade"/.test(idxTxt)) {
            warns.push('No visible Upgrade control while USE_EXTPAY=true');
            console.warn('WARNING: No visible Upgrade control while USE_EXTPAY=true');
          }
        }
        // ExtPay ID consistency check (config vs content script)
        try {
          const idMatch = txt.match(/EXTPAY_ID\s*=\s*['\"]([^'\"]+)['\"]/);
          if(idMatch){
            const cfgId = idMatch[1];
            const csEntry = zip.getEntry('src/extpay_onpaid_cs.js');
            if(csEntry){
              const csTxt = csEntry.getData().toString('utf8');
              const csIdMatch = csTxt.match(/EXTPAY_ID_CS\s*=\s*['\"]([^'\"]+)['\"]/);
              if(csIdMatch && csIdMatch[1] !== cfgId){
                err('ExtPay ID mismatch between config.js and extpay_onpaid_cs.js');
              }
            }
          }
        } catch(e){ err('Failed ExtPay ID consistency check: '+e.message); }

        // Scan all JS entries for wrong-case ExtPay import reference 'ExtPay.js'
        const entries = zip.getEntries();
        let hasExtpayLib = false;
        let appConfigEntry = null;
        for(const ent of entries){
          if(ent.entryName === 'src/extpay.js') hasExtpayLib = true;
          if(ent.entryName === 'src/app_config.js') appConfigEntry = ent;
          if(ent.entryName.endsWith('.js')){
            const txtJs = ent.getData().toString('utf8');
            if(/ExtPay\.js/.test(txtJs)) {
              err('Found wrong-case import/reference ExtPay.js in '+ent.entryName);
            }
          }
        }
        if(!hasExtpayLib) err('src/extpay.js missing in ZIP while USE_EXTPAY=true');
        if(appConfigEntry){
          const ac = appConfigEntry.getData().toString('utf8');
          if(!/__APP_CONFIG__/.test(ac) || !/APP_CONFIG/.test(ac)){
            err('app_config.js must define both __APP_CONFIG__ and APP_CONFIG when USE_EXTPAY=true');
          }
        } else {
          err('src/app_config.js missing in ZIP while USE_EXTPAY=true');
        }

        // Script tag ordering checks for index.html and options.html
        const indexHtml = zip.getEntry('index.html')?.getData().toString('utf8') || '';
        const optionsHtml = zip.getEntry('options.html')?.getData().toString('utf8') || '';
        if(indexHtml){
          const idxExtpayPos = indexHtml.indexOf('src/extpay.js');
          const idxCfgPos = indexHtml.indexOf('src/app_config.js');
          const idxClientPos = indexHtml.indexOf('src/extpayClient.js');
          const idxMainPos = indexHtml.lastIndexOf('main.js');
          if(idxExtpayPos === -1) err('index.html missing <script src="src/extpay.js"> while USE_EXTPAY=true');
          if(idxCfgPos === -1) err('index.html missing <script src="src/app_config.js"> while USE_EXTPAY=true');
          if(idxClientPos === -1) err('index.html missing <script src="src/extpayClient.js"> while USE_EXTPAY=true');
          if([idxExtpayPos, idxCfgPos, idxClientPos, idxMainPos].every(v=>v!==-1)){
            const orderOk = idxExtpayPos < idxCfgPos && idxCfgPos < idxClientPos && idxClientPos < idxMainPos;
            if(!orderOk) err('index.html script order incorrect (extpay.js -> app_config.js -> extpayClient.js -> main.js)');
          }
          // PRO indicator and refresh status checks
          if(!/id="proIndicator"/.test(indexHtml)) {
            warns.push('index.html missing id="proIndicator" while USE_EXTPAY=true');
            console.warn('WARNING: index.html missing id="proIndicator" while USE_EXTPAY=true');
          }
          if(!/id="refreshStatus"/.test(indexHtml)) {
            warns.push('index.html missing id="refreshStatus" while USE_EXTPAY=true');
            console.warn('WARNING: index.html missing id="refreshStatus" while USE_EXTPAY=true');
          }
        }
        if(optionsHtml){
          const optExtpayPos = optionsHtml.indexOf('src/extpay.js');
          const optCfgPos = optionsHtml.indexOf('src/app_config.js');
          const optClientPos = optionsHtml.indexOf('src/extpayClient.js');
          const optMainPos = optionsHtml.indexOf('options.js');
          if(optExtpayPos === -1) err('options.html missing <script src="src/extpay.js"> while USE_EXTPAY=true');
          if(optCfgPos === -1) err('options.html missing <script src="src/app_config.js"> while USE_EXTPAY=true');
          if(optClientPos === -1) err('options.html missing <script src="src/extpayClient.js"> while USE_EXTPAY=true');
          if([optExtpayPos,optCfgPos,optClientPos,optMainPos].every(v=>v!==-1)){
            const orderOk = optExtpayPos < optCfgPos && optCfgPos < optClientPos && optClientPos < optMainPos;
            if(!orderOk) err('options.html script order incorrect (extpay.js -> app_config.js -> extpayClient.js -> options.js)');
          }
        }
      }
    }
  } catch(e){ err('Failed reading ZIP: '+e.message); }
}

// 5) Inline script / handler detection in HTML
function checkHtmlInline(file){
  if(!fs.existsSync(file)) return;
  const html = fs.readFileSync(file,'utf8');
  // <script> without src
  const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i.test(html);
  if(inlineScript) err(`Inline <script> detected in ${file}`);
  // attributes like onclick= / onload=
  const inlineHandlers = /\son[a-z]+\s*=\s*("|')/i.test(html);
  if(inlineHandlers) err(`Inline event handler attribute detected in ${file}`);
}
checkHtmlInline('index.html');
checkHtmlInline('options.html');

// 6a) Help & Legal links validation (WARN only if USE_EXTPAY=true)
function checkHelpLegalLinks(file){
  if(!fs.existsSync(file)) return;
  const html = fs.readFileSync(file,'utf8');
  const hasPrivacy = /id=("|')menuPrivacy("|')|id=("|')optPrivacy("|')/.test(html);
  const hasTerms = /id=("|')menuTerms("|')|id=("|')optTerms("|')/.test(html);
  const hasSupport = /id=("|')menuSupport("|')|id=("|')optSupport("|')/.test(html);
  
  if(!hasPrivacy || !hasTerms || !hasSupport){
    const missing = [];
    if(!hasPrivacy) missing.push('Privacy Policy link');
    if(!hasTerms) missing.push('Terms link');
    if(!hasSupport) missing.push('Support link');
    
    // Only warn if USE_EXTPAY is enabled
    try {
      const configDev = fs.readFileSync('src/config.dev.js','utf8');
      const useExtPay = /USE_EXTPAY\s*=\s*true/.test(configDev);
      if(useExtPay){
        warn(`${file}: Missing Help & Legal links (${missing.join(', ')}). Recommended for production.`);
      }
    } catch(e){}
  }
}
checkHelpLegalLinks('index.html');
checkHelpLegalLinks('options.html');

// 6b) Check for placeholder URLs/emails in packaged files
if(fs.existsSync(zipPath)){
  try{
    const zip = new AdmZip(fs.readFileSync(zipPath));
    const filesToCheck = ['index.html','options.html','main.js','options.js','STORE-LISTING.md','PRIVACY.md','TERMS.md','EDGE_README.md'];
    const placeholders = {
      'support@example.com': 'placeholder support email',
      'https://yourdomain.example/privacy': 'placeholder privacy URL',
      'https://yourdomain.example/terms': 'placeholder terms URL'
    };
    
    for(const filename of filesToCheck){
      const entry = zip.getEntry(filename);
      if(entry){
        const content = entry.getData().toString('utf8');
        for(const [placeholder, desc] of Object.entries(placeholders)){
          if(content.includes(placeholder)){
            err(`${filename} contains ${desc}: "${placeholder}". Replace with production value.`);
          }
        }
        
        // ERROR for publisher/city placeholders
        if(content.includes('[TUO NOME O SOCIETÀ]')){
          err(`${filename} contains placeholder "[TUO NOME O SOCIETÀ]". Must be replaced before packaging.`);
        }
        if(content.includes('[CITTÀ]')){
          err(`${filename} contains placeholder "[CITTÀ]". Must be replaced before packaging.`);
        }
      }
    }
  }catch(e){ warn('Placeholder check failed: '+e.message); }
}

// 6) Reuse structure verification by performing minimal checks on zip entries
if(fs.existsSync(zipPath)){
  try{
    const zip = new AdmZip(fs.readFileSync(zipPath));
    const names = zip.getEntries().map(e=>e.entryName);
    const REQUIRED = [
      'icons/DWL_EIC_favicon_16x16.png','icons/DWL_EIC_favicon_48x48.png','icons/DWL_EIC_favicon_512x512.png',
      'src/init.js','src/migration.js','src/storage.js','src/backup.js','src/config.js',
      'manifest.json','index.html','styles.css','main.js','license.js','options.html','options.js','sw.js',
      'localStorageUtils.js','containers.js','icons.js','advancedBackup.js',
      'EngInC_logo_ver02.jpg'
    ];
    const FORBIDDEN = ['icon16.png','icon48.png','icon128.png','init.js','migration.js','storage.js','backup.js','config.js'];
    const set = new Set(names);
    const missing = REQUIRED.filter(r=>!set.has(r));
    const bad = FORBIDDEN.filter(f=>set.has(f));
    if(missing.length) err('ZIP missing REQUIRED: '+missing.join(', '));
    if(bad.length) err('ZIP contains forbidden root entries: '+bad.join(', '));
  }catch(e){ err('ZIP structure verification failed: '+e.message); }
}

// Summary
if(errors.length){
  console.error(`PRE-FLIGHT FAIL (${errors.length} errors)`);
  process.exit(1);
} else {
  info('PRE-FLIGHT PASS (0 errors)');
}
