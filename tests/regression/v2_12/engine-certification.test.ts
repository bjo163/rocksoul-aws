// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const engineDir = fs.existsSync(path.join(root, 'dist', 'src', 'engines')) ? path.join(root, 'dist', 'src', 'engines') : path.join(root, 'src', 'engines');
const files = fs.readdirSync(engineDir).filter(f => f.endsWith('.js')).sort();

const amal = {
  amalId: 'AMAL_CERT_001',
  ruhId: 'RUH_CERT_001',
  action: 'CORRUPTION',
  intention: 'HARMFUL',
  context: { jurisdiction: 'ID', lawfulStatus: 'UNASSESSED' },
  factors: { physicalImpact: 0.2, financialImpact: 0.8, socialImpact: 0.9, systemicImpact: 0.9, authority: 0.8, responsibility: 0.8, repair: true },
  positive: false,
  evidence: [{ type: 'DOCUMENT' }]
};

const contracts = {
  'accountability.ts': async m => m.accountabilityProfile(amal),
  'akhirzaman.ts': async m => m.worldState('AKHIRZAMAN'),
  'amal.ts': async m => m.createAmal({ action:'TEST', intention:'TEST' }, 'RUH_CERT_001'),
  'amanah.ts': async m => m.amanahProfile({ context:{ amanah:{ present:true, kept:true } } }),
  'barzakh.ts': async m => m.barzakhState({ ruhId:'RUH_CERT_001', state:'BARZAKH' }),
  'body-witness.ts': async m => m.bodyWitnessProfile(amal),
  'community.ts': async m => m.communityProfile({ context:{ community:{ level:'COMMUNITY' } } }),
  'creation.ts': async m => m.creationModel(),
  'dua.ts': async m => m.duaProfile({ action:'DUA', context:{ duaRequest:'TEST' } }),
  'eschatology.ts': async m => m.destinationModel({ state:'DUNYA', mizanScore:0 }),
  'final-judgment.ts': async m => m.finalGate({ state:'FINAL_STATE' }),
  'fitnah.ts': async m => m.fitnahProfile({ context:{ fitnah:{ active:true,type:'TEST' } } }),
  'fitrah.ts': async m => m.fitrahProfile({ state:'DUNYA', guidanceExposure:0.5, resistance:0.2 }),
  'genesis.ts': async m => m.validateGenesis({ sourceId:'S01', gatewayId:'G01', processId:'P01' }),
  'geography.ts': async m => m.getCountry('ID'),
  'gnostic-boundary.ts': async m => m.divineKnowledgeBoundary(),
  'governance.ts': async m => m.governanceModel(),
  'guidance.ts': async m => m.guidanceProfile({ context:{ guidanceSource:'QURAN', guidanceResponse:'TEST', guidanceConfidence:0.9 } }),
  'harm.ts': async m => m.harmProfile(amal),
  'heart.ts': async m => m.heartProfile(amal),
  'hisab.ts': async m => m.hisabProfile({ amal, semantic:{R:1,G:1,B:1,L:1}, rights:{}, wealth:{}, harm:{}, accountability:{}, tawbah:{}, lawlessness:{} }),
  'human-ontology.ts': async m => m.humanOntology({ ruhId:'RUH_CERT_001' }),
  'intercession.ts': async m => m.intercessionBoundary(),
  'jahannam.ts': async m => m.jahannamProfile(),
  'jannah.ts': async m => m.jannahProfile(),
  'khilafah.ts': async m => m.createKhilafahModel(),
  'knowledge-boundary.ts': async m => m.knowledgeBoundary('x','OBSERVED'),
  'law.ts': async m => m.lawProfile(amal),
  'lawlessness.ts': async m => m.lawlessnessProfile(amal),
  'ledger.ts': async m => { const l=new m.Ledger(); l.append({type:'TEST'}); assert.equal(l.verify(),true); return l; },
  'legacy.ts': async m => m.legacyProfile(amal),
  'mahshar.ts': async m => m.mahsharProfile({ ruhId:'RUH_CERT_001', ledgerCount:1 }),
  'mercy.ts': async m => m.mercyBoundary(),
  'mission.ts': async m => m.missionProfile({ context:{ mission:{ propheticModel:true, profile:'TEST' } } }),
  'mizan.ts': async m => { const sv={primary:['SIG-A'],secondary:['SIG-B'],weights:{'SIG-A':0.9,'SIG-B':0.6},attributes:[],mode:'DEVIATION'}; const r=m.evaluateMizan({ semantic:{R:0.5,G:0.5,B:0.5,L:0.5}, semanticVector:sv, factors:{impact:0.8,responsibility:0.8,systemicity:0.9,mode:'DEVIATION'}, scale:{scope:'NATION',reach:'R7',depth:'D6',duration:'LONG',reversibility:'HARD_TO_REVERSE',power:'NATIONAL_OFFICIAL',exposure:'NATIONAL',systemicity:'NATIONAL_SYSTEM',environment:'NATIONAL_ENVIRONMENT',futureImpact:'HIGH',evidence:'VERIFIED',dignity:'HIGH',socialImpact:'HIGH',irreversibility:'HIGH',risk:'HIGH'} }); assert.ok(r.assessment.accountabilityScore >= 0); assert.ok(r.xp.modelOnly === true); return r; },
  'observer.ts': async m => m.observeWorld({ worldState:'DUNYA', subjectCount:1 }),
  'prophetic.ts': async m => m.createScenario({ prophetId:'ISA', worldState:'AKHIRZAMAN', sourceProfile:'QURAN' }),
  'qadr-responsibility.ts': async m => m.responsibilityProfile(amal),
  'reputation.ts': async m => m.reputationProfile({ context:{ reputation:{ public:true, truthStatus:'SUPPORTED' } } }),
  'resurrection.ts': async m => m.resurrectionEvent(),
  'rights.ts': async m => m.rightsProfile(amal),
  'sirat.ts': async m => m.siratProfile({ state:'NOT_REACHED' }),
  'source-authority.ts': async m => m.sourceAuthorityProfile([{ authorityLevel:'PRIMARY' }]),
  'space.ts': async m => m.createSpaceEvent({ regionId:'EARTH' }),
  'tawbah.ts': async m => m.tawbahProfile({ factors:{ awareness:true, regret:true, stopped:true, returned:true, repair:true } }),
  'time.ts': async m => m.makeTimeEvent({ temporalScope:'INSTANT' }),
  'trial.ts': async m => m.trialProfile({ context:{ trial:{ active:true,type:'TEST',intensity:0.4 } } }),
  'wealth.ts': async m => m.wealthProfile(amal),
  'witness.ts': async m => m.witnessProfile({ amal, evidence:amal.evidence }),
  'world.ts': async m => m.createWorld({ state:'DUNYA', countryId:'ID' }),
  'worship.ts': async m => m.worshipProfile({ action:'SALAT' }),
  'xp.ts': async m => { const sv={primary:['SIG-A'],secondary:['SIG-B'],weights:{'SIG-A':0.9,'SIG-B':0.6},attributes:[],mode:'REFLECTION'}; return m.calculateXp({semanticVector:sv, scale:{scope:'SELF',reach:'R1',depth:'D1',duration:'SHORT',reversibility:'FULLY_REVERSIBLE'}, factors:{quality:0.9,intent:0.9}}); }
};

const certifiableFiles = files.filter(file => typeof contracts[file.replace(/\.js$/, '.ts')] === 'function');
assert.equal(certifiableFiles.length, Object.keys(contracts).length, 'Every declared certification contract must map to a compiled engine');

for (const file of certifiableFiles) {
  test(`CERTIFIED ${file}`, async () => {
    const modulePath = path.join(engineDir, file);
    const mod = await import(modulePath + `?cert=${Date.now()}_${Math.random()}`);
    assert.ok(Object.keys(mod).length > 0, 'engine must export at least one symbol');
    const contractKey = file.replace(/\.js$/, '.ts');
    assert.equal(typeof contracts[contractKey], 'function', `missing certification contract for ${contractKey}`);
    const output = await contracts[contractKey](mod);
    assert.notEqual(output, undefined, 'contract output must be defined');
  });
}
