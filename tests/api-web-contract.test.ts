import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const routesDir=resolve(root,'apps/api/src/routes');
const apiSource = readdirSync(routesDir).filter((name)=>name.endsWith('.ts')).map((name)=>readFileSync(resolve(routesDir,name),'utf8')).join('\n');
const appSource = readFileSync(resolve(root, 'apps/api/src/app.ts'), 'utf8');
const webApi = readFileSync(resolve(root, 'apps/cab/src/lib/api.ts'), 'utf8');

const routes = [
  '/api/v1/health',
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/features',
  '/api/v1/prophets',
  '/api/v1/models',
  '/api/v1/entities',
  '/api/v1/relations',
  '/api/v1/events',
  '/api/v1/types',
  '/api/v1/rules/resolve',
  '/api/v1/ai/analyze',
  '/api/v1/witness/status',
  '/api/v1/witness/diagnostics',
];

for (const route of routes) if (!apiSource.includes(route)) throw new Error(`API route missing: ${route}`);
if (!webApi.includes('/api/v1/ai/analyze')) throw new Error('Web AI analyzer route missing');
if (!webApi.includes('getJSON<AnalysisResult>')) throw new Error('Web AI analyzer is not typed');
if ((apiSource+appSource).includes('demo1234') || (apiSource+appSource).includes('RID-001')) throw new Error('Demo credentials remain hardcoded in API');

console.log(`API↔WEB contract PASS: ${routes.length} routes checked`);
