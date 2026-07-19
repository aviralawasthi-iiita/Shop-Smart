import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const { managerEmail, managerPassword, storeName, storeLocation, otp } = await req.json();

    if (!managerEmail || !managerPassword || !storeName || !storeLocation || !otp) {
      return NextResponse.json({ message: "All fields and OTP are required" }, { status: 400 });
    }

    // Verify OTP
    const otpRecord = await prisma.oTP.findUnique({
      where: { email: managerEmail },
    });

    if (!otpRecord) {
      return NextResponse.json({ message: "No OTP requested for this email" }, { status: 400 });
    }

    if (otpRecord.code !== otp) {
      return NextResponse.json({ message: "Invalid OTP code" }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ message: "OTP code has expired" }, { status: 400 });
    }

    // Check if manager/store already exists
    const existingStore = await prisma.store.findUnique({
      where: { managerEmail },
    });

    if (existingStore) {
      return NextResponse.json({ message: "Manager with this email already exists" }, { status: 400 });
    }

    // Create the Store
    const hashedPassword = await bcrypt.hash(managerPassword, 10);
    const newStore = await prisma.store.create({
      data: {
        managerEmail,
        managerPassword: hashedPassword,
        storeName,
        storeLocation,
      },
    });

    // Delete the OTP record
    await prisma.oTP.delete({
      where: { id: otpRecord.id },
    });

    return NextResponse.json({ message: "Manager registered successfully", store: newStore }, { status: 201 });
  } catch (error: any) {
    console.error("Manager Registration Error:", error);
    return NextResponse.json({ message: error.message || "Failed to register" }, { status: 500 });
  }
}
