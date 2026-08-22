// @ts-nocheck
const intentRules=[
  [/\bverify|true|false|source|quote|kitab|ayat|hadith|bible|quran\b/i,'VERIFICATION'],
  [/\bcab|ubah|change|perbaiki|improve\b/i,'CHANGE_REQUEST'],
  [/\bproject|bangun|buat|program\b/i,'PROJECT'],
  [/\bmission|misi|goal|tujuan\b/i,'MISSION'],
  [/\basset|harta|property|rumah|tanah\b/i,'ASSET'],
  [/\bzakat|pajak|tax|jizyah|gaji|salary\b/i,'FINANCE'],
  [/\bhealth|kesehatan|dokter|rumah sakit\b/i,'HEALTH'],
  [/\beducation|pendidikan|sekolah|belajar\b/i,'EDUCATION']
];
export function orchestrate(text,{availableTypes=[]}={}) {
  const matched=intentRules.find(([re])=>re.test(text));
  const intent=matched?.[1]||'GENERAL';
  const candidates=availableTypes.filter(t=>t.toLowerCase().startsWith(intent.toLowerCase()));
  return {intent, confidence:matched?0.85:0.25, recommendedCapabilities:candidates, needsHumanReview:intent==='GENERAL'};
}
