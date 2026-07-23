# Diário de Bordo — Uso de IA no CampusCycle

> Rascunho corrente, atualizado a cada sessão de trabalho. Versão final consolidada no README no dia 13.
> Estrutura exigida pelo edital: (1) ferramentas utilizadas, (2) exemplos de prompts, (3) links/registros de conversas, (4) reflexão crítica (incluindo caso concreto de erro/alucinação da IA e como foi corrigido).

## Ferramentas utilizadas

- **Claude Code (Anthropic)** — planejamento, geração de código assistida e revisão. Todas as decisões de arquitetura passaram por revisão adversarial (descrita abaixo) antes de qualquer implementação.
- **OpenAI Codex** — restauração de contexto, auditoria do código entregue e preparação da documentação final de estudo, README e freeze.
- **gstack** — fluxos estruturados de planejamento, revisão de engenharia/design, QA, documentação e preservação de contexto entre sessões.
- Segunda opinião cross-model: subagentes Claude com contexto limpo ("outside voice") desafiando o plano principal — 20 achados absorvidos, 1 rejeitado com justificativa.

## Sessões

### 2026-07-16 (dia 0) — Planejamento e design

- **Processo:** brainstorm estruturado (office-hours) → design doc → revisão de escopo (modo CEO) → revisão de engenharia → consultoria de design. 3 rodadas de revisão adversarial, 43 emendas incorporadas, 20 issues corrigidas antes de escrever qualquer linha de código.
- **Artefatos gerados:** `docs/design-doc.md` (plano aprovado), `DESIGN.md` (design system "Xilo-Feira"), `docs/test-plan.md`, `TODOS.md` (diferimentos deliberados).
- **Exemplo de curadoria (candidato à Reflexão Crítica):** a segunda opinião (outside voice) da revisão de engenharia recomendou remover o branch `failed → "toque para revisar"` da fila offline como código morto. A recomendação foi **rejeitada** após análise: os casos 409, 413 e drift de schema ainda alcançam esse branch. A IA revisora estava errada; a decisão humana manteve o branch com um refinamento (exibir a mensagem de erro do servidor no formulário reaberto). Registro: emenda Eng 9 (OV-9) no design doc.
- **Decisão de segurança originada em review de IA:** a migração de stub anônimo → conta registrada foi identificada como vetor de account takeover não-autenticado e abandonada (emenda CEO 7 / OV-3). `/register` sempre cria usuário novo.

### 2026-07-17 (dia 1) — Setup do repo e walking skeleton do server

- **Prompt real (resumido):** "acesse as docs do planejamento e comecemos a implementar; todas as specs e docs do processo de engenharia versionadas no git; crie um CLAUDE.md para guiar as próximas sessões; poucos commits, apenas grandes progressos."
- Specs versionadas em `docs/`; `CLAUDE.md` criado como contrato de contexto entre sessões de IA (garante que decisões travadas não sejam reabertas por uma sessão nova sem contexto).
- **Curadoria humana sobre a IA (2 casos):** (1) a IA propôs commitar diretamente — processo corrigido: commits são sempre revisados e executados pelo autor; (2) a IA vazou paths locais da máquina em docs versionadas — detectado na revisão humana, varredura completa feita e regra permanente adicionada ao CLAUDE.md.
- Walking skeleton do server implementado e verde: Express + TS estrito + zod + Prisma/Postgres (docker-compose local), envelope de erro padronizado, identidade estágio 1 (resolver exclusivo por `IDENTITY_MODE`, com diagrama inline), idempotência P2002 (mesmo dono → 200; outro dono → 409), rate limit de escrita, rotas `POST/GET/GET:id/DELETE /api/listings` + `/api/stats` (groupBy no banco + piso simulado) + `/api/health`.
- **14 testes de API (vitest + supertest) passando**; smoke test manual das rotas com o servidor real. Pendente da fase: deploy no Render + ping (depende das contas do pré-requisito 0).

