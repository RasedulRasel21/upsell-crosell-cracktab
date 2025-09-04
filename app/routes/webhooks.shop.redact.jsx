import { createGDPRWebhookAction } from "../utils/webhook-verification";

// Handle GET requests (verification)
export const loader = async () => {
  return new Response("OK", { status: 200 });
};

// Webhook handler function
async function handleShopRedact({ shop, payload }) {
  console.log(`Shop redaction request received for shop: ${shop}`, {
    shopId: payload.shop_id,
    shopDomain: payload.shop_domain,
    timestamp: new Date().toISOString()
  });

  // Delete all shop-related data when the store is deleted/requests redaction
  const shopDomain = payload.shop_domain || shop;
  
  if (shopDomain) {
    try {
      // Delete all upsell blocks for this shop
      const { deleteAllUpsellBlocks } = await import("../models/upsell.server");
      await deleteAllUpsellBlocks(shopDomain);
      
      console.log(`Successfully processed shop redaction for shop: ${shopDomain}`);
      
      // In a production app, you might also:
      // 1. Delete subscription data
      // 2. Delete analytics data
      // 3. Delete any cached data
      // 4. Notify relevant services
    } catch (error) {
      console.error(`Error cleaning up data for shop ${shopDomain}:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    received: true, 
    processed: true,
    shopDomain: shopDomain,
    processedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

// Export the GDPR-compliant webhook action
export const action = createGDPRWebhookAction(handleShopRedact, "shop/redact");