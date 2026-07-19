# Phase 6: AI Integration & Streaming Data Flows

This phase covers how you integrated Google's Gemini LLM into your Next.js backend, how you provided it with real-time store context, and the underlying computer science behind delivering AI responses to the user.

---

## 1. LLM Orchestration & RAG (Retrieval-Augmented Generation)

In your `app/api/chat/answer/route.ts` file, you didn't just pass the user's question directly to the AI. You implemented a pattern known as **RAG**.

### How you did it:
Before calling the LLM, your code queries your PostgreSQL database (via Prisma) to find Shopify products that match the user's search terms. It then dynamically constructs a massive string:
```typescript
contextString = "\n\n[SYSTEM: LIVE STORE INVENTORY CONTEXT]\n";
// ... loops through products ...
contextString += `- Product: ${product.title} ... Stock: ${totalStock}\n`;
```
This is injected directly into the LLM prompt along with the `SystemMessage`.

### The CS Concept: RAG
LLMs are pre-trained on massive datasets, but their "knowledge cut-off" means they have no idea what is currently in stock at *your specific store right now*. **Retrieval-Augmented Generation (RAG)** is the architecture where you:
1. **Retrieve:** Fetch live, private data from your database.
2. **Augment:** Inject that data into the prompt context.
3. **Generate:** The LLM generates an answer using that fresh context.

---

## 2. Data Delivery: Blocking vs. Streaming

Currently, your code uses the traditional blocking method:
```typescript
const response = await llm.invoke(history);
return NextResponse.json({ response: response.content });
```

### The Architectural Trade-off
*   **Blocking (Current State):** The server sends the entire prompt to Gemini, waits (potentially 3-5 seconds) for Gemini to generate the *entire* paragraph of text, and then sends one massive JSON response back to the frontend.
    *   **Pros:** Very easy to code. Easy to save to the chat history database.
    *   **Cons:** High TTFB (Time To First Byte). The user stares at a loading spinner for 5 seconds, which feels slow.
*   **Streaming (The Enterprise Upgrade):** The server opens a stream. As Gemini generates the first word, the server instantly sends that single word to the frontend. The text appears on the user's screen in real-time, typewriter-style.

---

## 3. CS Core: How Streaming Actually Works

If you were to upgrade your AI to use streaming (e.g., using the Vercel AI SDK), an interviewer will ask you how streaming works over standard HTTP. 

### Chunked Transfer Encoding
HTTP/1.1 introduced **Chunked Transfer Encoding**. Normally, an HTTP response must include a `Content-Length` header so the browser knows exactly how many bytes to wait for before rendering. 
When streaming an AI response, the server *doesn't know* how long the AI's answer will be! 

With Chunked Transfer Encoding, the server omits the `Content-Length` header and instead sends the data in discrete "chunks." Each chunk is prefixed with its size in hex. The browser keeps reading chunks until it receives a final chunk of size `0`, signaling the stream is finished.

### JavaScript Generators (`yield`)
Under the hood, reading these streams in JavaScript heavily relies on **Generators** and asynchronous iterators. 
Unlike a standard function that runs to completion and `returns` one value, a Generator function uses the `yield` keyword to pause execution, spit out a single chunk of data (e.g., one AI token), and wait for the next chunk to arrive, allowing you to process the stream piece-by-piece without locking up the Node.js Event Loop.
