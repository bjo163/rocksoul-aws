import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { chooseReminderPattern, type RevelationPattern } from './revelation-pattern-engine.js';
import { composeReminderBundle, type ReminderBundle } from './revelation-reminder-engine.js';

export interface IngressChannel {
  id: string;
  type: string;
  sourceClass: string;
  enabled: boolean;
  agentClass?: string;
  references: string[];
}

export interface IngressPayload {
  id: string;
  channelId: string;
  eventType: 'KNOWLEDGE_REMINDER' | 'MESSENGER_SYMBOLIC';
  reference?: string;
  reminder?: string;
  scheduledAt: string;
  triggeredAt?: string;
  unpredictable: true;
  modelOnly: true;
  disclaimer: string;
  patternId?: string;
  patternType?: string;
  evidenceClass?: string;
  patternReferences?: string[];
  passageCount?: number;
  reminderBundle?: ReminderBundle;
}

const REGISTRY_PATH = resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../'), 'data/ingress/revelation-channels.json');
const DISCLAIMER = 'Programmatic representation only; this does not claim actual revelation or supernatural communication.';

export async function loadIngressRegistry(): Promise<{ version: number; channels: IngressChannel[]; disclaimer: string }> {
  const raw = JSON.parse(await readFile(REGISTRY_PATH, 'utf8')) as {
    version: number;
    channels: IngressChannel[];
    disclaimer?: string;
  };
  return { ...raw, disclaimer: raw.disclaimer ?? DISCLAIMER };
}

export async function createUnpredictableIngress(options: {
  minDelayMs?: number;
  maxDelayMs?: number;
  now?: Date;
  channelId?: string;
  reference?: string;
  reminder?: string;
} = {}): Promise<IngressPayload> {
  const registry = await loadIngressRegistry();
  const available = registry.channels.filter((channel) => channel.enabled && (!options.channelId || channel.id === options.channelId));
  if (available.length === 0) throw new Error('NO_ENABLED_INGRESS_CHANNEL');

  const channel = available[randomInt(0, available.length)];
  const minDelayMs = Math.max(1_000, options.minDelayMs ?? 5 * 60_000);
  const maxDelayMs = Math.max(minDelayMs + 1_000, options.maxDelayMs ?? 6 * 60 * 60_000);
  const delay = randomInt(minDelayMs, maxDelayMs);
  const scheduledAt = new Date((options.now ?? new Date()).getTime() + delay).toISOString();
  const pattern: RevelationPattern = await chooseReminderPattern(await (async () => {
    const mod = await import('./revelation-pattern-engine.js');
    return mod.loadRevelationPatternRegistry();
  })());
  const reference = options.reference ?? pattern.passage ?? pattern.references[randomInt(0, pattern.references.length)] ?? channel.references[randomInt(0, channel.references.length)];
  const eventType = channel.type === 'MESSENGER_SYMBOLIC' ? 'MESSENGER_SYMBOLIC' : 'KNOWLEDGE_REMINDER';

  const reminderBundle = await composeReminderBundle(randomInt(0, 1_000_000));
  return {
    id: `ING-${randomUUID()}`,
    channelId: channel.id,
    eventType,
    reference: options.reference ?? reminderBundle.quran.reference ?? reference,
    reminder: options.reminder ?? 'Review the sourced reminder and reflect on its meaning.',
    scheduledAt,
    unpredictable: true,
    modelOnly: true,
    disclaimer: registry.disclaimer || DISCLAIMER,
    patternId: pattern.id,
    patternType: pattern.type,
    evidenceClass: pattern.evidenceClass,
    patternReferences: pattern.references,
    passageCount: pattern.count,
    reminderBundle,
  };
}

export async function triggerIngress(payload: IngressPayload, now = new Date()): Promise<IngressPayload> {
  if (!payload.unpredictable || !payload.modelOnly) throw new Error('INGRESS_METADATA_INVALID');
  const registry = await loadIngressRegistry();
  if (!registry.channels.some((channel) => channel.id === payload.channelId && channel.enabled)) {
    throw new Error('INGRESS_CHANNEL_DISABLED');
  }
  return { ...payload, triggeredAt: now.toISOString() };
}
