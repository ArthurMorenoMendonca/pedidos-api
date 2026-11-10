import { pino } from 'pino';
import type { Logger } from 'pino';

export function createLogger(level: string): Logger {
  return pino({
    level,
    base: { service: 'pedidos-api' },
    // Nunca registrar credenciais que cheguem em headers.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  });
}
