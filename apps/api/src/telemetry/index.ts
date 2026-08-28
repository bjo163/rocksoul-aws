export {
  buildResourceAttributes,
  getSamplingRate,
  getCommitSha,
  getPackageVersion,
  registerTelemetry,
  type TelemetryOptions,
  type MetricsHandles,
} from './telemetry.js';

export {
  redactHeaders,
  redactBody,
  redactPath,
  redactTraceAttributes,
} from './redaction.js';
