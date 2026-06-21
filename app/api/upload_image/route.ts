import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

declare global {
  var __chatHistory: Map<string, any[]>;
}

if (!global.__chatHistory) {
  global.__chatHistory = new Map();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "No image file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    });

    const sessionId = crypto.randomUUID();
    const history: any[] = [
      new SystemMessage("You are an accessible Walmart Assistant for visually impaired users. Describe the image clearly and concisely, focusing on products or store layouts. Keep responses short and helpful.")
    ];

    const message = new HumanMessage({
      content: [
        { type: "text", text: "Describe this image for a visually impaired user. What products or objects are visible?" },
        { type: "image_url", image_url: `data:${file.type};base64,${base64Image}` },
      ],
    });

    history.push(message);

    const response = await llm.invoke(history);
    history.push(response);

    global.__chatHistory.set(sessionId, history);

    return NextResponse.json({
      session_id: sessionId,
      response: response.content
    });

  } catch (error: any) {
    console.error("Upload Image Error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
