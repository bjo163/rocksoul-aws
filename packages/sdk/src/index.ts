import type {AnalysisResultContract,EvidenceAttachmentRequest,ReviewCreateRequest,ReviewRecord,ReviewTransitionRequest,UniverseAnalysisRequest,UniverseCommandRequest,UniverseEvaluationRequest,UniverseEvaluationResponse,UniverseObservationRequest,UniverseQueryRequest,UniverseRecord} from '@moonwitness/contracts';
export interface UniverseClientOptions{baseUrl?:string;fetchImpl?:typeof fetch;headers?:Record<string,string>;timeoutMs?:number}
export class UniverseApiError extends Error{constructor(public readonly status:number,public readonly body:unknown){super(`Universe API request failed: ${status}`);this.name='UniverseApiError';}}
export class UniverseClient{private readonly baseUrl:string;private readonly fetchImpl:typeof fetch;private readonly headers:Record<string,string>;private readonly timeoutMs:number;constructor(o:UniverseClientOptions={}){this.baseUrl=(o.baseUrl??'').replace(/\/$/,'');this.fetchImpl=o.fetchImpl??fetch;this.headers={...(o.headers??{})};this.timeoutMs=o.timeoutMs??20000}
private async request<T>(path:string,init:RequestInit):Promise<T>{const c=new AbortController();const t=setTimeout(()=>c.abort(),this.timeoutMs);try{const h={...this.headers};if(init.body&&!h['content-type'])h['content-type']='application/json';const r=await this.fetchImpl(`${this.baseUrl}${path}`,{...init,headers:h,signal:c.signal});const tx=await r.text();const b=tx?JSON.parse(tx):null;if(!r.ok)throw new UniverseApiError(r.status,b);return b as T}finally{clearTimeout(t)}}
observe(x:UniverseObservationRequest){return this.request<UniverseRecord>('/api/v1/observe',{method:'POST',body:JSON.stringify(x)})}
analyze(x:UniverseAnalysisRequest){return this.request<AnalysisResultContract>('/api/v1/analyze',{method:'POST',body:JSON.stringify(x)})}
evaluate(x:UniverseEvaluationRequest){return this.request<UniverseEvaluationResponse>('/api/v1/evaluate',{method:'POST',body:JSON.stringify(x)})}
query(x:UniverseQueryRequest){return this.request<unknown>('/api/v1/query',{method:'POST',body:JSON.stringify(x)})}
command(x:UniverseCommandRequest){return this.request<UniverseRecord>('/api/v1/command',{method:'POST',body:JSON.stringify(x)})}
resource(id:string){return this.request<UniverseRecord>(`/api/v1/resource/${encodeURIComponent(id)}`,{method:'GET'})}
attachEvidence(id:string,input:EvidenceAttachmentRequest){return this.request<{id:string;status:string;evidence:unknown;reanalysisRequired:boolean}>(`/api/v1/resource/${encodeURIComponent(id)}/evidence`,{method:'POST',body:JSON.stringify(input)})}
listEvidence(id:string){return this.request<{id:string;evidence:unknown[]}>(`/api/v1/resource/${encodeURIComponent(id)}/evidence`,{method:'GET'})}
reviews(){return this.request<{reviews:Array<{id:string;payload:ReviewRecord}>}>('/api/v1/reviews',{method:'GET'})}
createReview(input:ReviewCreateRequest){return this.request<ReviewRecord>('/api/v1/reviews',{method:'POST',body:JSON.stringify(input)})}
transitionReview(id:string,input:ReviewTransitionRequest){return this.request<ReviewRecord>(`/api/v1/reviews/${encodeURIComponent(id)}/transition`,{method:'POST',body:JSON.stringify(input)})}
}
