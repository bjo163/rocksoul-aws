# TSE V1 Validation

The versioned USNO fixture set reports MAE, RMSE, median, maximum, p95, and
event-specific error. Structural polar/no-event fixtures are checked for
explicit unresolved output and excluded from numerical error aggregation.

The release gate also covers deterministic repeatability, cross-midnight night
boundaries, activity neutrality, invalid coordinate/timezone rejection,
hypothesis non-leakage, and the TSE → Mizan temporal-context contract.
