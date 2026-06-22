import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import db from "@/lib/db";

declare global {
  var __chatHistory: Map<string, any[]>;
}

if (!global.__chatHistory) {
  global.__chatHistory = new Map();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question;
    const sessionId = body.session_id;
    const storeIdStr = body.storeId;
    const productType = body.productType;
    const isProductQuery = body.isProductQuery;

    if (!question) {
      return NextResponse.json({ detail: "Question is required" }, { status: 400 });
    }

    const storeId = storeIdStr ? parseInt(storeIdStr, 10) : null;
    let contextString = "";
    let storeName = "the store";

    if (storeId && !isNaN(storeId)) {
      const storeInfo = await db.store.findUnique({ where: { storeId } });
      if (storeInfo && storeInfo.storeName) {
        storeName = storeInfo.storeName;
      }

      if (isProductQuery && productType) {
        const matchingProducts = await db.shopifyProduct.findMany({
          where: {
            storeId: storeId,
            productType: productType,
          },
          include: {
            variants: {
              include: {
                inventoryLevels: true,
              },
            },
          },
          take: 10,
        });

        // Construct Context String
        contextString = "\n\n[SYSTEM: LIVE STORE INVENTORY CONTEXT]\n";
        if (matchingProducts.length === 0) {
          contextString += "No matching products found in inventory based on the user's query.\n";
        } else {
          for (const product of matchingProducts) {
            contextString += `- Product: ${product.title} (Type: ${product.productType || "Unknown"}, Vendor: ${product.vendor || "Unknown"})\n`;
            for (const variant of product.variants) {
              const totalStock = variant.inventoryLevels.reduce((acc: any, level: any) => acc + level.availableQuantity, 0);
              contextString += `  * Variant: ${variant.title} - Price: $${variant.price || "N/A"} - Stock: ${totalStock}\n`;
            }
          }
        }
        contextString += "[/SYSTEM]\n";
      }
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.3,
      apiKey: process.env.GEMINI_API_KEY,
      maxRetries: 0,
    });

    let history = sessionId && global.__chatHistory.has(sessionId)
      ? global.__chatHistory.get(sessionId)!
      : [new SystemMessage(`You are a helpful and accessible assistant exclusively for ${storeName}. You must NEVER refer to yourself as a ShopSmart assistant or mention ShopSmart. Always use the name "${storeName}" when referring to the store. Provide concise, clear, and easy-to-understand answers. If live store inventory context is provided below the user's message, use it strictly to answer stock and price questions.`)];

    // Inject context into the user's question if we have it
    const finalQuestion = contextString ? `${question}${contextString}` : question;

    history.push(new HumanMessage(finalQuestion));

    const response = await llm.invoke(history);
    history.push(response);

    const newSessionId = sessionId || crypto.randomUUID();
    global.__chatHistory.set(newSessionId, history);

    return NextResponse.json({ 
      session_id: newSessionId,
      response: response.content 
    });

  } catch (error: any) {
    console.error("Answer Error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
