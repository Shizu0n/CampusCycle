import 'dotenv/config';
import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma';

// TRAVA DE SEGURANÇA: a suíte faz deleteMany() antes de CADA teste. Se o
// DATABASE_URL do .env apontar para um banco remoto (ex.: Neon de produção,
// configurado temporariamente para seed/migrations), rodar os testes APAGARIA
// a base real — incidente ocorrido em 2026-07-18 e revertido via re-seed.
// Testes só rodam contra banco local; para exceção consciente, defina
// ALLOW_REMOTE_TEST_DB=1.
const dbUrl = process.env.DATABASE_URL ?? '';
const isLocal = /localhost|127\.0\.0\.1/.test(dbUrl);
if (!isLocal && process.env.ALLOW_REMOTE_TEST_DB !== '1') {
  throw new Error(
    'ABORTADO: DATABASE_URL não é local — os testes limpam o banco inteiro. ' +
      'Aponte o .env para o Postgres local (docker compose up -d db) ou, se você ' +
      'REALMENTE sabe o que está fazendo, rode com ALLOW_REMOTE_TEST_DB=1.'
  );
}

beforeEach(async () => {
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
