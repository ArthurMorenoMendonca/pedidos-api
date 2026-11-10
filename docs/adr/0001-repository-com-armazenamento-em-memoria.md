# 0001 — Repository com armazenamento em memória

- Status: aceita
- Data: 2026-11-07

## Contexto e problema

A API precisa persistir pedidos para que o fluxo criar -> pagar -> concluir funcione entre requisições.
O projeto é de domínio único, sem exigência de volume, e deve subir com um único `docker compose up`.
Ao mesmo tempo, a regra de negócio precisa ser testável sem infraestrutura e o armazenamento não pode
ficar acoplado ao serviço.

## Fatores de decisão

- Subir com 1 comando e sem dependências externas
- Testes unitários rápidos e determinísticos
- Possibilidade de trocar o armazenamento sem reescrever regras de negócio
- Simplicidade: mostrar engenharia, não tamanho

## Opções consideradas

1. **Repository (interface) + implementação em memória**
2. Serviço acessando diretamente um banco (ex.: Postgres via ORM)
3. Serviço acessando diretamente um `Map` global

## Decisão

Opção 1. O pattern **Repository** é definido pela interface `OrderRepository`; o `OrderService` depende dela
(Dependency Inversion) e recebe a implementação por construtor. A implementação inicial,
`InMemoryOrderRepository`, guarda *snapshots* (cópias), de modo que o domínio nunca compartilha referências
mutáveis com o armazenamento.

## Consequências

Positivas:

- Testes do serviço rodam sem banco e sem mocks complexos
- Trocar para Postgres (ou outro) é criar uma nova classe que implementa `OrderRepository`; serviço e domínio não mudam
- Compose continua com um único serviço

Negativas:

- Dados são perdidos ao reiniciar a API
- Não escala horizontalmente (cada instância teria seu próprio estado)

## Por que não as outras opções

- **Opção 2**: adiciona container, migrações e configuração que não agregam ao objetivo do trabalho e
  acoplariam o serviço ao banco.
- **Opção 3**: mais simples ainda, mas espalha o acesso a dados pelo serviço e impede trocar a persistência
  sem alterar regra de negócio.

## Revisitar quando

Houver necessidade de durabilidade ou mais de uma instância da API: criar `PostgresOrderRepository` e
registrar em `src/server.ts`.
