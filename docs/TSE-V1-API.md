# TSE V1 API

`calculateTemporalState(input)` is a deterministic, side-effect-free function.
It accepts an ISO timestamp or `Date`, a WGS84 latitude/longitude, and an IANA
timezone identifier. The timestamp is normalized to UTC internally; the IANA
zone is used only to resolve the civil local day and night boundaries.

The output protocol is `TEMPORAL_SIGNIFICANCE_ENGINE_V1` and contains:

- solar and lunar position facts;
- sunrise, sunset, moonrise, and moonset states;
- night model, interval, fraction, and segment;
- research markers for the frozen 45-degree hypotheses;
- analytical scoring and data-quality status;
- provider, algorithm, convention, and capability provenance.

An unavailable or out-of-search-window event is represented as
`{ status: "UNRESOLVED", utc: null }`. A state with incomplete required
astronomical events is `UNRESOLVED` for scoring and has no
`confidenceAdjustedScore`.

The optional `activity` field is metadata only. It cannot affect any temporal
fact or score. `SUNSET_TO_FAJR` requires an explicit `nightBoundary` end time;
use `SUNSET_TO_SUNRISE` when no Fajr boundary is available.
