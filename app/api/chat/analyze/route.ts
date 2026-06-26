import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import db from "@/lib/db";

declare global {
  var __chatHistory: Map<string, any[]>;
}

if (!global.__chatHistory) {
  global.__chatHistory = new Map();
}

const extractionSchema = z.object({
  searchTerms: z.array(z.string()).describe("Return 1 or more exact product types from the provided 'available product types' list. You MUST ONLY use the exact product types provided in the list (e.g. 'Snacks', 'Bakery'). Do not invent new types or item names like 'Chocolate'. If you are unsure which category the user's item falls under, return 2 or more of the provided product types as broad guesses."),
  isProductQuery: z.boolean().describe("True if the user is asking about a product or store inventory. False if it's a general question like 'hello' or store hours."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question;
    const storeIdStr = body.storeId;
    const sessionId = body.session_id;

    if (!question) {
      return NextResponse.json({ detail: "Question is required" }, { status: 400 });
    }

    const storeId = storeIdStr ? parseInt(storeIdStr, 10) : null;
    let availableTypes = "";

    if (storeId && !isNaN(storeId)) {
      const distinctTypesResult = await db.shopifyProduct.findMany({
        where: { storeId: storeId, productType: { not: null } },
        select: { productType: true },
        distinct: ['productType']
      });
      availableTypes = distinctTypesResult.map(t => t.productType).filter(Boolean).join(", ");
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
      maxRetries: 0,
    });

    let searchTerms: string[] = [];
    let isProductQuery = false;

    if (storeId && !isNaN(storeId)) {
      let chatContext = "";
      if (sessionId && global.__chatHistory && global.__chatHistory.has(sessionId)) {
        const history = global.__chatHistory.get(sessionId)!;
        const recentHistory = history.slice(-2);
        const contextMessages = recentHistory.map((msg: any) => {
           let text = typeof msg.content === 'string' ? msg.content : (Array.isArray(msg.content) ? msg.content.find((p:any)=>p.type==='text')?.text || '' : '');
           return text;
        }).filter(Boolean).join("\n---\n");
        if (contextMessages) {
           chatContext = `\n\nPrevious conversation context to help you disambiguate vague queries (e.g., if the user asks for a "healthy alternative" without specifying what kind, use the context to determine they mean Beverages). HOWEVER, if their new query explicitly asks about a different category (e.g. "what food would go with it"), you MUST shift to the newly requested category (e.g. Snacks, Pantry) rather than sticking to the old one. Context:\n${contextMessages}\n`;
        }
      }

      const structuredLlm = llm.withStructuredOutput(extractionSchema);
      const extractionResult = await structuredLlm.invoke([
        new HumanMessage(`Analyze the following user query: "${question}". The available product types in our store are: ${availableTypes}.${chatContext} Please identify if this is a product query. If it is, extract the search terms as instructed by the schema.`)
      ]);

      if (extractionResult) {
        isProductQuery = extractionResult.isProductQuery;
        if (isProductQuery) {
          searchTerms = extractionResult.searchTerms || [];
        }
      }
    }

    return NextResponse.json({
      isProductQuery,
      searchTerms
    });

  } catch (error: any) {
    console.error("Analyze Intent Error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
