import { NotFoundError, ValidationError } from '../domain/errors.js';
import { ORDER_STATUSES, Order } from '../domain/order.js';
import type { OrderSnapshot, OrderStatus } from '../domain/order.js';
import type { OrderRepository } from '../repositories/orderRepository.js';

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  now(): Date;
}

export interface CreateOrderInput {
  customerId: unknown;
  items: unknown;
}

export class OrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async create(input: CreateOrderInput): Promise<OrderSnapshot> {
    const order = Order.create({
      id: this.ids.next(),
      customerId: input.customerId,
      items: input.items,
      now: this.clock.now(),
    });
    const snapshot = order.toSnapshot();
    await this.repository.save(snapshot);
    return snapshot;
  }

  async get(id: string): Promise<OrderSnapshot> {
    return this.load(id).then((order) => order.toSnapshot());
  }

  async list(status?: string): Promise<OrderSnapshot[]> {
    if (status === undefined) {
      return this.repository.list();
    }
    if (!isOrderStatus(status)) {
      throw new ValidationError(`status inválido: ${status}`);
    }
    return this.repository.list({ status });
  }

  pay(id: string): Promise<OrderSnapshot> {
    return this.transition(id, (order, now) => order.pay(now));
  }

  complete(id: string): Promise<OrderSnapshot> {
    return this.transition(id, (order, now) => order.complete(now));
  }

  cancel(id: string): Promise<OrderSnapshot> {
    return this.transition(id, (order, now) => order.cancel(now));
  }

  private async transition(
    id: string,
    apply: (order: Order, now: Date) => void,
  ): Promise<OrderSnapshot> {
    const order = await this.load(id);
    apply(order, this.clock.now());
    const snapshot = order.toSnapshot();
    await this.repository.save(snapshot);
    return snapshot;
  }

  private async load(id: string): Promise<Order> {
    const snapshot = await this.repository.findById(id);
    if (!snapshot) {
      throw new NotFoundError(`Pedido ${id} não encontrado`);
    }
    return Order.restore(snapshot);
  }
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
