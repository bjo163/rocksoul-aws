# Jobs and Ingress Migration Audit

Audit ini memetakan bagian yang masih berada di root `src/` dan adapter API.
Tujuannya adalah menentukan ekstraksi package yang aman untuk Cosmic sebagai
engine/API yang akan dipakai MoonWitness.

## Temuan utama

### Jobs

| Surface | Lokasi | Kondisi saat ini | Rekomendasi |
| --- | --- | --- | --- |
| Queue canonical | `src/jobs/job-queue.ts:32` | Dipakai langsung oleh `apps/api/src/app.ts:66`; mendukung `PersistenceStore`, handler registration, polling, dan file/PostgreSQL repository | Pertahankan behavior ini sebagai implementasi canonical saat ekstraksi |
| Queue legacy | `src/jobs/persistent-job-queue.ts:5` | File-only, tidak memiliki handler registry atau worker loop; hanya dipakai oleh `tests/backend-v29.test.ts` | Tandai compatibility-only, migrasikan test, lalu hapus agar tidak ada dua `PersistentJobQueue` |
| Worker lifecycle | `src/jobs/worker-runtime.ts:8` | Wrapper lifecycle sudah ada, tetapi API masih memanggil `jobs.start()` langsung (`apps/api/src/app.ts:116`) | Gunakan `WorkerRuntime` sebagai entrypoint lifecycle setelah queue contract stabil |
| Job HTTP adapter | `GET /api/v1/jobs/:id`, `POST /api/v1/jobs/process` (`apps/api/src/routes/v1.routes.ts:129-143`) | Auth/scope/status mapping bercampur dengan queue access | Pertahankan sebagai API adapter; injeksikan port queue, jangan masukkan route ke package engine |
| Job handlers | `apps/api/src/app.ts:89-115` | `WITNESS_IMPORT_CHUNKS` dan `AI_ANALYZE` mengandung persistence, Witness, AI, checkpoint, dan observability sekaligus | Ekstrak handler registry/adapter terpisah setelah workflow analysis/evaluation selesai; handler harus memanggil workflow package dan menerima host ports |

### Ingress/reminder

| Surface | Lokasi | Kondisi saat ini | Rekomendasi |
| --- | --- | --- | --- |
| Generate reminder | `POST /api/v1/ingress/reminder` (`apps/api/src/routes/v1.routes.ts:668-680`) | Route melakukan auth dan langsung memanggil `createUnpredictableIngress`; hasil berstatus `SCHEDULED_MODEL_EVENT`, tetapi schedule tidak disimpan ke queue/persistence | Jadikan route adapter untuk workflow ingress; tambahkan persistence/IDempotency sebelum mengklaim schedule durable |
| Trigger reminder | `POST /api/v1/ingress/reminder/trigger` (`apps/api/src/routes/v1.routes.ts:682-689`) | Hanya memvalidasi metadata dan channel enabled, lalu mengembalikan `triggeredAt`; payload dapat datang langsung dari caller | Workflow harus memuat ingress berdasarkan ID, memeriksa status/actor/expiry, lalu melakukan one-time transition sebelum trigger |
| Ingress generator | `src/ingress/divine-ingress.ts:40-100` | Memuat registry/data dan memilih delay/pattern secara acak; tidak bergantung HTTP atau persistence | Kandidat package `@moonwitness/ingress` atau sub-package revelation, dengan data loading sebagai adapter yang dapat diganti |
| Reminder composition | `src/ingress/revelation-reminder-engine.ts:35-124` | Menggabungkan Qur'an, Asma, previous-scripture metadata, dan temporal context; bergantung langsung ke root `src/revelation` dan filesystem data | Pertahankan sebagai domain/revelation capability; jangan taruh di `@moonwitness/orchestrator`. Ekstrak hanya setelah data-path/runtime asset contract jelas |

## Urutan migrasi yang aman

1. **Stabilkan queue contract**: buat port minimal (`enqueue`, `get`,
   `processAvailable`, `start`, `stop`) dan adapter repository untuk
   `src/jobs/job-queue.ts`. Pindahkan `apps/api/src/route-context.ts` ke port
   tersebut sehingga API tidak mengenal class concrete.
2. **Hilangkan duplikasi queue**: migrasikan `tests/backend-v29.test.ts` ke
   canonical queue, hapus `src/jobs/persistent-job-queue.ts`, dan ubah
   `WorkerRuntime` agar menerima port, bukan class concrete.
3. **Pisahkan job handlers dari app bootstrap**: buat registry adapter di
   layer host. `AI_ANALYZE` harus memakai `runAnalysisWorkflow` dengan ports;
   `WITNESS_IMPORT_CHUNKS` tetap host-specific karena menyentuh transport,
   DAG, projection, dan checkpoint.
4. **Ekstrak ingress workflow**: tambahkan workflow kecil di
   `@moonwitness/orchestrator` untuk `schedule` dan `trigger`, dengan ports
   `createIngress`, `loadIngress`, dan `transitionIngress`. Generator dan
   reminder bundle tetap berada di capability Revelation/Ingress.
5. **Baru setelah itu buat package boundary**: package jobs/ingress boleh
   dipublikasikan untuk integrator, tetapi package tersebut tidak boleh
   mengimpor HTTP, auth implementation, filesystem global, atau concrete
   Witness/persistence.

## Hal yang tidak boleh dilakukan pada migrasi berikutnya

- Jangan menjadikan `/api/v1/jobs/process` sebagai contract engine; itu adalah
  operational/admin adapter.
- Jangan menyebut ingress sebagai durable schedule sampai record-nya benar-benar
  dipersist dan trigger-nya idempotent.
- Jangan memindahkan seluruh `src/ingress` ke `@moonwitness/cosmic-engine`;
  reminder corpus dan provenance adalah domain boundary, sedangkan engine
  facade harus tetap host-neutral.
- Jangan menghapus queue legacy sebelum test `backend-v29` dipindahkan dan
  compatibility check dijalankan.

