import JSZip from 'jszip';
import type { TransferFile } from '../types.ts';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Download received files as a single ZIP archive.
export async function downloadFilesAsZip(files: TransferFile[], zipName = 'sharepro-transferred-files.zip') {
  const usableFiles = files.filter(file => file.blob || file.file);
  if (usableFiles.length === 0) throw new Error('डाउनलोड करने योग्य फाइल उपलब्ध नहीं है');

  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const file of usableFiles) {
    const previous = usedNames.get(file.name) || 0;
    usedNames.set(file.name, previous + 1);
    const extensionMatch = file.name.match(/^(.*?)(\.[^.]*)?$/);
    const safeName = previous === 0
      ? file.name
      : `${extensionMatch?.[1] || file.name} (${previous})${extensionMatch?.[2] || ''}`;

    zip.file(safeName, file.blob || file.file!);
  }

  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  triggerBlobDownload(content, zipName);
}
