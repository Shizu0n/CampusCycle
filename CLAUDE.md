# CLAUDE.md — CampusCycle

Marketplace de economia circular universitária (desafio técnico de estágio, Laboratório Vortex/UNIFOR, prazo 15 dias a partir de 2026-07-16). **O objetivo NÃO é o produto perfeito: é maximizar a nota nos 4 eixos da rubrica** — (1) Git + README, (2) autoria provada em vídeo de 6 min, (3) requisitos obrigatórios, (4) Diário de Bordo da IA. Dois eixos são comunicação, não código.

## Fontes de verdade (ler antes de decidir qualquer coisa)

| Arquivo | O que é | Quando ler |
|---|---|---|
| `docs/design-doc.md` | Plano completo APROVADO (CEO + Eng review, 43 emendas, zero decisões abertas) | Início de toda sessão de implementação |
| `DESIGN.md` | Design system "Xilo-Feira" — fontes, cores, spacing, motion | Antes de QUALQUER decisão visual/UI. Não desviar sem aprovação explícita do usuário |
| `docs/test-plan.md` | Rotas, interações, edge cases e caminhos críticos a verificar | Antes de escrever testes ou QA |
| `TODOS.md` | Diferimentos deliberados (stretch / fora de escopo / cortável) | Antes de propor features novas — provavelmente já foi decidido |
| `docs/diario-de-bordo.md` | Diário de Bordo da IA (eixo 4 da nota) | **Atualizar a CADA sessão de trabalho** — nunca reconstruir depois |

**Regra de ouro:** o design doc já resolveu praticamente tudo (43 emendas de review). Se surgir uma dúvida de arquitetura/escopo, procure lá primeiro — a resposta quase certamente existe. Não reabrir decisões fechadas.

## Stack e arquitetura (travadas)

- **Monorepo sem workspaces** (sem package.json na raiz): `server/` (Node+Express+TS+Prisma+zod) e `web/` (React+Vite+TS+vite-plugin-pwa modo `injectManifest`).
- **Banco:** Neon Postgres (runtime = URL pooled `?pgbouncer=true&connect_timeout=15`; migrations = URL direta). Local: docker-compose OU Neon próprio.
- **Deploy:** Render (server/, root dir `server`) + Vercel (web/, root dir `web`). Ping anti-cold-start em `/api/stats` (aquece Render E Neon).
- **Identidade em 2 estágios, resolver EXCLUSIVO** via env `IDENTITY_MODE` (`anonymous` = header X-User-Id | `jwt`): nunca empilhar os dois. Registro SEMPRE cria usuário novo (nunca reivindica stub anônimo — vetor de takeover).
- **Fila offline (o momento-uau):** IndexedDB (`idb`) + listener `online` + retry no load. Máquina de estados `pending|synced|failed` — diagrama vive como comentário no topo de `web/src/lib/offlineQueue.ts`. UUID gerado no cliente no mount do form = idempotência (servidor trata P2002: mesmo dono → 200; dono diferente → 409). Background Sync API é stretch, NÃO implementar sem checkpoint do dia 12.
- **Erros sempre em envelope:** `{ "error": { "code", "message", "details?" } }`.
- **Preço em centavos (Int?), null = doação.** Nunca Decimal.

## Convenções de implementação

- TypeScript estrito ponta a ponta. Validação zod em toda rota de escrita; web usa cópia verbatim de `server/src/schemas/listing.ts` com header "copy of … — keep in sync" e valida ANTES de enfileirar.
- `app.set('trust proxy', 1)` no Express (Render) — nunca `true`.
- Rate limit ~20 escritas/15min/IP; `express.json({limit:'50kb'})`.
- `userId` NUNCA aparece em respostas públicas (select explícito do Prisma).
- Rota `/api/listings/mine` registrada ANTES de `/:id`.
- Testes: vitest + supertest (~16 testes de API), vitest + fake-indexeddb para a fila (1 teste por transição de estado). `npm test` verde antes de cada commit de marco.
- Diagramas inline obrigatórios (offlineQueue.ts, identity.ts, sw.ts) — atualizar no MESMO commit que mudar o comportamento.
- Fontes self-hosted woff2 SW-precached (nunca CDN — cai para Verdana offline na cena do modo avião).

