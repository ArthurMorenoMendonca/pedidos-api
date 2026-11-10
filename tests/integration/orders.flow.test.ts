import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/http/app.js';
import { createLogger } from '../../src/logger.js';
import { createMetrics } from '../../src/metrics.js';
import { InMemoryOrderRepository } from '../../src/repositories/inMemoryOrderRepository.js';
import { OrderService } from '../../src/services/orderService.js';

function buildApp() {
  let n = 0;
  const service = new OrderService(
    new InMemoryOrderRepository(),
    { next: () => `id-${++n}` },
    { now: () => new Date() },
  );
  return createApp({ service, logger: createLogger('silent'), metrics: createMetrics() });
}

const body = {
  customerId: 'c-1',
  items: [
    { sku: 'LIVRO-1', quantity: 2, unitPriceCents: 4500 },
    { sku: 'CANETA', quantity: 1, unitPriceCents: 300 },
  ],
};

describe('fluxo principal de pedidos (HTTP ponta a ponta)', () => {
  it('cria, paga, conclui e consulta um pedido', async () => {
    const app = buildApp();

    const created = await request(app).post('/orders').send(body).expect(201);
    expect(created.body.status).toBe('CREATED');
    expect(created.body.totalCents).toBe(9300);
    expect(created.headers.location).toBe('/orders/id-1');

    const paid = await request(app).post('/orders/id-1/pay').expect(200);
    expect(paid.body.status).toBe('PAID');

    const completed = await request(app).post('/orders/id-1/complete').expect(200);
    expect(completed.body.status).toBe('COMPLETED');

    const fetched = await request(app).get('/orders/id-1').expect(200);
    expect(fetched.body.status).toBe('COMPLETED');

    const listed = await request(app).get('/orders?status=COMPLETED').expect(200);
    expect(listed.body).toHaveLength(1);
  });

  it('cancela um pedido pago', async () => {
    const app = buildApp();
    await request(app).post('/orders').send(body).expect(201);
    await request(app).post('/orders/id-1/pay').expect(200);

    const res = await request(app).post('/orders/id-1/cancel').expect(200);

    expect(res.body.status).toBe('CANCELLED');
  });

  it('responde 400 para dados inválidos', async () => {
    const res = await request(buildApp()).post('/orders').send({ customerId: 'c-1', items: [] }).expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 400 para JSON malformado', async () => {
    const res = await request(buildApp())
      .post('/orders')
      .set('Content-Type', 'application/json')
      .send('{ nao eh json')
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('responde 400 para filtro de status inválido', async () => {
    await request(buildApp()).get('/orders?status=XYZ').expect(400);
  });

  it('responde 404 para pedido inexistente e para rota desconhecida', async () => {
    const app = buildApp();

    const missing = await request(app).get('/orders/nope').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const route = await request(app).get('/nada').expect(404);
    expect(route.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('responde 409 para transição inválida', async () => {
    const app = buildApp();
    await request(app).post('/orders').send(body).expect(201);

    const res = await request(app).post('/orders/id-1/complete').expect(409);

    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

describe('falhas inesperadas', () => {
  it('responde 500 sem vazar detalhes internos', async () => {
    const broken = {
      async save() {
        throw new Error('disco cheio: /var/segredo');
      },
      async findById() {
        return undefined;
      },
      async list() {
        return [];
      },
    };
    const service = new OrderService(broken, { next: () => 'x' }, { now: () => new Date() });
    const app = createApp({ service, logger: createLogger('silent'), metrics: createMetrics() });

    const res = await request(app).post('/orders').send(body).expect(500);

    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.text).not.toContain('segredo');
  });
});

describe('operação', () => {
  it('GET /health responde ok', async () => {
    const res = await request(buildApp()).get('/health').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /metrics expõe latência HTTP e transições de pedido', async () => {
    const app = buildApp();
    await request(app).post('/orders').send(body).expect(201);

    const res = await request(app).get('/metrics').expect(200);

    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toContain('orders_transitions_total{to="CREATED"} 1');
  });
});
