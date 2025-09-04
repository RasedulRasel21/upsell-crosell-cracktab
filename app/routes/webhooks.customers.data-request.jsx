import { createGDPRWebhookAction } from "../utils/webhook-verification";

// Handle GET requests (verification)
export const loader = async () => {
  return new Response("OK", { status: 200 });
};

// Webhook handler function
async function handleCustomerDataRequest({ shop, payload }) {
  console.log(`Customer data request received for shop: ${shop}`, {
    customerId: payload.customer?.id,
    ordersRequested: payload.orders_requested || [],
    timestamp: new Date().toISOString()
  });

  const customerId = payload.customer?.id;
  const customerData = {
    note: "This app does not store any customer personal data beyond what is required for app functionality.",
    data_stored: [
      "No customer personal information is stored by this application",
      "Only product and upsell configuration data is maintained",
      "All customer interactions are processed through Shopify's secure systems"
    ]
  };

  if (customerId) {
    // In a real app that stores customer data, you would:
    // 1. Query your database for all customer-related data
    // 2. Collect data from all relevant tables/collections
    // 3. Format the data according to GDPR requirements
    // 4. Return comprehensive customer data export
    
    console.log(`Successfully processed data request for customer ${customerId} in shop ${shop}`);
  }

  return new Response(JSON.stringify({
    received: true,
    processed: true,
    customerId: customerId,
    customerData: customerData,
    processedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

// Export the GDPR-compliant webhook action
export const action = createGDPRWebhookAction(handleCustomerDataRequest, "customers/data_request");