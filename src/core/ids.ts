// @ts-nocheck
import crypto from 'node:crypto';
export const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
export const now = () => new Date().toISOString();
//# sourceMappingURL=ids.js.map