export function isFastifyEnabled(): boolean {
  if (process.env.AWS_FASTIFY_RUNTIME !== undefined) {
    return process.env.AWS_FASTIFY_RUNTIME === '1';
  }
  // Deprecated compatibility alias. Remove after downstream migration.
  return process.env.COSMIC_FASTIFY_RUNTIME === '1';
}

export function getRuntimeMode(): 'native' | 'fastify' {
  return isFastifyEnabled() ? 'fastify' : 'native';
}