### 2026-07-17 (dia 1, sessão contínua) — Front esqueleto PWA (adiantando o dia 3)

- Scaffold `web/`: React + Vite + TS estrito + vite-plugin-pwa em modo `injectManifest` (SW autoral em `src/sw.ts` com a tabela de estratégias como comentário), manifest completo, ícones 192/512 + maskable gerados com a fonte real Alfa Slab One.
- Feed + NewListing consumindo a API; validação zod no cliente ANTES do envio (cópia disciplinada do schema do server); UUID do anúncio gerado no mount do formulário (fundação da idempotência da fila offline); UX de cold start ("servidor acordando").
- Tokens do design system Xilo-Feira em CSS custom properties; fontes self-hosted via @fontsource.
- **Verificação que rendeu correção (material de reflexão crítica):** o build inicial do PWA NÃO precacheava as fontes woff2 — o default do plugin só inclui js/css/html. Detectado inspecionando o manifest de precache gerado em `dist/sw.js`; sem a correção (`globPatterns`), a cena do modo avião renderizaria em Verdana. Corrigido e re-verificado (19 entradas, subsets vietnamitas excluídos).
- **QA automatizado em navegador headless pegou bug real:** CORS bloqueava o preview de produção (allowlist só tinha a porta do dev server, 5173, não a do `vite preview`, 4173). Corrigido no server e re-testado: fluxo completo criar anúncio → validar → publicar → aparecer no feed, verificado em desktop e mobile viewport.

### 2026-07-17 (dia 1, sessão contínua) — Obrigatórios dos dias 4-5

- **API:** filtros `?category=&q=&donation=true` (busca case-insensitive em título+descrição), rota `/api/listings/mine` registrada ANTES de `/:id`; suíte sobe para 20 testes verdes. Seed com 24 anúncios (todas as categorias, `imageUrl: null` — placeholder é feature), 3 vendidos + 2 doados para o contador ter dado real.
- **Web:** Landing com O PLACAR (odômetro por tiras de dígitos, stagger 1.2s, `aria-hidden` + valor em sr-only, reduced-motion estático), vitrine com chips `aria-pressed`, cards hang-tag (furo, rotação alternada ±1°, 3 variantes de placeholder por hash do id), `/mine` com remoção, detalhe mínimo, bottom-nav mobile em Chivo Mono 12px.
- **3 bugs reais detectados pelo QA automatizado em navegador (material de reflexão crítica):**
  1. *Closure stale nos chips de filtro:* cliques em sequência rápida sobrescreviam o toggle anterior (o onClick fechava sobre a prop `filters` do render antigo). Diagnóstico: contagens de cards inconsistentes no QA → inspeção de `aria-pressed` via DOM. Correção: functional updates (`prev => next`).
  2. *`apiGet` sem header de identidade:* `/mine` respondia 401 — o header `X-User-Id` só era enviado em POST/DELETE. Correção: identidade centralizada no transporte (toda requisição).
  3. *Processo de API stale:* o servidor de teste rodava código antigo (iniciado com `tsx` sem watch antes das mudanças) — os filtros "não funcionavam" no navegador mas passavam nos testes. Lição operacional: sempre conferir se o processo em execução corresponde ao código.
- Nota do PWA em desenvolvimento: com `registerType: 'prompt'`, o SW serve o bundle precacheado antigo até o usuário aceitar a atualização — comportamento correto em produção, mas exige unregister/limpeza de caches ao fazer QA local de builds sucessivos.

### 2026-07-17 (dia 1, sessão contínua) — Auth JWT backend (dia 6 do plano)