## Processo de trabalho (toda sessão)

1. Ler este arquivo + `docs/design-doc.md` (seções relevantes à fase atual).
2. Conferir o cronograma (abaixo) e o estado real do repo para saber a fase.
3. Implementar seguindo as emendas — elas são vinculantes.
4. **Atualizar `docs/diario-de-bordo.md`** com: prompts reais usados, decisões, e qualquer erro/alucinação de IA detectado (a Reflexão Crítica do edital exige caso concreto).
5. **Commits: SEMPRE feitos pelo usuário.** Claude NUNCA executa `git commit` — quando um marco estiver pronto, apenas sugerir a mensagem de commit e deixar o usuário revisar e commitar. Poucos commits, de marco (fim de fase, feature completa e testada), mensagens descritivas em português.
6. **NUNCA escrever paths da máquina do usuário em arquivos versionados** (nada de `C:\...`, nome de usuário do Windows, pastas de nuvem sincronizada ou diretórios de ferramentas locais). Referências sempre relativas à raiz do repo. Antes de sugerir commit de docs, grep por esses padrões.
7. Repo fica PRIVADO até o freeze do dia 13 (flip para público é item bloqueante do checklist do dia 13).

## Cronograma (âncora: dia 0 = 2026-07-16)

| Dias | Fase | Status |
|---|---|---|
| 1-2 | Walking skeleton: server (listings CRUD parcial, zod, envelope, Prisma/Neon, deploy Render, ping) | código ✅ (dia 1); falta deploy Render+ping |
| 3 | Front esqueleto PWA (manifest, ícones, Feed + NewListing, deploy Vercel, instalado no device) | código ✅ (dia 1); falta deploy Vercel+instalar no device |
| 4-5 | Obrigatórios: landing desktop, filtros, responsividade, /mine estágio 1 | |
| 6-7 | Auth JWT (dia 6 backend, dia 7 frontend). Fallback: cortar no dia 8 → IDENTITY_MODE=anonymous permanente | |
| 8-9 | Offline leitura (NetworkFirst), skeletons, empty states, contador de impacto, PATCH | |
| 10-12 | Fila offline (uau) + testes por transição + ensaio "explicar em voz alta" | |
| 13 | README final + Diário consolidado + FREEZE (tag v1.0, repo público, verificar deslogado) | |
| 14 | Vídeo (roteiro em docs/video-script.md) | |
| 15 | Folga | |

**Ordem de corte pré-designada se atrasar:** 1º docker-compose → 2º pino → 3º tuning do rate-limit → 4º PATCH. A pressão nunca decide sozinha; checkpoints dias 5/8/10.

## Pendências do usuário (pré-requisito 0 — perguntar se ainda abertas)

- [ ] Data-limite exata da submissão (ancora o cronograma; vídeo+README ocupam os 2 dias antes dela).
- [ ] Dispositivo da demo: Android físico (bloqueador da 1ª semana) × DevTools device mode (contingência).
- [ ] Contas Render / Vercel / Neon criadas (ações do usuário; código deve ficar deploy-ready).

## Design (resumo mínimo — DESIGN.md é a fonte)

Xilo-Feira: papel `#FBF8F0`, tinta `#141613`, verde-bandeira `#0B7A3E`, amarelo `#FFD100` SÓ para dinheiro e focus ring. Bordas 2px sólidas + sombra dura `4px 4px 0`. Alfa Slab One (display) / Archivo (UI) / Chivo Mono (stamps, sempre uppercase). Proibido: gradientes, blur shadows, emoji colorido, roxo, dark mode, fontes <12px. Assinatura: O PLACAR (odômetro de impacto).
