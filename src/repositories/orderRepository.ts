import type { OrderSnapshot, OrderStatus } from '../domain/order.js';

/**
 * Pattern: Repository.
 * O serviço depende desta interface (DIP), não de um armazenamento concreto.
 * Ver docs/adr/0001-repository-com-armazenamento-em-memoria.md
 */
export interface OrderRepository {
  save(order: OrderSnapshot): Promise<void>;
  findById(id: string): Promise<OrderSnapshot | undefined>;
  list(filter?: { status?: OrderStatus }): Promise<OrderSnapshot[]>;
}
