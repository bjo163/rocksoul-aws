import { getDemoScenario, type DemoScenarioName } from '../packages/demo-scenarios/src/index.js';

const rawName = process.argv.slice(2).find((value) => value.startsWith('--scenario='));
const scenarioName = (rawName?.slice('--scenario='.length) ?? 'basic') as DemoScenarioName;
const scenario = getDemoScenario(scenarioName);

console.log(`Demo scenario: ${scenario.name}`);
console.log(scenario.description);
console.log(`Entities: ${scenario.entities.length}`);
console.log(`Commands: ${scenario.commands.length}`);

for (const command of scenario.commands) {
  console.log(JSON.stringify(command));
}

console.log('Demo mode is intentionally separate from db:install.');
