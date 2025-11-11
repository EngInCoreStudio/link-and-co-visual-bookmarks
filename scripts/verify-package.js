import AdmZip from 'adm-zip';
import fs from 'fs';

const z = new AdmZip(fs.readFileSync('dist/extension.zip'));
const m = JSON.parse(z.getEntry('manifest.json').getData().toString());
const idx = z.getEntry('index.html').getData().toString();

console.log('=== PERMISSIONS ===');
console.log('Permissions:', m.permissions);
console.log('Host permissions:', m.host_permissions);
console.log('CSP:', m.content_security_policy || 'Not defined (default applies)');

console.log('\n=== ICONS ===');
console.log('Manifest icons:', m.icons);

console.log('\n=== UI ELEMENTS ===');
console.log('btnUpgrade present:', idx.includes('id="btnUpgrade"'));
console.log('proIndicator present:', idx.includes('id="proIndicator"'));
console.log('refreshStatus present:', idx.includes('id="refreshStatus"'));

console.log('\n=== CONTENT SCRIPTS ===');
console.log('Content scripts:', JSON.stringify(m.content_scripts, null, 2));

console.log('\n=== EXTPAY FILES ===');
const entries = z.getEntries().map(e => e.entryName);
console.log('src/extpay.js:', entries.includes('src/extpay.js'));
console.log('src/app_config.js:', entries.includes('src/app_config.js'));
console.log('src/extpayClient.js:', entries.includes('src/extpayClient.js'));
console.log('src/extpay_onpaid_cs.js:', entries.includes('src/extpay_onpaid_cs.js'));

console.log('\n=== EXTPAY ID CONSISTENCY ===');
const cfg = z.getEntry('src/config.js').getData().toString();
const cs = z.getEntry('src/extpay_onpaid_cs.js').getData().toString();
const appCfg = z.getEntry('src/app_config.js').getData().toString();
const cfgMatch = cfg.match(/EXTPAY_ID\s*=\s*['"]([^'"]+)['"]/);
const csMatch = cs.match(/EXTPAY_ID_CS\s*=\s*['"]([^'"]+)['"]/);
const appMatch = appCfg.match(/EXTPAY_ID:\s*['"]([^'"]+)['"]/);
console.log('config.js EXTPAY_ID:', cfgMatch ? cfgMatch[1] : 'NOT FOUND');
console.log('extpay_onpaid_cs.js EXTPAY_ID_CS:', csMatch ? csMatch[1] : 'NOT FOUND');
console.log('app_config.js EXTPAY_ID:', appMatch ? appMatch[1] : 'NOT FOUND');
const allMatch = cfgMatch && csMatch && appMatch && cfgMatch[1] === csMatch[1] && csMatch[1] === appMatch[1];
console.log('All IDs match:', allMatch ? '✅ YES' : '❌ NO');

console.log('\n=== SCRIPT ORDER (index.html) ===');
const extpayPos = idx.indexOf('src/extpay.js');
const appCfgPos = idx.indexOf('src/app_config.js');
const clientPos = idx.indexOf('src/extpayClient.js');
const mainPos = idx.indexOf('main.js');
console.log('extpay.js position:', extpayPos);
console.log('app_config.js position:', appCfgPos);
console.log('extpayClient.js position:', clientPos);
console.log('main.js position:', mainPos);
const orderOk = extpayPos < appCfgPos && appCfgPos < clientPos && clientPos < mainPos;
console.log('Order correct:', orderOk ? '✅ YES' : '❌ NO');
