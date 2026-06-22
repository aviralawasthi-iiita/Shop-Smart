import db from "./db"

const SHOPIFY_API_VERSION = "2024-04"

interface ShopifyGraphQLResponse {
  data: {
    products: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      edges: Array<{
        node: {
          id: string
          title: string
          productType: string
          vendor: string
          tags: string[]
          variants: {
            edges: Array<{
              node: {
                id: string
                title: string
                price: string
                inventoryItem: {
                  inventoryLevels: {
                    edges: Array<{
                      node: {
                        id: string
                        location: {
                          id: string
                        }
                        quantities: Array<{
                          name: string
                          quantity: number
                        }>
                      }
                    }>
                  }
                }
              }
            }>
          }
        }
      }>
    }
  }
}

const PRODUCTS_QUERY = `
  query getProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          productType
          vendor
          tags
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                inventoryItem {
                  inventoryLevels(first: 10) {
                    edges {
                      node {
                        id
                        location {
                          id
                        }
                        quantities(names: ["available"]) {
                          name
                          quantity
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

export async function syncStoreInventory(storeId: number) {
  const store = await db.store.findUnique({
    where: { storeId },
  })

  if (!store) {
    throw new Error(`Store with ID ${storeId} not found.`)
  }

  if (!store.shopDomain || !store.apiToken) {
    throw new Error(`Store ${storeId} is missing Shopify credentials.`)
  }

  let hasNextPage = true
  let cursor: string | null = null

  while (hasNextPage) {
    const response = await fetch(`https://${store.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": store.apiToken,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: { cursor },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${text}`)
    }

    const { data } = (await response.json()) as ShopifyGraphQLResponse

    if (!data || !data.products) {
      console.warn("No products data returned from Shopify.")
      break
    }

    const products = data.products.edges

    // Upsert data using Prisma
    for (const productEdge of products) {
      const productNode = productEdge.node

      await db.shopifyProduct.upsert({
        where: {
          id_storeId: { id: productNode.id, storeId },
        },
        create: {
          id: productNode.id,
          storeId,
          title: productNode.title,
          productType: productNode.productType,
          vendor: productNode.vendor,
          tags: productNode.tags,
        },
        update: {
          title: productNode.title,
          productType: productNode.productType,
          vendor: productNode.vendor,
          tags: productNode.tags,
        },
      })

      for (const variantEdge of productNode.variants.edges) {
        const variantNode = variantEdge.node

        await db.shopifyVariant.upsert({
          where: {
            id_storeId: { id: variantNode.id, storeId },
          },
          create: {
            id: variantNode.id,
            productId: productNode.id,
            storeId,
            title: variantNode.title,
            price: variantNode.price,
          },
          update: {
            title: variantNode.title,
            price: variantNode.price,
          },
        })

        for (const levelEdge of variantNode.inventoryItem.inventoryLevels.edges) {
          const levelNode = levelEdge.node
          const availableQty = levelNode.quantities.find((q) => q.name === "available")?.quantity || 0

          await db.shopifyInventoryLevel.upsert({
            where: {
              variantId_locationId_storeId: {
                variantId: variantNode.id,
                locationId: levelNode.location.id,
                storeId,
              },
            },
            create: {
              id: levelNode.id,
              variantId: variantNode.id,
              locationId: levelNode.location.id,
              storeId,
              availableQuantity: availableQty,
            },
            update: {
              availableQuantity: availableQty,
            },
          })
        }
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage
    cursor = data.products.pageInfo.endCursor
  }

  console.log(`Successfully synced inventory for store ${storeId}.`)
}
