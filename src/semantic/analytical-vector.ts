type Key = string|number;

type BuildInput = {
  primary?: Key[];
  secondary?: Key[];
  relevance?: Record<string,number>;
  mode?: 'REFLECTION'|'DEVIATION'|string;
};

export function buildAnalyticalSemanticVector({primary=[],secondary=[],relevance={},mode='REFLECTION'}:BuildInput={}) {
  const keys=[...new Set([...primary,...secondary].map(String))];
  const weights:Record<string,number>={};
  const attributes=keys.map((key,index)=>{
    const isPrimary=primary.map(String).includes(key);
    const rank=isPrimary?1:Math.max(0.15,0.85-secondary.map(String).indexOf(key)*0.12);
    const contextual=Number.isFinite(Number(relevance[key]))?Number(relevance[key]):0.7;
    const weight=Number(Math.max(0,Math.min(1,rank*contextual)).toFixed(6));
    weights[key]=weight;
    return {id:key,primary:isPrimary,weight,scaleBias:{},source:'ENGINEERING_SEMANTIC_SIGNAL'};
  });
  return {primary:primary.map(String),secondary:secondary.map(String),weights,attributes,mode,semanticReady:attributes.length>0,normativeAuthority:false};
}
