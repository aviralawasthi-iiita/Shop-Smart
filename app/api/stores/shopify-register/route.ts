import { NextResponse } from "next/server"
import db from "@/lib/db"
import { syncStoreInventory } from "@/lib/shopifySync"
import { encrypt } from "@/lib/encryption"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { storeId, shopDomain, apiToken, webhookSecret } = body

    if (!storeId || !shopDomain || !apiToken || !webhookSecret) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const store = await db.store.findUnique({
      where: { storeId: Number(storeId) },
    })

    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 })
    }

    // Encrypt credentials before saving
    const encryptedApiToken = encrypt(apiToken)
    const encryptedWebhookSecret = encrypt(webhookSecret)

    // Update the store with Shopify credentials
    const updatedStore = await db.store.update({
      where: { storeId: Number(storeId) },
      data: {
        shopDomain,
        apiToken: encryptedApiToken,
        webhookSecret: encryptedWebhookSecret,
      },
    })

    // Trigger async sync without waiting
    syncStoreInventory(updatedStore.storeId).catch((error) => {
      console.error("Async inventory sync failed:", error)
    })

    return NextResponse.json(
      { message: "Shopify configuration saved and sync started", storeId: updatedStore.storeId },
      { status: 200 }
    )
  } catch (error) {
    console.error("Shopify config error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
