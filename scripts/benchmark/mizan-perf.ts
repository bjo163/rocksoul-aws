import { performance } from 'node:perf_hooks';
import { buildAiAnalysis } from '../../src/ai/general-analyzer.js';

function formatMemoryUsage(data: NodeJS.MemoryUsage) {
  return `${Math.round(data.heapUsed / 1024 / 1024 * 100) / 100} MB`;
}

async function runBenchmark() {
  console.log('========================================================');
  console.log('         Mizan Engine (Revelation Pattern) Benchmark    ');
  console.log('========================================================\n');

  const prompts = [
    'Q 2:255 menjelaskan tentang kekuasaan Allah secara mutlak.',
    'Pemerintah baru saja menerbitkan undang-undang tentang pajak. Q 4:29 jangan saling memakan harta sesama.',
    'Sengketa lahan di desa menyebabkan kerusakan ekosistem dan memicu konflik keluarga (Q 2:205).',
    'Menurut Q 11:85 kita harus menakar timbangan dengan jujur, jangan berbuat korupsi.',
    'Orang itu sering merokok di tempat umum dan mengganggu kesehatan orang lain.'
  ];

  const totalRuns = 10000;
  
  console.log(`Starting Sequential Benchmark (${totalRuns} iterations)...`);
  
  const initialMemory = process.memoryUsage();
  
  const start = performance.now();
  
  for (let i = 0; i < totalRuns; i++) {
    const text = prompts[i % prompts.length];
    // We pass a dummy search function to simulate graph context injection
    const options = {
      sourceGraph: {
        search: () => [] // Simulate 0 results from DB for baseline CPU measuring
      }
    };
    buildAiAnalysis(text, options as any);
  }
  
  const end = performance.now();
  const finalMemory = process.memoryUsage();
  
  const durationMs = end - start;
  const opsPerSec = Math.round((totalRuns / durationMs) * 1000);
  
  console.log(`\n--- Results (Sequential) ---`);
  console.log(`Total Iterations : ${totalRuns}`);
  console.log(`Total Duration   : ${durationMs.toFixed(2)} ms`);
  console.log(`Average Speed    : ${(durationMs / totalRuns).toFixed(4)} ms per operation`);
  console.log(`Throughput       : ${opsPerSec.toLocaleString()} operations / sec`);
  
  console.log(`\n--- Memory Usage ---`);
  console.log(`Heap Used (Start): ${formatMemoryUsage(initialMemory)}`);
  console.log(`Heap Used (End)  : ${formatMemoryUsage(finalMemory)}`);
  console.log(`Delta Heap       : ${formatMemoryUsage({ heapUsed: finalMemory.heapUsed - initialMemory.heapUsed } as any)}`);
  
  console.log('\nBenchmarking Complete.\n');
}

runBenchmark().catch(console.error);
