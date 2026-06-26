import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export type ComplaintResponse = {
  id: number;
  userName: string;
  storeLocation: string;
  date: string;
  timeWindow: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    const complaints = await prisma.complaint.findMany({
      where: {
        storeId: Number(storeId),
      },
      include: {
        store: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    const formatted: ComplaintResponse[] = complaints.map(c => ({
      id: c.id,
      userName: "Anonymous Customer",
      storeLocation: c.store.storeLocation,
      date: c.date.toISOString().split("T")[0],
      timeWindow: "Complaint",
      reason: c.reason,
      status: c.status as any,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch Complaints Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch complaints" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Complaint ID and status are required" }, { status: 400 });
    }

    const updated = await prisma.complaint.update({
      where: { id: Number(id) },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Complaint Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update complaint" }, { status: 500 });
  }
}
