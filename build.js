import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DIST_DIR = 'dist';
const PUBLIC_DIR = 'public';

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Recursively copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// Compress text assets with Gzip and Brotli
function compressAssets(dir) {
  let count = 0;
  let savedBytes = 0;
  const compressibleExts = ['.html', '.js', '.css', '.json', '.svg', '.txt'];

  function walk(currentDir) {
    for (const item of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(item).toLowerCase();
        if (compressibleExts.includes(ext) && stat.size > 1024) {
          const content = fs.readFileSync(fullPath);

          // 1. Gzip compression
          const gz = zlib.gzipSync(content, { level: 9 });
          fs.writeFileSync(`${fullPath}.gz`, gz);

          // 2. Brotli compression (maximum web compression)
          const br = zlib.brotliCompressSync(content, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
            },
          });
          fs.writeFileSync(`${fullPath}.br`, br);

          count++;
          savedBytes += content.length - br.length;
        }
      }
    }
  }

  walk(dir);
  return { count, savedBytes };
}

console.log('── Bvmbino Sovereign Production Build ─────────────────────');
console.log(`Syncing ${PUBLIC_DIR}/ to ${DIST_DIR}/...`);
copyDir(PUBLIC_DIR, DIST_DIR);

console.log('Generating production Brotli (.br) and Gzip (.gz) optimized bundles...');
const { count, savedBytes } = compressAssets(DIST_DIR);
console.log(`Successfully compressed ${count} assets (saved ${(savedBytes / 1024).toFixed(1)} KB over raw size).`);

const indexStat = fs.statSync(path.join(DIST_DIR, 'index.html'));
const indexBrStat = fs.statSync(path.join(DIST_DIR, 'index.html.br'));
console.log(`Main HTML size: ${(indexStat.size / 1024).toFixed(1)} KB (Brotli: ${(indexBrStat.size / 1024).toFixed(1)} KB)`);
console.log('Production build successfully synced and optimized to dist/ ✓');