- Padronização: mensagens de commit em inglês (histórico reescrito com `git filter-branch --msg-filter`; force-push necessário).
- `POST /api/auth/register` e `/login`: bcrypt (custo 10), JWT com expiração de 7 dias (anúncio enfileirado offline horas antes ainda sincroniza), resposta idêntica para e-mail inexistente e senha errada (não vaza cadastro), P2002 → 409 EMAIL_TAKEN.
- **Propriedade de segurança central testada:** registro SEMPRE cria usuário novo — teste prova que o stub anônimo não é reivindicado (id novo ≠ UUID anônimo; conta nova começa com 0 anúncios; o stub continua dono dos dele). Decisão da revisão de planejamento (vetor de account takeover) virou teste automatizado.
- **Resolver exclusivo em código:** modo `jwt` ignora `X-User-Id` por completo (teste: header presente sem token → 401); rotas de auth nem existem em modo `anonymous` (404); boot falha sem `JWT_SECRET` em modo jwt. Diagrama do `identity.ts` atualizado no mesmo commit.
- Suíte: **30 testes verdes** (10 novos de auth, cobrindo as emendas Eng 5 e 12).

### 2026-07-17 (dia 1, sessão contínua) — Auth JWT frontend (dia 7 do plano)

- Sessão JWT no cliente: `AuthContext` + `startSession`/`endSession`, com **purge do runtime cache da API na troca de identidade** (emenda Eng 7) — o nome do cache (`campuscycle-api-v1`) virou contrato compartilhado em `lib/cacheNames.ts`, que o `sw.ts` consumirá nos dias 8-9.
- Modo exclusivo espelhado no cliente via `VITE_IDENTITY_MODE`: em `jwt`, o transporte envia só `Authorization: Bearer` (nunca X-User-Id); em `anonymous`, só o UUID. Rotas `/login`/`/register` nem são montadas em modo anonymous.
- Páginas Login/Registro validando com cópia verbatim de `schemas/auth.ts` do server; guarda `RequireAuth` em `/new` e `/mine`; 401 em voo (token expirado) → redireciona para login com retorno à rota original.
- QA ponta a ponta em modo jwt (builds e envs via shell, sem tocar em `.env`): `/new` deslogado → `/login`; registro → saudação no header; anúncio criado com Bearer; `/mine` lista; logout → `/mine` volta ao login; senha errada exibe o erro do envelope; re-login retorna à rota `next` com os dados. Zero erros de console.
- Ambiente local restaurado ao padrão `anonymous` — o flip para jwt é decisão de deploy (uma env em cada plataforma).

### 2026-07-17 (dia 1, sessão contínua) — Offline leitura + PATCH + polimento (dias 8-9 do plano)

- **Prompt real:** restauração de contexto da sessão anterior (`/context-restore`) + "continue" — a IA retomou o plano salvo e executou o bloco dos dias 8-9 sem reabrir decisões já travadas.
- **SW (runtime caching), completando a tabela do `sw.ts`:** NetworkFirst para `GET /api/listings*` no cache `campuscycle-api-v1` (o contrato de `lib/cacheNames.ts` criado na sessão de auth) com `networkTimeoutSeconds: 4` — no cold start do Render, quem já tem cache vê o feed cacheado enquanto o servidor acorda (emenda CEO 8); CacheFirst para imagens externas (60 itens/30 dias); NetworkOnly para `/api/auth/*`. Tabela-comentário atualizada no mesmo commit, como manda a convenção.
- **Detalhe técnico que evitaria um bug silencioso:** imagens externas sem CORS chegam como resposta *opaca* (status 0) e o Workbox NÃO as cacheia por padrão — sem o `CacheableResponsePlugin({ statuses: [0, 200] })`, o CacheFirst pareceria funcionar online e falharia offline. Registrado como comentário no código.
- **PATCH `/api/listings/:id` (o U do CRUD, emenda CEO 18):** schema zod parcial + `.strict()` + "ao menos um campo"; só título/descrição/preço/status (escopo do design doc); checagem de dono (403), 404, 401, select público sem `userId`. Cópia verbatim espelhada no schema do web. **Suíte: 30 → 35 testes verdes** (5 novos: dono marca vendido, não-dono 403, 404/401, status inválido/campo estranho/body vazio 400, preço → doação).
- **"Vendi!/Doei!" em Meus Anúncios:** botões no card (disabled durante a requisição), estado atualizado com a resposta do server; o placar reflete a venda via `/api/stats` (groupBy por status) — nenhum contador paralelo no cliente.
- **Skeletons no formato hang-tag:** blocos de tinta a 8% com pulso de opacidade — shimmer de gradiente é proibido pelo DESIGN.md, então o pulso anima só `opacity` (regra transform/opacity-only) e `prefers-reduced-motion` desliga a animação. Vitrine (6), Meus Anúncios (3) e Detalhe.
- **Empty states:** caixas de borda tracejada com carimbo Chivo Mono + CTA "Anunciar agora" (vitrine filtrada vazia e /mine vazio).
- Pendente de QA manual (test-plan): cena do modo avião com feed cacheado no build de produção — depende do dispositivo de demo (pré-requisito 0).

