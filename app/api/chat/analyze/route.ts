import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import db from "@/lib/db";

const extractionSchema = z.object({
  productType: z.string().describe("The exact product type from the provided list that matches the user's query. If it is not in the list, just return the name of the product the user is asking about."),
  isProductQuery: z.boolean().describe("True if the user is asking about a product or store inventory. False if it's a general question like 'hello' or store hours."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question;
    const storeIdStr = body.storeId;

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

    let productType = "";
    let isProductQuery = false;

    if (storeId && !isNaN(storeId)) {
      const structuredLlm = llm.withStructuredOutput(extractionSchema);
      const extractionResult = await structuredLlm.invoke([
        new HumanMessage(`Analyze the following user query: "${question}". The available product types in our store are: ${availableTypes}. Please identify if this is a product query and if so, which of these exact product types they are asking about.`)
      ]);
      
      if (extractionResult) {
        isProductQuery = extractionResult.isProductQuery;
        if (isProductQuery) {
          productType = extractionResult.productType || "";
        }
      }
    }

    return NextResponse.json({ 
      isProductQuery,
      productType
    });

  } catch (error: any) {
    console.error("Analyze Intent Error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
