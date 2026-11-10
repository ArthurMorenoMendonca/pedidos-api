import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export interface Metrics {
  registry: Registry;
  httpDuration: Histogram<'method' | 'route' | 'status'>;
  orderTransitions: Counter<'to'>;
}

/**
 * Métrica principal (base do SLO, ver docs/desempenho.md):
 *   http_request_duration_seconds — latência e status por rota.
 * Métrica de negócio:
 *   orders_transitions_total — pedidos por estado de destino.
 */
export function createMetrics(): Metrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });

  const orderTransitions = new Counter({
    name: 'orders_transitions_total',
    help: 'Quantidade de pedidos que chegaram a cada estado',
    labelNames: ['to'] as const,
    registers: [registry],
  });

  return { registry, httpDuration, orderTransitions };
}
