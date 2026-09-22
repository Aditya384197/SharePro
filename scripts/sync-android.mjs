import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
const configTarget = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json');

if (!fs.existsSync(dist)) {
  throw new Error('dist/ नहीं मिला। पहले npm run build चलाएँ।');
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(publicDir), { recursive: true });
fs.cpSync(dist, publicDir, { recursive: true });

const capacitorConfig = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
fs.writeFileSync(configTarget, JSON.stringify(capacitorConfig, null, 2));

console.log(`Android web assets synced: ${path.relative(root, publicDir)}`);
