const checks = [
  ['@moonwitness/contracts', 'assertApiResponseContract'],
  ['@moonwitness/persistence', 'createPersistence'],
  ['@moonwitness/witness', 'createWitnessIdentity'],
  ['@moonwitness/jobs', 'PersistentJobQueue'],
  ['@moonwitness/temporal-engine', 'makeTimeEvent'],
  ['@moonwitness/semantic-engine', 'buildAnalyticalSemanticVector'],
  ['@moonwitness/mizan-engine', 'evaluateMizan'],
  ['@moonwitness/explanation-engine', 'explainLegalResult'],
  ['@moonwitness/tse-engine', 'calculateTemporalState'],
  ['@moonwitness/aws-engine', 'createAwsEngine'],
  ['@moonwitness/cosmic-engine', 'createCosmicEngine'],
  ['@moonwitness/orchestrator', 'runAnalysisWorkflow'],
  ['@moonwitness/sdk', 'UniverseClient'],
];

for (const [packageName, exportName] of checks) {
  const module = await import(packageName);
  if (!(exportName in module)) throw new Error(`${packageName} does not export ${exportName}`);
}

console.log(`Runtime package smoke passed (${checks.length} packages).`);
