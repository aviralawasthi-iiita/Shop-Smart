# Phase 1: Data Modeling & Persistence (PostgreSQL + Prisma)

### 1. Prisma ORM & The Singleton Pattern (`lib/db.ts`)

```typescript
export const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
```

**The What:** You are storing the `PrismaClient` instance on the `global` object during development and reusing it, rather than creating a new instance every time the file is loaded.

**The Why:** Next.js uses Hot Module Replacement (HMR) for a fast developer experience. Every time you save a file in development, Next.js clears the Node.js module cache and re-evaluates your files. If you simply instantiated `new PrismaClient()` at the top of your file, Next.js would spawn a brand new database connection pool to your PostgreSQL database on every single save. 
PostgreSQL has a hard limit on concurrent connections (often 100 by default). Without this pattern, you would quickly exhaust the database connections and crash the app with a fatal error. The `global` object survives HMR, preventing a connection leak.

**CS Core:** This is a real-world implementation of the **Singleton Pattern** combined with **Resource Pooling**. Opening a TCP connection to a database is expensive (DNS resolution, TCP 3-way handshake, authentication). A connection pool keeps a set of connections open and ready in the background, drastically reducing latency for incoming API requests.

---

### 2. Relational Modeling & Normalization (`prisma/schema.prisma`)

Data structure flow: `Store` ➔ `ShopifyProduct` ➔ `ShopifyVariant` ➔ `ShopifyInventoryLevel`.

**The What:** You've separated products, their variants (e.g., sizes or colors), and their physical inventory levels into distinct tables linked by foreign keys (`storeId`, `productId`, `variantId`). You also utilized `onDelete: Cascade` on the relations.

**The Why:** This perfectly adheres to **Database Normalization** (specifically up to the 3rd Normal Form). Instead of storing a massive, nested JSON object in a single column (which makes updating a single variant's stock computationally expensive and prone to race conditions), you've atomicized the data. 
Furthermore, `onDelete: Cascade` delegates cleanup to the database engine. If a `Store` is deleted, Postgres automatically wipes all associated products, variants, and inventory, preventing "orphaned" records without requiring you to write a massive, multi-step transaction in Node.js.

---

### 3. CS Core: B-Trees and Indexing

Use of `@id`, `@unique`, and composite constraints like `@@unique([id, storeId])` on the `ShopifyProduct` model.

**The Why:** Under the hood, PostgreSQL doesn't just read these as arbitrary validation rules. When you declare these, it actively builds a data structure on the disk called a **B-Tree (Balanced Tree)** index.

If you query a product without an index, the database engine must read every single row from the disk into memory to find a match. This is called a "Sequential Scan" (or Full Table Scan), and its time complexity is **O(N)**. 

Because you explicitly declared `@@unique([id, storeId])`, Postgres traverses a shallow, balanced tree to find the exact disk block where your data lives. The time complexity drops to **O(log N)**. In a table with millions of products, this is the difference between a query taking 2 milliseconds versus 2 full seconds.
