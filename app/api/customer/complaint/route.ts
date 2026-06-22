import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { producer } from "@/lib/kafka";

export async function POST(req: NextRequest) {
  try {
    const { storeId, complaint } = await req.json();

    if (!storeId || !complaint) {
      return NextResponse.json({ error: "Store ID and complaint text are required" }, { status: 400 });
    }

    // Find or create the default user for customer submissions
    const user = await prisma.user.upsert({
      where: { userEmail: "customer@assist.com" },
      update: {},
      create: {
        userEmail: "customer@assist.com",
        name: "Anonymous Customer",
        password: "customer-dummy-password",
      },
    });

    // Lookup store details
    const store = await prisma.store.findUnique({
      where: { storeId: Number(storeId) }
    });
    const storeLocation = store ? store.storeLocation : "Unknown Store";

    // Create the complaint record in the QuietTime table representing a store action/complaint
    const newComplaint = await prisma.quietTime.create({
      data: {
        userId: user.userId,
        storeId: Number(storeId),
        date: new Date(),
        timewindow: "Complaint",
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
            userId: user.userId.toString(),
            userName: user.name,
            storeLocation: storeLocation,
            date: newComplaint.date.toISOString().split('T')[0],
            timeWindow: "Complaint",
            reason: newComplaint.reason || '',
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
