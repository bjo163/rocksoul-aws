import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ClientConfig } from 'pg';

const root = resolve(process.env.MW_REPO_ROOT ?? process.cwd());

// ─── HTML UI ────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MoonWitness Setup Wizard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0c0e14;--surface:#141720;--surface2:#1a1e2a;--border:#252a3a;--text:#e4e8f1;--muted:#7a8299;--accent:#6c8cff;--accent2:#a78bfa;--success:#34d399;--warning:#fbbf24;--error:#f87171;--radius:12px}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center}
.wizard{width:640px;max-width:96vw;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}
.header{padding:28px 32px 20px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,var(--surface) 0%,var(--surface2) 100%)}
.brand{display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.12em;color:var(--muted);margin-bottom:16px}
.brand-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
h1{font-size:22px;font-weight:600;margin-bottom:4px}
.subtitle{color:var(--muted);font-size:14px}
.steps{padding:24px 32px;display:flex;flex-direction:column;gap:12px}
.step{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);transition:all .3s}
.step.active{border-color:var(--accent);background:rgba(108,140,255,.08)}
.step.done{border-color:var(--success);background:rgba(52,211,153,.06)}
.step.error{border-color:var(--error);background:rgba(248,113,113,.06)}
.step-icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.step.waiting .step-icon{background:var(--border);color:var(--muted)}
.step.active .step-icon{background:var(--accent);color:#fff;animation:pulse 1.5s infinite}
.step.done .step-icon{background:var(--success);color:#fff}
.step.error .step-icon{background:var(--error);color:#fff}
.step-info{flex:1;min-width:0}
.step-title{font-size:14px;font-weight:600}
.step-detail{font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.progress-bar{height:3px;background:var(--border);border-radius:2px;margin-top:6px;overflow:hidden}
.progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .4s;border-radius:2px}
.form-section{padding:20px 32px;border-top:1px solid var(--border)}
.form-section h2{font-size:15px;font-weight:600;margin-bottom:14px}
.field{margin-bottom:12px}
.field label{display:block;font-size:12px;color:var(--muted);margin-bottom:4px;letter-spacing:.04em}
.field input{width:100%;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;outline:none;transition:border-color .2s}
.field input:focus{border-color:var(--accent)}
.actions{padding:20px 32px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px}
.btn{padding:10px 24px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{border-color:var(--accent);color:var(--text)}
.btn-danger{background:rgba(248,113,113,.12);color:var(--error);border:1px solid rgba(248,113,113,.45)}
.btn-danger:hover{background:rgba(248,113,113,.2);transform:translateY(-1px)}
.choice-description{color:var(--muted);font-size:13px;line-height:1.6}
.log-panel{padding:0 32px 20px}
.log-box{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 16px;max-height:160px;overflow-y:auto;font-family:'Cascadia Code','Fira Code',monospace;font-size:12px;color:var(--muted);line-height:1.6;white-space:pre-wrap}
.log-box .log-ok{color:var(--success)}
.log-box .log-err{color:var(--error)}
.log-box .log-info{color:var(--accent)}
.result-banner{padding:20px 32px;text-align:center}
.result-banner.success{background:rgba(52,211,153,.08);border-top:1px solid var(--success)}
.result-banner.failure{background:rgba(248,113,113,.08);border-top:1px solid var(--error)}
.result-banner h2{font-size:18px;margin-bottom:6px}
.result-banner p{color:var(--muted);font-size:13px}
.result-banner a{color:var(--accent);text-decoration:none;font-weight:600}
</style>
</head>
<body>
<div class="wizard" id="wizard">
  <div class="header">
    <div class="brand"><span class="brand-dot"></span> MOONWITNESS</div>
    <h1>Setup Wizard</h1>
    <p class="subtitle">One command, everything ready.</p>
  </div>
  <div class="steps" id="steps"></div>
  <div class="form-section" id="form-section" style="display:none">
    <h2 id="form-title"></h2>
    <div id="form-fields"></div>
  </div>
  <div class="log-panel" id="log-panel" style="display:none">
    <div class="log-box" id="log-box"></div>
  </div>
  <div class="result-banner" id="result-banner" style="display:none"></div>
  <div class="actions" id="actions">
    <button class="btn btn-primary" id="btn-start">Start Setup</button>
  </div>
</div>
<script>
const STEPS = [
  { id:'env', title:'Environment', detail:'Check .env configuration' },
  { id:'db', title:'Database Setup', detail:'Reuse, reset, or install' },
  { id:'admin', title:'Create Admin', detail:'First administrator account' },
  { id:'build', title:'Build Applications', detail:'API, Web, CAB, XRP, Flow' },
  { id:'start', title:'Start Services', detail:'Launch all applications' },
];
let currentStep = -1;
let sse = null;

function renderSteps() {
  const container = document.getElementById('steps');
  container.innerHTML = STEPS.map((s, i) => {
    const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'waiting';
    const icon = state === 'done' ? '✓' : state === 'active' ? '⟳' : (i + 1);
    return '<div class="step ' + state + '" id="step-' + s.id + '"><div class="step-icon">' + icon + '</div><div class="step-info"><div class="step-title">' + s.title + '</div><div class="step-detail" id="detail-' + s.id + '">' + s.detail + '</div></div></div>';
  }).join('');
}
renderSteps();

function log(text, cls) {
  const box = document.getElementById('log-box');
  const panel = document.getElementById('log-panel');
  panel.style.display = '';
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text + '\\n';
  box.appendChild(span);
  box.scrollTop = box.scrollHeight;
}

function setDetail(stepId, text) {
  const el = document.getElementById('detail-' + stepId);
  if (el) el.textContent = text;
}

function setStepState(index, state) {
  const step = STEPS[index];
  if (!step) return;
  const el = document.getElementById('step-' + step.id);
  if (!el) return;
  el.className = 'step ' + state;
  const icon = el.querySelector('.step-icon');
  if (state === 'done') icon.textContent = '✓';
  else if (state === 'error') icon.textContent = '✗';
  else if (state === 'active') icon.textContent = '⟳';
}

function showForm(title, fields) {
  return new Promise((resolve) => {
    const section = document.getElementById('form-section');
    const titleEl = document.getElementById('form-title');
    const fieldsEl = document.getElementById('form-fields');
    const actions = document.getElementById('actions');
    section.style.display = '';
    titleEl.textContent = title;
    fieldsEl.innerHTML = fields.map(f =>
      '<div class="field"><label>' + f.label + '</label><input id="field-' + f.name + '" type="' + (f.type||'text') + '" value="' + (f.value||'') + '" placeholder="' + (f.placeholder||'') + '"/></div>'
    ).join('');
    actions.innerHTML = '<button class="btn btn-primary" id="btn-submit">Continue</button>';
    document.getElementById('btn-submit').onclick = () => {
      const result = {};
      fields.forEach(f => { result[f.name] = document.getElementById('field-' + f.name).value; });
      section.style.display = 'none';
      resolve(result);
    };
  });
}

function showChoice(title, description, choices) {
  return new Promise((resolve) => {
    const section = document.getElementById('form-section');
    const titleEl = document.getElementById('form-title');
    const fieldsEl = document.getElementById('form-fields');
    const actions = document.getElementById('actions');
    section.style.display = '';
    titleEl.textContent = title;
    fieldsEl.innerHTML = '<p class="choice-description">' + description + '</p>';
    actions.innerHTML = choices.map(choice =>
      '<button class="btn ' + choice.className + '" id="choice-' + choice.id + '">' + choice.label + '</button>'
    ).join('');
    choices.forEach(choice => {
      document.getElementById('choice-' + choice.id).onclick = () => {
        section.style.display = 'none';
        actions.innerHTML = '';
        resolve(choice.id);
      };
    });
  });
}

async function runSetup() {
  document.getElementById('actions').innerHTML = '';

  // Step 0: Environment
  currentStep = 0; renderSteps();
  log('Checking environment...', 'log-info');
  const envRes = await fetch('/api/step/env', { method: 'POST' });
  const envData = await envRes.json();
  if (envData.needsInput) {
    const fields = [
      { name: 'PGHOST', label: 'PostgreSQL Host', value: envData.defaults?.PGHOST || 'localhost' },
      { name: 'PGPORT', label: 'PostgreSQL Port', value: envData.defaults?.PGPORT || '5432' },
      { name: 'PGDATABASE', label: 'Database Name', value: envData.defaults?.PGDATABASE || 'moonwitness' },
      { name: 'PGUSER', label: 'Database User', value: envData.defaults?.PGUSER || 'postgres' },
      { name: 'PGPASSWORD', label: 'Database Password', type: 'password', value: envData.defaults?.PGPASSWORD || '' },
    ];
    const input = await showForm('PostgreSQL Connection', fields);
    const saveRes = await fetch('/api/step/env/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const saveData = await saveRes.json();
    log(saveData.ok ? 'Environment saved.' : 'Error: ' + saveData.error, saveData.ok ? 'log-ok' : 'log-err');
    if (!saveData.ok) { setStepState(0, 'error'); return; }
  } else {
    log('Environment file found.', 'log-ok');
  }
  setStepState(0, 'done');

  // Step 1: Database choice/install
  currentStep = 1; renderSteps();
  log('Checking database status...', 'log-info');
  const dbStatusRes = await fetch('/api/step/db/status', { method: 'POST' });
  const dbStatus = await dbStatusRes.json();
  if (!dbStatus.ok) {
    log('Database status check failed: ' + (dbStatus.error || 'Unknown error'), 'log-err');
    setStepState(1, 'error');
    throw new Error('DB_STATUS_FAILED');
  }

  let shouldInstall = !dbStatus.populated;
  if (dbStatus.populated) {
    setDetail('db', 'Existing database detected');
    let action;
    while (true) {
      action = await showChoice(
        'Existing Database Found',
        'The audit ledger contains ' + dbStatus.auditEntries + ' entries. Keep it to preserve existing data, or reset the public schema and install from scratch.',
        [
          { id: 'reuse', label: 'Use Existing Database', className: 'btn-primary' },
          { id: 'reinstall', label: 'Reset & Reinstall', className: 'btn-danger' },
        ]
      );
      if (action !== 'reinstall' || window.confirm('Permanently delete all data in the public schema and reinstall the database?')) break;
      log('Database reset cancelled.', 'log-info');
    }
    if (action === 'reuse') {
      log('Using existing database. Installer skipped.', 'log-ok');
      setDetail('db', 'Existing database selected');
    } else {
      log('Resetting existing database...', 'log-info');
      const resetRes = await fetch('/api/step/db/reset', { method: 'POST' });
      const resetData = await resetRes.json();
      if (!resetData.ok) {
        log('Database reset failed: ' + (resetData.error || 'Unknown error'), 'log-err');
        setStepState(1, 'error');
        throw new Error('DB_RESET_FAILED');
      }
      log('Database reset complete.', 'log-ok');
      shouldInstall = true;
    }
  }

  if (shouldInstall) {
    log('Installing database...', 'log-info');
    await new Promise((resolve, reject) => {
      const es = new EventSource('/api/step/db');
      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'log') log(data.text);
        else if (data.type === 'detail') setDetail('db', data.text);
        else if (data.type === 'done') { es.close(); if (data.ok) { log('Database installed.', 'log-ok'); resolve(); } else { log('Database install failed: ' + (data.error || ''), 'log-err'); setStepState(1, 'error'); reject(new Error('DB_INSTALL_FAILED')); } }
      };
      es.onerror = () => { es.close(); log('Connection lost during DB install.', 'log-err'); setStepState(1, 'error'); reject(new Error('SSE_ERROR')); };
    }).catch((err) => {
      document.getElementById('actions').innerHTML = '<button class="btn btn-primary" id="btn-retry">Retry</button>';
      document.getElementById('btn-retry').onclick = runSetup;
      throw err;
    });
  }
  setStepState(1, 'done');

  // Step 2: Create Admin
  currentStep = 2; renderSteps();
  const adminFields = [
    { name: 'username', label: 'Admin Username', placeholder: 'admin' },
    { name: 'password', label: 'Admin Password (min 12 chars)', type: 'password' },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
  ];
  const adminInput = await showForm('Create Administrator Account', adminFields);
  if (adminInput.password !== adminInput.confirmPassword) {
    log('Passwords do not match.', 'log-err');
    setStepState(2, 'error');
    return;
  }
  const adminRes = await fetch('/api/step/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: adminInput.username, password: adminInput.password }) });
  const adminData = await adminRes.json();
  if (adminData.ok) { log('Admin account created: ' + adminData.username, 'log-ok'); }
  else { log('Error: ' + adminData.error, 'log-err'); setStepState(2, 'error'); return; }
  setStepState(2, 'done');

  // Step 3: Build (SSE)
  currentStep = 3; renderSteps();
  log('Building applications...', 'log-info');
  await new Promise((resolve, reject) => {
    const es = new EventSource('/api/step/build');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'log') log(data.text);
      else if (data.type === 'detail') setDetail('build', data.text);
      else if (data.type === 'done') { es.close(); if (data.ok) { log('Build complete.', 'log-ok'); resolve(); } else { log('Build failed.', 'log-err'); setStepState(3, 'error'); reject(new Error('BUILD_FAILED')); } }
    };
    es.onerror = () => { es.close(); reject(new Error('SSE_ERROR')); };
  });
  setStepState(3, 'done');

  // Step 4: Start (SSE)
  currentStep = 4; renderSteps();
  log('Starting services...', 'log-info');
  await new Promise((resolve, reject) => {
    const es = new EventSource('/api/step/start');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'log') log(data.text);
      else if (data.type === 'detail') setDetail('start', data.text);
      else if (data.type === 'done') { es.close(); if (data.ok) { log('All services running.', 'log-ok'); resolve(); } else { log('Start failed.', 'log-err'); setStepState(4, 'error'); reject(new Error('START_FAILED')); } }
    };
    es.onerror = () => { es.close(); reject(new Error('SSE_ERROR')); };
  });
  setStepState(4, 'done');
  currentStep = 5;

  // Show success
  const banner = document.getElementById('result-banner');
  banner.style.display = '';
  banner.className = 'result-banner success';
  banner.innerHTML = '<h2>✓ Setup Complete</h2><p>All services are running. <a href="http://127.0.0.1:4173" target="_blank">Open CAB Console →</a></p>';
  document.getElementById('actions').innerHTML = '<a class="btn btn-primary" href="http://127.0.0.1:4173" target="_blank">Open CAB</a>';
}

