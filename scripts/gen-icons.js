// scripts/gen-icons.js
import fs from 'fs';
import path from 'path';

// Inline Base64 (Windows PowerShell friendly)
const ICON16 = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR4nGNgGAXDFIgwMDD8Z2BgOEOM
YiZKbRs1ADuAxQI6lqCFZZQDAHIpBxGh5jn5AAAAAElFTkSuQmCC`.trim();
const ICON48 = `iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAV0lEQVR4nO3XwQmAMBBE0cVqLN7C0oU2
oCBEMyy8B3sePjmlCgAAgL72qjpv7lgxvq0Y+ZOANAFpAtIEpAlIE5AmIE1AWvuALzx9Kd/emBlv/wIC
AGjtAnEvFfv48AcnAAAAAElFTkSuQmCC`.trim();
const ICON128 = `iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAA7ElEQVR4nO3duQ3DQAwAQcJ1qQCV5c6t
DpTos70zAHOCWFx6MwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB71pn5HJj37Rt/sdfTC/AsAcQJIE4A
cQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKI
E0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gTAzzn6YcTds1xzhnN4AeIE
ECeAOAHECSBOAHECiBNAnADiBBAnAAAAAAAAAAAA+CcbfZk7iahOqeQAAAAASUVORK5CYII=`.trim();

const outDir = path.join(process.cwd(), 'icons');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  { name: 'icon16.png', b64: ICON16, expected: { w: 16, h: 16 } },
  { name: 'icon48.png', b64: ICON48, expected: { w: 48, h: 48 } },
  { name: 'icon128.png', b64: ICON128, expected: { w: 128, h: 128 } }
];

function getPngSize(buf) {
  const sig = '89504e470d0a1a0a';
  if (buf.slice(0, 8).toString('hex') !== sig) throw new Error('Not a PNG signature');
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

for (const f of files) {
  const p = path.join(outDir, f.name);
  if (fs.existsSync(p) && fs.statSync(p).size === 0) {
    fs.unlinkSync(p);
  }
  const buf = Buffer.from(f.b64, 'base64');
  fs.writeFileSync(p, buf);
  const { w, h } = getPngSize(buf);
  if (w !== f.expected.w || h !== f.expected.h) {
    console.error(`Dimension mismatch for ${f.name}: got ${w}x${h}`);
    process.exitCode = 1;
  }
  console.log(`${f.name}: ${w}x${h}, ${buf.length} bytes`);
}
