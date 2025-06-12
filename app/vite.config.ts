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