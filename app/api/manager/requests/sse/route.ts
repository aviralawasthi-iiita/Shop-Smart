import { NextRequest } from "next/server";
import { createConsumer } from "@/lib/kafka";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeIdParam = searchParams.get("storeId");
  const targetStoreId = storeIdParam ? Number(storeIdParam) : null;

  if (!targetStoreId) {
    return new Response("Missing storeId", { status: 400 });
  }

  const encoder = new TextEncoder();
  const consumer = createConsumer(`sse-requests-${Date.now()}-${Math.random()}`);

  const stream = new ReadableStream({
    async start(controller) {
      // Keep alive interval to prevent browser timeout
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch (e) {
          // Stream might be closed
        }
      }, 30000);

      try {
        await consumer.connect();
        await consumer.subscribe({ topic: "store-requests" });
        await consumer.run({
          eachMessage: async ({ message }) => {
            if (!message.value) return;
            const data = JSON.parse(message.value.toString());
            // Only stream to managers matching the target store
            if (Number(data.storeId) === targetStoreId) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            }
          },
        });
      } catch (err) {
        console.error("SSE Manager requests Kafka error:", err);
      }

      // Cleanup when connection closes
      req.signal.addEventListener("abort", async () => {
        clearInterval(keepAlive);
        try {
          await consumer.disconnect();
        } catch (e) {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
