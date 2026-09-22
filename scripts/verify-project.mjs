import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'index.html',
  'vite.config.ts',
  'server.ts',
  'src/App.tsx',
  'src/utils/webrtc.ts',
  'src/utils/native.ts',
  'src/components/SenderScannerModal.tsx',
  'android/settings.gradle',
  'android/build.gradle',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/com/sharepro/app/MainActivity.java',
  'android/app/src/main/java/com/sharepro/app/LocalSignalingPlugin.java',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing required files:\n' + missing.map((file) => `- ${file}`).join('\n'));
  process.exit(1);
}

const forbidden = ['relay_chunk', 'downloadProjectSourceCodeZip'];
const rootsToScan = ['src', 'server.ts', 'android'];
const sourceFiles = [];

function collect(entry) {
  const full = path.join(root, entry);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(full)) collect(path.join(entry, child));
  } else if (/\.(ts|tsx|java|xml|gradle)$/.test(full) || path.basename(full) === 'server.ts') {
    sourceFiles.push(full);
  }
}
rootsToScan.forEach(collect);

const hits = [];
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const marker of forbidden) {
    if (content.includes(marker)) hits.push(`${path.relative(root, file)} -> ${marker}`);
  }
}

if (hits.length) {
  console.error('Forbidden legacy transfer/source markers found:\n' + hits.map((hit) => `- ${hit}`).join('\n'));
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const dependency of ['@capacitor/android', '@capacitor/core', '@capacitor/cli', '@zxing/browser', 'ws']) {
  if (!pkg.dependencies?.[dependency]) {
    console.error(`Missing runtime dependency: ${dependency}`);
    process.exit(1);
  }
}

console.log(`SharePro verification passed: ${required.length} required files, ${sourceFiles.length} source files scanned.`);
