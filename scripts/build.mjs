import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundle = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, write: false, format: 'iife', target: ['es2020'],
  minify: true, legalComments: 'inline',
});
const [template, css, license] = await Promise.all([
  readFile(path.join(root, 'src/template.html'), 'utf8'),
  readFile(path.join(root, 'src/style.css'), 'utf8'),
  readFile(path.join(root, 'node_modules/three/LICENSE'), 'utf8'),
]);
const html = template.replace('/* INLINE_STYLE */', () => css)
  .replace('/* INLINE_SCRIPT */', () => bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
await writeFile(path.join(root, 'index.html'), html + '\n<!-- Bundled Three.js license\n' + license + '\n-->\n');
console.log(`Built offline index.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
