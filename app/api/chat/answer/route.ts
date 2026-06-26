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
    const searchTerms = body.searchTerms;
    const isProductQuery = body.isProductQuery;
    const base64Image = body.base64Image;

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

      if (isProductQuery && searchTerms && searchTerms.length > 0) {
        let matchingProducts = await db.shopifyProduct.findMany({
          where: {
            storeId: storeId,
            productType: { in: searchTerms },
          },
          include: {
            variants: {
              include: {
                inventoryLevels: true,
              },
            },
          },
          take: 100,
        });

        // Construct Context String
        contextString = "\n\n[SYSTEM: LIVE STORE INVENTORY CONTEXT]\n";
        if (matchingProducts.length === 0) {
          if (base64Image) {
            contextString += "IMPORTANT INSTRUCTION: We do NOT have this exact product in stock. You MUST explicitly say 'We don't have this exact product, but we do have other products in stock.' Then, carefully evaluate the list of fallback products below. ONLY suggest them as alternatives if they are genuinely functionally similar to the product the user is holding. If they are, provide a brief reason why they might be a good alternative. If none are similar, simply state what else is available without calling them alternatives.\n";
            const fallbackProducts = await db.shopifyProduct.findMany({
              where: { storeId },
              include: {
                variants: { include: { inventoryLevels: true } }
              },
              take: 5,
            });
            for (const product of fallbackProducts) {
              contextString += `- Fallback Product: ${product.title} (Type: ${product.productType || "Unknown"}, Vendor: ${product.vendor || "Unknown"})\n`;
              for (const variant of product.variants) {
                const totalStock = variant.inventoryLevels.reduce((acc: any, level: any) => acc + level.availableQuantity, 0);
                contextString += `  * Variant: ${variant.title} - Price: $${variant.price || "N/A"} - Stock: ${totalStock}\n`;
              }
            }
          } else {
            contextString += "No matching products found in inventory based on the user's query.\n";
          }
        } else {
          if (base64Image) {
            contextString += "IMPORTANT INSTRUCTION: We found matching products. You MUST explicitly say 'The product you are currently holding is [Product Name]' and give its details (price, availability). Then, you MUST identify the product correctly, and carefully evaluate the list of products below to find valid alternatives. ONLY provide alternatives that are functionally similar to the original product (e.g., do not suggest deodorant as an alternative to shaving cream). Do not just provide cheaper alternatives; list any genuinely similar alternatives present in the list, and include a brief reason as to why each might be better or how it compares.\n";
          } else {
            contextString += "IMPORTANT INSTRUCTION: You MUST explicitly list the available items found below with their details (e.g. name, price, availability).\n";
          }
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
      : [new SystemMessage(`You are a helpful and accessible assistant exclusively for ${storeName}. You must NEVER refer to yourself as a ShopSmart assistant or mention ShopSmart. Always use the name "${storeName}" when referring to the store. Provide concise, clear, and easy-to-understand answers. Do not use any markdown formatting like bold (**), italics (*), or lists in your responses. Your responses will be read aloud by a text-to-speech engine, so format them as plain conversational text. If live store inventory context is provided below the user's message, use it strictly to answer stock and price questions.`)];

    // Inject context into the user's question if we have it
    const finalQuestion = contextString ? `${question}${contextString}` : question;

    let messageContent: any = finalQuestion;
    if (base64Image) {
      messageContent = [
        { type: "text", text: finalQuestion },
        { type: "image_url", image_url: base64Image }
      ];
    }

    history.push(new HumanMessage({ content: messageContent }));

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
