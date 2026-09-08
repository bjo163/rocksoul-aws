export type AwsFreshnessState = 'FRESH' | 'STALE' | 'UNAVAILABLE';
export type AwsChangeState = 'UNCHANGED' | 'CHANGED' | 'REVIEW_REQUIRED';

export interface AwsSourceMonitor {
  id: string;
  source_ref: string;
  adapter_key: 'icrc-gciv' | 'untc-genocide' | 'icj-bosnia-serbia';
  enabled: boolean;
  poll_interval_minutes: number;
  stale_after_minutes: number;
  max_attempts: number;
  retry_base_ms: number;
}

export interface AwsSourceFreshness extends Record<string, unknown> {
  id: string;
  source_ref: string;
  freshness_state: AwsFreshnessState;
  change_state: AwsChangeState;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_change_at: string | null;
  next_due_at: string;
  consecutive_failures: number;
  last_error: string | null;
}

export function awsFreshnessId(sourceRef: string): string {
  return `FRESH-AWS-${sourceRef.replace(/^SRC-AWS-/, '').replace(/[^A-Z0-9]+/gi, '-').toUpperCase()}`;
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function evaluateAwsFreshness(input: {
  now: string;
  lastSuccessAt: string | null;
  staleAfterMinutes: number;
  currentlyUnavailable?: boolean;
}): AwsFreshnessState {
  if (input.currentlyUnavailable) return 'UNAVAILABLE';
  if (!input.lastSuccessAt) return 'STALE';
  const ageMs = new Date(input.now).getTime() - new Date(input.lastSuccessAt).getTime();
  return ageMs > input.staleAfterMinutes * 60_000 ? 'STALE' : 'FRESH';
}

export function isAwsMonitorDue(
  monitor: AwsSourceMonitor,
  freshness: AwsSourceFreshness | null,
  now: string,
): boolean {
  if (!monitor.enabled) return false;
  if (!freshness) return true;
  return new Date(freshness.next_due_at).getTime() <= new Date(now).getTime();
}
