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
function policy():Loose{return profile().semanticPolicy??{};}
function vocabulary():Loose{return profile().semanticVocabulary??{};}
function actionSurface(name:string):string[]{const p=profile();return Array.isArray(p.genericActionSurfaces?.[name])?p.genericActionSurfaces[name]:[];}
function regexFromTerms(terms:unknown, flags='i'):RegExp|null{const values=(Array.isArray(terms)?terms:[]).map((x:string)=>norm(x)).filter(Boolean).sort((a,b)=>b.length-a.length).map((x:string)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));return values.length?new RegExp(`(?:${values.join('|')})`,flags):null;}
function termRegex(key:string, flags='i'):RegExp|null{return regexFromTerms(vocabulary()?.[key],flags);}
function structuralAction(key:string):string|null{const value=policy()?.structuralActions?.[key];return typeof value==='string'&&value?value:null;}
function policyGroup(key:string):Set<string>{return new Set(Array.isArray(policy()?.summaryActionGroups?.[key])?policy().summaryActionGroups[key].map(String):[]);}
function protectedReportingActions():Set<string>{return new Set(Array.isArray(profile().reporting?.protectedActions)?profile().reporting.protectedActions.map(String):[]);}
function phraseScore(text:string,phrase:string):number{
  const t=norm(text),p=norm(phrase); if(!p)return 0; if(t===p)return 1; if(t.includes(p))return Math.min(.995,.90+Math.min(.08,p.split(' ').length*.02));
  const ts=new Set(t.split(' ')),ps=uniq(p.split(' ').filter(Boolean)); const overlap=ps.filter(x=>ts.has(x)).length; return overlap>=2?Math.min(.82,(overlap/ps.length)*.72):0;
}
function negatedNear(text:string,alias:string):boolean{
  const t=norm(text),a=norm(alias),i=t.indexOf(a); if(i<0)return false; const w=t.slice(Math.max(0,i-48),i); return hits(w,vocabulary()?.negation).length>0;
}
function actionCandidates(text:string):EventActionCandidate[]{
  const out:EventActionCandidate[]=[];
  for(const [action,surfaces] of Object.entries(aliases())){
    let best={score:0,alias:''}; for(const surface of surfaces??[]){const score=phraseScore(text,surface);if(score>best.score)best={score,alias:surface};}
    if(best.score>=.70) out.push({action,score:best.score,matchedAlias:best.alias,source:'ALIAS'});
  }
  const p=profile();
  const propertyTaking=actionSurface('PROPERTY_TAKING'); const returning=actionSurface('RETURN');
  const takingAction=structuralAction('propertyTaking'); const returnAction=structuralAction('return');
  const other=hits(text,p.ownership?.other).length>0; const permission=hits(text,p.context?.permission).length>0; const mistake=hits(text,p.context?.mistake).length>0;
  if(other && hits(text,propertyTaking).length && takingAction && !out.some(x=>x.action===takingAction)) out.push({action:takingAction,score:.76,matchedAlias:'STRUCTURAL:PROPERTY_TAKING+OTHER_OWNERSHIP',source:'STRUCTURAL',suppressed:permission||mistake,suppressionReason:permission?'PERMISSION_CONTEXT':mistake?'MISTAKE_CONTEXT':undefined});
  if(hits(text,returning).length && returnAction && !out.some(x=>x.action===returnAction)) out.push({action:returnAction,score:.78,matchedAlias:'STRUCTURAL:RETURN',source:'STRUCTURAL'});
  return out.sort((a,b)=>b.score-a.score);
}
function splitClauses(raw:string):Array<{text:string;connector:string|null}>{
  const p=profile(); const connectors=[...(p.sequenceConnectors??[])].sort((a:string,b:string)=>b.length-a.length).map((x:string)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  if(!connectors.length)return[{text:raw.trim(),connector:null}];
  const re=new RegExp(`\\s+(${connectors.join('|')})\\s+|[.;]+`,'gi'); const parts:Array<{text:string;connector:string|null}>=[]; let last=0,connector:string|null=null,m:RegExpExecArray|null;
  while((m=re.exec(raw))){const segment=raw.slice(last,m.index).trim(); if(segment)parts.push({text:segment,connector}); connector=(m[1]??null)?.toLowerCase?.()??null; last=re.lastIndex;}
  const tail=raw.slice(last).trim(); if(tail)parts.push({text:tail,connector}); return parts.length?parts:[{text:raw.trim(),connector:null}];
}
function leadingSubject(text:string):string|null{
  const raw=text.trim(); const pronouns=(vocabulary()?.subjectPronouns??[]).map(String).sort((a:string,b:string)=>b.length-a.length); const pronounPattern=pronouns.length?pronouns.map((x:string)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'):'';
  const pattern=pronounPattern?`^(${pronounPattern})\\b`:'^$a'; const re=new RegExp(pattern,'u'); const m=raw.match(re); if(m)return m[1]??null;
  const generic=String(vocabulary()?.genericPersonSubjectPattern??''); return generic?raw.match(new RegExp(generic,'u'))?.[0]??null;
}
function extractActor(text:string):string|null{ const suppressed=termRegex('passiveSuppressionSignals'); if(suppressed?.test(text))return null; return leadingSubject(text); }
function extractPatient(text:string):string|null{
  const passive=termRegex('passiveSuppressionSignals'); if(passive?.test(text))return leadingSubject(text);
  const verbs=vocabulary()?.reportedActiveVerbs; const stops=vocabulary()?.extractionStopWords; const verbPattern=regexFromTerms(verbs); const stopPattern=regexFromTerms(stops);
  if(!verbPattern)return null;
  const re=new RegExp(`\\b${verbPattern.source}\\s+([^,.;]+?)(?=\\s+(?:${stopPattern?.source??'$^'})\\b|$)`,'i'); const m=text.match(re); return m?.[1]?.trim()??null;
}
function extractObject(text:string):string|null{
  const verbs=vocabulary()?.objectVerbs; const stops=vocabulary()?.extractionStopWords; const verbPattern=regexFromTerms(verbs); const stopPattern=regexFromTerms(stops); if(!verbPattern)return null;
  const re=new RegExp(`\\b${verbPattern.source}\\s+([^,.;]+?)(?=\\s+(?:${stopPattern?.source??'$^'})\\b|$)`,'i'); return text.match(re)?.[1]?.trim()??null;
}
function extractOwner(text:string):string|null{
  const markers=vocabulary()?.ownerMarkers; const markerPattern=regexFromTerms(markers); const personPattern=String(vocabulary()?.ownerPersonPattern??''); const m=markerPattern&&personPattern?text.match(new RegExp(`\\b${markerPattern.source}\\s+([\\p{L}][\\p{L}'-]{0,30}|${personPattern})\\b`,'iu')):null; if(m)return m[1];
  const rightful=profile().ownership?.return; const rightfulPattern=regexFromTerms(rightful); if(rightfulPattern?.test(text))return 'RIGHTFUL_OWNER'; return null;
}
function knowledge(text:string):{state:KnowledgeState;signals:string[]}{
  const p=profile().knowledge??{}; const updated=hits(text,p.updated),believed=hits(text,p.believed),unknown=hits(text,p.unknown),known=hits(text,p.known);
  if(updated.length)return{state:'UPDATED',signals:updated}; if(believed.length)return{state:'BELIEVED',signals:believed}; if(unknown.length)return{state:'UNKNOWN',signals:unknown}; if(known.length)return{state:'KNOWN',signals:known}; return{state:'UNSPECIFIED',signals:[]};
}
function purpose(text:string):{declared:boolean;purpose:string|null;signals:string[]}{
  const p=profile(); for(const c of p.purposeConnectors??[]){const re=new RegExp(`\\b${String(c).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b\\s+(.+)$`,'i'); const m=text.match(re); if(m)return{declared:true,purpose:m[1].trim(),signals:[String(c)]};}
  const s=hits(text,vocabulary()?.intentionSignals); return{declared:s.length>0,purpose:null,signals:s};
}
function reportedContentSuppression(text:string,candidates:EventActionCandidate[]):EventActionCandidate[]{
  const p=profile().reporting??{}; const reporting=hits(text,p.verbs); if(!reporting.length)return candidates;
  const protectedActions=protectedReportingActions(); const t=norm(text); return candidates.map(c=>{
    if(protectedActions.has(c.action))return c;
    const alias=norm(c.matchedAlias.replace(/^STRUCTURAL:/,'')); const claimPos=Math.max(...reporting.map((r:string)=>t.indexOf(norm(r)))); const actionPos=alias?t.indexOf(alias):claimPos+1;
    if(actionPos>claimPos) return {...c,suppressed:true,suppressionReason:'EMBEDDED_REPORTED_CLAIM'};
    return c;
  });
}

export function parseSemanticEventGraph(text:string):SemanticEventGraph{
  const raw=String(text??'').trim(); const p=profile(); const clauses=splitClauses(raw); const nodes:SemanticEventNode[]=[]; const negativeActions=policyGroup('negative'); const positiveActions=policyGroup('positive');
  for(let i=0;i<clauses.length;i++){
    const c=clauses[i]; const ctxSignals={mistake:hits(c.text,p.context?.mistake),coercion:hits(c.text,p.context?.coercion),permission:hits(c.text,p.context?.permission),capacityLimited:hits(c.text,p.context?.capacityLimited),emergency:hits(c.text,p.context?.emergency)};
    const reportingSignals=hits(c.text,p.reporting?.verbs); const unverified=hits(c.text,p.reporting?.unverified); let candidates=actionCandidates(c.text);
    const unsupportedAccusation=structuralAction('unsupportedAccusation'); const reportedVerbs=vocabulary()?.reportedActiveVerbs??[];
    if(reportingSignals.length && unverified.length && unsupportedAccusation && reportedVerbs.some((v:string)=>has(c.text,v)) && !candidates.some(x=>x.action===unsupportedAccusation)) candidates.push({action:unsupportedAccusation,score:.82,matchedAlias:'STRUCTURAL:UNSUPPORTED_ACCUSATION',source:'STRUCTURAL'});
    candidates=candidates.map(x=>negatedNear(c.text,x.matchedAlias)?{...x,suppressed:true,suppressionReason:'NEGATED_ACTION'}:x);
    const hasPermission=ctxSignals.permission.length>0, hasMistake=ctxSignals.mistake.length>0;
    const takingAction=structuralAction('propertyTaking');
    candidates=candidates.map(x=>{
      if(!takingAction || x.action!==takingAction||x.suppressed)return x;
      const explicitTheft=hits(x.matchedAlias,vocabulary()?.explicitTakingTerms).length>0;
      if(hasPermission)return {...x,suppressed:true,suppressionReason:'PERMISSION_CONTEXT_INVALIDATES_TAKING_LABEL'};
      if(hasMistake&&!explicitTheft)return {...x,suppressed:true,suppressionReason:'MISTAKE_CONTEXT_INVALIDATES_TAKING_LABEL'};
      return x;
    });
    candidates=reportedContentSuppression(c.text,candidates);
    const active=candidates.filter(x=>!x.suppressed); const negated=Boolean(candidates.length)&&!active.length&&candidates.every(x=>x.suppressionReason==='NEGATED_ACTION');
    const contextInvalid=Boolean(candidates.length)&&!active.length&&!negated;
    const occurrence=negated?'NEGATED':contextInvalid?'CONTEXT_INVALIDATED':reportingSignals.length?'REPORTED':active.length?'ASSERTED':'UNRESOLVED';
    const intent=purpose(c.text); const k=knowledge(c.text); const returnAction=structuralAction('return'); const restoration=Boolean(returnAction&&active.some(x=>x.action===returnAction))||hits(c.text,actionSurface('RETURN')).length>0;
    const lifecycleSignals=Object.fromEntries(Object.entries(lifecycleProfile()?.signals??{}).map(([stage,surfaces])=>[stage,hits(c.text,surfaces)]).filter(([,found])=>Array.isArray(found)&&found.length>0));
    const confidence=clamp01(active.length?Math.max(...active.map(x=>x.score))*(occurrence==='REPORTED'?.72:1):candidates.length?.45:.2);
    nodes.push({id:`EV${String(i+1).padStart(2,'0')}`,sequence:i+1,text:c.text,connector:c.connector,actor:extractActor(c.text),patient:extractPatient(c.text),object:extractObject(c.text),owner:extractOwner(c.text),occurrence,knowledge:k,
      context:{mistake:ctxSignals.mistake.length>0,coercion:ctxSignals.coercion.length>0,permission:ctxSignals.permission.length>0,capacityLimited:ctxSignals.capacityLimited.length>0,emergency:ctxSignals.emergency.length>0,signals:uniq(Object.values(ctxSignals).flat())},
      intention:intent,reporting:{reported:reportingSignals.length>0,unverified:unverified.length>0,signals:uniq([...reportingSignals,...unverified])},actions:candidates,restoration,lifecycleSignals,confidence});
  }
  const contrastConnectors=new Set<string>((Array.isArray(p.contrastConnectors)?p.contrastConnectors:[]).map((x:string)=>norm(x)));
  const relations:SemanticEventGraph['relations']=[]; for(let i=1;i<nodes.length;i++)relations.push({from:nodes[i-1].id,to:nodes[i].id,type:contrastConnectors.has(norm(nodes[i].connector??''))?'CONTRAST':'SEQUENCE'});
  const negativeActionPresent=nodes.some(n=>n.actions.some(a=>!a.suppressed&&negativeActions.has(a.action)));
  const positiveActionPresent=nodes.some(n=>n.actions.some(a=>!a.suppressed&&positiveActions.has(a.action)));
  return {protocol:'SEMANTIC_EVENT_GRAPH_V1',version:'4.29.0',text:raw,nodes,relations,summary:{eventCount:nodes.length,assertedCount:nodes.filter(n=>n.occurrence==='ASSERTED').length,reportedCount:nodes.filter(n=>n.occurrence==='REPORTED').length,negatedCount:nodes.filter(n=>n.occurrence==='NEGATED').length,restorationCount:nodes.filter(n=>n.restoration).length,hasMistake:nodes.some(n=>n.context.mistake),hasCoercion:nodes.some(n=>n.context.coercion),hasPermission:nodes.some(n=>n.context.permission),hasPrincipleConflictCandidate:negativeActionPresent&&positiveActionPresent},boundary:'This graph parses described events, sequence, knowledge and context. It is a language/epistemic model only and has no normative authority.'};
}

export function semanticEventEngineSnapshot(){
  const p=profile();
  return {protocol:'SEMANTIC_EVENT_ENGINE_V1',version:'4.30.0',profileVersion:p.version??'unknown',normativeAuthority:false,features:['MULTI_EVENT_SEQUENCE','NEGATION','REPORTED_CLAIM','KNOWLEDGE_STATE','MISTAKE','COERCION','PERMISSION','RESTORATION','PRINCIPLE_CONFLICT'],invariants:{eventParserCreatesMoralDirection:false,negatedActionMayBeTreatedAsOccurred:false,reportedClaimMayBeTreatedAsEstablishedFact:false,permissionMayBeIgnoredForPropertyTaking:false,restorationErasesHistory:false},boundary:p.boundary??'Language/event parsing only.'};
}
