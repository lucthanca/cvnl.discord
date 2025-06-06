// import { defineConfig } from 'vite';
// import { resolve } from 'path';
// import { writeFileSync, readFileSync } from 'fs';
//
// export default defineConfig({
//   build: {
//     target: ['esnext'],
//     rollupOptions: {
//       input: {
//         popup: resolve(__dirname, 'public/popup.html'),
//         options: resolve(__dirname, 'public/options.html'),
//         service_worker: resolve(__dirname, 'src/service_worker.ts'),
//         content: resolve(__dirname, 'src/content.ts'),
//         attempt: resolve(__dirname, 'src/attempt.ts'),
//         summary: resolve(__dirname, 'src/summary.ts'),
//         review: resolve(__dirname, 'src/review.ts'),
//         view: resolve(__dirname, 'src/view.ts'),
//         assign_view: resolve(__dirname, 'src/assign_view.ts'),
//         questionnaire: resolve(__dirname, 'src/questionnaire.ts'),
//       },
//       preserveEntrySignatures: 'strict',
//       output: {
//         entryFileNames: '[name].js',
//         assetFileNames: 'assets/[name].[ext]',
//         format: 'es',
//         preserveModules: true,
//       }
//         // chunkFileNames: 'assets/[name].js',
//       //   manualChunks: (id) => {
//       //     if (id.includes('node_modules')) {
//       //       return 'vendor';
//       //     }
//       //     if (id.includes('generative-answer')) {
//       //       return 'utils';
//       //     }
//       //   },
//       // }
//     },
//     modulePreload: {
//       polyfill: false,
//     },
//     outDir: 'dist',
//     emptyOutDir: true,
//     minify: 'terser',
//   },
//   plugins: [{
//     name: 'add-chunks-to-manifest',
//     writeBundle(options, bundle) {
//       const manifestPath = resolve(__dirname, 'dist/manifest.json');
//       const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
//
//       const chunks = Object.keys(bundle).filter((file) => file.startsWith('assets/') && file.endsWith('.js'));
//
//       manifest.web_accessible_resources = [
//         ...(manifest.web_accessible_resources || []),
//         {
//           resources: chunks,
//           matches: ['<all_urls>'],
//         },
//       ];
//
//       writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
//     },
//   }],
// });

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { ManifestV3Export, crx } from '@crxjs/vite-plugin';
import { defineConfig, BuildOptions, mergeConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths'
import manifest from './public/manifest.json';
import pkg from './package.json';

const isDev = process.env.__DEV__ === 'true';

export const baseManifest = {
  ...manifest,
  version: pkg.version,
} as ManifestV3Export

export const baseBuildOptions: BuildOptions = {
  sourcemap: isDev,
  emptyOutDir: !isDev
}

const baseConfig = defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
  ],
  publicDir: resolve(__dirname, 'public'),
});
const outDir = resolve(__dirname, 'dist');
export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      crx({
        manifest: {
          ...baseManifest,
          background: {
            service_worker: 'src/service_worker.ts',
            type: 'module'
          },
        } as ManifestV3Export,
        browser: 'chrome',
        contentScripts: {
          injectCss: true,
        }
      })
    ],
    build: {
      ...baseBuildOptions,
      outDir,
      emptyOutDir: true,
      minify: 'terser',
    },
  })
)