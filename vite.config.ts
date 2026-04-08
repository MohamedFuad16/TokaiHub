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