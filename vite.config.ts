import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // Zod 4.5.4 mentions PURE annotations in prose comments. Rollup already
        // removes these invalid annotations; ignore only these two known comments.
        const id = warning.id?.replace(/\\/g, '/') ?? '';
        if (warning.code === 'INVALID_ANNOTATION' && (
          (/\/node_modules\/zod\/v4\/core\/util\.js$/.test(id) && warning.message.indexOf('Wrapped in a `@__PURE__` IIFE') !== -1) ||
          (/\/node_modules\/zod\/v4\/core\/regexes\.js$/.test(id) && warning.message.indexOf('Anchors a pattern source.') !== -1)
        )) return;
        defaultHandler(warning);
      },
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.indexOf('/node_modules/') === -1) return;
          if (/\/node_modules\/(?:@mui|@emotion)\//.test(normalized)) return 'ui';
          if (/\/node_modules\/(?:react|react-dom|scheduler)\//.test(normalized)) return 'react';
          if (normalized.indexOf('/node_modules/zod/') !== -1) return 'validation';
        },
      },
    },
  },
});
