import { createSecureWebhookAction } from "../utils/webhook-verification";
import db from "../db.server";

// Webhook handler function
async function handleAppUninstalled({ shop, payload }) {
  console.log(`Received app/uninstalled webhook for ${shop}`);

  // Clean up all app data when uninstalled
  try {
    // Delete all upsell blocks for this shop
    const { deleteAllUpsellBlocks } = await import("../models/upsell.server");
    await deleteAllUpsellBlocks(shop);
    console.log(`Cleaned up upsell blocks for uninstalled shop: ${shop}`);
  } catch (error) {
    console.error(`Error cleaning up upsell blocks for ${shop}:`, error);
  }

  // Clean up sessions for this shop
  try {
    await db.session.deleteMany({ where: { shop } });
    console.log(`Cleaned up sessions for uninstalled shop: ${shop}`);
  } catch (error) {
    console.error(`Error cleaning up sessions for ${shop}:`, error);
  }

  return new Response(null, { status: 200 });
}

// Export the secure webhook action
export const action = createSecureWebhookAction(handleAppUninstalled, "app/uninstalled");
