# Demo Database and E2E Plan

## Three-layer branch model

```text
feature/*  ->  dev  ->  main
implementation   integration   certified release
```

- `feature/*`: isolated implementation and focused tests. No direct release deployment.
- `dev`: integration trunk. Demo work, API/UI integration, and exploratory validation land here first.
- `main`: certified destination. Only the exact commit that passes the authoritative certification lane is promoted.

## Database modes

### `db:install`
Production-safe baseline only.

- schema migrations
- canonical application seed
- no showcase/demo records
- deterministic and reproducible from a clean checkout

### `db:demo --scenario=<name>`
Explicitly loads demo records into an existing development/staging database.

Demo records must carry a recognizable marker such as `demoScenario` so they can be identified and removed safely.

### `db:reset-demo`
Removes demo-scoped records and reloads the selected scenario deterministically.

The reset operation must never delete canonical seed data.

## Scenario set

### `basic`
A compact Universe graph:

```text
Entity A
  └── Relation ──> Entity B
                      └── Event timeline
                             └── Evidence
```

### `review`
A governed workflow:

```text
Entity
  -> Observation/Event
  -> Evidence
  -> Review request
  -> Witness/Audit
```

### `full`
The showcase scenario combining the supported surfaces into one realistic journey.

## API E2E

The canonical E2E must behave like a real client:

1. start the API against a disposable database;
2. create/login the test operator through the authentication surface;
3. obtain the normal access token/session;
4. create records through HTTP endpoints;
5. follow the resulting IDs between endpoints;
6. verify persistence, replay, audit, witness, and idempotency through public contracts;
7. tear down the disposable environment.

Direct repository writes are allowed only for preparing infrastructure that the public API itself cannot create (for example, a test operator when no public registration flow exists). Domain records should be created through the HTTP surface.

## UI/browser E2E

After the API scenario is stable, browser automation should reproduce the same `full` scenario through the Web UI:

- authenticate
- create/select the case
- inspect entity/event/evidence surfaces
- submit or request review where supported
- observe witness/audit state
- verify a successful final state

The browser test should reuse stable API fixtures/contracts rather than duplicate domain definitions.

## CI rules

- `feature/*`: focused tests and browser/API validation for the changed area.
- `dev`: integration validation and demo scenario smoke.
- `main`: release certification; demo data is never loaded implicitly.

## Definition of done

- [ ] `db:install` remains demo-free.
- [ ] `db:demo --scenario=basic|review|full` is reproducible.
- [ ] `db:reset-demo` is safe and deterministic.
- [ ] API E2E reproduces the `full` scenario through authenticated HTTP endpoints.
- [ ] Browser E2E reproduces the same scenario through the UI.
- [ ] Demo documentation explains local and staging usage.
- [ ] CI keeps demo concerns separate from production certification.
