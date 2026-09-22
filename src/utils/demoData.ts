interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'app' | 'video' | 'audio' | 'photo' | 'document';
  description: string;
}

export const DEMO_FILES: FileItem[] = [
  {
    id: 'app-1',
    name: 'WhatsApp_Messenger_v2.24.apk',
    size: 48 * 1024 * 1024,
    type: 'application/vnd.android.package-archive',
    category: 'app',
    description: 'Popular messaging app package',
  },
  {
    id: 'app-2',
    name: 'Minecraft_Pocket_v1.20.apk',
    size: 154 * 1024 * 1024,
    type: 'application/vnd.android.package-archive',
    category: 'app',
    description: 'Sandbox adventure game installer',
  },
  {
    id: 'app-3',
    name: 'Instagram_Lite_v310.apk',
    size: 2.4 * 1024 * 1024,
    type: 'application/vnd.android.package-archive',
    category: 'app',
    description: 'Photo and reel sharing app',
  },
  {
    id: 'app-4',
    name: 'SharePro_Turbo_Utility.apk',
    size: 8.9 * 1024 * 1024,
    type: 'application/vnd.android.package-archive',
    category: 'app',
    description: 'Direct accelerator',
  },
  {
    id: 'video-1',
    name: 'Himalayan_Wilderness_4K.mp4',
    size: 84 * 1024 * 1024,
    type: 'video/mp4',
    category: 'video',
    description: '60fps nature documentary',
  },
  {
    id: 'video-2',
    name: 'Action_Sports_Cinematic.mp4',
    size: 32 * 1024 * 1024,
    type: 'video/mp4',
    category: 'video',
    description: 'High energy sports video',
  },
  {
    id: 'video-3',
    name: 'World_Cup_Highlights.mkv',
    size: 110 * 1024 * 1024,
    type: 'video/x-matroska',
    category: 'video',
    description: 'Match moments highlight',
  },
  {
    id: 'music-1',
    name: 'Acoustic_Melody_Studio.mp3',
    size: 9.8 * 1024 * 1024,
    type: 'audio/mpeg',
    category: 'audio',
    description: '320kbps high definition track',
  },
  {
    id: 'music-2',
    name: 'Electronic_Dance_Remix.mp3',
    size: 7.4 * 1024 * 1024,
    type: 'audio/mpeg',
    category: 'audio',
    description: 'Bass boosted dance single',
  },
  {
    id: 'music-3',
    name: 'LoFi_Study_Beats.mp3',
    size: 14.2 * 1024 * 1024,
    type: 'audio/mpeg',
    category: 'audio',
    description: 'Ambient background melody',
  },
  {
    id: 'photo-1',
    name: 'Landscape_GoldenHour.jpg',
    size: 6.2 * 1024 * 1024,
    type: 'image/jpeg',
    category: 'photo',
    description: '48MP RAW camera capture',
  },
  {
    id: 'photo-2',
    name: 'Neon_City_Skyline.png',
    size: 12.8 * 1024 * 1024,
    type: 'image/png',
    category: 'photo',
    description: 'Digital artwork',
  },
  {
    id: 'photo-3',
    name: 'Sunset_Panorama.jpg',
    size: 8.1 * 1024 * 1024,
    type: 'image/jpeg',
    category: 'photo',
    description: 'Wide panoramic landscape',
  },
  {
    id: 'doc-1',
    name: 'Project_Report_2026.pdf',
    size: 4.5 * 1024 * 1024,
    type: 'application/pdf',
    category: 'document',
    description: 'Quarterly presentation report',
  },
  {
    id: 'doc-2',
    name: 'Executive_Profile_Resume.pdf',
    size: 1.2 * 1024 * 1024,
    type: 'application/pdf',
    category: 'document',
    description: 'Professional resume file',
  },
  {
    id: 'doc-3',
    name: 'Software_Source_Archive.zip',
    size: 38.6 * 1024 * 1024,
    type: 'application/zip',
    category: 'document',
    description: 'Compressed asset bundle',
  },
];

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function createDemoFileBlob(fileItem: FileItem): Blob {
  const simulatedSize = Math.min(fileItem.size, 1024 * 512);
  const buffer = new Uint8Array(simulatedSize);
  for (let i = 0; i < simulatedSize; i++) {
    buffer[i] = (i * 31) % 256;
  }
  return new Blob([buffer], { type: fileItem.type });
}
