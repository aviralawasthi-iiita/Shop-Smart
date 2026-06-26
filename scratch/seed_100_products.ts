import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { type: 'Produce', tags: ['fresh', 'organic', 'raw'], items: ['Bananas', 'Tomatoes', 'Carrots', 'Spinach', 'Potatoes', 'Onions', 'Garlic', 'Bell Peppers', 'Avocados', 'Grapes'] },
  { type: 'Dairy', tags: ['refrigerated', 'fresh'], items: ['Whole Milk', 'Cheddar Cheese', 'Greek Yogurt', 'Butter', 'Heavy Cream', 'Cream Cheese', 'Sour Cream', 'Cottage Cheese', 'Mozzarella', 'Ghee'] },
  { type: 'Meat', tags: ['fresh', 'protein', 'raw'], items: ['Chicken Breast', 'Ground Beef', 'Pork Chops', 'Bacon', 'Turkey Sausage', 'Salmon Fillet', 'Ribeye Steak', 'Chicken Thighs', 'Lamb Chops', 'Tuna Steaks'] },
  { type: 'Bakery', tags: ['fresh', 'baked'], items: ['Sourdough Bread', 'Bagels', 'Croissants', 'Muffins', 'Tortillas', 'Hamburger Buns', 'Pita Bread', 'Baguette', 'Cinnamon Rolls', 'Donuts'] },
  { type: 'Pantry', tags: ['non-perishable', 'grocery'], items: ['Olive Oil', 'Pasta', 'Rice', 'Canned Beans', 'Tomato Sauce', 'Peanut Butter', 'Jelly', 'Flour', 'Sugar', 'Salt'] },
  { type: 'Beverages', tags: ['drink', 'refreshment'], items: ['Orange Juice', 'Apple Juice', 'Coffee Beans', 'Tea Bags', 'Soda', 'Sparkling Water', 'Bottled Water', 'Energy Drink', 'Sports Drink', 'Lemonade'] },
  { type: 'Snacks', tags: ['snack', 'ready-to-eat'], items: ['Potato Chips', 'Pretzels', 'Popcorn', 'Tortilla Chips', 'Mixed Nuts', 'Granola Bars', 'Chocolate Bar', 'Gummy Bears', 'Crackers', 'Cookies'] },
  { type: 'Personal Care', tags: ['hygiene', 'health'], items: ['Toothpaste', 'Shampoo', 'Conditioner', 'Body Wash', 'Deodorant', 'Lotion', 'Shaving Cream', 'Razors', 'Cotton Swabs', 'Mouthwash'] },
  { type: 'Household', tags: ['cleaning', 'supplies'], items: ['Paper Towels', 'Toilet Paper', 'Trash Bags', 'Dish Soap', 'Laundry Detergent', 'Sponges', 'Glass Cleaner', 'Bleach', 'Fabric Softener', 'Aluminum Foil'] },
  { type: 'Frozen', tags: ['frozen', 'cold'], items: ['Frozen Pizza', 'Ice Cream', 'Frozen Peas', 'Frozen Mixed Berries', 'Frozen Waffles', 'Fish Sticks', 'French Fries', 'Frozen Dinners', 'Frozen Corn', 'Frozen Spinach'] },
]

async function main() {
  const storeId = 5;
  const locationId = 'gid://shopify/Location/999999';

  console.log("Seeding 100 supermarket products for ABC Supermart (Store ID: 5)...");

  let baseId = 500000;
  let successCount = 0;

  for (const category of categories) {
    for (let i = 0; i < category.items.length; i++) {
      const itemName = category.items[i];
      const productId = `gid://shopify/Product/${baseId}`;
      const variantId = `gid://shopify/ProductVariant/${baseId}`;
      const inventoryId = `gid://shopify/InventoryLevel/${baseId}`;
      
      const price = (Math.random() * 15 + 1).toFixed(2);
      const qty = Math.floor(Math.random() * 100) + 10;
      
      try {
        await prisma.shopifyProduct.upsert({
          where: { id_storeId: { id: productId, storeId } },
          create: {
            id: productId,
            storeId,
            title: itemName,
            productType: category.type,
            vendor: 'Supermarket Brands',
            tags: category.tags,
            variants: {
              create: [
                {
                  id: variantId,
                  storeId,
                  title: 'Standard Size',
                  price: price,
                  inventoryLevels: {
                    create: [
                      {
                        id: inventoryId,
                        storeId,
                        locationId,
                        availableQuantity: qty
                      }
                    ]
                  }
                }
              ]
            }
          },
          update: {} // Do nothing if it already exists
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to insert ${itemName}:`, err);
      }
      
      baseId++;
    }
  }

  console.log(`Successfully processed ${successCount} products.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
