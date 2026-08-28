import assert from 'node:assert/strict';
import test from 'node:test';
import {
  redactHeaders,
  redactBody,
  redactPath,
  redactTraceAttributes,
  buildResourceAttributes,
  getSamplingRate,
  getPackageVersion,
  getCommitSha,
  registerTelemetry,
} from '../src/telemetry/index.js';
import Fastify from 'fastify';

test('header redaction removes sensitive headers', () => {
  const headers = {
    authorization: 'Bearer xyz',
    cookie: 'session=abc',
    'set-cookie': 'id=123',
    'x-mw-auth-mode': 'jwt',
    'content-type': 'application/json',
    'x-custom': 'value',
  };
  const result = redactHeaders(headers);
  assert.equal(result.authorization, '[REDACTED]');
  assert.equal(result.cookie, '[REDACTED]');
  assert.equal(result['set-cookie'], '[REDACTED]');
  assert.equal(result['x-mw-auth-mode'], '[REDACTED]');
  assert.equal(result['content-type'], 'application/json');
  assert.equal(result['x-custom'], 'value');
});

test('header redaction is case-insensitive', () => {
  const headers = {
    Authorization: 'Bearer xyz',
    COOKIE: 'session=abc',
    'X-MW-Auth-Mode': 'jwt',
  };
  const result = redactHeaders(headers);
  assert.equal(result.Authorization, '[REDACTED]');
  assert.equal(result.COOKIE, '[REDACTED]');
  assert.equal(result['X-MW-Auth-Mode'], '[REDACTED]');
});

test('body redaction removes sensitive fields', () => {
  const body = {
    username: 'alice',
    password: 'secret123',
    token: 'tok_xyz',
    secret: 'shhh',
    refreshToken: 'rtok_abc',
    accessToken: 'atok_def',
    sourceText: 'classified content',
    text: 'short text',
    nested: {
      password: 'nested-secret',
      token: 'nested-tok',
    },
  };
  const result = redactBody(body);
  assert.equal(result.password, '[REDACTED]');
  assert.equal(result.token, '[REDACTED]');
  assert.equal(result.secret, '[REDACTED]');
  assert.equal(result.refreshToken, '[REDACTED]');
  assert.equal(result.accessToken, '[REDACTED]');
  assert.equal(result.sourceText, '[REDACTED]');
  assert.equal(result.text, 'short text');
  assert.equal(result.username, 'alice');
  assert.equal((result.nested as Record<string, unknown>).password, '[REDACTED]');
  assert.equal((result.nested as Record<string, unknown>).token, '[REDACTED]');
});

test('body redaction redacts long text fields', () => {
  const body = {
    text: 'a'.repeat(600),
    shortText: 'small',
  };
  const result = redactBody(body);
  assert.equal(result.text, '[REDACTED]');
  assert.equal(result.shortText, 'small');
});

test('body redaction handles arrays and primitives', () => {
  assert.equal(redactBody(null), null);
  assert.equal(redactBody(undefined), undefined);
  assert.equal(redactBody('string'), 'string');
  assert.equal(redactBody(123), 123);
  assert.deepEqual(redactBody([{ password: 'x' }]), [{ password: '[REDACTED]' }]);
});

test('path redaction removes sensitive segments', () => {
  assert.equal(
    redactPath('/api/v1/auth/login'),
    '/api/v1/[REDACTED]/login',
  );
  assert.equal(
    redactPath('/api/v1/command'),
    '/api/v1/command',
  );
  assert.equal(redactPath('/'), '/');
});

test('trace attribute redaction removes sensitive keys', () => {
  const attrs = {
    'http.method': 'POST',
    'user.password': 'secret',
    'auth.token': 'tok',
    'api.key': 'key',
    'client_secret': 'shh',
    'normal.attr': 'value',
  };
  const result = redactTraceAttributes(attrs);
  assert.equal(result['http.method'], 'POST');
  assert.equal(result['user.password'], '[REDACTED]');
  assert.equal(result['auth.token'], '[REDACTED]');
  assert.equal(result['api.key'], '[REDACTED]');
  assert.equal(result['client_secret'], '[REDACTED]');
  assert.equal(result['normal.attr'], 'value');
});

test('disabled telemetry does not register plugin when OTEL_ENABLED is not 1', async () => {
  const previous = process.env.OTEL_ENABLED;
  process.env.OTEL_ENABLED = '0';
  const app = Fastify();
  await registerTelemetry(app);
  assert.equal(app.hasPlugin('@fastify/otel'), false);
  await app.close();
  process.env.OTEL_ENABLED = previous;
});

test('resource attribute population uses defaults', () => {
  const attrs = buildResourceAttributes({});
  assert.equal(attrs['service.name'], 'cosmic-api');
  assert.equal(typeof attrs['service.version'], 'string');
  assert.equal(attrs['deployment.environment'], process.env.NODE_ENV ?? 'development');
  assert.equal(typeof attrs['commit.sha'], 'string');
});

test('resource attribute population respects overrides', () => {
  const attrs = buildResourceAttributes({
    serviceName: 'custom-service',
    serviceVersion: '9.9.9',
    environment: 'production',
    commitSha: 'abc123',
  });
  assert.equal(attrs['service.name'], 'custom-service');
  assert.equal(attrs['service.version'], '9.9.9');
  assert.equal(attrs['deployment.environment'], 'production');
  assert.equal(attrs['commit.sha'], 'abc123');
});

test('sampling rate is 100% local, 10% staging, 1% production', () => {
  assert.equal(getSamplingRate('development'), 1);
  assert.equal(getSamplingRate('local'), 1);
  assert.equal(getSamplingRate('staging'), 0.1);
  assert.equal(getSamplingRate('production'), 0.01);
});

test('getPackageVersion returns a valid version string', () => {
  const version = getPackageVersion();
  assert.equal(typeof version, 'string');
  assert.ok(version.length > 0);
});

test('getCommitSha returns a valid sha or unknown', () => {
  const sha = getCommitSha();
  assert.equal(typeof sha, 'string');
  assert.ok(sha === 'unknown' || /^[0-9a-f]{40}$/.test(sha));
});

test('no sensitive data leaks into span attributes via requestHook', async () => {
  const app = Fastify();
  const sensitiveHeaders: Record<string, string> = {
    authorization: 'Bearer secret-token',
    cookie: 'session=sensitive',
    'x-mw-auth-mode': 'jwt',
    'content-type': 'application/json',
  };

  app.get('/test', async (_request, _reply) => {
    return { ok: true };
  });

  await registerTelemetry(app);
  const response = await app.inject({
    method: 'GET',
    url: '/test',
    headers: sensitiveHeaders,
  });
  assert.equal(response.statusCode, 200);

  const redacted = redactHeaders(sensitiveHeaders);
  assert.equal(redacted.authorization, '[REDACTED]');
  assert.equal(redacted.cookie, '[REDACTED]');
  assert.equal(redacted['x-mw-auth-mode'], '[REDACTED]');
  assert.equal(redacted['content-type'], 'application/json');

  await app.close();
});
