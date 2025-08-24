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

  const FREE_UPSELL_LIMIT = 3;
  const upsellUsagePercentage = (upsellBlocksCount / FREE_UPSELL_LIMIT) * 100;
  const isNearUpsellLimit = upsellBlocksCount >= 2;
  const isOverUpsellLimit = upsellBlocksCount >= FREE_UPSELL_LIMIT && !hasActiveSubscription;

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
                      status={hasActiveSubscription ? "success" : isOverUpsellLimit ? "critical" : isNearUpsellLimit ? "attention" : "info"}
                    >
                      {hasActiveSubscription ? "Pro Plan" : "Free Plan"}
                    </Badge>
                  </InlineStack>

                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">
                        Upsell blocks created
                      </Text>
                      <Text variant="bodyMd" fontWeight="bold">
                        {upsellBlocksCount} / {hasActiveSubscription ? "Unlimited" : FREE_UPSELL_LIMIT}
                      </Text>
                    </InlineStack>

                    {!hasActiveSubscription && (
                      <BlockStack gap="200">
                        <ProgressBar
                          progress={Math.min(upsellUsagePercentage, 100)}
                          size="small"
                          color={isOverUpsellLimit ? "critical" : isNearUpsellLimit ? "highlight" : "success"}
                        />
                        <Text variant="bodySm" color="subdued">
                          {FREE_UPSELL_LIMIT - upsellBlocksCount > 0 
                            ? `You can create ${FREE_UPSELL_LIMIT - upsellBlocksCount} more upsell blocks`
                            : "You've reached your free limit of 3 upsell blocks"
                          }
                        </Text>
                      </BlockStack>
                    )}

                    {isOverUpsellLimit && (
                      <Banner status="critical">
                        <Text variant="bodyMd">
                          You've reached your free limit of {FREE_UPSELL_LIMIT} upsell blocks. 
                          Upgrade to Pro for unlimited blocks and checkout page placement.
                        </Text>
                      </Banner>
                    )}

                    {isNearUpsellLimit && !hasActiveSubscription && !isOverUpsellLimit && (
                      <Banner status="warning">
                        <Text variant="bodyMd">
                          You're approaching your free limit of 3 upsell blocks. Consider upgrading to Pro for unlimited blocks.
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
                        {hasActiveSubscription ? "Unlimited ✓" : `${FREE_UPSELL_LIMIT} max`}
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
              {/* Free Plan Card */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Free Plan
                  </Text>
                  
                  <InlineStack gap="100" align="start">
                    <Text variant="headingXl">$0</Text>
                    <Text variant="bodyMd" color="subdued"> /month</Text>
                  </InlineStack>

                  <List>
                    <List.Item>Up to 3 upsell blocks</List.Item>
                    <List.Item>Basic upsell blocks</List.Item>
                    <List.Item>Product page placement</List.Item>
                  </List>

                  {!hasActiveSubscription && (
                    <Badge status="success">✓ Current Plan</Badge>
                  )}
                </BlockStack>
              </Card>

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
                    <List.Item>Unlimited upsell blocks</List.Item>
                    <List.Item>All placement options</List.Item>
                    <List.Item>Advanced customization</List.Item>
                    <List.Item>Checkout page upsells</List.Item>
                    <List.Item>Priority support</List.Item>
                    <List.Item>Advanced analytics</List.Item>
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
                        What's the difference between Free and Pro?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Free: 3 upsell blocks, basic placements. Pro: Unlimited blocks + checkout page placement.
                      </Text>
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">
                        Can I place upsells on checkout page?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Checkout page placement is only available with Pro plan for compliance and quality reasons.
                      </Text>
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">
                        What happens if I exceed 3 blocks?
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        You'll need to upgrade to Pro plan to create more than 3 upsell blocks.
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