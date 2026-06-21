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
    const body = await req.json();
    const question = body.question;
    const sessionId = body.session_id;

    if (!question) {
      return NextResponse.json({ detail: "Question is required" }, { status: 400 });
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    });

    let history = sessionId && global.__chatHistory.has(sessionId)
      ? global.__chatHistory.get(sessionId)!
      : [new SystemMessage("You are a helpful and accessible Walmart Assistant. Provide concise, clear, and easy-to-understand answers.")];

    history.push(new HumanMessage(question));

    const response = await llm.invoke(history);
    history.push(response);

    if (sessionId) {
      global.__chatHistory.set(sessionId, history);
    }

    return NextResponse.json({ response: response.content });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
