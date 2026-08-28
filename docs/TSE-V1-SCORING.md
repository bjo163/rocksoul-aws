# TSE V1 Scoring

The state exposes these separate concepts:

`rawScore`, `confidenceAdjustedScore`, `hypothesisSignalScore`, `confidence`,
`dataQuality`, and `astronomicalDataStatus`.

The base score contains only declared temporal markers. Hypothesis signals are
reported separately and never become a hidden relevance bonus. Missing required
events produce `UNRESOLVED`, zero raw score, and a null adjusted score.

These are analytical software measurements for comparison and audit. They are
not quantities of divine reward, punishment, sin, merit, or final judgement.