### 2026-07-17 (dia 1, sessão contínua) — Fila offline, o momento-uau (dias 10-12 do plano)

- **Prompt real:** "commitado, vamos prosseguir" — a IA releu as emendas vinculantes (CEO 1-4, Eng 8-11) antes de escrever qualquer linha.
- **`lib/offlineQueue.ts`:** máquina de estados `pending | synced | failed` persistida no IndexedDB (lib `idb`), com `errorReason` e `retryCount`; o diagrama ASCII da emenda CEO 1 vive como comentário no topo do arquivo. Sync primário = listener `online` + retry no load (Background Sync segue como stretch no TODOS.md). Classificação por tentativa: falha de rede permanece `pending` intocada (offline não é erro do item); 401 → `pending` + flag de re-login (o login dispara `syncQueue()`); 429 → `pending` + backoff sem contar retry; 5xx conta retry e falha na 5ª; demais 4xx → `failed` com a mensagem **do servidor** (emenda Eng 9). Nenhum estado é silencioso.
- **Guarda de IndexedDB (emenda Eng 8):** `enqueue()` lança e o formulário mostra erro visível preservando os dados; leitura/sync degradam em silêncio (lista vazia / no-op).
- **`lib/mergeMine.ts` (função pura, OV-2):** serverItems + fila mesclados pelo UUID do cliente — servidor ganha o conteúdo, gêmeo recém-sincronizado ganha o carimbo "publicado", item só-local entra com badge; ordenação mais-recente-primeiro.
- **UI:** NewListing enfileira na falha de rede e navega para /mine; item `failed` reabre o formulário preenchido exibindo o erro do servidor, **reusando o mesmo UUID** (idempotência da emenda CEO 3); badges em Chivo Mono com o "thunk" de carimbo (scale 1.15→1, 120ms, só transform; reduced-motion estático).
- **Testes (emenda Eng 11): 13 novos no web** — um por transição (rede→pending; 2xx→synced; 4xx→failed+motivo; 401→pending+flag; 429→pending+backoff sem re-tentativa dentro da janela; 5º retry→failed) + invariante "mesmo UUID em todos os retries" + guarda de IDB + 5 testes do merge (dedupe/carimbo/ordenação). fake-indexeddb + fetch mockado + módulo limpo por teste. Suíte total: **35 server + 13 web verdes**.
- **Erro operacional da IA detectado e corrigido (material de Reflexão Crítica):** o `npm install` das dependências da fila rodou na **raiz do monorepo** (o diretório de trabalho do shell tinha resetado entre turnos), criando `package.json`/`package-lock.json`/`node_modules` na raiz — violando a decisão travada "monorepo SEM package.json na raiz" (emenda CEO 13). Sintoma: `npm test` falhou com "Missing script"; diagnóstico pelo `pwd` + `git status`; correção: raiz limpa e reinstalação dentro de `web/`. Lição: verificar o cwd antes de comandos com efeito em disco.
- Pendente: checklist manual do modo avião ×3 (inclui purge de identidade e reabrir o app instalado offline em rota interna) — depende do build de produção no dispositivo de demo.

