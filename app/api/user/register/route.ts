import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userEmail, password, name, otp } = await req.json();

    if (!userEmail || !password || !name || !otp) {
      return NextResponse.json({ message: "All fields and OTP are required" }, { status: 400 });
    }

    // Verify OTP
    const otpRecord = await prisma.oTP.findUnique({
      where: { email: userEmail },
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { userEmail },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    // Create the User
    // In production, remember to hash the password (e.g. using bcrypt). For now, storing plain text to match existing app behavior.
    const newUser = await prisma.user.create({
      data: {
        userEmail,
        password,
        name,
      },
    });

    // Delete the OTP record so it can't be reused
    await prisma.oTP.delete({
      where: { id: otpRecord.id },
    });

    return NextResponse.json({ message: "Student registered successfully", user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("User Registration Error:", error);
    return NextResponse.json({ message: error.message || "Failed to register" }, { status: 500 });
  }
}
