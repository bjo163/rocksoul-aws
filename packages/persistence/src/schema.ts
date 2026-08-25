export interface Migration {
  id: string;
  version: number;
  description: string;
  postgresSql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: '0001_initial',
    version: 1,
    description: 'Core persistent event/state/evidence storage',
    postgresSql: `
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, type TEXT NOT NULL, version INTEGER NOT NULL, payload_json JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
      CREATE TABLE IF NOT EXISTS relations (id TEXT PRIMARY KEY, from_id TEXT NOT NULL, relation_type TEXT NOT NULL, to_id TEXT NOT NULL, valid_from TIMESTAMPTZ NULL, valid_to TIMESTAMPTZ NULL, payload_json JSONB NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_rel_from ON relations(from_id, relation_type);
      CREATE INDEX IF NOT EXISTS idx_rel_to ON relations(to_id, relation_type);
      CREATE TABLE IF NOT EXISTS event_ledger (event_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, event_type TEXT NOT NULL, payload_json JSONB NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, recorded_at TIMESTAMPTZ NOT NULL, previous_hash TEXT, event_hash TEXT NOT NULL, actor_id TEXT, device_id TEXT, source TEXT, signature TEXT);
      CREATE INDEX IF NOT EXISTS idx_event_entity ON event_ledger(entity_id, occurred_at);
      CREATE TABLE IF NOT EXISTS projections (projection_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, projection_type TEXT NOT NULL, version INTEGER NOT NULL, payload_json JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_projection_entity_type ON projections(entity_id, projection_type);
      INSERT INTO meta(key, value) VALUES ('schema_version', '1') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
    `,
  },
  {
    id: '0002_audit_trail',
    version: 2,
    description: 'Immutable audit trail and Odoo-like write metadata',
    postgresSql: `ALTER TABLE entities ADD COLUMN IF NOT EXISTS audit_json JSONB NOT NULL DEFAULT '{}'; ALTER TABLE relations ADD COLUMN IF NOT EXISTS audit_json JSONB NOT NULL DEFAULT '{}'; ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS audit_json JSONB NOT NULL DEFAULT '{}'; ALTER TABLE projections ADD COLUMN IF NOT EXISTS audit_json JSONB NOT NULL DEFAULT '{}'; CREATE TABLE IF NOT EXISTS evidence (evidence_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, source_type TEXT NOT NULL, reference TEXT, status TEXT, confidence DOUBLE PRECISION, payload_json JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, audit_json JSONB NOT NULL DEFAULT '{}'); CREATE TABLE IF NOT EXISTS audit_ledger (audit_id TEXT PRIMARY KEY, operation TEXT NOT NULL, model_type TEXT NOT NULL, record_id TEXT NOT NULL, actor_id TEXT NOT NULL, timestamp TIMESTAMPTZ NOT NULL, changed_fields_json JSONB NOT NULL, before_json JSONB, after_json JSONB, previous_hash TEXT, hash TEXT NOT NULL, correlation_id TEXT, reason TEXT); CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_ledger(record_id, timestamp);`,
  },
  {
    id: '0003_observability_jobs',
    version: 3,
    description: 'System Traces and Job Queues',
    postgresSql: `CREATE TABLE IF NOT EXISTS system_traces (request_id TEXT PRIMARY KEY, correlation_id TEXT NOT NULL, route TEXT NOT NULL, status_code INTEGER, duration_ms DOUBLE PRECISION, error_message TEXT, started_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ); CREATE TABLE IF NOT EXISTS system_jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, payload_json JSONB NOT NULL, result_json JSONB, error_message TEXT, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL);`,
  },
  {
    id: '0004_operational_state',
    version: 4,
    description: 'Database-backed authentication users, revoked tokens and idempotency records',
    postgresSql: `CREATE TABLE IF NOT EXISTS auth_users (user_id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, rid TEXT, roles_json JSONB NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL); CREATE TABLE IF NOT EXISTS auth_revoked_tokens (token_hash TEXT PRIMARY KEY, revoked_at TIMESTAMPTZ NOT NULL); CREATE TABLE IF NOT EXISTS idempotency_records (key TEXT PRIMARY KEY, request_hash TEXT NOT NULL, status_code INTEGER NOT NULL, body_json JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL); CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);`,
  },
  {
    id: '0005_distributed_witness_projection',
    version: 5,
    description: 'Q-DAG witness projections, checkpoints and key lifecycle metadata',
    postgresSql: `CREATE TABLE IF NOT EXISTS witness_nodes (hash TEXT PRIMARY KEY, node_id TEXT UNIQUE NOT NULL, kind TEXT NOT NULL, payload_json JSONB NOT NULL, parents_json JSONB NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, actor_id TEXT, nonce TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_witness_nodes_occurred ON witness_nodes(occurred_at); CREATE TABLE IF NOT EXISTS witness_checkpoints (checkpoint_id TEXT NOT NULL, witness_id TEXT NOT NULL, root TEXT NOT NULL, heads_json JSONB NOT NULL, node_count INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL, algorithm TEXT NOT NULL, public_key TEXT NOT NULL, signature TEXT NOT NULL, PRIMARY KEY(checkpoint_id,witness_id)); CREATE INDEX IF NOT EXISTS idx_witness_checkpoint_root ON witness_checkpoints(root,created_at); CREATE TABLE IF NOT EXISTS witness_keys (key_id TEXT PRIMARY KEY, witness_id TEXT NOT NULL, algorithm TEXT NOT NULL, public_key TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('ACTIVE','REVOKED','SUPERSEDED')), created_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, superseded_by TEXT); CREATE INDEX IF NOT EXISTS idx_witness_keys_witness ON witness_keys(witness_id,status);`,
  },
  {
    id: '0006_postgres_audit_sequence',
    version: 6,
    description: 'Deterministic PostgreSQL audit-chain ordering under concurrent writes',
    postgresSql: `ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS chain_position BIGINT GENERATED BY DEFAULT AS IDENTITY; CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_chain_position ON audit_ledger(chain_position);`,
  },
  {
    id: '0007_durable_auth_sessions',
    version: 7,
    description: 'Durable revocable sessions with rotating refresh-token hashes',
    postgresSql: `CREATE TABLE IF NOT EXISTS auth_sessions (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_users(user_id) ON DELETE CASCADE, refresh_token_hash TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL, refresh_expires_at TIMESTAMPTZ NOT NULL, last_seen_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, rotation_counter INTEGER NOT NULL DEFAULT 1); CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, revoked_at); CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh ON auth_sessions(refresh_token_hash);`,
  },
];

export function getLatestSchemaVersion(): number {
  return MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
}