### 2026-07-18 (dia 2) — Deploy em produção + QA automatizado (Render + Vercel + Neon)

- **Prompt real:** "fiz o deploy do vercel… faz o /qa completo".
- **Deploy:** API no Render (root `server`, build `npm ci && npm run build && npx prisma migrate deploy`), PWA no Vercel (root `web`), banco Neon (pooled + `pgbouncer=true`). Seed de produção rodado da máquina local contra o Neon (24 anúncios, 3 sold, 2 donated) — verificado via `/api/stats` (0 → 24). Ping do UptimeRobot em `/api/stats`.
- **QA automatizado em navegador headless (gstack /qa) pegou 2 bugs CRÍTICOS de configuração de deploy — material de Reflexão Crítica:**
  1. *Barra dupla na URL da API (`//api/stats` → 404):* o placar mostrava 0 e a vitrine dava "não foi possível carregar", mesmo com a API respondendo 200 no fetch manual. Diagnóstico pelo painel de network do browse: o app chamava `onrender.com//api/stats` (barra dupla). Causa: `VITE_API_URL` setado no Vercel COM barra final; o `api.ts` fazia `${BASE}${path}` sem normalizar. **Correção durável no código** (não só na env): `BASE.replace(/\/+$/, '')` — o app passa a tolerar barra final, fechando a classe inteira de erro. 13 testes web seguem verdes.
  2. *Deep-link a rotas internas → 404 do Vercel:* `/login`, `/mine`, `/new`, `/listings/:id` retornavam 404 no acesso direto/refresh (o React Router só resolvia via clique). Faltava o rewrite de SPA. **Impacto crítico na cena do modo avião** (abrir o app instalado numa rota interna offline — emenda CEO 4). Correção: `web/vercel.json` com rewrite `/(.*) → /index.html`.
- **O que já está verde em produção:** Landing carrega sem erros de console, design system Xilo-Feira renderizado, manifest válido + SW registrado + instalável, API sã (CORS correto — o `WEB_ORIGIN` bateu com o domínio novo `campus-cycles.vercel.app`).
- **Bloqueado até o redeploy:** fluxo register→login→anunciar→/mine→marcar vendido e a cena do modo avião — ambos dependem da API alcançável (bug 1). Re-QA agendado após redeploy dos dois fixes.

### 2026-07-18 (dia 2, sessão contínua) — QA completo de produção: funcionalidade + design/UX

- **Prompt real:** "vamos fazer o /qa com fluxo completo do nosso app, teste e valide todas as funcionalidades, incluindo possiveis erros de inconsistencia em design ui/ux".
- **Todos os fluxos verificados em produção (navegador headless):** filtros combinados (Livros + Só doações → exatamente o card esperado do seed), busca com debounce, detalhe com deep-link, guarda de rota, registro com validação amigável, re-login retornando à rota original (`next`), publicar → /mine → Vendi! → stamp VENDIDO + placar subindo exatamente +R$ 12,00 → remover → empty state. Mobile 375px: sem overflow, chips no piso de 44px, bottom-nav fixa. Fontes reais confirmadas via `document.fonts` (nada de Verdana). **Health score: 96/100.**
- **Achado de UX corrigido (medium):** o form de anúncio exibia erro de validação em inglês cru do zod ("title: String must contain at least 3 character(s)"), inconsistente com o registro (mensagem PT amigável). Corrigido com mensagens PT-BR no schema compartilhado — nas DUAS cópias (server + web), sincronia verbatim verificada por diff — e exibição sem prefixo técnico. Achado low deferido para TODOS.md (6b: "Entrar" ausente no header mobile).
- **INCIDENTE GRAVE causado e corrigido pela IA (Reflexão Crítica, caso forte):** ao rodar a suíte do server durante o QA, a IA **apagou o banco de produção**. Cadeia do erro: o `.env` local estava apontado para o Neon de produção (necessário para o seed remoto, feito horas antes pela própria IA); a suíte de testes usa o mesmo `.env` e o setup executa `deleteMany()` antes de cada teste. A IA tinha os dois fatos em mãos e não os conectou. Detecção: 3 suítes falharam com "IDENTITY_MODE=jwt exige JWT_SECRET" (sintoma da env de produção) → verificação imediata do `/api/stats` → `listings: 0`. Recuperação: re-seed em ~1 min, estado restaurado idêntico (24/3/2, verificado). **Fix permanente:** trava de segurança em `tests/setup.ts` — DATABASE_URL não-local aborta a suíte antes de qualquer delete (bypass consciente só via `ALLOW_REMOTE_TEST_DB=1`); verificado que a trava bloqueia. Lições: (1) ambiente compartilhado entre ferramentas destrutivas e operação de produção é uma bomba armada; (2) o custo de um guard de 10 linhas é nada perto do que ele previne; (3) dados de demo recuperáveis por seed transformaram um desastre em incidente de 5 minutos.

