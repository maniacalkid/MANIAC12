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
const docsDir = path.join(rootDir, 'docs');
const cdnDir = path.join(rootDir, 'cdn');
const outHtmlPath = path.join(publicDir, 'maniac12-standalone.html');
const docsIndexPath = path.join(docsDir, 'index.html');
const cdnCssPath = path.join(cdnDir, 'maniac12.css');
const cdnJsPath = path.join(cdnDir, 'maniac12.js');
const cdnEmbedPath = path.join(cdnDir, 'jsdelivr-embed.html');

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

  const rawCss = cssFiles
    .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
    .join('\n');

  const rawJs = jsFiles
    .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
    .join('\n');

  const cssContent = rawCss.replace(/<\/style/gi, '<\\/style');
  const jsContent = rawJs.replace(/<\/script/gi, '<\\/script');

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

  const jsdelivrEmbedHtml = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>maniac12 · lowkey unblocked game hub</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <!-- Replace YOUR_GITHUB_USER/YOUR_REPO with your public GitHub username & repo name -->
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/YOUR_REPO@main/cdn/maniac12.css"
    />
  </head>
  <body class="antialiased selection:bg-sky-500/30">
    <div id="root"></div>
    <script>window.__MANIAC12_STANDALONE__ = true;</script>
    <script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/YOUR_REPO@main/cdn/maniac12.js"></script>
  </body>
</html>
`;

  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(cdnDir, { recursive: true });

  fs.writeFileSync(outHtmlPath, singleHtml, 'utf-8');
  fs.writeFileSync(docsIndexPath, singleHtml, 'utf-8');
  fs.writeFileSync(cdnCssPath, rawCss, 'utf-8');
  fs.writeFileSync(cdnJsPath, `window.__MANIAC12_STANDALONE__=true;\n${rawJs}`, 'utf-8');
  fs.writeFileSync(cdnEmbedPath, jsdelivrEmbedHtml, 'utf-8');

  fs.rmSync(tmpDir, { recursive: true, force: true });

  const htmlKb = (fs.statSync(outHtmlPath).size / 1024).toFixed(1);
  const jsKb = (fs.statSync(cdnJsPath).size / 1024).toFixed(1);
  const cssKb = (fs.statSync(cdnCssPath).size / 1024).toFixed(1);
  console.log(
    `Built standalone (${htmlKb} KB) + jsDelivr CDN assets (cdn/maniac12.js: ${jsKb} KB, cdn/maniac12.css: ${cssKb} KB)`
  );
}

buildStandaloneHtml().catch((err) => {
  console.error(err);
  process.exit(1);
});
