import Fastify, { type FastifyInstance } from 'fastify';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { trace, context, propagation, diag } from '@opentelemetry/api';
import { redactHeaders, redactTraceAttributes } from './redaction.js';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

export interface TelemetryOptions {
  /** Explicitly disable registration for tests or transitional runtimes. */
  enabled?: boolean;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  commitSha?: string;
}

export interface MetricsHandles {
  requestLatency: { record: (value: number, attributes?: Record<string, unknown>) => void };
  statusCodes: { add: (amount: number, attributes?: Record<string, unknown>) => void };
  errorCount: { add: (amount: number, attributes?: Record<string, unknown>) => void };
}

const NOOP_METRICS: MetricsHandles = {
  requestLatency: { record: () => {} },
  statusCodes: { add: () => {} },
  errorCount: { add: () => {} },
};

export function buildResourceAttributes(
  opts: TelemetryOptions = {},
): Record<string, string> {
  return {
    'service.name': opts.serviceName ?? 'cosmic-api',
    'service.version': opts.serviceVersion ?? getPackageVersion(),
    'deployment.environment': opts.environment ?? process.env.NODE_ENV ?? 'development',
    'commit.sha': opts.commitSha ?? getCommitSha(),
  };
}

export function getSamplingRate(environment: string): number {
  switch (environment) {
    case 'production':
      return 0.01;
    case 'staging':
      return 0.1;
    default:
      return 1;
  }
}

export function getCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

export function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );
    return typeof pkg.version === 'string' ? pkg.version : '4.33.0';
  } catch {
    return '4.33.0';
  }
}

export async function registerTelemetry(
  app: FastifyInstance,
  opts: TelemetryOptions = {},
): Promise<void> {
  if (opts.enabled === false || (opts.enabled !== true && process.env.OTEL_ENABLED !== '1')) return;

  try {
    const resourceAttrs = buildResourceAttributes(opts);
    await setupProviders(resourceAttrs);
    const metrics = await setupMetrics(resourceAttrs);

    const instrumentation = new FastifyOtelInstrumentation({
      requestHook: (span, request) => {
        try {
          const requestId = request.id ?? request.headers['x-request-id'];
          if (requestId) {
            span.setAttribute('request.id', String(requestId));
          }

          const redacted = redactHeaders(
            request.headers as Record<string, unknown>,
          );
          for (const [key, value] of Object.entries(redacted)) {
            if (value !== '[REDACTED]' && typeof value === 'string') {
              span.setAttribute(`http.request.header.${key.toLowerCase()}`, value);
            }
          }

          const carrier: Record<string, string> = {};
          propagation.inject(context.active(), carrier, {
            set: (c, k, v) => {
              c[k] = v;
            },
          });
          (request as unknown as { reply: { header: (k: string, v: string) => void } }).reply.header('traceparent', carrier['traceparent'] ?? '');
          (request as unknown as { reply: { header: (k: string, v: string) => void } }).reply.header('tracestate', carrier['tracestate'] ?? '');

          const spanContext = span.spanContext();
          if (spanContext && request.log) {
            request.log = request.log.child({ traceId: spanContext.traceId });
          }
        } catch {
          // never throw from hook
        }
      },
    });

    await app.register(instrumentation.plugin());

    app.decorate('telemetryMetrics', metrics);

    app.addHook('onRequest', async (request) => {
      (request as unknown as { telemetryStartTime?: number }).telemetryStartTime =
        performance.now();
    });

    app.addHook('onResponse', async (request, reply) => {
      const startTime = (request as unknown as { telemetryStartTime?: number })
        .telemetryStartTime;
      if (startTime != null) {
        const latency = performance.now() - startTime;
        metrics.requestLatency.record(latency, {
          'http.status_code': String(reply.statusCode),
        });
        metrics.statusCodes.add(1, {
          'http.status_code': String(reply.statusCode),
        });
      }
    });

    app.addHook('onError', async (_request, _reply, error) => {
      metrics.errorCount.add(1, {
        'error.type': error instanceof Error ? error.name : 'Error',
      });
    });
  } catch (error) {
    console.error('[telemetry] registration failed:', error);
  }
}

async function setupProviders(
  resourceAttrs: Record<string, string>,
): Promise<void> {
  try {
    // @ts-ignore optional dependency
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node');
    // @ts-ignore optional dependency
    const { TraceIdRatioBasedSampler, AlwaysOnSampler } = await import('@opentelemetry/sdk-trace-base');
    // @ts-ignore optional dependency
    const { Resource } = await import('@opentelemetry/resources');
    // @ts-ignore optional dependency
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');
    // @ts-ignore optional dependency
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    // @ts-ignore optional dependency
    const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-base');

    const sampler =
      resourceAttrs['deployment.environment'] === 'production'
        ? new TraceIdRatioBasedSampler(0.01)
        : resourceAttrs['deployment.environment'] === 'staging'
          ? new TraceIdRatioBasedSampler(0.1)
          : new AlwaysOnSampler();

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: resourceAttrs['service.name'],
        [SemanticResourceAttributes.SERVICE_VERSION]: resourceAttrs['service.version'],
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: resourceAttrs['deployment.environment'],
        ['commit.sha']: resourceAttrs['commit.sha'],
      }),
    );

    const provider = new NodeTracerProvider({ resource, sampler });

    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (endpoint) {
      try {
        provider.addSpanProcessor(
          new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint })),
        );
      } catch {
        diag.debug('[telemetry] OTLP trace exporter setup failed');
      }
    }

    try {
      provider.register();
    } catch {
      (trace as unknown as { _proxyTracerProvider: unknown })._proxyTracerProvider = provider;
    }
  } catch {
    diag.debug('[telemetry] tracer provider setup skipped');
  }
}

async function setupMetrics(
  resourceAttrs: Record<string, string>,
): Promise<MetricsHandles> {
  try {
    // @ts-ignore optional dependency
    const { MeterProvider } = await import('@opentelemetry/sdk-metrics');
    // @ts-ignore optional dependency
    const { Resource } = await import('@opentelemetry/resources');
    // @ts-ignore optional dependency
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: resourceAttrs['service.name'],
        [SemanticResourceAttributes.SERVICE_VERSION]: resourceAttrs['service.version'],
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: resourceAttrs['deployment.environment'],
        ['commit.sha']: resourceAttrs['commit.sha'],
      }),
    );

    const meterProvider = new MeterProvider({ resource });
    const meter = meterProvider.getMeter('cosmic-api');

    return {
      requestLatency: meter.createHistogram(
        'http.server.request.duration',
        {
          description: 'Request latency in milliseconds',
        },
      ),
      statusCodes: meter.createCounter('http.server.response.status_code', {
        description: 'HTTP response status codes',
      }),
      errorCount: meter.createCounter('http.server.response.errors', {
        description: 'Error count',
      }),
    };
  } catch {
    return NOOP_METRICS;
  }
}
