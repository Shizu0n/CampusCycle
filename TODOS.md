# TODOS — CampusCycle

> **Checklist do dia 1:**

## Stretch (só se sobrar tempo no cronograma)

### 1. Background Sync API na fila offline
- **O quê:** Registrar sync no Service Worker (Chromium) como camada extra sobre o listener `online` + retry no load.
- **Por quê:** Sincroniza mesmo com o app fechado — mas só em Chromium.
- **Prós:** PWA "de verdade" até com app fechado; material técnico extra para o vídeo.
- **Contras:** Duplica a lógica de sync com risco de post duplo; Chromium-only; zero ganho na demo (a cena do modo avião já funciona sem isso).
- **Contexto:** Decisão do design doc (constraint + micro-decisões). A fila primária (IndexedDB + listener `online`, idempotente por UUID) é suficiente e cross-browser. Só considerar no dia 12 com tudo entregue.
- **Depende de:** fila offline completa e testada (dias 10-12).

### 2. E2E Playwright da cena do modo avião
- **O quê:** Um spec Playwright: offline → submit → badge/IndexedDB → online → publicado → lista mesclada.
- **Por quê:** Reverificar o caminho do uau em 30s a cada commit de polimento, em vez de ×3 na mão.
- **Prós:** Regressão automática do fluxo mais valioso; `npm run e2e` é bom material de autoria.
- **Contras:** Terceiro harness de teste; flakiness conhecida de SW/offline em E2E; a banca nunca vê CI.
- **Contexto:** Decisão 8B do eng review (2026-07-16): gate primário continua o checklist manual ×3 (incluindo purge de identidade e reopen offline em rota interna); unit tests da fila (6A) cobrem as transições. Stretch do dia 12, junto do item 1.
- **Depende de:** fila offline pronta; unit tests 6A verdes.

## Fora de escopo (produção real, não este desafio)

### 3. Upload real de imagem
- **O quê:** Substituir o campo de URL opcional por upload (storage S3/R2/Supabase).
- **Contexto:** Micro-decisão do plano: URL opcional + placeholder de categoria (inicial em Alfa Slab, DESIGN.md) mantém a demo fluida e a fila só carrega strings. Upload = blob na fila offline = complexidade desproporcional para 15 dias.

### 4. JWT em cookie httpOnly
- **O quê:** Mover o token de localStorage para cookie httpOnly + CSRF.
- **Contexto:** Tradeoff de XSS reconhecido e defendido no vídeo como escolha consciente de escopo de demo. Em produção real, migrar.

### 5. Dark mode
- **O quê:** Variante escura do sistema Xilo-Feira.
- **Contexto:** Light-only por decisão (log do DESIGN.md, 2026-07-16): a linguagem de papel não traduz para dark barato dentro do prazo. Revisitar pós-desafio se o projeto continuar.

## Cortável sem dó (se ameaçar o cronograma)

### 6. "Carregar mais" no feed
- **O quê:** Paginação incremental na vitrine (`?page=`, take/skip 12).
- **Contexto:** A API já pagina; o botão de carregar mais no front não é requisito do edital. Cortar não afeta nenhum critério de sucesso.

## Pós-avaliação (housekeeping)

### 7. Voltar o ping do UptimeRobot para /api/health
- **O quê:** Depois da janela de avaliação da banca, trocar o ping periódico de `/api/stats` de volta para `/api/health`.
- **Contexto:** Decisão D18 do eng review (OV-5): `/api/stats` mantém Render E Neon quentes durante a avaliação (~90 das 191 compute-hours/mês do Neon free — cabe no período, desperdício como hábito permanente).

---
*Criado em 2026-07-16 (dia 0) a partir das decisões do office-hours, CEO review, eng review e design review. Histórico completo: `docs/design-doc.md` e `DESIGN.md` na raiz do repo.*
