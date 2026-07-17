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

<!-- Adicionar nova entrada a cada sessão. Colar prompts complexos reais NA HORA em que renderem. Registrar imediatamente qualquer alucinação/erro de IA detectado. -->
