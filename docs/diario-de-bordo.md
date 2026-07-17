# Diário de Bordo — Uso de IA no CampusCycle

> Rascunho corrente, atualizado a cada sessão de trabalho. Versão final consolidada no README no dia 13.
> Estrutura exigida pelo edital: (1) ferramentas utilizadas, (2) exemplos de prompts, (3) links/registros de conversas, (4) reflexão crítica (incluindo caso concreto de erro/alucinação da IA e como foi corrigido).

## Ferramentas utilizadas

- **Claude Code (Anthropic)** — planejamento, geração de código assistida e revisão. Todas as decisões de arquitetura passaram por revisão adversarial (descrita abaixo) antes de qualquer implementação.
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

<!-- Adicionar nova entrada a cada sessão. Colar prompts complexos reais NA HORA em que renderem. Registrar imediatamente qualquer alucinação/erro de IA detectado. -->
