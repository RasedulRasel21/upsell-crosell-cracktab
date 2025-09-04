import { createGDPRWebhookAction } from "../utils/webhook-verification";

// Handle GET requests (verification)
export const loader = async () => {
  return new Response("OK", { status: 200 });
};

// Webhook handler function
async function handleCustomerRedact({ shop, payload }) {
  console.log(`Customer redaction request received for shop: ${shop}`, {
    customerId: payload.customer?.id,
    ordersToRedact: payload.orders_to_redact || [],
    timestamp: new Date().toISOString()
  });

  // Since this app doesn't store customer PII, there's minimal data to redact
  // In a real app, you would:
  // 1. Delete all customer PII from your database
  // 2. Anonymize any remaining data
  // 3. Log the deletion for audit purposes

  const customerId = payload.customer?.id;
  
  if (customerId) {
    // Example: If you stored any customer-related data, delete it here
    // await deleteCustomerData(customerId);
    
    console.log(`Successfully processed redaction for customer ${customerId} in shop ${shop}`);
  }

  return new Response(JSON.stringify({ 
    received: true, 
    processed: true,
    customerId: customerId,
    processedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

// Export the GDPR-compliant webhook action
export const action = createGDPRWebhookAction(handleCustomerRedact, "customers/redact");