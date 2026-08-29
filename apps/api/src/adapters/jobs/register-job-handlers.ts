import { randomUUID } from 'node:crypto';
import { buildAiAnalysis, analyzeWithProvider } from '@moonwitness/cosmic-engine';
import { composeReminderBundle, runAiAnalyzeWorkflow, type WorkflowEvidence } from '@moonwitness/orchestrator';
import { appendMizanWitness, signCheckpoint as signWitnessCheckpoint } from '@moonwitness/witness';

type RecordValue = Record<string, unknown>;

interface JobQueueLike {
  register(name: string, handler: (payload: RecordValue) => Promise<unknown>): void;
}

interface WitnessDagLike {
  list(): unknown[];
  root(): string | null;
  checkpoint(): unknown;
}

interface WitnessTransportLike {
  importChunks(chunks: unknown[], trustedPublicKey?: string): unknown;
}

interface WitnessDagStoreLike {
  save(dag: WitnessDagLike): Promise<void>;
}

interface WitnessProjectionStoreLike {
  putNode(node: unknown): Promise<void>;
  putCheckpoint(checkpoint: unknown): Promise<void>;
}

interface WitnessMetricsLike {
  record(event: string): void;
}

interface WitnessKeyStoreLike {
  activeIdentity(): unknown;
}

interface WitnessCheckpointStoreLike {
  put(checkpoint: unknown): Promise<void>;
}

export interface JobHandlerDependencies {
  jobs: JobQueueLike;
  universeStore: {
    listCaseEvidence(caseId: string): Promise<unknown[]>;
    saveCase(aggregate: unknown, eventType: string, actorId: string): Promise<unknown>;
  };
  semanticProvider: unknown;
  backend: {
    runtime: {
      graph: {
        listEntities(input: { q: string }): unknown[];
      };
    };
  };
  witnessDag: WitnessDagLike;
  witnessDagStore: WitnessDagStoreLike;
  witnessTransport: WitnessTransportLike;
  witnessStore: WitnessProjectionStoreLike | null;
  witnessMetrics: WitnessMetricsLike;
  witnessKeyStore: WitnessKeyStoreLike;
  witnessCheckpointStore: WitnessCheckpointStoreLike;
}

/** Register host-specific queue handlers while keeping app bootstrap small. */
export function registerJobHandlers(deps: JobHandlerDependencies): void {
  deps.jobs.register('WITNESS_IMPORT_CHUNKS', async (payload) => {
    if (!Array.isArray(payload.chunks)) throw new Error('WITNESS_CHUNKS_REQUIRED');
    const result = deps.witnessTransport.importChunks(
      payload.chunks,
      typeof payload.trustedPublicKey === 'string' ? payload.trustedPublicKey : undefined,
    );
    if (deps.witnessStore) {
      for (const node of deps.witnessDag.list()) await deps.witnessStore.putNode(node);
    }
    await deps.witnessDagStore.save(deps.witnessDag);
    return result;
  });

  deps.jobs.register('AI_ANALYZE', async (payload) => {
    const text = typeof payload.text === 'string' ? payload.text : '';
    const caseId = typeof payload.caseId === 'string' ? payload.caseId : `CASE-${randomUUID()}`;
    const aiOpts = typeof payload.options === 'object' && payload.options ? { ...payload.options } : {};
    const actorId = typeof payload.actorId === 'string' ? payload.actorId : 'SERVICE-WORKER-001';
    return runAiAnalyzeWorkflow(
      {
        caseId,
        actorId,
        text,
        options: aiOpts,
        semanticObservation: payload.semanticObservation && typeof payload.semanticObservation === 'object'
          ? payload.semanticObservation as RecordValue
          : undefined,
        modelVersion: process.env.MOONWITNESS_RELEASE_VERSION ?? '4.33.0',
        source: 'persistent-job',
      },
      {
        listEvidence: (id) => deps.universeStore.listCaseEvidence(id) as Promise<WorkflowEvidence[]>,
        analyze: async ({ text: analysisText, options, semanticObservation }) => {
          const enriched = {
            ...options,
            provider: deps.semanticProvider,
            sourceGraph: {
              search: ({ q, limit = 10 }: { q: string; limit?: number }) => deps.backend.runtime.graph
                .listEntities({ q })
                .slice(0, limit)
                .map((entity) => {
                  const record = entity as RecordValue;
                  return { ...record, id: record.entityId };
                }),
            },
          };
          return semanticObservation
            ? buildAiAnalysis(analysisText, enriched as Parameters<typeof buildAiAnalysis>[1])
            : analyzeWithProvider(analysisText, enriched as Parameters<typeof analyzeWithProvider>[1]);
        },
        composeReminder: (seed) => composeReminderBundle(seed),
        saveCase: ({ aggregate, eventType, actorId: saveActor }) => deps.universeStore
          .saveCase(aggregate, eventType, saveActor),
        commitWitness: async (input) => {
          const node = appendMizanWitness(deps.witnessDag as never, input as never);
          await deps.witnessDagStore.save(deps.witnessDag);
          if (deps.witnessStore) await deps.witnessStore.putNode(node);
          deps.witnessMetrics.record('NODE_APPENDED');
          let checkpointId: string | null = null;
          const activeIdentity = deps.witnessKeyStore.activeIdentity();
          if (process.env.WITNESS_AUTO_CHECKPOINT !== '0' && activeIdentity) {
            const signed = signWitnessCheckpoint(deps.witnessDag.checkpoint() as never, activeIdentity as never);
            await deps.witnessCheckpointStore.put(signed);
            if (deps.witnessStore) await deps.witnessStore.putCheckpoint(signed);
            deps.witnessMetrics.record('CHECKPOINT_CREATED');
            checkpointId = (signed as { checkpoint: { checkpointId: string } }).checkpoint.checkpointId;
          }
          return { node: { nodeId: (node as { nodeId: string }).nodeId, hash: (node as { hash: string }).hash }, root: deps.witnessDag.root(), checkpointId };
        },
      },
    );
  });
}
