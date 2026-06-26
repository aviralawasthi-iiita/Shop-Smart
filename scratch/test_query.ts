import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const storeId = 5;
  const searchTerms = ["Snacks", "Bakery", "Chocolate"];

  console.log("Searching for terms:", searchTerms);

  const matchingProducts = await db.shopifyProduct.findMany({
    where: {
      storeId: storeId,
      OR: searchTerms.flatMap((term: string) => [
        { title: { contains: term, mode: "insensitive" } },
        { productType: { contains: term, mode: "insensitive" } },
        { tags: { has: term.toLowerCase() } }
      ])
    },
    include: {
      variants: {
        include: {
          inventoryLevels: true,
        },
      },
    },
    take: 10,
  });

  console.log(`Found ${matchingProducts.length} products:`);
  for (const product of matchingProducts) {
    console.log(`- ${product.title} (${product.productType})`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await db.$disconnect());