document.getElementById('btn-start').onclick = () => {
  runSetup().catch(err => {
    log('Setup stopped: ' + err.message, 'log-err');
  });
};
</script>
</body>
</html>`;

// ─── ENV helpers ────────────────────────────────────────────────────────────────
function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const result: Record<string, string> = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (match) result[match[1].trim()] = match[2];
  }
  return result;
}

function writeEnvFile(filePath: string, values: Record<string, string>): void {
  // Start from .env.example if available
  const examplePath = resolve(root, '.env.example');
  let lines: string[] = [];
  if (existsSync(examplePath)) {
    lines = readFileSync(examplePath, 'utf8').split('\n');
    // Replace known keys
    for (const [key, value] of Object.entries(values)) {
      const idx = lines.findIndex(l => l.match(new RegExp(`^\\s*${key}=`)));
      if (idx >= 0) lines[idx] = `${key}=${value}`;
    }
  } else {
    for (const [key, value] of Object.entries(values)) {
      lines.push(`${key}=${value}`);
    }
  }
  writeFileSync(filePath, lines.join('\n'));
}

function loadPostgresClientConfig(): ClientConfig {
  const localEnvPath = resolve(root, '.env.development.local');
  const envPath = existsSync(localEnvPath) ? localEnvPath : resolve(root, '.env');
  const fileEnv = loadEnvFile(envPath);
  const connectionString = fileEnv.DATABASE_URL || fileEnv.POSTGRES_URL;
  if (connectionString) return { connectionString };
  return {
    host: fileEnv.PGHOST || 'localhost',
    port: Number(fileEnv.PGPORT || 5432),
    database: fileEnv.PGDATABASE || 'moonwitness',
    user: fileEnv.PGUSER || 'postgres',
    password: fileEnv.PGPASSWORD,
  };
}

// ─── Process runner with SSE ────────────────────────────────────────────────────
function spawnWithSSE(res: ServerResponse, command: string, args: string[], env?: Record<string, string>): Promise<boolean> {
  return new Promise((done) => {
    const envFile = resolve(root, '.env.development.local');
    const fileEnv = loadEnvFile(existsSync(envFile) ? envFile : resolve(root, '.env'));
    const child = spawn(command, args, {
      cwd: root,
      shell: true,
      env: { ...process.env, ...fileEnv, ...(env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) res.write(`data: ${JSON.stringify({ type: 'log', text })}\n\n`);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) res.write(`data: ${JSON.stringify({ type: 'log', text })}\n\n`);
    });
    child.on('close', (code) => {
      res.write(`data: ${JSON.stringify({ type: 'done', ok: code === 0, code })}\n\n`);
      res.end();
      done(code === 0);
    });
    child.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'done', ok: false, error: err.message })}\n\n`);
      res.end();
      done(false);
    });
  });
}

