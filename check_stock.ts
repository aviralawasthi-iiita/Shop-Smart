import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.shopifyProduct.findMany()
  console.log("Products:", products)
  
  const variants = await prisma.shopifyVariant.findMany()
  console.log("Variants:", variants)
  
  const inventory = await prisma.shopifyInventoryLevel.findMany()
  console.log("Inventory Levels:", inventory)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
