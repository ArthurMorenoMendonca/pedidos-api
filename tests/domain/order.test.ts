import { describe, expect, it } from 'vitest';
import { InvalidTransitionError, ValidationError } from '../../src/domain/errors.js';
import { Order } from '../../src/domain/order.js';

const T0 = new Date('2026-01-01T10:00:00.000Z');
const T1 = new Date('2026-01-01T11:00:00.000Z');

const validItems = [
  { sku: 'A', quantity: 2, unitPriceCents: 1000 },
  { sku: 'B', quantity: 1, unitPriceCents: 550 },
];

function newOrder(): Order {
  return Order.create({ id: 'o-1', customerId: 'c-1', items: validItems, now: T0 });
}

describe('Order.create', () => {
  it('cria pedido em CREATED e calcula o total', () => {
    const snap = newOrder().toSnapshot();

    expect(snap.status).toBe('CREATED');
    expect(snap.totalCents).toBe(2550);
    expect(snap.createdAt).toBe(T0.toISOString());
  });

  it('remove espaços de customerId e sku', () => {
    const snap = Order.create({
      id: 'o-2',
      customerId: '  c-9  ',
      items: [{ sku: ' X ', quantity: 1, unitPriceCents: 1 }],
      now: T0,
    }).toSnapshot();

    expect(snap.customerId).toBe('c-9');
    expect(snap.items[0]?.sku).toBe('X');
  });

  it.each([
    ['customerId ausente', { customerId: undefined, items: validItems }],
    ['customerId vazio', { customerId: '   ', items: validItems }],
    ['items ausente', { customerId: 'c', items: undefined }],
    ['items vazio', { customerId: 'c', items: [] }],
    ['item nulo', { customerId: 'c', items: [null] }],
    ['sku vazio', { customerId: 'c', items: [{ sku: '', quantity: 1, unitPriceCents: 1 }] }],
    ['quantity zero', { customerId: 'c', items: [{ sku: 'A', quantity: 0, unitPriceCents: 1 }] }],
    ['quantity fracionada', { customerId: 'c', items: [{ sku: 'A', quantity: 1.5, unitPriceCents: 1 }] }],
    ['preço negativo', { customerId: 'c', items: [{ sku: 'A', quantity: 1, unitPriceCents: -5 }] }],
    ['preço como texto', { customerId: 'c', items: [{ sku: 'A', quantity: 1, unitPriceCents: '10' }] }],
  ])('rejeita %s', (_name, input) => {
    expect(() => Order.create({ id: 'o', now: T0, ...input })).toThrow(ValidationError);
  });
});

describe('transições de estado', () => {
  it('segue CREATED -> PAID -> COMPLETED e atualiza updatedAt', () => {
    const order = newOrder();

    order.pay(T1);
    expect(order.toSnapshot().status).toBe('PAID');
    expect(order.toSnapshot().updatedAt).toBe(T1.toISOString());

    order.complete(T1);
    expect(order.toSnapshot().status).toBe('COMPLETED');
  });

  it('permite cancelar em CREATED e em PAID', () => {
    const fromCreated = newOrder();
    fromCreated.cancel(T1);
    expect(fromCreated.toSnapshot().status).toBe('CANCELLED');

    const fromPaid = newOrder();
    fromPaid.pay(T1);
    fromPaid.cancel(T1);
    expect(fromPaid.toSnapshot().status).toBe('CANCELLED');
  });

  it('não completa pedido que não foi pago', () => {
    expect(() => newOrder().complete(T1)).toThrow(InvalidTransitionError);
  });

  it('não paga duas vezes', () => {
    const order = newOrder();
    order.pay(T1);
    expect(() => order.pay(T1)).toThrow(InvalidTransitionError);
  });

  it('não altera pedido concluído nem cancelado', () => {
    const done = newOrder();
    done.pay(T1);
    done.complete(T1);
    expect(() => done.cancel(T1)).toThrow(InvalidTransitionError);

    const cancelled = newOrder();
    cancelled.cancel(T1);
    expect(() => cancelled.pay(T1)).toThrow(InvalidTransitionError);
  });
});

describe('Order.restore', () => {
  it('reconstrói o mesmo estado a partir do snapshot', () => {
    const original = newOrder();
    original.pay(T1);

    const restored = Order.restore(original.toSnapshot());

    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });
});
