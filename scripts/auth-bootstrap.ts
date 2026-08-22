import path from 'node:path';
import { createAuthService } from '../src/access/auth.js';
import { PostgresAuthService } from '../src/access/postgres-auth.js';

const dataDir = path.resolve(process.env.MOONWITNESS_DATA_DIR ?? '.data');
const username = process.env.MOONWITNESS_ADMIN_USERNAME;
const password = process.env.MOONWITNESS_ADMIN_PASSWORD;
const rid = process.env.MOONWITNESS_ADMIN_RID;
if (!username || !password || !rid) {
  console.error('Set MOONWITNESS_ADMIN_USERNAME, MOONWITNESS_ADMIN_PASSWORD, and MOONWITNESS_ADMIN_RID.');
  process.exit(2);
}
if (password.length < 12) {
  console.error('Admin password must be at least 12 characters.');
  process.exit(2);
}
const usePostgres = (process.env.STORAGE_DRIVER ?? '').toLowerCase() === 'postgres';
try {
  if (usePostgres) {
    const jwtSecret = process.env.JWT_SECRET ?? '';
    if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
      console.error('JWT_SECRET must be at least 32 characters in production.');
      process.exit(2);
    }
    const auth = await PostgresAuthService.create({ jwtSecret: jwtSecret || 'change-me-before-production' });
    const existing = auth._users.get(username);
    if (existing && !existing.roles.includes('ADMIN')) throw new Error('Existing username is not an ADMIN account.');
    const user = existing
      ? await auth.assignRid(existing.userId, rid)
      : await auth.createUser({ username, password, rid, roles: ['ADMIN'] });
    console.log(JSON.stringify(user, null, 2));
    await auth.close();
    process.exit(0);
  }
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  const existing = auth._users.get(username);
  if (existing && !existing.roles.includes('ADMIN')) throw new Error('Existing username is not an ADMIN account.');
  const user = existing
    ? auth.assignRid(existing.userId, rid)
    : auth.createUser({ username, password, rid, roles: ['ADMIN'] });
  console.log(JSON.stringify(user, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
