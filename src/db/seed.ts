import { GbretailDB, type Product } from "@/db/database";
import { products as productsData } from "@/data/products";

export async function seedDatabase() {
  try {
    const db = new GbretailDB();

    const dbProducts = await db.products.toArray();
    if (dbProducts.length === 0) {
      await db.products.bulkAdd(productsData as Product[]);
      console.log("[SEED] Products added to IndexedDB:", productsData.length);
    } else {
      console.log("[SEED] Products already exist in IndexedDB");
    }

    await db.close();
  } catch (err) {
    console.error("[SEED] Error seeding database:", err);
  }
}
