import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function tc(name, method, route, requiresAuth, expectedStatus, options = {}) {
  return { name, method, route, requiresAuth, expectedStatus, ...options };
}

const semanticCases = [];

const themes = [
  {
    name: 'Korupsi',
    type: 'JUSTICE.CASE',
    events: ['PENYELIDIKAN', 'PENYITAAN_ASET', 'SIDANG_TIPIKOR', 'VONIS'],
    payload: (i) => ({ deskripsi: `Korupsi dana proyek infrastruktur tahap ${i}`, kerugianNegara: 1000000000 * (i + 1), wilayah: 'Jakarta' })
  },
  {
    name: 'Merokok',
    type: 'CAB.INCIDENT',
    events: ['TEGURAN', 'DENDA_ADMINISTRATIF'],
    payload: (i) => ({ deskripsi: `Pelanggaran merokok di area dilarang RSUD ${i}`, denda: 500000, lokasi: 'Rumah Sakit' })
  },
  {
    name: 'Narkoba',
    type: 'JUSTICE.CASE',
    events: ['PENANGKAPAN', 'UJI_LAB', 'REHABILITASI_ATAU_PENJARA'],
    payload: (i) => ({ deskripsi: `Penyalahgunaan zat terlarang golongan ${ (i % 3) + 1 }`, beratBarangBuktiGram: i * 10, lokasi: 'Diskotik' })
  },
  {
    name: 'Sengketa',
    type: 'CIVIL.CASE',
    events: ['MEDIASI', 'GUGATAN_PERDATA', 'PUTUSAN_PENGADILAN'],
    payload: (i) => ({ deskripsi: `Sengketa batas tanah keluarga ${i} vs tetangga`, luasM2: 500 + i * 50, lokasi: 'Desa Agraria' })
  },
  {
    name: 'Lalin',
    type: 'TRAFFIC.VIOLATION',
    events: ['E_TILANG', 'BAYAR_DENDA'],
    payload: (i) => ({ deskripsi: `Menerobos lampu merah di persimpangan ${i}`, platNomor: `B ${1000 + i} ABC`, denda: 250000 })
  }
];

let globalIdx = 0;

for (const theme of themes) {
  for (let i = 0; i < 50; i++) {
    const caseId = `SEMANTIC-${theme.name.toUpperCase()}-${i}`;
    const actorId = `ACTOR-${theme.name.toUpperCase()}-${i}`;
    
    // 1. Create the Case Entity (1 test)
    semanticCases.push(tc(
      `Semantic [${theme.name}] - Create Case ${i}`, 
      'POST', '/api/v1/command', true, 201, 
      { 
        headers: { 'idempotency-key': `sem-create-${globalIdx}` }, 
        body: { 
          command: 'CREATE_ENTITY', 
          target: caseId, 
          payload: { type: theme.type, payload: theme.payload(i) } 
        } 
      }
    ));

    // 2. Assign Actor Relation (1 test)
    semanticCases.push(tc(
      `Semantic [${theme.name}] - Link Actor ${i}`, 
      'POST', '/api/v1/command', true, 201, 
      { 
        headers: { 'idempotency-key': `sem-rel-${globalIdx}` }, 
        body: { 
          command: 'CREATE_RELATION', 
          target: caseId, 
          payload: { relationType: 'INVOLVES', toId: actorId, payload: { peran: 'TERLAPOR' } } 
        } 
      }
    ));

    // 3. Record the first timeline Event (1 test)
    const firstEvent = theme.events[0];
    semanticCases.push(tc(
      `Semantic [${theme.name}] - Progress Event ${firstEvent} ${i}`, 
      'POST', '/api/v1/command', true, 201, 
      { 
        headers: { 'idempotency-key': `sem-evt-${globalIdx}` }, 
        body: { 
          command: 'RECORD_EVENT', 
          target: caseId, 
          payload: { eventType: firstEvent, payload: { catatan: `Tindakan ${firstEvent} dilaksanakan pada hari ini.` } } 
        } 
      }
    ));

    globalIdx++;
  }
}

// Total 5 themes * 50 instances * 4 operations = 1000 semantic test cases
fs.writeFileSync(path.join(__dirname, 'test-cases-semantic.json'), JSON.stringify(semanticCases, null, 2));
console.log(`Generated ${semanticCases.length} semantic test cases in test-cases-semantic.json`);
