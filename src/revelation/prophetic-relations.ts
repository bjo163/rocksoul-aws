import { runtimeDatasetOr } from '../persistence/runtime-data.js';
import {
  buildPropheticRelations,
  type PropheticEvent,
  type ProphetRecord,
  type ScriptureReference,
} from '../../packages/revelation/src/prophetic-relations.js';

export function propheticRelationsSnapshot() {
  const prophets = runtimeDatasetOr<ProphetRecord[]>('packages/revelation/data/prophets.json', []);
  const scriptureReferences = runtimeDatasetOr<ScriptureReference[]>('packages/revelation/data/knowledge/prophet-scripture-index.json', []);
  const events = runtimeDatasetOr<PropheticEvent[]>('packages/revelation/data/knowledge/prophetic-events.json', []);

  return buildPropheticRelations({ prophets, scriptureReferences, events });
}
