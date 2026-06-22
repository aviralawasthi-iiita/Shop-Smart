import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import db from "@/lib/db";

const extractionSchema = z.object({
  productType: z.string().describe("The exact product type from the provided list that matches the image. If it is not in the list, just return the name of the product as closely as possible."),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const storeIdStr = formData.get("storeId") as string | null;

    if (!file || !storeIdStr) {
      return NextResponse.json(
        { detail: "Missing required fields: image or storeId" },
        { status: 400 }
      );
    }

    const storeId = parseInt(storeIdStr, 10);
    if (isNaN(storeId)) {
      return NextResponse.json({ detail: "Invalid storeId" }, { status: 400 });
    }

    // Step 1: Extract Metadata from Image using Gemini Vision
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    // Fetch available product types for this store
    const distinctTypesResult = await db.shopifyProduct.findMany({
      where: { storeId: storeId, productType: { not: null } },
      select: { productType: true },
      distinct: ['productType']
    });
    const availableTypes = distinctTypesResult.map(t => t.productType).filter(Boolean).join(", ");

    const visionLlm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
      maxRetries: 0,
    });

    const structuredLlm = visionLlm.withStructuredOutput(extractionSchema);

    // Call the structured model with the image
    const extractionResult = await structuredLlm.invoke([
      new HumanMessage({
        content: [
          {
            type: "text",
            text: `Analyze this image. The available product types in our store are: ${availableTypes}. Please identify which of these exact product types best matches the image. Return only the exact string. If none match perfectly, return the closest one or empty string.`,
          },
          {
            type: "image_url",
            image_url: `data:${file.type};base64,${base64Image}`,
          },
        ],
      }),
    ]);

    if (!extractionResult) {
      throw new Error("Failed to extract structured data from image.");
    }

    const { productType } = extractionResult;

    return NextResponse.json({
      productType: productType || "",
      isProductQuery: true
    });
  } catch (error: any) {
    console.error("Analyze Image Error:", error);
    return NextResponse.json({ detail: error.message || "An error occurred" }, { status: 500 });
  }
}
