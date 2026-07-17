# CampusCycle ♺

Marketplace de economia circular para estudantes universitários — anuncie, doe e encontre itens usados (livros, jalecos, calculadoras, eletrônicos, móveis) dentro do campus.

> **Status: em construção** (desafio técnico — Laboratório Vortex/UNIFOR).
> Links de produção, instruções de execução local e o Diário de Bordo da IA serão consolidados aqui até o freeze (dia 13).

## Estrutura

```
campuscycle/
├── server/   # API REST — Node.js + Express + TypeScript + Prisma (Postgres/Neon)
├── web/      # PWA — React + Vite + TypeScript + vite-plugin-pwa
└── docs/     # Especificações e processo de engenharia (versionados)
    ├── design-doc.md       # Plano aprovado (CEO + Eng review)
    ├── test-plan.md        # Plano de testes
    ├── video-script.md     # Roteiro cronometrado do vídeo
    └── diario-de-bordo.md  # Diário de Bordo da IA (rascunho corrente)
```

Design system: [`DESIGN.md`](./DESIGN.md) · Diferimentos deliberados: [`TODOS.md`](./TODOS.md)
