import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('usa valores padrão', () => {
    expect(loadConfig({})).toEqual({ port: 3000, logLevel: 'info' });
  });

  it('lê PORT e LOG_LEVEL do ambiente', () => {
    expect(loadConfig({ PORT: '8080', LOG_LEVEL: 'debug' })).toEqual({ port: 8080, logLevel: 'debug' });
  });

  it('falha com PORT inválida', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow('PORT inválida');
    expect(() => loadConfig({ PORT: '70000' })).toThrow('PORT inválida');
  });
});
