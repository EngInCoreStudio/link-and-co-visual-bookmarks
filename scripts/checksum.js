import fs from 'fs';
import crypto from 'crypto';

const ZIP_PATH = 'dist/extension.zip';
if (!fs.existsSync(ZIP_PATH)) {
  console.error('ERROR: ZIP not found at', ZIP_PATH);
  process.exit(1);
}
const buf = fs.readFileSync(ZIP_PATH);
const hash = crypto.createHash('sha256').update(buf).digest('hex');
console.log('SHA256  dist/extension.zip  ' + hash);
