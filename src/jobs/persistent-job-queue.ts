import { PersistenceClient } from '../../packages/persistence/src/client.js';

export interface PersistedJob<T = unknown> { id: string; type: string; payload: T; status: 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'; createdAt: string; updatedAt: string; error?: string }

export class PersistentJobQueue<T = unknown> {
  private readonly persistence: PersistenceClient;
  private readonly entities;
  constructor(dataDir: string) { this.persistence = new PersistenceClient({ driver: 'file', fileDir: dataDir }); this.entities = this.persistence.entities(); }
  async enqueue(type: string, payload: T): Promise<PersistedJob<T>> { const now=new Date().toISOString(); const job={id:`JOB-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type,payload,status:'QUEUED' as const,createdAt:now,updatedAt:now}; await this.entities.put({id:job.id,type:'JOB',payload:job}); return job; }
async get(id:string):Promise<PersistedJob<T>|null>{const e=await this.entities.get(id); return e?.type==='JOB'?e.payload as unknown as PersistedJob<T>:null;}
  async mark(id:string,status:PersistedJob['status'],error?:string):Promise<PersistedJob<T>>{const job=await this.get(id);if(!job)throw new Error('JOB_NOT_FOUND');const next={...job,status,updatedAt:new Date().toISOString(),...(error?{error}: {})};await this.entities.put({id,type:'JOB',version:(await this.entities.get(id))?.version??1,payload:next});return next;}
  async close(){await this.persistence.close();}
}
