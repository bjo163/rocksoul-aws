import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const schemaFiles = walk(path.resolve('schemas')).filter((p) => p.endsWith('.schema.json'));
const yamlFiles = walk(path.resolve('config')).filter((p) => /\.(ya?ml)$/.test(p));

for (const file of schemaFiles) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  if (parsed.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error(`Unsupported schema draft: ${file}`);
  }
  if (typeof parsed.$id !== 'string' || typeof parsed.title !== 'string') {
    throw new Error(`Schema requires $id and title: ${file}`);
  }
}

for (const file of yamlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\t/.test(text)) throw new Error(`YAML must not use tabs: ${file}`);
  if (!/^version:\s*\d+/m.test(text)) throw new Error(`YAML config needs a version: ${file}`);
}

console.log(JSON.stringify({ schemas: schemaFiles.length, yamlConfigs: yamlFiles.length, status: 'PASS' }, null, 2));
