import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * Writes precache.json: every file of this build plus the fonts and icons from public/, so the
 * service worker can store the whole app when it installs (instant, offline-capable screens).
 * TTF fonts are left out; browsers take the WOFF listed first in @font-face.
 */
function precacheList(): Plugin {
  return {
    name: 'tokaihub-precache',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const built = Object.keys(bundle).filter(f => !f.endsWith('.map') && f !== 'precache.json');
      const pub = (dir: string, keep: RegExp) => (fs.existsSync(`public/${dir}`) ? fs.readdirSync(`public/${dir}`) : [])
        .filter(f => keep.test(f)).map(f => `${dir}/${f}`);
      const files = ['/', ...built, 'manifest.json', ...pub('fonts', /\.woff$/), ...pub('icons', /\.png$/)]
        .map(f => (f.startsWith('/') ? f : `/${f}`))
        .filter(f => f !== '/index.html');
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
    },
  };
}

export default defineConfig(() => {
  const isGithub = process.env.GITHUB === 'true';

  return {
    base: isGithub ? '/TokaiHub/' : '/', // 👈 FIX
    plugins: [react(), tailwindcss(), precacheList()],
    server: {
      // The bridge (server/) runs separately; editing it should not reload the page.
      watch: { ignored: ['**/server/**'] },
      // Local TIPS bridge (npm run bridge). `npm run dev` listens on 0.0.0.0 for phone
      // testing, so refuse proxy requests that do not come from this machine: the bridge
      // serves the student's TIPS data.
      proxy: {
        '/tips-api': {
          target: 'http://127.0.0.1:8791',
          bypass(req, res) {
            const ip = req.socket.remoteAddress ?? '';
            if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
              console.warn(`[tips-proxy] refused ${req.url} from ${ip}`);
              res!.statusCode = 403;
              res!.end('TIPS bridge is only available on this computer');
              return false;
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'build',
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('aws-amplify') || id.includes('@aws-amplify')) {
                return 'aws-core';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              if (id.includes('motion')) {
                return 'motion';
              }
              if (id.includes('react-router-dom') || id.includes('remix-run') || id.includes('@remix-run')) {
                return 'routing';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
});