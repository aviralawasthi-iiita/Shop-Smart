import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { producer } from "@/lib/kafka";

export async function POST(req: NextRequest) {
  try {
    const { storeId, complaint } = await req.json();

    if (!storeId || !complaint) {
      return NextResponse.json({ error: "Store ID and complaint text are required" }, { status: 400 });
    }

    // Lookup store details
    const store = await prisma.store.findUnique({
      where: { storeId: Number(storeId) }
    });
    
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const storeLocation = store.storeLocation;

    // Create the complaint record in the new Complaint table
    const newComplaint = await prisma.complaint.create({
      data: {
        storeId: Number(storeId),
        date: new Date(),
        reason: complaint,
        status: "pending",
      },
    });

    // Produce complaint to Kafka
    await producer.send({
      topic: "store-requests",
      messages: [
        {
          value: JSON.stringify({
            id: newComplaint.id,
            userName: "Anonymous Customer",
            storeLocation: storeLocation,
            date: newComplaint.date.toISOString().split('T')[0],
            timeWindow: "Complaint",
            reason: newComplaint.reason,
            status: "pending",
            storeId: newComplaint.storeId
          }),
        },
      ],
    });

    return NextResponse.json({
      message: "Complaint submitted successfully",
      id: newComplaint.id,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Complaint Submission Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit complaint" }, { status: 500 });
  }
}
