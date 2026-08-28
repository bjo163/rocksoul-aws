/** Deterministic, provider-agnostic guardrails for semantic AI requests. */
export type AiGovernancePolicy = { maxInputChars?: number; timeoutMs?: number; allowRemote?: boolean };
export const DEFAULT_AI_GOVERNANCE: Required<AiGovernancePolicy> = Object.freeze({ maxInputChars: 32_000, timeoutMs: 15_000, allowRemote: false });

export function resolveAiGovernance(input: AiGovernancePolicy = {}): Required<AiGovernancePolicy> {
  const positive = (value: unknown, fallback: number) => Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  return Object.freeze({ maxInputChars: positive(input.maxInputChars, DEFAULT_AI_GOVERNANCE.maxInputChars), timeoutMs: positive(input.timeoutMs, DEFAULT_AI_GOVERNANCE.timeoutMs), allowRemote: input.allowRemote === true });
}

export function assertGovernedAiInput(text: unknown, policy: AiGovernancePolicy = {}): string {
  if (typeof text !== 'string') throw new Error('AI_INPUT_MUST_BE_STRING');
  const resolved = resolveAiGovernance(policy);
  if (text.length > resolved.maxInputChars) throw new Error('AI_INPUT_TOO_LARGE');
  return text;
}

export async function withAiTimeout<T>(work: () => Promise<T>, policy: AiGovernancePolicy = {}): Promise<T> {
  const { timeoutMs } = resolveAiGovernance(policy);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work(), new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('AI_PROVIDER_TIMEOUT')), timeoutMs); })]);
  } finally { if (timer) clearTimeout(timer); }
}
