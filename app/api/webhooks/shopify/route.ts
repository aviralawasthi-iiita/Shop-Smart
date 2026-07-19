import { NextResponse } from "next/server"
import crypto from "crypto"
import db from "@/lib/db"
import { decrypt } from "@/lib/encryption"

export async function POST(request: Request) {
  try {
    const shopDomain = request.headers.get("x-shopify-shop-domain")
    const hmac = request.headers.get("x-shopify-hmac-sha256")

    if (!shopDomain || !hmac) {
      return NextResponse.json({ message: "Missing required headers" }, { status: 400 })
    }

    const store = await db.store.findUnique({
      where: { shopDomain },
    })

    if (!store || !store.webhookSecret) {
      return NextResponse.json({ message: "Store not found or unauthorized" }, { status: 404 })
    }

    const rawBody = await request.text()

    const decryptedSecret = decrypt(store.webhookSecret)
    if (!decryptedSecret) {
      return NextResponse.json({ message: "Store not found or unauthorized (decryption failed)" }, { status: 404 })
    }

    // Validate HMAC signature
    const hash = crypto
      .createHmac("sha256", decryptedSecret)
      .update(rawBody, "utf8")
      .digest("base64")

    if (hash !== hmac) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Shopify inventory_levels/update payload contains inventory_item_id, location_id, and available
    const locationIdStr = String(payload.location_id)
    const inventoryItemIdStr = String(payload.inventory_item_id)
    const available = Number(payload.available)

    // In a production system we'd parse the GraphQL global IDs properly, but for this 
    // implementation we use contains matching against the raw string IDs we got from GraphQL
    await db.shopifyInventoryLevel.updateMany({
      where: {
        storeId: store.storeId, // Crucial Tenant Isolation
        locationId: {
          contains: locationIdStr,
        },
        id: {
          contains: inventoryItemIdStr,
        },
      },
      data: {
        availableQuantity: available,
      },
    })

    return NextResponse.json({ message: "Inventory updated" }, { status: 200 })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
