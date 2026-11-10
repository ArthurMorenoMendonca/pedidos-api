import type { OrderSnapshot, OrderStatus } from '../domain/order.js';
import type { OrderRepository } from './orderRepository.js';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<string, OrderSnapshot>();

  async save(order: OrderSnapshot): Promise<void> {
    this.store.set(order.id, structuredClone(order));
  }

  async findById(id: string): Promise<OrderSnapshot | undefined> {
    const found = this.store.get(id);
    return found ? structuredClone(found) : undefined;
  }

  async list(filter: { status?: OrderStatus } = {}): Promise<OrderSnapshot[]> {
    const all = [...this.store.values()].map((order) => structuredClone(order));
    const filtered = filter.status ? all.filter((order) => order.status === filter.status) : all;
    return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
