import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

type OpenApiOperation = {
  deprecated?: unknown;
  parameters?: unknown;
  responses?: unknown;
  'x-contract-status'?: unknown;
  'x-deprecation'?: unknown;
};

type OpenApiDocument = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    parameters?: Record<string, { in?: unknown; name?: unknown }>;
  };
};

const routeDeclaration = /\.add\(\s*(['"])(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\1\s*,\s*(['"])(\/api\/v1[^'"]+)\3/g;
const routeFiles = fs.readdirSync(path.resolve('apps/api/src/routes'))
  .filter((file) => file.endsWith('.ts'))
  .sort();
const nativeOperations = routeFiles.flatMap((file) => {
  const source = fs.readFileSync(path.resolve('apps/api/src/routes', file), 'utf8');
  return [...source.matchAll(routeDeclaration)].map((match) => ({
    method: match[2].toLowerCase(),
    path: match[4].replace(/:([A-Za-z0-9_]+)/g, '{$1}'),
  }));
});
const openapi = JSON.parse(fs.readFileSync('docs/api/openapi.json', 'utf8')) as OpenApiDocument;

function pathParameterName(parameter: unknown): string | undefined {
  if (typeof parameter !== 'object' || parameter === null) return undefined;
  const record = parameter as Record<string, unknown>;
  const inline = record.in === 'path' && typeof record.name === 'string' ? record.name : undefined;
  if (inline) return inline;
  if (typeof record.$ref !== 'string') return undefined;
  const prefix = '#/components/parameters/';
  if (!record.$ref.startsWith(prefix)) return undefined;
  const component = openapi.components?.parameters?.[record.$ref.slice(prefix.length)];
  return component?.in === 'path' && typeof component.name === 'string' ? component.name : undefined;
}

function operationKey(operation: { method: string; path: string }): string {
  return `${operation.method.toUpperCase()} ${operation.path}`;
}

test('OpenAPI is a complete, exact inventory of native v1 route operations', () => {
  const documented = Object.entries(openapi.paths ?? {}).flatMap(([route, pathItem]) => Object.keys(pathItem)
    .filter((method) => ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method))
    .map((method) => operationKey({ method, path: route })));
  const native = nativeOperations.map(operationKey);
  assert.deepEqual([...new Set(documented)].sort(), [...new Set(native)].sort());
});

test('every documented native operation has a response contract and route parameters', () => {
  for (const native of nativeOperations) {
    const operation = openapi.paths?.[native.path]?.[native.method];
    assert.ok(operation, `OpenAPI operation missing: ${operationKey(native)}`);
    assert.ok(operation.responses && typeof operation.responses === 'object', `responses missing: ${operationKey(native)}`);
    const expectedParameters = [...native.path.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]);
    const documentedParameters = Array.isArray(operation.parameters)
      ? operation.parameters.map(pathParameterName).filter((name): name is string => typeof name === 'string')
      : [];
    assert.deepEqual(documentedParameters.sort(), expectedParameters.sort(), `path parameters mismatch: ${operationKey(native)}`);
  }
});

test('compatibility operations declare an explicit deprecation decision', () => {
  for (const [route, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation['x-contract-status'] !== 'compatibility') continue;
      assert.equal(operation.deprecated, true, `compatibility operation is not deprecated: ${method.toUpperCase()} ${route}`);
      assert.deepEqual(typeof operation['x-deprecation'], 'object', `deprecation metadata missing: ${method.toUpperCase()} ${route}`);
    }
  }
});
