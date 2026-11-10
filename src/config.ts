export interface Config {
  port: number;
  logLevel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT inválida: ${env.PORT}`);
  }
  return { port, logLevel: env.LOG_LEVEL ?? 'info' };
}
