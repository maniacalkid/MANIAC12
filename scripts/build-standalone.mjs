process.env.NODE_ENV = 'production';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tmpDir = path.join(rootDir, '.tmp-standalone');
const publicDir = path.join(rootDir, 'public');
const outHtmlPath = path.join(publicDir, 'maniac12-standalone.html');

async function buildStandaloneHtml() {
  fs.rmSync(tmpDir, { recursive: true, force: true });

  await build({
    root: rootDir,
    configFile: false,
    mode: 'production',
    logLevel: 'warn',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    build: {
      outDir: tmpDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      minify: 'esbuild',
      rollupOptions: {
        input: path.join(rootDir, 'index.html'),
        output: {
          format: 'iife',
          name: 'Maniac12Standalone',
          codeSplitting: false,
          entryFileNames: 'assets/app.js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  });

  const assetsDir = path.join(tmpDir, 'assets');
  const files = fs.readdirSync(assetsDir);

  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    throw new Error('Standalone build produced no JS bundle.');
  }

  const cssContent = cssFiles
    .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
    .join('\n')
    .replace(/<\/style/gi, '<\\/style');

  const jsContent = jsFiles
    .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
    .join('\n')
    .replace(/<\/script/gi, '<\\/script');

  const sourceHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

  // Remove the dev module entrypoint and embed standalone flag, CSS, and IIFE JS inline
  let singleHtml = sourceHtml.replace(
    /<script\s+type="module"\s+src="\/src\/main\.tsx"\s*><\/script>/i,
    ''
  );

  singleHtml = singleHtml.replace(
    '</head>',
    `    <script>window.__MANIAC12_STANDALONE__ = true;</script>\n    <style>${cssContent}</style>\n  </head>`
  );

  singleHtml = singleHtml.replace(
    '</body>',
    `    <script>${jsContent}</script>\n  </body>`
  );

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(outHtmlPath, singleHtml, 'utf-8');
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const stats = fs.statSync(outHtmlPath);
  const kb = (stats.size / 1024).toFixed(1);
  console.log(`Built standalone single-file HTML: ${outHtmlPath} (${kb} KB)`);
}

buildStandaloneHtml().catch((err) => {
  console.error(err);
  process.exit(1);
});
