import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { hashPassword, verifyPassword, type AuthService, type AuthUser, type CreateUserInput, type PublicUser } from './auth.js';

interface PgResult { rows: any[] }
interface PgClient { query(sql:string, params?:unknown[]):Promise<PgResult>; release():void }
interface PgPool { query(sql:string, params?:unknown[]):Promise<PgResult>; connect():Promise<PgClient>; end():Promise<void>; }
const require = createRequire(import.meta.url);
function getPool(): PgPool { const pg=require('pg'); return new pg.Pool(); }
function b64(s:string|Buffer){return (typeof s==='string'?Buffer.from(s):s).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
export class PostgresAuthService {
  private readonly pool: PgPool;
  private readonly users = new Map<string, AuthUser>();
  private readonly revoked = new Set<string>();
  private readonly sessions = new Map<string,{lastSeen:number}>();
  private readonly ttlMs: number;
  private readonly secret: string;
  private constructor(ttlMs:number, secret:string){ this.pool=getPool(); this.ttlMs=ttlMs; this.secret=secret; }
  static async create(options:{sessionTtlMs?:number; jwtSecret:string}): Promise<PostgresAuthService> {
    const service=new PostgresAuthService(options.sessionTtlMs ?? 8*60*60*1000, options.jwtSecret);
    const rows=await service.pool.query('SELECT * FROM auth_users ORDER BY username');
    for(const r of rows.rows) service.users.set(r.username,{userId:r.user_id,username:r.username,passwordHash:r.password_hash,rid:r.rid??null,roles:Array.isArray(r.roles_json)?r.roles_json:[],active:r.active===true,createdAt:new Date(r.created_at).toISOString()});
    const revoked=await service.pool.query('SELECT token_hash FROM auth_revoked_tokens');
    for(const r of revoked.rows) service.revoked.add(r.token_hash);
    return service;
  }
  private publicUser(u:AuthUser):PublicUser{const s=this.sessions.get(u.userId);return {userId:u.userId,username:u.username,rid:u.rid,roles:[...u.roles],active:u.active,lastSeen:s?new Date(s.lastSeen).toISOString():undefined,isOnline:s?Date.now()-s.lastSeen<5*60*1000:false};}
  private sign(payload:any){const h=b64(JSON.stringify({alg:'HS256',typ:'JWT'}));const p=b64(JSON.stringify({...payload,exp:Math.floor((Date.now()+this.ttlMs)/1000)}));const sig=b64(crypto.createHmac('sha256',this.secret).update(`${h}.${p}`).digest());return `${h}.${p}.${sig}`;}
  private decode(token:string){if(!token||this.revoked.has(crypto.createHash('sha256').update(token).digest('hex')))return null;const [h,p,s]=token.split('.');if(!h||!p||!s)return null;const expected=b64(crypto.createHmac('sha256',this.secret).update(`${h}.${p}`).digest());if(expected!==s)return null;try{const payload=JSON.parse(Buffer.from(p,'base64').toString());if(payload.exp&&payload.exp*1000<Date.now())return null;return payload;}catch{return null;}}
  async createUser(input:CreateUserInput):Promise<PublicUser>{if(!input.username||!input.password)throw new Error('username and password are required');if(this.users.has(input.username))throw new Error('user already exists');const user:AuthUser={userId:`USR-${crypto.randomUUID()}`,username:input.username,passwordHash:hashPassword(input.password),rid:input.rid??null,roles:[...(input.roles??['USER'])],active:true,createdAt:new Date().toISOString()};await this.pool.query('INSERT INTO auth_users(user_id,username,password_hash,rid,roles_json,active,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.userId,user.username,user.passwordHash,user.rid,JSON.stringify(user.roles),true,user.createdAt]);this.users.set(user.username,user);return this.publicUser(user);}
  login(username:string,password:string){const u=this.users.get(username);if(!u||!u.active||!verifyPassword(password,u.passwordHash))return null;this.sessions.set(u.userId,{lastSeen:Date.now()});return {token:this.sign({userId:u.userId,username:u.username,roles:u.roles,rid:u.rid}),expiresAt:new Date(Date.now()+this.ttlMs).toISOString(),user:this.publicUser(u)};}
  authenticate(token:string){const p=this.decode(token);if(!p?.userId)return null;const u=[...this.users.values()].find(x=>x.userId===p.userId);if(!u||!u.active)return null;this.sessions.set(u.userId,{lastSeen:Date.now()});return this.publicUser(u);}
  async logout(token:string){if(!token)return true;this.revoked.add(crypto.createHash('sha256').update(token).digest('hex'));await this.pool.query('INSERT INTO auth_revoked_tokens(token_hash,revoked_at) VALUES($1,$2) ON CONFLICT(token_hash) DO NOTHING',[crypto.createHash('sha256').update(token).digest('hex'),new Date().toISOString()]);return true;}
  getOnlineUsers(){return [...this.users.values()].map(u=>this.publicUser(u)).filter(u=>u.isOnline);}
  async close(){ await this.pool.end(); }
}
