import express from 'express';
import type { ErrorRequestHandler, Request, Response } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { DomainError, InvalidTransitionError, NotFoundError, ValidationError } from '../domain/errors.js';
import type { OrderSnapshot } from '../domain/order.js';
import type { Metrics } from '../metrics.js';
import type { OrderService } from '../services/orderService.js';

export interface AppDeps {
  service: OrderService;
  logger: Logger;
  metrics: Metrics;
}

export function createApp({ service, logger, metrics }: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // Mede duração de toda requisição, com a rota (template) como label.
  app.use((req, res, next) => {
    const end = metrics.httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
      end({ method: req.method, route, status: String(res.statusCode) });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metrics.registry.contentType);
    res.send(await metrics.registry.metrics());
  });

  app.post('/orders', async (req, res) => {
    const body = (req.body ?? {}) as { customerId?: unknown; items?: unknown };
    const order = await service.create({ customerId: body.customerId, items: body.items });
    metrics.orderTransitions.inc({ to: order.status });
    res.status(201).location(`/orders/${order.id}`).json(order);
  });

  app.get('/orders', async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await service.list(status));
  });

  app.get('/orders/:id', async (req, res) => {
    res.json(await service.get(String(req.params.id)));
  });

  const transitions = {
    pay: (id: string) => service.pay(id),
    complete: (id: string) => service.complete(id),
    cancel: (id: string) => service.cancel(id),
  } as const;

  for (const [action, run] of Object.entries(transitions)) {
    app.post(`/orders/:id/${action}`, async (req: Request, res: Response) => {
      const order: OrderSnapshot = await run(String(req.params.id));
      metrics.orderTransitions.inc({ to: order.status });
      res.json(order);
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada' } });
  });

  app.use(errorHandler(logger));
  return app;
}

function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof DomainError) {
      res.status(statusFor(err)).json({ error: { code: err.code, message: err.message } });
      return;
    }
    if ((err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido' } });
      return;
    }
    logger.error({ err, path: req.path }, 'erro não tratado');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
  };
}

function statusFor(err: DomainError): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof InvalidTransitionError) return 409;
  return 500;
}
