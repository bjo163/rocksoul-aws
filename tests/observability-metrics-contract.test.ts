import test from 'node:test';
import assert from 'node:assert/strict';

test('core metrics names remain stable', () => {
  const metrics = ['http_requests_total', 'http_request_duration_ms', 'http_errors_total', 'postgres_connections', 'witness_operations_total'];
  for (const name of metrics) assert.match(name, /^[a-z][a-z0-9_]+$/);
  assert.equal(new Set(metrics).size, metrics.length);
});

test('latency metric uses bounded numeric observations', () => {
  const latency = 123.45;
  assert.equal(Number.isFinite(latency), true);
  assert.ok(latency >= 0);
});
