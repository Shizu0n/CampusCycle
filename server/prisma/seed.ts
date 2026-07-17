// Seed: 24 anúncios cobrindo as 7 categorias, TODOS com imageUrl null —
// o placeholder de categoria do cliente é feature, não fallback (emenda Eng 15).
// 3 vendidos + 2 doados dão dado real ao contador de impacto (emenda Eng 16).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_USERS = ['Mariana', 'Rafael', 'Beatriz', 'Caio'].map((name) => ({
  id: randomUUID(),
  name,
}));

type SeedItem = {
  title: string;
  description: string;
  category: string;
  price: number | null; // centavos
  status?: 'sold' | 'donated';
};

const ITEMS: SeedItem[] = [
  // Livros
  { title: 'Cálculo Vol. 1 — James Stewart', description: 'Capa levemente desgastada, conteúdo íntegro. Ideal para Cálculo I e II.', category: 'Livros', price: 4500 },
  { title: 'Física para Cientistas — Tipler', description: 'Edição completa, sem rabiscos. Acompanha caderno de exercícios resolvidos.', category: 'Livros', price: 6000 },
  { title: 'Anatomia Humana — Sobotta (2 vols.)', description: 'Atlas completo em ótimo estado. Usado por um semestre em Medicina.', category: 'Livros', price: 18000 },
  { title: 'Código Civil comentado', description: 'Edição de 2023, poucas marcações a caneta marca-texto.', category: 'Livros', price: null },
  { title: 'Introdução à Economia — Mankiw', description: 'Livro-texto de ECO101. Bom estado geral.', category: 'Livros', price: 5500, status: 'sold' },
  // Engenharia
  { title: 'Kit de desenho técnico completo', description: 'Esquadros, compasso, escalímetro e prancheta A3. Tudo funcionando.', category: 'Engenharia', price: 3500 },
  { title: 'Capacete + óculos de proteção', description: 'EPI usado em visitas de obra, higienizado. Capacete classe B.', category: 'Engenharia', price: 2500 },
  { title: 'Trena a laser 40m', description: 'Precisa de pilhas novas, mede perfeitamente. Com capa.', category: 'Engenharia', price: 9000, status: 'sold' },
  // Computação
  { title: 'Teclado mecânico switch brown', description: 'ABNT2, iluminação branca. Troquei por um 60%.', category: 'Computação', price: 15000 },
  { title: 'Mouse sem fio + mousepad', description: 'Funciona com pilha AA, sensor ok. Mousepad grande incluso.', category: 'Computação', price: 4000 },
  { title: 'Raspberry Pi 4 (4GB) com case', description: 'Usado em projeto de IC concluído. Acompanha fonte e cartão 32GB.', category: 'Computação', price: 28000 },
  { title: 'Hub USB-C 7 portas', description: 'HDMI, 3x USB-A, leitor SD. Perfeito para notebook com poucas portas.', category: 'Computação', price: null },
  // Eletrônicos
  { title: 'Calculadora HP 12C original', description: 'A clássica de Engenharia Econômica. Com capa e manual.', category: 'Eletrônicos', price: 12000 },
  { title: 'Calculadora científica Casio fx-82', description: 'Aprovada para provas. Funciona perfeitamente.', category: 'Eletrônicos', price: 3000, status: 'sold' },
  { title: 'Fone com fio + adaptador P2', description: 'Som limpo, espuma nova. Ótimo para as aulas online.', category: 'Eletrônicos', price: null, status: 'donated' },
  { title: 'Carregador portátil 10.000mAh', description: 'Segura dois carregamentos completos de celular.', category: 'Eletrônicos', price: 5000 },
  // Vestuário
  { title: 'Jaleco branco tamanho M', description: 'Usado um semestre no laboratório, sem manchas. Bordado removível.', category: 'Vestuário', price: 4000 },
  { title: 'Jaleco tamanho G + touca', description: 'Kit completo para aulas práticas de saúde.', category: 'Vestuário', price: 5500 },
  { title: 'Moletom da Atlética (M)', description: 'Pouquíssimo uso, sem desbotamento.', category: 'Vestuário', price: null, status: 'donated' },
  // Móveis
  { title: 'Escrivaninha 120cm com gaveta', description: 'Desmontada e pronta para transporte. Pequenos riscos no tampo.', category: 'Móveis', price: 15000 },
  { title: 'Cadeira de escritório com regulagem', description: 'Pistão funcionando, estofado limpo. Retirada no campus.', category: 'Móveis', price: 12000 },
  { title: 'Luminária de mesa articulada', description: 'Lâmpada LED inclusa, braço firme.', category: 'Móveis', price: null },
  // Outros
  { title: 'Violão de nylon com capa', description: 'Cordas novas, ótimo para começar. Acompanha apoio de perna.', category: 'Outros', price: 18000 },
  { title: 'Garrafa térmica 1L', description: 'Mantém gelado o dia inteiro. Sem amassados.', category: 'Outros', price: 2000 },
];

async function main() {
  // Demo/dev: zera e repopula — rodar o seed sempre resulta no mesmo estado.
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  for (const u of SEED_USERS) {
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: u });
  }

  await prisma.listing.createMany({
    data: ITEMS.map((item, i) => ({
      id: randomUUID(),
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      imageUrl: null,
      status: item.status ?? 'available',
      userId: SEED_USERS[i % SEED_USERS.length]!.id,
      // espalha as datas pelos últimos 20 dias para o feed não nascer "tudo agora"
      createdAt: new Date(Date.now() - i * 20 * 60 * 60 * 1000),
    })),
    skipDuplicates: true,
  });

  console.log(`Seed: ${SEED_USERS.length} usuários, ${ITEMS.length} anúncios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
