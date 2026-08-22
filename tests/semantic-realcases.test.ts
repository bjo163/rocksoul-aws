import { createDefaultSemanticProvider } from '../src/ai/provider.js';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

const cases = [
  ['RC01', 'Seorang pegawai menerima suap untuk meloloskan izin.'],
  ['RC02', 'Bendahara menggelapkan dana kantor untuk kepentingan pribadi.'],
  ['RC03', 'Saya menemukan dompet orang lain lalu mengembalikannya kepada pemilik.'],
  ['RC04', 'Saya sengaja berbohong kepada pelanggan tentang kondisi barang.'],
  ['RC05', 'Seseorang menuduh tetangganya tanpa bukti.'],
  ['RC06', 'Saya mengecek sumber sebelum membagikan klaim.'],
  ['RC07', 'Seorang pegawai memakai anggaran publik untuk biaya pribadinya.'],
  ['RC08', 'Saya rutin merokok setelah bekerja.'],
  ['RC09', 'Seorang siswa membantu temannya belajar tanpa meminta imbalan.'],
  ['RC10', 'Ia mengambil barang milik orang lain dan menyimpannya.']
];
const provider = createDefaultSemanticProvider(process.cwd());
for (const [id, text] of cases) {
  const obs = await provider.analyze(text);
  const result = await buildAiAnalysis(text, { semanticObservation: obs });
  console.log(JSON.stringify({
    id, text, action: obs.action, status: obs.status, confidence: obs.confidence,
    contextConfidence: obs.contextConfidence,
    candidates: obs.actionCandidates?.slice(0,3),
    rejected: obs.composition?.rejectedCandidates,
    outcome: obs.composition?.outcome,
    recurrence: obs.timeFactor?.recurrence,
    risk: result.mizan?.assessment?.risk ?? null,
    band: result.mizan?.assessment?.band ?? null,
    accountability: result.mizan?.assessment?.accountabilityScore ?? null,
    uncertainty: result.confidence?.uncertainty ?? null,
    needsHumanReview: result.capability?.needsHumanReview ?? null
  }));
}
