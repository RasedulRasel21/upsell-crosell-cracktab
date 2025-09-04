import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  BlockStack,
  Banner,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, BASIC_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // For now, just return basic info without billing checks
    // since billing is not properly configured yet
    return {
      currentSubscription: null,
      upsellBlocksCount: 0,
      shop: session.shop,
      hasActiveSubscription: false,
    };
  } catch (error) {
    console.error("Billing loader error:", error);
    return {
      currentSubscription: null,
      upsellBlocksCount: 0,
      shop: null,
      hasActiveSubscription: false,
      error: error.message,
    };
  }
};

export const action = async ({ request }) => {
  try {
    const { billing } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "subscribe") {
      try {
        // Create subscription using Shopify billing API
        const billingResult = await billing.require({
          plans: [BASIC_PLAN],
          isTest: true,
          onFailure: async () => {
            return await billing.request({
              plan: BASIC_PLAN,
              isTest: true,
              returnUrl: `https://${request.headers.get("host")}/app/billing?subscribed=true`,
            });
          }
        });

        console.log("Billing Result:", JSON.stringify(billingResult, null, 2));

        return {
          success: true,
          message: "Subscription activated successfully",
        };
      } catch (billingError) {
        console.log("Billing error:", billingError);
        
        // Check if it's a redirect response
        if (billingError.status === 302 || billingError.headers?.get?.('location')) {
          return billingError;
        }
        
        return {
          error: billingError.message || "Failed to create subscription. Please ensure your app has billing configured in Partners dashboard.",
        };
      }
    }

    if (actionType === "cancel") {
      try {
        // Get current subscription first
        const billingCheck = await billing.check({
          plans: [BASIC_PLAN],
          isTest: true,
        });
        
        if (billingCheck.hasActivePayment && billingCheck.appSubscriptions?.[0]) {
          const subscription = billingCheck.appSubscriptions[0];
          
          const canceledSubscription = await billing.cancel({
            subscriptionId: subscription.id,
            isTest: true,
            prorate: true,
          });

          console.log("Cancel Result:", JSON.stringify(canceledSubscription, null, 2));

          if (canceledSubscription) {
            return {
              success: true,
              message: "Subscription cancelled successfully",
              cancelled: true,
            };
          }
        }

        return {
          error: "No active subscription found to cancel",
        };
      } catch (cancelError) {
        console.log("Cancel error:", cancelError);
        return {
          error: cancelError.message || "Failed to cancel subscription",
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Billing action error:", error);
    return {
      error: error.message,
    };
  }
};

export default function Billing() {
  const data = useLoaderData();

  const {
    hasActiveSubscription = false,
    shop,
  } = data;

  // Check if this is a development store
  const isDevelopmentStore = shop && shop.includes('.myshopify.com');

  const handleChangePlan = () => {
    const storeHandle = shop?.replace('.myshopify.com', '') || '';
    const appHandle = 'upsell-cross-sell-booster';
    const url = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
    window.open(url, '_blank');
  };

  return (
    <Page>
      <TitleBar title="Billing" />
      
      <BlockStack gap="500">
        {hasActiveSubscription && (
          <Banner status="success">
            ✓ You are subscribed to the Premium plan
          </Banner>
        )}

        {!hasActiveSubscription && isDevelopmentStore && (
          <Banner status="info">
            Development Store - Free Access
          </Banner>
        )}

        {!hasActiveSubscription && !isDevelopmentStore && (
          <Banner status="attention">
            No active subscription
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <ButtonGroup>
              <Button onClick={handleChangePlan}>
                {hasActiveSubscription ? 'Change Plan' : 'Subscribe to Premium'}
              </Button>
              {hasActiveSubscription && (
                <Button>
                  Cancel Plan
                </Button>
              )}
            </ButtonGroup>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}