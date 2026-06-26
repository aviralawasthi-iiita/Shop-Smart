import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findUnique({
    where: { storeId: 5 },
    include: {
      shopifyProducts: {
        include: {
          variants: {
            include: {
              inventoryLevels: true
            }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(store, null, 2));
}

main().finally(() => prisma.$disconnect());
