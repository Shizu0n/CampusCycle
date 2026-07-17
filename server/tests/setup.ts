import 'dotenv/config';
import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma';

beforeEach(async () => {
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
