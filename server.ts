import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupSignaling } from './src/server/signaling.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize WebSocket signaling
setupSignaling(server);

app.use(express.json());

// API health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'SharePro Server', time: Date.now() });
});

// Real project file audit & zip download API
app.get('/api/project-files-info', async (_req, res) => {
  try {
    const { getProjectFilesList } = await import('./src/server/zipServer.ts');
    const files = getProjectFilesList(process.cwd());
    res.json({
      success: true,
      totalFiles: files.length,
      files,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download-source-zip', async (_req, res) => {
  try {
    const { createSourceCodeZipBuffer } = await import('./src/server/zipServer.ts');
    const buffer = await createSourceCodeZipBuffer(process.cwd());
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SharePro-Full-SourceCode-and-Android-Project.zip"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(`Error creating zip: ${err.message}`);
  }
});

// Serve frontend static files in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SharePro server running on http://0.0.0.0:${PORT}`);
});
