# MoonWitness OS v4.18.0 — Single-Node Secure Witness Runtime

## Scope decision

This release intentionally stops expansion toward a network and hardens **one node first**. Peer discovery, gossip, multi-node quorum, federation, and consensus are deferred until there is a concrete operational need.

## Added

- persistent encrypted Ed25519 witness keystore;
- stable witness identity across restarts;
- AES-256-GCM + scrypt encrypted-at-rest private-key custody;
- production requirement for `WITNESS_KEY_PASSWORD`;
- development-only generated local master secret fallback;
- persistent ACTIVE/SUPERSEDED/REVOKED lifecycle;
- explicit key rotation, revocation, and manual replacement;
- persistent local signed checkpoint history;
- 1-of-1 local checkpoint authority;
- PostgreSQL public key/checkpoint projection synchronization;
- new single-node witness API operations;
- single-node witness restart/security tests.

## API additions

```text
GET  /api/v1/witness/keys
POST /api/v1/witness/keys/rotate
POST /api/v1/witness/keys/revoke
POST /api/v1/witness/keys/create
GET  /api/v1/witness/checkpoints
POST /api/v1/witness/checkpoints
```

Existing bundle endpoints remain local utilities; they do not activate a peer network.

## Verification

`npm run test:witness` covers the v4.15-v4.17 witness suites plus the v4.18 single-node keystore suite: encrypted storage, persistent identity, wrong-password rejection, rotation persistence, revocation persistence, explicit recovery, and checkpoint persistence.

Live PostgreSQL execution remains environment-dependent and is not claimed without an accessible PostgreSQL service.
