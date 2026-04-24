const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(dist, 'extension-store-ready');

const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
];

const folders = ['data', 'rules', 'services', 'utils'];

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyItem(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyItem(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

resetDir(out);

for (const file of files) {
  copyItem(path.join(root, file), path.join(out, file));
}

for (const folder of folders) {
  copyItem(path.join(root, folder), path.join(out, folder));
}

const note = [
  'DarkWatch · build para Chrome Web Store',
  '',
  '1. Esta carpeta ya contiene solo los archivos de la extensión.',
  '2. Para crear el ZIP, comprime el CONTENIDO de esta carpeta, no la carpeta padre.',
  '3. Verifica que manifest.json quede en la raíz del ZIP final.',
  '4. El backend Python y el .env no se suben al ZIP de la tienda.',
].join('\n');

fs.writeFileSync(path.join(out, 'README_STORE.txt'), note, 'utf8');
console.log(`Build listo en: ${out}`);
