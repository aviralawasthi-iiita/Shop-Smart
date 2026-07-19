# Phase 3: Backend API Design & Webhook Synchronization

This phase explores how your backend communicates with both your frontend and external systems (Shopify). We will analyze the Next.js App Router API structure, the architecture of webhooks, and the critical CS concept of Idempotency.

---

## 1. Routing Paradigms (Next.js App Router)

In legacy Node.js/Express applications, you had to manually configure an HTTP server, define routing middleware, and bind controllers to paths (e.g., `app.post('/api/login', loginController)`).

Next.js 14 uses **File-System Based Routing**. 
By placing a `route.ts` file inside a folder like `app/api/webhooks/shopify/`, Next.js automatically provisions an API endpoint at `/api/webhooks/shopify`. 

Inside these files, you export specific HTTP verb functions:
```typescript
export async function POST(request: Request) { ... }
export async function GET(request: Request) { ... }
```
**Why this is better:** It forces strict adherence to RESTful principles. You cannot accidentally handle a `POST` request in a `GET` function, and it drastically reduces the "boilerplate" code required to spin up a microservice.

---

## 2. External System Synchronization (`lib/shopifySync.ts`)

Integrating with massive third-party platforms like Shopify requires robust data synchronization. Your app handles this in two ways: **Initial Sync (Pull)** and **Live Updates (Push)**.

### The Initial Sync (Pull via GraphQL)
When a manager registers a store, you trigger `syncStoreInventory()`.
*   **The Problem:** A store might have 50,000 products. If you try to fetch them all in one HTTP request, the connection will time out, or the Node.js server will run out of RAM and crash.
*   **The Solution (Pagination):** You utilized **Cursor-Based Pagination** with Shopify's GraphQL API. Your `while (hasNextPage)` loop fetches products in chunks of 50. It grabs the `endCursor` from the first chunk and uses it as the starting point for the next request. This ensures stable, predictable memory usage regardless of catalog size.

Look at your `PRODUCTS_QUERY` in `shopifySync.ts`: You asked for the Product `title`, nested inside that you asked for Variants `price`, and nested inside that you asked for Inventory `quantities`. GraphQL grabs all three layers of relational data in a single, hyper-efficient network request.

### The GraphQL Code in Your Project

Here is the exact query you wrote in `lib/shopifySync.ts` to achieve this:

```graphql
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
```

**Why this is a brilliant use of GraphQL:**
1. **Three levels deep in one call:** You fetched Products -> Variants -> Inventory Levels. In a standard REST API, fetching 50 products, their variants, and their stock across different locations would take **hundreds** of sequential HTTP requests. You did it in exactly **1 request**.
2. **Cursor Pagination:** Notice the `$cursor` variable. Instead of saying "give me page 2" (which becomes very slow in massive databases), GraphQL lets you say "give me 50 items occurring *after* this specific ID." This guarantees extremely fast database reads even if the Shopify store has 1,000,000 items.

### Live Updates (Push via Webhooks)
Once the initial sync is done, you don't want to constantly "poll" (ask) Shopify every 5 minutes if inventory has changed. That wastes bandwidth.
Instead, you registered a **Webhook**. A webhook is a "Reverse API". Instead of your server calling Shopify, Shopify calls *your* server (`app/api/webhooks/shopify/route.ts`) the exact millisecond an inventory level changes.

---

## 3. CS Core: Idempotency in Distributed Systems

In distributed systems, networks are fundamentally unreliable. Packets get dropped, routers restart, and connections time out. 

Because of this, Shopify (and Stripe, AWS, etc.) use an "At-Least-Once Delivery" mechanism for webhooks. If Shopify sends you a webhook but doesn't get a `200 OK` back fast enough (maybe your server was slightly slow), Shopify assumes it failed and **resends the exact same webhook**.

This introduces a massive danger: **Duplicate Processing**.

**The CS Concept: Idempotency**
An API endpoint is **Idempotent** if executing it 1 time has the exact same state effect as executing it 100 times. 

Look at how you wrote your Shopify webhook handler:
```typescript
// From app/api/webhooks/shopify/route.ts
await db.shopifyInventoryLevel.updateMany({
  where: { id: inventoryItemIdStr },
  data: { availableQuantity: available }, // We set the absolute value
})
```

**Why this is a Senior-level implementation:**
Imagine Shopify sends a webhook saying: `"Item X has 5 items left"`. 
*   **Non-Idempotent (Bad):** If your code did `availableQuantity = availableQuantity - 1`, and Shopify accidentally sent the webhook three times, your database would show `2` items left. Data corruption!
*   **Idempotent (Good):** Your code sets the absolute value: `availableQuantity = 5`. If Shopify accidentally sends this webhook three times in a row, your database sets the value to `5`, then overwrites it with `5`, and overwrites it again with `5`. 

Your webhook is inherently idempotent. Network glitches and duplicate webhook deliveries will never corrupt your inventory counts!
