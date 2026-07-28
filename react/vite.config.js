import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Library build, not an app build.
 *
 * The output has to be one file a merchant can point a single <script> tag at,
 * so: iife format, dynamic imports inlined, and React bundled in rather than
 * externalised. An embed cannot assume anything about the host page — least of
 * all that it already runs our version of React.
 */
export default defineConfig({
  plugins: [react()],
  // The dev page reads the real sample content from design-starter rather than a
  // copy of it, so the two can never drift apart. Nothing from here is emitted
  // into the build — see copyPublicDir below.
  publicDir: '../design-starter',
  // Vite does not substitute this in library mode, on the reasoning that a
  // library may be consumed in either environment. An embed is not: it ships
  // compiled, to strangers' pages. Without the substitution React's development
  // build — warnings, dev-only invariants, the whole thing — goes out with it,
  // which measured 229kB gzipped against 60kB for this.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    copyPublicDir: false,
    target: 'es2020',
    lib: {
      entry: 'src/index.jsx',
      name: 'ProductHighlights',
      formats: ['iife'],
      fileName: () => 'product-highlights.react.js',
    },
    rollupOptions: {
      output: {
        // Styles live in JS as strings destined for adoptedStyleSheets, so no
        // stylesheet is emitted and the merchant has one asset, not two.
        assetFileNames: 'product-highlights.react.[ext]',
      },
    },
    cssCodeSplit: false,
    reportCompressedSize: true,
    emptyOutDir: true,
  },
});
