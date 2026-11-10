import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { createLogger } from './logger.js';
import { createMetrics } from './metrics.js';
import { InMemoryOrderRepository } from './repositories/inMemoryOrderRepository.js';
import { OrderService } from './services/orderService.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);

const service = new OrderService(
  new InMemoryOrderRepository(),
  { next: () => randomUUID() },
  { now: () => new Date() },
);

const app = createApp({ service, logger, metrics: createMetrics() });

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'API no ar');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'encerrando');
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
