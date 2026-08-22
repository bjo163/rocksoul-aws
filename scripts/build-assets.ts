import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const assets = ['data', 'config', 'schemas'];

await mkdir(dist, { recursive: true });
for (const dir of assets) {
  const src = path.join(root, dir);
  const dst = path.join(dist, dir);
  await rm(dst, { recursive: true, force: true });
  await cp(src, dst, { recursive: true });
}
console.log(`Copied ${assets.length} runtime asset directories to dist/`);
