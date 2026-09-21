import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { products } from "../src/data/products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("[SEED] Seeding products...");

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        is_loose: p.is_loose,
        rate_per_kg: p.rate_per_kg ?? null,
        barcode: p.barcode ?? null,
        price: p.price ?? null,
        category: p.category,
        preset_weights: p.preset_weights ?? [],
        preset_prices: p.preset_prices ?? [],
        stockQuantity: 100,
      },
      create: {
        id: p.id,
        name: p.name,
        is_loose: p.is_loose,
        rate_per_kg: p.rate_per_kg ?? null,
        barcode: p.barcode ?? null,
        price: p.price ?? null,
        category: p.category,
        preset_weights: p.preset_weights ?? [],
        preset_prices: p.preset_prices ?? [],
        stockQuantity: 100,
      },
    });
  }

  console.log(`[SEED] Seeded ${products.length} products`);
}

main()
  .catch((e) => {
    console.error("[SEED] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
