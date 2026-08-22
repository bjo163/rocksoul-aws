import { runtimeDatasetOr } from '../persistence/runtime-data.js';
import type { SemanticEventGraph,SemanticEventNode,EventActionCandidate,KnowledgeState } from './types.js';

type Loose=Record<string,any>;
const norm=(v:unknown)=>String(v??'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}.'_-]+/gu,' ').replace(/\s+/g,' ').trim();
const uniq=<T>(xs:T[])=>[...new Set(xs)];
const has=(text:string,x:string)=>norm(text).includes(norm(x));
const hits=(text:string,xs:unknown)=> (Array.isArray(xs)?xs:[]).map(String).filter(x=>has(text,x));
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));

function profile():Loose{return runtimeDatasetOr('data/events/event-language-profile.json',{}) as Loose;}
function lifecycleProfile():Loose{return runtimeDatasetOr('data/events/moral-lifecycle-language-profile.json',{}) as Loose;}
function aliases():Record<string,string[]>{return ((runtimeDatasetOr('data/ai/concept-aliases.json',{}) as Loose)?.actions??{}) as Record<string,string[]>;}
function phraseScore(text:string,phrase:string):number{
  const t=norm(text),p=norm(phrase); if(!p)return 0; if(t===p)return 1; if(t.includes(p))return Math.min(.995,.90+Math.min(.08,p.split(' ').length*.02));
  const ts=new Set(t.split(' ')),ps=uniq(p.split(' ').filter(Boolean)); const overlap=ps.filter(x=>ts.has(x)).length; return overlap>=2?Math.min(.82,(overlap/ps.length)*.72):0;
}
function negatedNear(text:string,alias:string):boolean{
  const t=norm(text),a=norm(alias),i=t.indexOf(a); if(i<0)return false; const w=t.slice(Math.max(0,i-32),i); return /(^|\s)(tidak|bukan|jangan|belum|tak)(\s|$)/.test(w);
}
function actionCandidates(text:string):EventActionCandidate[]{
  const out:EventActionCandidate[]=[];
  for(const [action,surfaces] of Object.entries(aliases())){
    let best={score:0,alias:''}; for(const surface of surfaces??[]){const score=phraseScore(text,surface);if(score>best.score)best={score,alias:surface};}
    if(best.score>=.70) out.push({action,score:best.score,matchedAlias:best.alias,source:'ALIAS'});
  }
  const p=profile(); const generic=p.genericActionSurfaces??{};
  const other=hits(text,p.ownership?.other).length>0; const permission=hits(text,p.context?.permission).length>0; const mistake=hits(text,p.context?.mistake).length>0;
  if(other && hits(text,generic.PROPERTY_TAKING).length && !out.some(x=>x.action==='THEFT')) out.push({action:'THEFT',score:.76,matchedAlias:'STRUCTURAL:PROPERTY_TAKING+OTHER_OWNERSHIP',source:'STRUCTURAL',suppressed:permission||mistake,suppressionReason:permission?'PERMISSION_CONTEXT':mistake?'MISTAKE_CONTEXT':undefined});
  if(hits(text,generic.RETURN).length && !out.some(x=>x.action==='RESTITUTION')) out.push({action:'RESTITUTION',score:.78,matchedAlias:'STRUCTURAL:RETURN',source:'STRUCTURAL'});
  return out.sort((a,b)=>b.score-a.score);
}
function splitClauses(raw:string):Array<{text:string;connector:string|null}>{
  const p=profile(); const connectors=[...(p.sequenceConnectors??[])].sort((a:string,b:string)=>b.length-a.length).map((x:string)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const re=new RegExp(`\\s+(${connectors.join('|')})\\s+|[.;]+`,'gi'); const parts:Array<{text:string;connector:string|null}>=[]; let last=0,connector:string|null=null,m:RegExpExecArray|null;
  while((m=re.exec(raw))){const segment=raw.slice(last,m.index).trim(); if(segment)parts.push({text:segment,connector}); connector=(m[1]??null)?.toLowerCase?.()??null; last=re.lastIndex;}
  const tail=raw.slice(last).trim(); if(tail)parts.push({text:tail,connector}); return parts.length?parts:[{text:raw.trim(),connector:null}];
}
function leadingSubject(text:string):string|null{ const raw=text.trim(); const m=raw.match(/^(saya|aku|kami|kita|dia|ia|mereka|seseorang|seorang\s+[\p{L}'-]+|[A-Z][\p{L}'-]{1,30})\b/u); return m?.[1]??null; }
function extractActor(text:string):string|null{ if(/\b(dituduh|dilaporkan|dipaksa)\b/i.test(text)) return null; return leadingSubject(text); }
function extractPatient(text:string):string|null{ if(/\b(dituduh|dilaporkan)\b/i.test(text)) return leadingSubject(text); const m=text.match(/\b(?:menuduh|melaporkan)\s+([^,.;]+?)(?=\s+(?:tanpa|karena|agar|supaya|demi|lalu|kemudian|tetapi|namun)\b|$)/i); return m?.[1]?.trim()??null; }

function extractObject(text:string):string|null{
  const m=text.match(/\b(?:mengambil|ambil|mencuri|mengembalikan|memulangkan|memberi|membantu|menolong|menggelapkan)\s+([^,.;]+?)(?=\s+(?:karena|agar|supaya|demi|dengan|kepada|lalu|kemudian|tetapi|namun)\b|$)/i); return m?.[1]?.trim()??null;
}
function extractOwner(text:string):string|null{
  const m=text.match(/\b(?:milik|punya)\s+([\p{L}][\p{L}'-]{0,30}|orang(?: lain)?)\b/iu); if(m)return m[1]; if(/kepada pemilik(?:nya)?/i.test(text))return 'RIGHTFUL_OWNER'; return null;
}
function knowledge(text:string):{state:KnowledgeState;signals:string[]}{
  const p=profile().knowledge??{}; const updated=hits(text,p.updated),believed=hits(text,p.believed),unknown=hits(text,p.unknown),known=hits(text,p.known);
  if(updated.length)return{state:'UPDATED',signals:updated}; if(believed.length)return{state:'BELIEVED',signals:believed}; if(unknown.length)return{state:'UNKNOWN',signals:unknown}; if(known.length)return{state:'KNOWN',signals:known}; return{state:'UNSPECIFIED',signals:[]};
}
function purpose(text:string):{declared:boolean;purpose:string|null;signals:string[]}{
  const p=profile(); for(const c of p.purposeConnectors??[]){const re=new RegExp(`\\b${String(c)}\\b\\s+(.+)$`,'i'); const m=text.match(re); if(m)return{declared:true,purpose:m[1].trim(),signals:[String(c)]};}
  const s=hits(text,['sengaja','berniat','bermaksud']); return{declared:s.length>0,purpose:null,signals:s};
}
function reportedContentSuppression(text:string,candidates:EventActionCandidate[]):EventActionCandidate[]{
  const p=profile().reporting??{}; const reporting=hits(text,p.verbs); if(!reporting.length)return candidates;
  const t=norm(text); return candidates.map(c=>{
    if(c.action==='DEFAMATION'||c.action==='VERIFY_CLAIM')return c;
    const alias=norm(c.matchedAlias.replace(/^STRUCTURAL:/,'')); const claimPos=Math.max(...reporting.map((r:string)=>t.indexOf(norm(r)))); const actionPos=alias?t.indexOf(alias):claimPos+1;
    if(actionPos>claimPos) return {...c,suppressed:true,suppressionReason:'EMBEDDED_REPORTED_CLAIM'};
    return c;
  });
}

export function parseSemanticEventGraph(text:string):SemanticEventGraph{
  const raw=String(text??'').trim(); const p=profile(); const clauses=splitClauses(raw); const nodes:SemanticEventNode[]=[];
  for(let i=0;i<clauses.length;i++){
    const c=clauses[i]; const ctxSignals={mistake:hits(c.text,p.context?.mistake),coercion:hits(c.text,p.context?.coercion),permission:hits(c.text,p.context?.permission),capacityLimited:hits(c.text,p.context?.capacityLimited),emergency:hits(c.text,p.context?.emergency)};
    const reportingSignals=hits(c.text,p.reporting?.verbs); const unverified=hits(c.text,p.reporting?.unverified); let candidates=actionCandidates(c.text);
    if(reportingSignals.some((x:string)=>['menuduh','dituduh'].includes(norm(x))) && unverified.length && !candidates.some(x=>x.action==='DEFAMATION')) candidates.push({action:'DEFAMATION',score:.82,matchedAlias:'STRUCTURAL:UNSUPPORTED_ACCUSATION',source:'STRUCTURAL'});
    candidates=candidates.map(x=>negatedNear(c.text,x.matchedAlias)?{...x,suppressed:true,suppressionReason:'NEGATED_ACTION'}:x);
    const hasPermission=ctxSignals.permission.length>0, hasMistake=ctxSignals.mistake.length>0;
    candidates=candidates.map(x=>{
      if(x.action!=='THEFT'||x.suppressed)return x;
      const explicitTheft=/\b(mencuri|curi)\b/.test(norm(x.matchedAlias));
      if(hasPermission)return {...x,suppressed:true,suppressionReason:'PERMISSION_CONTEXT_INVALIDATES_THEFT_LABEL'};
      if(hasMistake&&!explicitTheft)return {...x,suppressed:true,suppressionReason:'MISTAKE_CONTEXT_INVALIDATES_THEFT_LABEL'};
      return x;
    });
    candidates=reportedContentSuppression(c.text,candidates);
    const active=candidates.filter(x=>!x.suppressed); const negated=Boolean(candidates.length)&&!active.length&&candidates.every(x=>x.suppressionReason==='NEGATED_ACTION');
    const contextInvalid=Boolean(candidates.length)&&!active.length&&!negated;
    const occurrence=negated?'NEGATED':contextInvalid?'CONTEXT_INVALIDATED':reportingSignals.length?'REPORTED':active.length?'ASSERTED':'UNRESOLVED';
    const intent=purpose(c.text); const k=knowledge(c.text); const restoration=active.some(x=>x.action==='RESTITUTION')||hits(c.text,p.genericActionSurfaces?.RETURN).length>0;
    const lifecycleSignals=Object.fromEntries(Object.entries(lifecycleProfile()?.signals??{}).map(([stage,surfaces])=>[stage,hits(c.text,surfaces)]).filter(([,found])=>Array.isArray(found)&&found.length>0));
    const confidence=clamp01(active.length?Math.max(...active.map(x=>x.score))*(occurrence==='REPORTED'?.72:1):candidates.length?.45:.2);
    nodes.push({id:`EV${String(i+1).padStart(2,'0')}`,sequence:i+1,text:c.text,connector:c.connector,actor:extractActor(c.text),patient:extractPatient(c.text),object:extractObject(c.text),owner:extractOwner(c.text),occurrence,knowledge:k,
      context:{mistake:ctxSignals.mistake.length>0,coercion:ctxSignals.coercion.length>0,permission:ctxSignals.permission.length>0,capacityLimited:ctxSignals.capacityLimited.length>0,emergency:ctxSignals.emergency.length>0,signals:uniq(Object.values(ctxSignals).flat())},
      intention:intent,reporting:{reported:reportingSignals.length>0,unverified:unverified.length>0,signals:uniq([...reportingSignals,...unverified])},actions:candidates,restoration,lifecycleSignals,confidence});
  }
  const relations:SemanticEventGraph['relations']=[]; for(let i=1;i<nodes.length;i++)relations.push({from:nodes[i-1].id,to:nodes[i].id,type:['tetapi','namun'].includes(nodes[i].connector??'')?'CONTRAST':'SEQUENCE'});
  const negativeActionPresent=nodes.some(n=>n.actions.some(a=>!a.suppressed&&['THEFT','LYING','CORRUPTION','DEFAMATION'].includes(a.action)));
  const positiveActionPresent=nodes.some(n=>n.actions.some(a=>!a.suppressed&&['RESTITUTION','HELPING_GOOD','CHARITY','VERIFY_CLAIM','FAIR_TRADE','PROTECTION_LIFE'].includes(a.action)));
  return {protocol:'SEMANTIC_EVENT_GRAPH_V1',version:'4.29.0',text:raw,nodes,relations,summary:{eventCount:nodes.length,assertedCount:nodes.filter(n=>n.occurrence==='ASSERTED').length,reportedCount:nodes.filter(n=>n.occurrence==='REPORTED').length,negatedCount:nodes.filter(n=>n.occurrence==='NEGATED').length,restorationCount:nodes.filter(n=>n.restoration).length,hasMistake:nodes.some(n=>n.context.mistake),hasCoercion:nodes.some(n=>n.context.coercion),hasPermission:nodes.some(n=>n.context.permission),hasPrincipleConflictCandidate:negativeActionPresent&&positiveActionPresent},boundary:'This graph parses described events, sequence, knowledge and context. It is a language/epistemic model only and has no normative authority.'};
}

export function semanticEventEngineSnapshot(){
  const p=profile();
  return {protocol:'SEMANTIC_EVENT_ENGINE_V1',version:'4.29.0',profileVersion:p.version??'unknown',normativeAuthority:false,features:['MULTI_EVENT_SEQUENCE','NEGATION','REPORTED_CLAIM','KNOWLEDGE_STATE','MISTAKE','COERCION','PERMISSION','RESTORATION','PRINCIPLE_CONFLICT'],invariants:{eventParserCreatesMoralDirection:false,negatedActionMayBeTreatedAsOccurred:false,reportedClaimMayBeTreatedAsEstablishedFact:false,permissionMayBeIgnoredForPropertyTaking:false,restorationErasesHistory:false},boundary:p.boundary??'Language/event parsing only.'};
}
