const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEW_VERSION = '4.4.0';
const rootDir = path.resolve(__dirname, '..');

const filesToUpdate = [
  'package.json',
  'apps/api/package.json',
  'apps/cab/package.json',
  'apps/web/package.json',
  'packages/contracts/package.json',
  'packages/data-access/package.json',
  'packages/persistence/package.json',
  'packages/sdk/package.json',
  'packages/ui/package.json'
];

console.log(`Bumping version to ${NEW_VERSION}...`);

for (const relPath of filesToUpdate) {
  const absPath = path.join(rootDir, relPath);
  if (fs.existsSync(absPath)) {
    const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    pkg.version = NEW_VERSION;
    // Also update workspace dependencies
    for (const deps of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
      if (!deps) continue;
      for (const [key, val] of Object.entries(deps)) {
        if (key.startsWith('@moonwitness/') && val !== '*') {
          deps[key] = NEW_VERSION;
        }
      }
    }
    fs.writeFileSync(absPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${relPath}`);
  }
}

// Ensure lockfile is updated
try {
  execSync('npm install --package-lock-only --ignore-scripts', { stdio: 'inherit', cwd: rootDir });
  console.log('Updated package-lock.json');
} catch (e) {
  console.error('Failed to update package-lock.json', e);
}

console.log(`Version bump to ${NEW_VERSION} complete.`);
