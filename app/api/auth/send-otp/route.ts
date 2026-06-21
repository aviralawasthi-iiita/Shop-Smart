import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Upsert the OTP in the database
    await prisma.oTP.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    // Send email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: "Your Walmart Assist Verification Code",
      text: `Your OTP verification code is: ${code}\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0071ce;">Walmart Assist Verification</h2>
          <p>You recently requested to register for a Walmart Assist account.</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; color: #0f172a; margin: 0;">${code}</h1>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ message: error.message || "Failed to send OTP" }, { status: 500 });
  }
}
