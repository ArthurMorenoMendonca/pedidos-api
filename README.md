**Nível: Projeto completo (com `docs/c4/`)**

# Pedidos API

API REST de domínio único para gerenciar **pedidos**. O fluxo principal funciona de ponta a ponta:

```
POST /orders  ->  POST /orders/:id/pay  ->  POST /orders/:id/complete
                         \-> POST /orders/:id/cancel (também a partir de CREATED)
```

Estados: `CREATED -> PAID -> COMPLETED`, com `CANCELLED` possível a partir de `CREATED` ou `PAID`.
Transições inválidas retornam `409`.

## Primeiro dia

### Pré-requisitos

- Docker e Docker Compose (para subir com 1 comando)
- Node.js 22+ (para rodar testes e lint fora do Docker)

### Subir (1 comando)

```bash
docker compose up --build
```

A API fica em <http://localhost:3000>. Confira com `curl http://localhost:3000/health`.

### Experimentar o fluxo

```bash
curl -s -X POST localhost:3000/orders -H 'content-type: application/json' \
  -d '{"customerId":"c1","items":[{"sku":"LIVRO-1","quantity":2,"unitPriceCents":4500}]}'
# copie o "id" da resposta:
curl -s -X POST localhost:3000/orders/<id>/pay
curl -s -X POST localhost:3000/orders/<id>/complete
curl -s localhost:3000/orders/<id>
```

### Rodar localmente (sem Docker)

```bash
cp .env.example .env
npm ci
npm run dev
```

### Testar

```bash
npm run lint            # ESLint
npm run typecheck       # TypeScript
npm run lint:openapi    # Spectral em docs/openapi.yaml
npm test                # unitários + integração
npm run test:coverage   # idem, falha se abaixo do coverage mínimo
```

**Coverage mínimo declarado** (`vitest.config.ts`): linhas e statements 85%, funções 85%, branches 80%.
O CI quebra se algum limite não for respeitado. `src/server.ts` (apenas bootstrap) fica fora da conta.

### Teste de carga (smoke com k6)

Com a API no ar (`docker compose up -d`):

```bash
k6 run k6/smoke.js
```

Resultados e SLO em [`docs/desempenho.md`](docs/desempenho.md).

## Configuração

Variáveis em [`.env.example`](.env.example). O `.env` real não vai para o git (`.gitignore`), e o CI roda
[gitleaks](https://github.com/gitleaks/gitleaks) para impedir segredos no histórico.

| Variável    | Padrão | Descrição                                     |
| ----------- | ------ | --------------------------------------------- |
| `PORT`      | `3000` | Porta HTTP                                    |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` |

## Observabilidade

- **Logs estruturados** em JSON com `pino` (uma linha por requisição via `pino-http`; `authorization` e `cookie` são mascarados).
- **Métricas** em `GET /metrics` (formato Prometheus, `prom-client`):
  `http_request_duration_seconds` (latência por rota/status) e `orders_transitions_total` (pedidos por estado).
- **SLO**: 99% das requisições do fluxo principal abaixo de 300 ms e 99,5% sem erro 5xx. Detalhes em `docs/desempenho.md`.

## Arquitetura

```
src/
├─ domain/         regras de negócio puras (Order, máquina de estados, erros)
├─ services/       casos de uso (OrderService), dependem de interfaces
├─ repositories/   interface OrderRepository + implementação em memória
└─ http/           Express: rotas, métricas por requisição, tradução de erros
```

- **SOLID**: `OrderService` recebe `OrderRepository`, `IdGenerator` e `Clock` por construtor (DIP, fácil de trocar/testar);
  o domínio não conhece HTTP nem armazenamento (SRP); novas implementações de repositório não exigem mudar o serviço (OCP).
- **Pattern justificado**: Repository. Ver [ADR 0001](docs/adr/0001-repository-com-armazenamento-em-memoria.md).
- **Contexto C4**: [`docs/c4/contexto.md`](docs/c4/contexto.md).
- **Contrato da API**: [`docs/openapi.yaml`](docs/openapi.yaml).

## Limitação conhecida

Os pedidos ficam **em memória**: reiniciar a API apaga os dados. É uma decisão consciente (ADR 0001); trocar por um banco
exige apenas uma nova implementação de `OrderRepository`.

## Documentos da entrega

- [`CONTRIBUTORS.md`](CONTRIBUTORS.md) — quem fez o quê
- [`docs/desempenho.md`](docs/desempenho.md) — SLO e p95 medido
- [`docs/ia.md`](docs/ia.md) — prompts de IA que importaram
- Link da execução verde do CI: _colar aqui após o primeiro run verde no GitHub Actions_
