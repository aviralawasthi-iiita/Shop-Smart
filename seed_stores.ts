import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding default stores using raw SQL...")

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "store" ("storeId", "managerEmail", "storeLocation", "managerPassword")
      VALUES 
      (1, 'manager1@walmart.com', 'walmart-supercenter-main-st', 'password123'),
      (2, 'manager2@walmart.com', 'walmart-neighborhood-oak-ave', 'password123'),
      (3, 'manager3@walmart.com', 'walmart-supercenter-river-rd', 'password123')
      ON CONFLICT ("managerEmail") DO NOTHING;
    `)
    console.log("Raw SQL seed successful.")
  } catch (e) {
    console.error("Raw SQL seed failed:", e)
  }

  const stores = await prisma.store.findMany()
  console.log("Stores in DB:", stores)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
