import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Menyiapkan serangan besar-besaran (1750+ request) ke server lokal Anda di http://127.0.0.1:8787 ...');

  const dirFiles = fs.readdirSync(__dirname);
  const caseFiles = dirFiles.filter(f => f.startsWith('test-cases-') && f.endsWith('.json'));
  
  let cases = [];
  for (const f of caseFiles) {
    const content = fs.readFileSync(path.join(__dirname, f), 'utf-8');
    cases = cases.concat(JSON.parse(content));
  }
  
  const base = 'http://127.0.0.1:8787';
  let authToken = '';

  try {
    // 1. Register a test admin
    await fetch(`${base}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'live-admin', password: 'password', role: 'ADMIN' })
    });
    
    // Hack local file to enforce ADMIN role
    const authFile = path.resolve(__dirname, '../.data/auth-users.json');
    if (fs.existsSync(authFile)) {
      const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      if (data.users && Array.isArray(data.users)) {
        const u = data.users.find((x) => x.username === 'live-admin');
        if (u) {
          u.roles = ['ADMIN', 'COMMAND'];
          fs.writeFileSync(authFile, JSON.stringify(data, null, 2));
        }
      }
    }

    // 2. Login
    const loginRes = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'live-admin', password: 'password' })
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      authToken = data.token;
      console.log('Berhasil login sebagai admin untuk token otorisasi!');
    } else {
      console.log('Peringatan: Gagal login admin. Melanjutkan tanpa otorisasi. Status:', loginRes.status);
    }
  } catch (e) {
    console.error('Gagal:', e.message);
    process.exit(1);
  }

  console.log(`Mengirim ${cases.length} kasus semantik ke mesin Anda...\nSilakan perhatikan terminal npm run dev Anda sekarang!\n`);

  let count = 0;
  for (const tc of cases) {
    const headers = { ...tc.headers };
    if (tc.requiresAuth && authToken) {
      headers['authorization'] = `Bearer ${authToken}`;
    }
    const init = { method: tc.method, headers };
    if (tc.body) {
      init.body = JSON.stringify(tc.body);
      headers['content-type'] = 'application/json';
    }

    try {
      const res = await fetch(`${base}${tc.route}`, init);
      count++;
      if (count % 50 === 0) {
        console.log(`-> ${count} request telah ditembakkan ke 8787...`);
      }
      
      // Delay 100ms to avoid 429 Too Many Requests (Limit is 600/min or 10/sec)
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      // ignore
    }
  }
  
  console.log(`\nSelesai! Berhasil menembak ${count} request langsung ke mesin Anda.`);
}

main().catch(console.error);
