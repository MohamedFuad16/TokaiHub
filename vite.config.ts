import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isGithub = process.env.GITHUB === 'true';

  return {
    base: isGithub ? '/TokaiHub/' : '/', // 👈 FIX
    plugins: [react(), tailwindcss()],
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
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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