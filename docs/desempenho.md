# Desempenho

## Métrica e SLO

**Métrica:** `http_request_duration_seconds` (histograma, `GET /metrics`), com labels `method`, `route` e `status`.

**SLO (fluxo principal: criar -> pagar -> concluir):**

| Indicador                         | Objetivo                 |
| --------------------------------- | ------------------------ |
| Latência p95 das requisições      | < 300 ms                 |
| Requisições sem erro 5xx          | >= 99,5%                 |

O mesmo limite de latência está como *threshold* em `k6/smoke.js`, então o k6 falha se o SLO for violado.

## Smoke test com k6

Cenário (`k6/smoke.js`): 5 usuários virtuais por 30 s, cada um repetindo criar -> pagar -> concluir.

Como reproduzir:

```bash
docker compose up -d --build
k6 run k6/smoke.js
```

### Resultado oficial (k6)



|    Data    |              Máquina                | VUs / duração   Requisições | Falhas     | p50      | p90       | **p95**         | SLO cumprido?             |
|      |                                           | ------------- | ----------- | ------     | ---      | ---       | -------         | -------------             |
| 09/11/2026 | Windows, Docker Desktop (compose)   | 5 / 30 s      | 1278        | 0 (0,00%)  | 32,27 ms | 105,33 ms | **138,42 ms**   | Sim (p95 < 300 ms)        |

## Medição preliminar (não substitui o k6)

Antes do teste oficial, a API foi executada em outro ambiente (Linux, `tsx src/server.ts`, sem Docker) e exercitada
por um script Node com 5 workers por ~15 s no mesmo fluxo, apenas para validar que o SLO era plausível:

| Requisições | Falhas | p50 | p90 | p95 | máx |
| ----------- | ------ | --- | --- | --- | --- |
| 1080        | 0      | 2,03 ms | 4,58 ms | 5,82 ms | 43,57 ms |

A diferença para o resultado oficial (p95 de 5,82 ms contra 138,42 ms) vem do ambiente: o teste oficial roda a API
dentro do Docker no Windows, com o k6 do lado de fora, o que adiciona latência de rede e de virtualização. O SLO de
300 ms foi cumprido com folga nos dois casos. Esses números preliminares **não** são o resultado oficial pedido.

## Leitura e limites

- Os números dependem da máquina e do fato de o armazenamento ser em memória (ver ADR 0001). Com um banco real,
  a latência de escrita passaria a pesar e o SLO deveria ser reavaliado.
- O smoke test não é teste de capacidade: mostra que o fluxo principal responde dentro do SLO sob carga leve.
