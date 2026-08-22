import readline from 'node:readline';
import { analyzeTextAutomatic } from '../ai/analyzer.js';
import { formatLawResult } from '../ai/format-result.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('MoonWitness AI Semantic Analyzer');
console.log('Natural language input is analyzed through the registry-driven semantic engine; no keyword rule is passed from the CLI.');
console.log('Ketik exit untuk keluar.');

const ask = () => rl.question('> ', async (q) => {
  if (q.trim().toLowerCase() === 'exit') return rl.close();
  try {
    const result = await analyzeTextAutomatic(q, { jurisdiction: 'ID' });
    console.log(formatLawResult(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
  console.log('---');
  ask();
});

ask();
