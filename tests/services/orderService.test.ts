import { beforeEach, describe, expect, it } from 'vitest';
import { InvalidTransitionError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { InMemoryOrderRepository } from '../../src/repositories/inMemoryOrderRepository.js';
import { OrderService } from '../../src/services/orderService.js';

const items = [{ sku: 'A', quantity: 1, unitPriceCents: 1000 }];

function buildService() {
  let n = 0;
  let tick = 0;
  return new OrderService(
    new InMemoryOrderRepository(),
    { next: () => `id-${++n}` },
    { now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)) },
  );
}

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    service = buildService();
  });

  it('cria e recupera um pedido', async () => {
    const created = await service.create({ customerId: 'c-1', items });

    expect(created.id).toBe('id-1');
    expect(await service.get('id-1')).toEqual(created);
  });

  it('não persiste pedido inválido', async () => {
    await expect(service.create({ customerId: '', items })).rejects.toThrow(ValidationError);
    expect(await service.list()).toHaveLength(0);
  });

  it('executa o fluxo completo e persiste cada passo', async () => {
    await service.create({ customerId: 'c-1', items });

    expect((await service.pay('id-1')).status).toBe('PAID');
    expect((await service.complete('id-1')).status).toBe('COMPLETED');
    expect((await service.get('id-1')).status).toBe('COMPLETED');
  });

  it('cancela um pedido', async () => {
    await service.create({ customerId: 'c-1', items });

    expect((await service.cancel('id-1')).status).toBe('CANCELLED');
  });

  it('propaga transição inválida e mantém o estado anterior', async () => {
    await service.create({ customerId: 'c-1', items });

    await expect(service.complete('id-1')).rejects.toThrow(InvalidTransitionError);
    expect((await service.get('id-1')).status).toBe('CREATED');
  });

  it('retorna NotFoundError para id inexistente', async () => {
    await expect(service.get('nope')).rejects.toThrow(NotFoundError);
    await expect(service.pay('nope')).rejects.toThrow(NotFoundError);
  });

  it('lista todos e filtra por status', async () => {
    await service.create({ customerId: 'c-1', items });
    await service.create({ customerId: 'c-2', items });
    await service.pay('id-2');

    expect(await service.list()).toHaveLength(2);
    expect((await service.list('PAID')).map((o) => o.id)).toEqual(['id-2']);
    expect((await service.list('CREATED')).map((o) => o.id)).toEqual(['id-1']);
  });

  it('rejeita filtro de status inválido', async () => {
    await expect(service.list('QUALQUER')).rejects.toThrow(ValidationError);
  });
});
