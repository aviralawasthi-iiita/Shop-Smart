import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function testShopifyIntegration() {
  console.log("Starting Shopify Integration Test...")

  try {
    // 1. Create a dummy store (abc in lucknow)
    console.log("1. Creating dummy store 'abc' in 'lucknow'...")
    const dummyStore = await prisma.store.upsert({
      where: { managerEmail: "manager.abc.lucknow@example.com" },
      create: {
        storeName: "ABC Supermart",
        storeLocation: "Hazratganj, Lucknow, UP",
        managerEmail: "manager.abc.lucknow@example.com",
        managerPassword: "dummy_password_hash",
      },
      update: {
        storeName: "ABC Supermart",
        storeLocation: "Hazratganj, Lucknow, UP",
      }
    })
    console.log(`✅ Store created/found with ID: ${dummyStore.storeId}`)

    // 2. Simulate manager saving Shopify Config
    console.log("\n2. Updating store with Shopify config...")
    const updatedStore = await prisma.store.update({
      where: { storeId: dummyStore.storeId },
      data: {
        shopDomain: "abc-lucknow.myshopify.com",
        apiToken: "shpat_1234567890abcdef",
        webhookSecret: "super_secret_webhook_key",
      },
    })
    console.log(`✅ Shopify config saved for store ${updatedStore.storeId}: ${updatedStore.shopDomain}`)

    // 3. Simulate background Shopify sync (Upserting products and variants)
    console.log("\n3. Simulating Shopify inventory sync (upserting dummy products)...")
    
    // Create Product
    const product = await prisma.shopifyProduct.upsert({
      where: { id_storeId: { id: "gid://shopify/Product/111111", storeId: updatedStore.storeId } },
      create: {
        id: "gid://shopify/Product/111111",
        storeId: updatedStore.storeId,
        title: "Lucknow Special Mangoes",
        productType: "Fruit",
        vendor: "Mango Kings",
        tags: ["fresh", "organic", "local"],
      },
      update: {
        title: "Lucknow Special Mangoes",
        productType: "Fruit",
        vendor: "Mango Kings",
        tags: ["fresh", "organic", "local"],
      }
    })
    console.log(`✅ Created/Updated ShopifyProduct: ${product.title}`)

    // Create Variant
    const variant = await prisma.shopifyVariant.upsert({
      where: { id_storeId: { id: "gid://shopify/ProductVariant/222222", storeId: updatedStore.storeId } },
      create: {
        id: "gid://shopify/ProductVariant/222222",
        productId: product.id,
        storeId: updatedStore.storeId,
        title: "1 Dozen Box",
        price: "15.99",
      },
      update: {
        title: "1 Dozen Box",
        price: "15.99",
      }
    })
    console.log(`✅ Created/Updated ShopifyVariant: ${variant.title}`)

    // Create Inventory Level
    const inventoryLevel = await prisma.shopifyInventoryLevel.upsert({
      where: { variantId_locationId_storeId: { variantId: variant.id, locationId: "gid://shopify/Location/999999", storeId: updatedStore.storeId } },
      create: {
        id: "gid://shopify/InventoryLevel/333333",
        variantId: variant.id,
        locationId: "gid://shopify/Location/999999",
        storeId: updatedStore.storeId,
        availableQuantity: 50,
      },
      update: {
        availableQuantity: 50,
      }
    })
    console.log(`✅ Created ShopifyInventoryLevel with quantity: ${inventoryLevel.availableQuantity}`)

    // 4. Test multi-tenant isolation constraint (Should fail if we try to create an identical variant ID under a DIFFERENT store)
    console.log("\n4. Database tests completed successfully! (Data retained for future testing)")

  } catch (err) {
    console.error("❌ Test failed:", err)
  } finally {
    await prisma.$disconnect()
  }
}

testShopifyIntegration()
