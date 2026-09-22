import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const IGNORED_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.cache',
  '.aistudio',
  '.system_generated',
  '.gradle',
  'build',
]);

function shouldSkip(relativePath: string): boolean {
  const parts = relativePath.split('/');
  if (parts.some(part => IGNORED_NAMES.has(part))) return true;
  if (relativePath.startsWith('android/app/src/main/assets/public/')) return true;
  if (relativePath === 'android/app/src/main/assets/capacitor.config.json') return true;
  return false;
}

export function getProjectFilesList(rootDir: string): string[] {
  const filesList: string[] = [];

  function scanDir(currentDir: string) {
    for (const item of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, item);
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      if (shouldSkip(relativePath)) continue;

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) scanDir(fullPath);
      else filesList.push(relativePath);
    }
  }

  scanDir(rootDir);
  return filesList.sort();
}

export async function createSourceCodeZipBuffer(rootDir: string): Promise<Buffer> {
  const zip = new JSZip();

  for (const relativePath of getProjectFilesList(rootDir)) {
    const absolutePath = path.join(rootDir, relativePath);
    zip.file(relativePath, fs.readFileSync(absolutePath));
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