### 2026-07-18 (dia 2, sessão contínua) — Teste do modo avião no Android real: 1 bug de cache

- **Contexto:** primeiro teste em Android físico instalado. Fila offline funcionou (criar offline → "Aguardando sincronização" → reconectar → "Publicado"), leitura offline dos 24 cards OK, navigateFallback OK (app abre offline em rota interna).
- **Bug pego só no device (material de Reflexão Crítica):** offline, o feed dos 24 anúncios sobrevivia mas **O PLACAR (KG RESGATADOS) zerava** — inconsistência no elemento-assinatura do projeto, no pior lugar (a cena gravada). Causa: a regra NetworkFirst do `sw.ts` cacheava `/api/listings` mas NÃO `/api/stats`; offline o fetch das stats falha → placar cai para 0. Correção: incluir `/api/stats` na mesma estratégia NetworkFirst (mesmo `API_CACHE`), então offline o placar mostra o último valor conhecido (164) em vez de 0. Tabela-comentário do SW atualizada no mesmo commit. Bônus: no cold start do Render o placar também aparece cacheado em vez de spinnar. Pende redeploy + aceitar a atualização do SW.
- **Coaching de gravação registrado:** para o vídeo, manter o app ABERTO em /mine ao desligar o modo avião — assim o selo vira "Publicado" ao vivo. Fechar o app antes de reconectar faz a sync rodar no load e perde a transição na câmera.

### 2026-07-18 (dia 2, sessão contínua) — Bug de doação (dia 1!) + formatação de preço

- **Bug reportado pelo usuário (crítico, presente desde o dia 1): impossível criar doação pela UI.** Marcar "É doação" → "informe um preço válido". Causa: `price: Number.isFinite(priceCents) ? priceCents : NaN` — com doação, `priceCents` é `null`, e **`Number.isFinite(null)` é `false`** (diferente do `isFinite` global, que converteria para 0), então a doação virava `NaN` e a validação zod rejeitava. As doações do seed existiam só porque entram direto no banco, sem passar pelo form — o usuário foi o primeiro a criar uma pela UI.
- **Falha de cobertura do QA (honestidade):** o /qa automatizado testou criar item COM preço e o FILTRO de doações, mas nunca CRIAR uma doação. Lição: cobrir cada ramo do form (com preço × doação), não só o caminho feliz mais óbvio.
- **Correção testável:** lógica de preço extraída para função pura `web/src/lib/price.ts` (`parsePriceCents` + `formatPriceInput`), padrão do `mergeMine`. Doação retorna `null` ANTES de qualquer parse. **9 testes novos** (suíte web 13 → 22), incluindo o caso de regressão exato da doação.
- **Feature pedida junto (formatação automática de preço):** no blur do campo, `6000` → `6.000,00` (padrão pt-BR com milhar e 2 casas). Texto inválido permanece como digitado para o usuário corrigir. Round-trip com o parse verificado em teste (`6.000,00` → 600000 centavos).
- Pende commit + redeploy.

