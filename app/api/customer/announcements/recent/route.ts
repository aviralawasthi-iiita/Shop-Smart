import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get("storeId")

  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required" }, { status: 400 })
  }

  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        storeId: parseInt(storeId),
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10,
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Error fetching recent announcements:", error)
    return NextResponse.json({ error: "Failed to fetch recent announcements" }, { status: 500 })
  }
}
