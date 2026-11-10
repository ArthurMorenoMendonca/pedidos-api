import { InvalidTransitionError, ValidationError } from './errors.js';

export const ORDER_STATUSES = ['CREATED', 'PAID', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderSnapshot {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderParams {
  id: string;
  customerId: unknown;
  items: unknown;
  now: Date;
}

/**
 * Ciclo de vida permitido:
 *   CREATED -> PAID -> COMPLETED
 *   CREATED | PAID -> CANCELLED
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  CREATED: ['PAID', 'CANCELLED'],
  PAID: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class Order {
  private constructor(
    private readonly id: string,
    private readonly customerId: string,
    private readonly items: readonly OrderItem[],
    private status: OrderStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: CreateOrderParams): Order {
    const customerId = parseCustomerId(params.customerId);
    const items = parseItems(params.items);
    return new Order(params.id, customerId, items, 'CREATED', params.now, params.now);
  }

  static restore(snapshot: OrderSnapshot): Order {
    return new Order(
      snapshot.id,
      snapshot.customerId,
      snapshot.items.map((item) => ({ ...item })),
      snapshot.status,
      new Date(snapshot.createdAt),
      new Date(snapshot.updatedAt),
    );
  }

  pay(now: Date): void {
    this.transitionTo('PAID', now);
  }

  complete(now: Date): void {
    this.transitionTo('COMPLETED', now);
  }

  cancel(now: Date): void {
    this.transitionTo('CANCELLED', now);
  }

  get totalCents(): number {
    return this.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  }

  toSnapshot(): OrderSnapshot {
    return {
      id: this.id,
      customerId: this.customerId,
      items: this.items.map((item) => ({ ...item })),
      status: this.status,
      totalCents: this.totalCents,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  private transitionTo(next: OrderStatus, now: Date): void {
    if (!ALLOWED[this.status].includes(next)) {
      throw new InvalidTransitionError(`Não é possível ir de ${this.status} para ${next}`);
    }
    this.status = next;
    this.updatedAt = now;
  }
}

function parseCustomerId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError('customerId é obrigatório');
  }
  return value.trim();
}

function parseItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('items deve ter ao menos 1 item');
  }
  return value.map((raw, index) => parseItem(raw, index));
}

function parseItem(raw: unknown, index: number): OrderItem {
  const item = (raw ?? {}) as Record<string, unknown>;
  const where = `items[${index}]`;

  if (typeof item.sku !== 'string' || item.sku.trim() === '') {
    throw new ValidationError(`${where}.sku é obrigatório`);
  }
  if (!Number.isInteger(item.quantity) || (item.quantity as number) <= 0) {
    throw new ValidationError(`${where}.quantity deve ser inteiro maior que 0`);
  }
  if (!Number.isInteger(item.unitPriceCents) || (item.unitPriceCents as number) <= 0) {
    throw new ValidationError(`${where}.unitPriceCents deve ser inteiro maior que 0`);
  }
  return {
    sku: item.sku.trim(),
    quantity: item.quantity as number,
    unitPriceCents: item.unitPriceCents as number,
  };
}