// ─── HTTP Server ────────────────────────────────────────────────────────────────
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1`);
  const path = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Serve HTML
  if (path === '/' || path === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  // Step: env check
  if (path === '/api/step/env' && req.method === 'POST') {
    const envPath = resolve(root, '.env.development.local');
    const envPath2 = resolve(root, '.env');
    if (existsSync(envPath) || existsSync(envPath2)) {
      const env = loadEnvFile(existsSync(envPath) ? envPath : envPath2);
      if (env.PGPASSWORD && env.PGPASSWORD !== 'change-me') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, needsInput: false }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, needsInput: true, defaults: env }));
      return;
    }
    // No env file at all
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, needsInput: true, defaults: { PGHOST: 'localhost', PGPORT: '5432', PGDATABASE: 'moonwitness', PGUSER: 'postgres' } }));
    return;
  }

  // Step: env save
  if (path === '/api/step/env/save' && req.method === 'POST') {
    const body = await readBody(req);
    const envPath = resolve(root, '.env.development.local');
    const envPath2 = resolve(root, '.env');
    // Copy from example if neither exists
    const examplePath = resolve(root, '.env.example');
    if (!existsSync(envPath) && !existsSync(envPath2) && existsSync(examplePath)) {
      copyFileSync(examplePath, envPath);
    }
    const targetPath = existsSync(envPath) ? envPath : envPath2;
    // Merge PG values into env file
    const current = loadEnvFile(existsSync(targetPath) ? targetPath : examplePath);
    const merged = { ...current, ...body };
    writeEnvFile(existsSync(envPath) ? envPath : envPath, merged);
    // Also write to .env if it doesn't exist (for transpile-exec which uses .env)
    if (!existsSync(envPath2)) writeEnvFile(envPath2, merged);
    else {
      const envCurrent = loadEnvFile(envPath2);
      writeEnvFile(envPath2, { ...envCurrent, ...body });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

let isInstallingDb = false;

  // Step: inspect whether the database already contains a ledger
  if (path === '/api/step/db/status' && req.method === 'POST') {
    const { Client } = await import('pg');
    const client = new Client(loadPostgresClientConfig());
    try {
      await client.connect();
      const table = await client.query("SELECT to_regclass('public.audit_ledger') AS table_name");
      if (!table.rows[0]?.table_name) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, populated: false, auditEntries: 0 }));
        return;
      }
      const count = await client.query('SELECT count(*)::int AS count FROM audit_ledger');
      const auditEntries = Number(count.rows[0]?.count ?? 0);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, populated: auditEntries > 0, auditEntries }));
    } catch (err: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    } finally {
      await client.end().catch(() => undefined);
    }
    return;
  }

  // Step: db install (SSE)
  if (path === '/api/step/db' && req.method === 'GET') {
    if (isInstallingDb) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DB_INSTALL_IN_PROGRESS' }));
      return;
    }
    isInstallingDb = true;
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'detail', text: 'Running db:install...' })}\n\n`);
    try {
      await spawnWithSSE(res, 'node', ['--env-file=.env', 'scripts/transpile-exec.mjs', 'scripts/db-install.ts', '--driver=postgres']);
    } finally {
      isInstallingDb = false;
    }
    return;
  }

  // Step: db reset
  if (path === '/api/step/db/reset' && req.method === 'POST') {
    const { Client } = await import('pg');
    const client = new Client(loadPostgresClientConfig());
    try {
      await client.connect();
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    } finally {
      await client.end().catch(() => undefined);
    }
    return;
  }

  // Step: create admin
  if (path === '/api/step/admin' && req.method === 'POST') {
    const body = await readBody(req);
    const { username, password } = body;
    if (!username || !password || password.length < 12) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Username required, password must be at least 12 characters.' }));
      return;
    }
    // Write admin creds to env files for the local-apps script health check
    const envPath = resolve(root, '.env.development.local');
    const envPath2 = resolve(root, '.env');
    for (const target of [envPath, envPath2]) {
      if (existsSync(target)) {
        const env = loadEnvFile(target);
        env.MOONWITNESS_ADMIN_USERNAME = username;
        env.MOONWITNESS_ADMIN_PASSWORD = password;
        writeEnvFile(target, env);
      }
    }
    // Run auth:bootstrap
    const result = await new Promise<{ ok: boolean; output: string }>((resolve) => {
      const fileEnv = loadEnvFile(existsSync(envPath) ? envPath : envPath2);
      const child = spawn('node', ['--env-file=.env', 'scripts/transpile-exec.mjs', 'scripts/auth-bootstrap.ts'], {
        cwd: root, shell: true,
        env: { ...process.env, ...fileEnv, MOONWITNESS_ADMIN_USERNAME: username, MOONWITNESS_ADMIN_PASSWORD: password, MOONWITNESS_ADMIN_RID: fileEnv.MOONWITNESS_ADMIN_RID || 'RID-SETUP-WIZARD' },
      });
      let output = '';
      child.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { output += d.toString(); });
      child.on('close', (code) => resolve({ ok: code === 0, output }));
    });
    res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: result.ok, username, output: result.output }));
    return;
  }

  // Step: build (SSE)
  if (path === '/api/step/build' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const apps = ['api', 'web', 'cab', 'xrp', 'flow'];
    for (const app of apps) {
      res.write(`data: ${JSON.stringify({ type: 'detail', text: 'Building ' + app + '...' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'log', text: '── Building ' + app + ' ──' })}\n\n`);
      const ok = await new Promise<boolean>((resolve) => {
        const child = spawn('npm', ['run', 'build:' + app], { cwd: root, shell: true, env: { ...process.env } });
        child.stdout?.on('data', (d: Buffer) => {
          const text = d.toString().trim();
          if (text) res.write(`data: ${JSON.stringify({ type: 'log', text })}\n\n`);
        });
        child.stderr?.on('data', (d: Buffer) => {
          const text = d.toString().trim();
          if (text) res.write(`data: ${JSON.stringify({ type: 'log', text })}\n\n`);
        });
        child.on('close', (code) => resolve(code === 0));
      });
      if (!ok) {
        res.write(`data: ${JSON.stringify({ type: 'done', ok: false, error: 'build:' + app + ' failed' })}\n\n`);
        res.end();
        return;
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'done', ok: true })}\n\n`);
    res.end();
    return;
  }

  // Step: start (SSE)
  if (path === '/api/step/start' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'detail', text: 'Starting local services...' })}\n\n`);
    await spawnWithSSE(res, 'npm', ['run', 'local:start']);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'NOT_FOUND' }));
});

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

// ─── Start ──────────────────────────────────────────────────────────────────────
const PORT = 19847;
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`\n  🌙 MoonWitness Setup Wizard`);
  console.log(`  ${url}\n`);
  // Auto-open in default browser
  spawn('powershell', ['-Command', `Start-Process '${url}'`], { stdio: 'ignore', detached: true }).unref();
});
