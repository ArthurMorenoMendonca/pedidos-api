# Uso de IA

Ferramenta: Claude (Anthropic), via interface de chat com ferramentas de arquivo e terminal.

> A nota é individual. Este arquivo declara honestamente como a IA foi usada. **Cada integrante deve
> acrescentar seus próprios prompts e o que verificou/alterou**, e saber explicar na apresentação qualquer
> trecho que esteja no repositório.

## Prompts que importaram

### 1. Enunciado completo

Colei o enunciado do trabalho (objetivo, entregáveis M1 a M4, estrutura de pastas e rubrica) e pedi ajuda para
montar o projeto.

### 2. Decisões em aberto

A IA perguntou domínio, stack, nível e quanto entregar. Respondi sem preferência de domínio, stack e nível, e pedi
o **projeto completo**. Decisões resultantes:

- Domínio: **pedidos** (fluxo criar -> pagar -> concluir/cancelar)
- Stack: Node 22 + TypeScript + Express, Vitest + Supertest, pino, prom-client, ESLint, Spectral, k6
- Nível declarado: completo, com `docs/c4/`

## O que a IA gerou

Esqueleto completo: código em `src/`, testes em `tests/`, `docker-compose.yml`, `Dockerfile`, CI, k6, OpenAPI e
documentação em `docs/`.

## O que foi verificado

Durante a geração foram executados: `npm run lint`, `npm run typecheck`, `npm run lint:openapi`,
`npm run test:coverage` (39 testes, coverage acima dos mínimos) e uma execução real da API com `curl`.

**Não foi verificado pela IA:** o `docker compose up` (sem daemon Docker no ambiente), o k6 (não instalado) e o
CI no GitHub Actions. Esses três precisam ser rodados por quem entrega.

## O que eu (integrante) revisei e alterei


**Meu ponto de partida**
Meu conhecimento era mais acadêmico. Eu tinha só o básico de Docker, nunca tinha usado o k6 e já tinha usado o GitHub
algumas vezes. No começo o projeto foi difícil por isso, principalmente a parte de subir tudo com Docker Compose,
rodar o teste de carga e configurar o CI. Fui aprendendo executando cada etapa e conferindo o resultado.

**O que li e entendi**
- Li o domínio (`src/domain/order.ts`): um pedido tem os estados CREATED, PAID, COMPLETED e CANCELLED, e só pode
  mudar de estado seguindo regras fixas. Uma transição inválida gera erro, que a API devolve como HTTP 409.
- Entendi a separação em camadas: o domínio guarda as regras, o serviço (`OrderService`) orquestra o caso de uso e
  a camada HTTP só traduz requisições e erros.
- Entendi o pattern Repository: o serviço depende de uma interface (`OrderRepository`), e hoje a implementação
  guarda os dados em memória. Por isso trocar por um banco não exigiria mudar as regras de negócio (ADR 0001).
- Entendi que o coverage mínimo está declarado no `vitest.config.ts` e que o CI falha se os testes ficarem abaixo
  dele.
- Entendi que o endpoint `/metrics` expõe a latência das requisições, que é a base do SLO medido pelo k6.

**O que executei e verifiquei no meu computador**
- Rodei `npm run lint`, `typecheck`, `lint:openapi` e `test:coverage`: 39 testes passaram, com coverage de 99%.
- Subi a API com `docker compose up --build` e percorri o fluxo criar, pagar e concluir, vendo o status passar
  por CREATED, PAID e COMPLETED.
- Rodei o k6 pela primeira vez (5 usuários por 30 s): p95 de 138,42 ms, sem falhas, dentro do SLO de 300 ms.
  Registrei os números em `docs/desempenho.md`.

**Dificuldades que resolvi**
- No Windows, o PowerShell bloqueou o `npm` por causa da política de execução de scripts. Resolvi liberando a
  execução para o meu usuário com `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Eu estava executando os comandos fora da pasta do projeto e precisei entrar na pasta correta com `cd`.
- No PowerShell, `curl` é um apelido de outro comando, então passei a usar `curl.exe` e `Invoke-RestMethod`.

**O que alterei**
- Preenchi `docs/desempenho.md` com o resultado real do k6 e corrigi o texto da medição preliminar.
- Ajustei o `CONTRIBUTORS.md` para o meu nome e troquei o `OWNER` do `docs/openapi.yaml` pelo meu usuário.

**O que a IA fez e o que eu fiz**
A IA gerou a estrutura inicial do código e da documentação, e me ajudou com o passo a passo de execução e do
GitHub. Eu executei, testei, conferi os resultados e passei a conseguir explicar o funcionamento de cada camada.
