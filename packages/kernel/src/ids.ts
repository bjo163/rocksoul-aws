import crypto from 'node:crypto';

export type EntityIdPrefix = string;
export const id = (prefix: EntityIdPrefix): string => `${prefix}_${crypto.randomUUID()}`;
export const now = (): string => new Date().toISOString();
