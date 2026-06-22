import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const storeId = 5;
  const locationId = 'gid://shopify/Location/999999';

  console.log("Seeding more stock data for ABC Supermart (Store ID: 5)...");

  // Use try-catch to avoid crashing if already seeded
  try {
    await prisma.shopifyProduct.create({
      data: {
        id: 'gid://shopify/Product/111112',
        storeId,
        title: 'Premium Organic Apples',
        productType: 'Fruit',
        vendor: 'Fresh Farms',
        tags: ['fresh', 'organic'],
        variants: {
          create: [
            {
              id: 'gid://shopify/ProductVariant/222223',
              storeId,
              title: '1kg Bag',
              price: '8.99',
              inventoryLevels: {
                create: [
                  {
                    id: 'gid://shopify/InventoryLevel/333334',
                    storeId,
                    locationId,
                    availableQuantity: 100
                  }
                ]
              }
            }
          ]
        }
      }
    });

    await prisma.shopifyProduct.create({
      data: {
        id: 'gid://shopify/Product/111113',
        storeId,
        title: 'Whole Wheat Bread',
        productType: 'Bakery',
        vendor: 'Daily Bakes',
        tags: ['bakery', 'fresh'],
        variants: {
          create: [
            {
              id: 'gid://shopify/ProductVariant/222224',
              storeId,
              title: 'Standard Loaf',
              price: '3.49',
              inventoryLevels: {
                create: [
                  {
                    id: 'gid://shopify/InventoryLevel/333335',
                    storeId,
                    locationId,
                    availableQuantity: 30
                  }
                ]
              }
            }
          ]
        }
      }
    });

    await prisma.shopifyProduct.create({
      data: {
        id: 'gid://shopify/Product/111114',
        storeId,
        title: 'Almond Milk',
        productType: 'Dairy Alternative',
        vendor: 'NutriLife',
        tags: ['dairy-free', 'vegan'],
        variants: {
          create: [
            {
              id: 'gid://shopify/ProductVariant/222225',
              storeId,
              title: '1 Liter',
              price: '4.99',
              inventoryLevels: {
                create: [
                  {
                    id: 'gid://shopify/InventoryLevel/333336',
                    storeId,
                    locationId,
                    availableQuantity: 75
                  }
                ]
              }
            }
          ]
        }
      }
    });

    console.log("Successfully seeded more stock for ABC Supermart!");
  } catch (error) {
    console.error("Data might already be seeded or an error occurred:", error);
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
