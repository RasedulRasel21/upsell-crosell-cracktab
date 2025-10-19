import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { session, billing, admin } = await authenticate.admin(request);

    // Get shop information
    let shopInfo = null;
    try {
      const shopQuery = await admin.graphql(`
        query {
          shop {
            name
            plan {
              displayName
              shopifyPlus
            }
            myshopifyDomain
            primaryDomain {
              host
            }
          }
        }
      `);
      const shopData = await shopQuery.json();
      shopInfo = shopData?.data?.shop;
    } catch (shopError) {
      console.error("Shop query failed:", shopError);
    }

    // Check billing status with detailed logging
    let billingInfo = {
      hasActivePayment: false,
      appSubscriptions: [],
      error: null,
      testMode: false
    };

    try {
      // Try production billing first
      const billingCheck = await billing.check({
        plans: [MONTHLY_PLAN],
        isTest: false,
      });

      billingInfo = {
        hasActivePayment: billingCheck.hasActivePayment,
        appSubscriptions: billingCheck.appSubscriptions || [],
        error: null,
        testMode: false
      };

      console.log("🔍 Production billing check:", billingCheck);

      // If no production subscription, try test mode
      if (!billingCheck.hasActivePayment) {
        try {
          const testBillingCheck = await billing.check({
            plans: [MONTHLY_PLAN],
            isTest: true,
          });

          if (testBillingCheck.hasActivePayment) {
            billingInfo = {
              hasActivePayment: testBillingCheck.hasActivePayment,
              appSubscriptions: testBillingCheck.appSubscriptions || [],
              error: null,
              testMode: true
            };
            console.log("🧪 Test billing check (found subscription):", testBillingCheck);
          }
        } catch (testError) {
          console.log("🧪 Test billing check failed:", testError);
        }
      }

    } catch (billingError) {
      billingInfo.error = billingError.message;
      console.error("💥 Billing check failed:", billingError);
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        shop: session.shop,
        id: session.id,
        scope: session.scope
      },
      shopInfo,
      billing: billingInfo,
      planConfig: MONTHLY_PLAN,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
        hasApiKey: !!process.env.SHOPIFY_API_KEY,
        hasApiSecret: !!process.env.SHOPIFY_API_SECRET
      }
    };

    console.log("🐛 Debug Info:", debugInfo);

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });

  } catch (error) {
    console.error("🚨 Debug endpoint error:", error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};