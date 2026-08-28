const baseUrl = String(process.env.API_BASE_URL ?? '').replace(/\/$/, '');
if (!baseUrl || !/^https:\/\//i.test(baseUrl)) throw new Error('API_BASE_URL_MUST_BE_HTTPS');

async function check(path: string): Promise<{ status: number; ok: boolean }> {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json' } });
  return { status: response.status, ok: response.ok };
}

const ready = await check('/api/v1/ready');
if (!ready.ok) throw new Error(`STAGING_NOT_READY:${ready.status}`);

const health = await check('/api/v1/health');
if (!health.ok) throw new Error(`STAGING_HEALTH_FAILED:${health.status}`);

console.log(JSON.stringify({ ok: true, baseUrl, readyStatus: ready.status, healthStatus: health.status }, null, 2));
