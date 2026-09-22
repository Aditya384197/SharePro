import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {setupSignaling} from './src/server/signaling.ts';

function signalingPlugin(): Plugin {
  return {
    name: 'sharepro-signaling',
    configureServer(server) {
      if (server.httpServer) {
        setupSignaling(server.httpServer as any);
      }

      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/project-files-info') {
          try {
            const { getProjectFilesList } = await import('./src/server/zipServer.ts');
            const files = getProjectFilesList(process.cwd());
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              totalFiles: files.length,
              files,
              timestamp: Date.now(),
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.url === '/api/download-source-zip') {
          try {
            const { createSourceCodeZipBuffer } = await import('./src/server/zipServer.ts');
            const buffer = await createSourceCodeZipBuffer(process.cwd());
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="SharePro-Full-SourceCode-and-Android-Project.zip"');
            res.end(buffer);
          } catch (err: any) {
            res.statusCode = 500;
            res.end(`Error creating zip: ${err.message}`);
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), signalingPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
