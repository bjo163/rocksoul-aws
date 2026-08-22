import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'apps/cab/package.json','apps/cab/vite.config.ts','apps/cab/src/App.tsx','apps/cab/src/lib/api.ts',
  'apps/cab/src/components/model/ModelTable.tsx','apps/cab/src/components/model/ModelDetail.tsx','apps/cab/src/components/model/ModelGraphPanel.tsx',
  'apps/cab/src/components/model/RelationPanel.tsx','apps/cab/src/components/model/TimelinePanel.tsx','apps/cab/src/components/ui/Button.tsx',
  'apps/cab/src/components/ui/Card.tsx','apps/cab/src/components/ui/Input.tsx','apps/cab/src/components/ui/Badge.tsx'
];

test('model-driven UI source tree is complete', () => {
  for (const rel of required) assert.equal(fs.existsSync(path.join(root, rel)), true, rel);
  const app = fs.readFileSync(path.join(root,'apps/cab/src/App.tsx'),'utf8');
  assert.match(app, /ModelTable/);
  assert.match(app, /ModelGraphPanel/);
  const api = fs.readFileSync(path.join(root,'apps/cab/src/lib/api.ts'),'utf8');
  assert.match(api, /api\/models/);
});