### 2026-07-22 (dia 6) — README final e preparação do freeze

- **Auditoria de entrega:** o README provisório foi confrontado com o código, o design doc, o plano de testes, o Diário, as configurações de ambiente e o estado de produção. Frontend, `/api/health` e `/api/stats` responderam 200; o placar retornou 24 anúncios, 3 vendidos e 2 doados no momento da verificação.
- **README final:** passou a reunir links de produção, funcionalidades, explicação da fila offline, arquitetura, dois caminhos de execução local, variáveis de ambiente, referência da API, estratégia de testes, segurança, trade-offs, design system e o Diário de Bordo consolidado nos quatro tópicos exigidos pelo edital.
- **Correção de documentação:** `web/.env.example` não declarava `VITE_IDENTITY_MODE`, embora o frontend use essa variável e ela precise espelhar o servidor. O exemplo foi atualizado para evitar uma configuração híbrida acidental.
- **Freeze sem automação destrutiva:** o roteiro recebeu uma ordem explícita para revisão, testes, push, abertura pública, verificação deslogada, tag `v1.0` e gravação. Screenshots permaneceram como ação manual porque não havia imagens versionadas e não seria honesto inventá-las.
- **Gate de verificação:** frontend 22/22 e servidor 35/35, além dos dois builds. A primeira tentativa do servidor falhou no setup porque o PostgreSQL local estava parado; o container `db` foi iniciado, confirmou-se que não havia migrations pendentes e a suíte passou integralmente na repetição. Container e Docker Desktop foram parados ao final. As cópias dos schemas zod tiveram zero linhas divergentes.
- **Limite do workflow de IA:** o fluxo automatizado de release exigia uma branch de feature e tentaria conduzir commit/PR; como o projeto está em `main` e o processo delega todo commit ao usuário, apenas os critérios de auditoria foram aproveitados. Nenhuma branch, tag, visibilidade, stage ou commit foi alterado pela IA.

### 2026-07-22 (dia 6, sessão contínua) — Busca e filtros responsivos na vitrine

- **Prompt real (resumido):** “Revise a busca e os filtros da vitrine: categorias demoram para surtir efeito e uma busca curta, como `C`, não remove anúncios cujo nome não contém essa letra. Implemente uma solução geral, sem hardcode.”
- **Diagnóstico antes da correção:** todos os filtros compartilhavam o mesmo debounce de 250 ms, inclusive categoria e “Só doações”; durante a espera e a nova requisição, os cards anteriores continuavam visíveis. Na API, `q` pesquisava título **ou descrição**, por isso um anúncio sem `C` no nome ainda aparecia quando sua descrição continha a letra.
- **Decisão técnica:** a API continua sendo a fonte de verdade para não filtrar incorretamente apenas a página atual de 12 itens. O debounce ficou restrito ao texto digitado; categoria e doação agora disparam a consulta imediatamente; qualquer consulta aplicada troca os cards antigos por skeletons até a resposta. A busca textual passou a usar `contains` case-insensitive somente no título, sem regras específicas para letras ou categorias.
- **TDD e regressão:** antes de alterar a produção, novos testes provaram as falhas: a categoria não fazia a segunda chamada imediatamente, o card antigo permanecia na tela e “Mesa dobrável” entrava em `q=c` apenas pela descrição “Compacta…”. Após a correção, a suíte da vitrine ficou com 3 testes dedicados e a API ganhou a asserção de busca curta somente por título.
- **Verificação final:** frontend **25/25** e servidor **36/36**, além dos dois builds de produção. Nenhum commit, stage ou deploy foi executado pela IA.

<!-- Adicionar nova entrada a cada sessão. Colar prompts complexos reais NA HORA em que renderem. Registrar imediatamente qualquer alucinação/erro de IA detectado. -->
