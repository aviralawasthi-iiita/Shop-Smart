# Phase 7: Production Readiness & Build Architecture

When an application is ready for production, the code is only half the battle. The other half is ensuring the system can handle traffic, stay online during outages, and return data lightning fast. 

In system design interviews, these topics are critical. We will cover **Caching**, **The CAP Theorem**, and **Scaling**.

---

## 1. Caching Strategies
Every time a user asks a question on your app, the backend queries PostgreSQL for up to 100 products. Database queries are expensive (CPU, Disk I/O, Network). If 1,000 users query for "Apples" at the same time, your database will crash.

A **Cache** is a temporary, high-speed storage layer (usually stored in RAM instead of a hard drive).

### Next.js `unstable_cache`
In `app/api/chat/answer/route.ts`, we wrapped the database queries with `unstable_cache`. Next.js intercepts the request, checks if the result for "Apples" is already in memory, and returns it instantly. If it isn't, it queries the database, saves the result to the cache, and sets a TTL (Time-To-Live) of 60 seconds.

### Types of Caching
- **Cache-Aside (Lazy Loading):** The application checks the cache first. If it's a miss, it queries the DB and updates the cache. (This is what `unstable_cache` does).
- **Write-Through:** Every time you write data to the DB, you also write it to the cache. Data is always perfectly in sync, but writes are slower.
- **Redis:** An open-source, in-memory data structure store used heavily in enterprise as a centralized caching server.

> [!TIP]
> **Interview Question:** "What happens if a product's price changes, but the old price is still cached?"
> **Answer:** This is called "Stale Data". We solve this using a TTL (e.g., revalidate every 60 seconds), or by implementing "Cache Invalidation," where updating the price in the DB explicitly deletes the cached version.

---

## 2. The CAP Theorem
The CAP Theorem states that a **distributed data store** can only provide two of the following three guarantees simultaneously:

1. **Consistency (C):** Every read receives the most recent write. (All nodes see the exact same data at the same time).
2. **Availability (A):** Every request receives a non-error response, but without the guarantee that it contains the most recent write.
3. **Partition Tolerance (P):** The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

Because network partitions (P) are unavoidable in the real world (servers go offline, cables break), databases must choose between **CP** and **AP**.

- **PostgreSQL (Our DB):** Typically **CP** (Consistency & Partition Tolerance). If the primary node goes down, it stops accepting writes to prevent data corruption.
- **Redis (Our Cache conceptual equivalent):** Often used in an **AP** (Availability & Partition Tolerance) setup. It prioritizes returning data extremely quickly, even if it's slightly out of date.

---

## 3. Scaling Architecture

When your startup gets too much traffic, your server CPU maxes out. How do you fix it?

### Vertical Scaling (Scaling Up)
Buying a bigger, more expensive server with more CPU and RAM.
- **Pros:** Extremely easy. No code changes needed.
- **Cons:** There is a physical limit to how big a single machine can get. If that machine crashes, your entire app goes down (Single Point of Failure).

### Horizontal Scaling (Scaling Out)
Adding more identical servers and using a **Load Balancer** to distribute the traffic (Server A gets request 1, Server B gets request 2).
- **Pros:** Infinite scaling. High availability (if Server A crashes, the load balancer reroutes traffic to Server B).
- **Cons:** Harder to manage. State (like user sessions) must be stored in a centralized cache (like Redis) because User 1 might hit Server A first, and Server B next.

> [!IMPORTANT]
> Because our Next.js backend uses JWTs (which are self-contained) instead of server-side sessions, our backend is entirely **Stateless**. This means we can Horizontally Scale our backend to 1,000 servers immediately without any issues!
