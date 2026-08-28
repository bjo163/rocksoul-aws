export function isFastifyEnabled(): boolean {
  return process.env.COSMIC_FASTIFY_RUNTIME === '1';
}

export function getRuntimeMode(): 'native' | 'fastify' {
  return isFastifyEnabled() ? 'fastify' : 'native';
}
