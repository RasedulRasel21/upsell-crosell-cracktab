import { useEffect } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  Banner,
  List,
  Divider,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, BASIC_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, billing, session } = await authenticate.admin(request);
    
    // Check current subscription status using billing API
    let hasActiveSubscription = false;
    let currentSubscription = null;
    let billingCheck = null;
    
    try {
      billingCheck = await billing.check({
        plans: [BASIC_PLAN],
        isTest: true,
      });
      hasActiveSubscription = billingCheck.hasActivePayment;
      currentSubscription = billingCheck.appSubscriptions?.[0] || null;
      
      console.log("Billing Check Result:", JSON.stringify(billingCheck, null, 2));
    } catch (billingError) {
      console.log("Billing check failed:", billingError);
    }

    // Get upsell blocks count
    let upsellBlocksCount = 0;
    try {
      const { getUpsellBlocks } = await import("../models/upsell.server");
      const upsellBlocks = await getUpsellBlocks(session.shop);
      upsellBlocksCount = upsellBlocks.length;
    } catch (error) {
      console.log("Database query failed:", error);
    }
    
    return {
      currentSubscription,
      upsellBlocksCount,
      shop: session.shop,
      hasActiveSubscription,
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
  const fetcher = useFetcher();

  const {
    currentSubscription,
    upsellBlocksCount = 0,
    hasActiveSubscription = false,
    error,
  } = data;

  // Check if this is a development store
  const isDevelopmentStore = data.shop && data.shop.includes('.myshopify.com');
  const isFreeForDevelopment = isDevelopmentStore;
  
  // For production stores, Pro plan is required for any upsells
  const requiresProPlan = !isDevelopmentStore && !hasActiveSubscription;

  useEffect(() => {
    if (fetcher.data?.success) {
      // Handle success messages
      console.log("Billing action successful:", fetcher.data.message);
      
      // Reload page to get fresh subscription data
      if (fetcher.data.cancelled || fetcher.data.message?.includes("activated")) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  }, [fetcher.data]);

  const handleSubscribe = () => {
    const formData = new FormData();
    formData.append("actionType", "subscribe");
    fetcher.submit(formData, { method: "POST" });
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel your subscription? You'll lose access to unlimited upsell blocks and checkout placement.")) {
      const formData = new FormData();
      formData.append("actionType", "cancel");
      fetcher.submit(formData, { method: "POST" });
    }
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <Page>
      <TitleBar title="Billing & Plans" />
      
      <BlockStack gap="500">
        {error && (
          <Banner status="critical">
            Error loading billing information: {error}
          </Banner>
        )}

        {fetcher.data?.success && (
          <Banner status="success">
            {fetcher.data.message}
          </Banner>
        )}

        {fetcher.data?.error && (
          <Banner status="critical">
            {fetcher.data.error}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Current Usage Card */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingLg">
                      Current Usage
                    </Text>
                    <Badge 
                      status={hasActiveSubscription ? "success" : isFreeForDevelopment ? "info" : "attention"}
                    >
                      {hasActiveSubscription ? "Pro Plan" : isFreeForDevelopment ? "Free (Dev Store)" : "Pro Required"}
                    </Badge>
                  </InlineStack>

                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">
                        Upsell blocks created
                      </Text>
                      <Text variant="bodyMd" fontWeight="bold">
                        {upsellBlocksCount} / {hasActiveSubscription || isFreeForDevelopment ? "1 (Checkout)" : "Pro Required"}
                      </Text>
                    </InlineStack>

                    {!hasActiveSubscription && !isFreeForDevelopment && (
                      <Banner status="attention">
                        <Text variant="bodyMd">
                          <strong>Production Store:</strong> Pro plan required to create upsells. 
                          Development stores get free access with 1 checkout upsell.
                        </Text>
                      </Banner>
                    )}

                    {isFreeForDevelopment && !hasActiveSubscription && (
                      <Banner status="info">
                        <Text variant="bodyMd">
                          <strong>Development Store:</strong> You can create 1 checkout upsell for free. 
                          Upgrade to Pro for unlimited features.
                        </Text>
                      </Banner>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Usage Stats Card */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Usage Statistics
                  </Text>
                  
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Total upsell blocks</Text>
                      <Text variant="bodyMd" fontWeight="bold">{upsellBlocksCount}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Active blocks</Text>
                      <Text variant="bodyMd" fontWeight="bold">-</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Block limit</Text>
                      <Text variant="bodyMd" fontWeight="bold" color={hasActiveSubscription ? "success" : "subdued"}>
                        {hasActiveSubscription ? "1 Checkout Upsell ✓" : isFreeForDevelopment ? "1 (Free for Dev)" : "Pro Required"}
                      </Text>
                    </InlineStack>
                    {currentSubscription && (
                      <InlineStack align="space-between">
                        <Text variant="bodyMd">Subscription ID</Text>
                        <Text variant="bodyMd" fontWeight="bold" color="subdued">
                          {currentSubscription.id}
                        </Text>
                      </InlineStack>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Development Store Info */}
              {isFreeForDevelopment && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Development Store
                    </Text>
                    
                    <InlineStack gap="100" align="start">
                      <Text variant="headingXl">FREE</Text>
                    </InlineStack>

                    <List>
                      <List.Item>1 checkout upsell block</List.Item>
                      <List.Item>Up to 5 products per upsell</List.Item>
                      <List.Item>Automatic checkout integration</List.Item>
                      <List.Item>Perfect for testing & development</List.Item>
                    </List>

                    <Badge status="success">✓ Active</Badge>
                  </BlockStack>
                </Card>
              )}

              {/* Pro Plan Card */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">
                      Pro Plan
                    </Text>
                    {hasActiveSubscription && (
                      <Badge status="success">✓ Active</Badge>
                    )}
                  </InlineStack>
                  
                  <InlineStack gap="100" align="start">
                    <Text variant="headingXl">$15</Text>
                    <Text variant="bodyMd" color="subdued"> /month</Text>
                  </InlineStack>

                  <List>
                    <List.Item>One checkout upsell block</List.Item>
                    <List.Item>Up to 5 products per upsell</List.Item>
                    <List.Item>Automatic checkout integration</List.Item>
                    <List.Item>Priority support</List.Item>
                    <List.Item>Free for development stores</List.Item>
                  </List>

                  {!hasActiveSubscription ? (
                    <Button 
                      primary
                      fullWidth
                      onClick={handleSubscribe}
                      loading={isLoading}
                      disabled={isLoading}
                    >
                      {isLoading ? "Setting up..." : "Upgrade to Pro - $15/month"}
                    </Button>
                  ) : (
                    <Button 
                      fullWidth
                      onClick={handleCancel}
                      loading={isLoading && fetcher.formData?.get("actionType") === "cancel"}
                      disabled={isLoading}
                      tone="critical"
                    >
                      {isLoading && fetcher.formData?.get("actionType") === "cancel" 
                        ? "Cancelling..." 
                        : "Cancel Subscription"
                      }
                    </Button>
                  )}
                </BlockStack>
              </Card>

              {/* FAQ Card */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Frequently Asked Questions
                  </Text>
                  
                  <BlockStack gap="300">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">
                        Is it free for development stores?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Yes! Development stores get full access with 1 checkout upsell for free. Perfect for testing.
                      </Text>
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">
                        What about production stores?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Production stores require the Pro plan ($15/month) to create checkout upsells.
                      </Text>
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">
                        How many upsells can I create?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        You can create 1 checkout upsell with up to 5 products. This keeps your checkout clean and focused.
                      </Text>
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">
                        Can I cancel anytime?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Yes! Cancel anytime. You'll keep Pro features until the end of your billing period.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}