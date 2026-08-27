import assert from 'node:assert/strict';

const base = (process.env.SMOKE_API_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const username = process.env.SMOKE_ADMIN_USERNAME ?? process.env.MOONWITNESS_ADMIN_USERNAME ?? '';
const password = process.env.SMOKE_ADMIN_PASSWORD ?? process.env.MOONWITNESS_ADMIN_PASSWORD ?? '';
if (!username || !password) throw new Error('Set SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD');

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const text = await response.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

const health = await request('/api/v1/health');
assert.equal(health.status, 200);

const login = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
assert.equal(login.status, 200, `login failed: ${JSON.stringify(login.body)}`);
const token = String((login.body as any)?.token ?? '');
assert.ok(token);
const auth = { authorization: `Bearer ${token}` };

const cases = [
  'Saya menemukan dompet orang lain lalu mengembalikannya kepada pemilik.',
  'Bendahara menggunakan uang kantor untuk kebutuhan pribadinya.',
  'Saya membantu teman belajar tanpa meminta imbalan.',
  'Saya memeriksa sumber sebelum membagikan sebuah klaim.',
  'Seorang pegawai menerima suap untuk meloloskan izin.',
  'Saya menuduh tetangga melakukan sesuatu tanpa bukti.',
  'Saya berbohong kepada pelanggan tentang kondisi barang.',
  'Anggaran publik digunakan untuk biaya pribadi.',
  'Saya rutin melakukan kebiasaan yang berdampak buruk pada kesehatan.',
  'Seseorang mengambil barang orang lain dan menyimpannya.',
];

const results: unknown[] = [];
for (let i = 0; i < cases.length; i++) {
  const key = `api-smoke-${Date.now()}-${i}`;
  const analyzed = await request('/api/v1/analyze', {
    method: 'POST',
    headers: { ...auth, 'idempotency-key': key },
    body: JSON.stringify({ text: cases[i], caseId: `SMOKE-CASE-${i}` }),
  });
  assert.equal(analyzed.status, 200, `analyze ${i} failed: ${JSON.stringify(analyzed.body)}`);

  const ai = await request('/api/v1/ai/analyze', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ text: cases[i] }),
  });
  assert.equal(ai.status, 200, `ai/analyze ${i} failed: ${JSON.stringify(ai.body)}`);

  results.push({ index: i, analyzeStatus: analyzed.status, aiAnalyzeStatus: ai.status, analyze: analyzed.body, ai: ai.body });
}

const directMizan = await request('/api/v1/mizan', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({
    semantic: { R: -0.7, G: 0, B: 0.8, L: 0.1 },
    actionGateVector: Array(9).fill(0.2),
    impactVector: Array(13).fill(-0.1),
    domainVector: { HEALTH: 0.8 },
    evidenceCount: 1,
    confidence: 0.8,
    evidenceQuality: 0.75,
    semanticObservation: { action: 'SMOKING', frequency: 'daily', quantityPerDay: 10 },
  }),
});
assert.equal(directMizan.status, 200, `mizan failed: ${JSON.stringify(directMizan.body)}`);
assert.equal(typeof (directMizan.body as any)?.assessment?.accountabilityScore, 'number');
assert.equal((directMizan.body as any)?.meta?.engine, 'mizan');

const invalidMizan = await request('/api/v1/mizan', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({ confidence: 'not-a-number' }),
});
assert.equal(invalidMizan.status, 400, `invalid mizan input unexpectedly accepted: ${JSON.stringify(invalidMizan.body)}`);

const idemKey = `api-smoke-command-${Date.now()}`;
const commandPayload = { command: 'CREATE_ENTITY', target: `SMOKE-IDEMPOTENT-${Date.now()}`, payload: { type: 'SMOKE.TEST', payload: { source: 'api-smoke' } } };
const [idemA, idemB] = await Promise.all([
  request('/api/v1/command', { method: 'POST', headers: { ...auth, 'idempotency-key': idemKey }, body: JSON.stringify(commandPayload) }),
  request('/api/v1/command', { method: 'POST', headers: { ...auth, 'idempotency-key': idemKey }, body: JSON.stringify(commandPayload) }),
]);
assert.ok([200, 201].includes(idemA.status), `first idempotent command failed: ${JSON.stringify(idemA.body)}`);
assert.ok([200, 201].includes(idemB.status), `second idempotent command failed: ${JSON.stringify(idemB.body)}`);
assert.deepEqual(idemA.body, idemB.body);

const evaluation = await request('/api/v1/evaluate', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({ target: 'SMOKE-EVAL-1', text: cases[4] }),
});
assert.equal(evaluation.status, 200, `evaluate failed: ${JSON.stringify(evaluation.body)}`);

console.log(JSON.stringify({ ok: true, base, cases: results, mizan: directMizan.body, mizanInvalidStatus: invalidMizan.status, idempotency: { statusA: idemA.status, statusB: idemB.status, identical: JSON.stringify(idemA.body) === JSON.stringify(idemB.body) }, evaluation: evaluation.body }, null, 2));
