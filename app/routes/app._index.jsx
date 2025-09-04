import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Banner,
  ResourceList,
  ResourceItem,
  Badge,
  EmptyState,
  Modal,
  ButtonGroup,
  Icon,
} from "@shopify/polaris";
import { 
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate, BASIC_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, billing, session } = await authenticate.admin(request);
    
    // Check subscription status
    let hasActiveSubscription = false;
    try {
      const billingCheck = await billing.check({
        plans: [BASIC_PLAN],
        isTest: true // Free for development stores
      });
      hasActiveSubscription = billingCheck.hasActivePayment;
    } catch (billingError) {
      console.log("Billing check failed:", billingError);
      hasActiveSubscription = false;
    }
    
    // Fetch existing upsell blocks for this shop
    try {
      const { getUpsellBlocks } = await import("../models/upsell.server");
      const upsellBlocks = await getUpsellBlocks(session.shop);
      
      return {
        upsellBlocks,
        hasActiveSubscription,
        shop: session.shop,
      };
    } catch (error) {
      console.log("Database query failed:", error);
      return {
        upsellBlocks: [],
        hasActiveSubscription,
        shop: session.shop,
      };
    }
    
  } catch (error) {
    console.error("Loader error:", error);
    return {
      upsellBlocks: [],
      hasActiveSubscription: false,
      shop: null,
      error: error.message
    };
  }
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "delete_upsell") {
    const upsellId = formData.get("upsellId");
    
    try {
      const { deleteUpsellBlock } = await import("../models/upsell.server");
      await deleteUpsellBlock(upsellId);
      
      return {
        success: true,
        message: "Upsell block deleted successfully!",
      };
    } catch (error) {
      return {
        error: "Failed to delete upsell block: " + error.message,
      };
    }
  }

  if (actionType === "toggle_status") {
    const upsellId = formData.get("upsellId");
    const newStatus = formData.get("status") === "true";
    
    try {
      const { updateUpsellBlock } = await import("../models/upsell.server");
      await updateUpsellBlock(upsellId, { active: newStatus });
      
      return {
        success: true,
        message: `Upsell block ${newStatus ? 'activated' : 'deactivated'} successfully!`,
      };
    } catch (error) {
      return {
        error: "Failed to update upsell block: " + error.message,
      };
    }
  }

  return null;
};

export default function Dashboard() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  
  const [deleteModal, setDeleteModal] = useState({ open: false, upsell: null });
  
  const { upsellBlocks = [], hasActiveSubscription = false, error } = loaderData;
  
  // Handle success/error messages
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message);
      setDeleteModal({ open: false, upsell: null });
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const handleDelete = (upsell) => {
    setDeleteModal({ open: true, upsell });
  };

  const confirmDelete = () => {
    if (!deleteModal.upsell) return;
    
    const formData = new FormData();
    formData.append("actionType", "delete_upsell");
    formData.append("upsellId", deleteModal.upsell.id);
    fetcher.submit(formData, { method: "POST" });
  };

  const toggleStatus = (upsell) => {
    const formData = new FormData();
    formData.append("actionType", "toggle_status");
    formData.append("upsellId", upsell.id);
    formData.append("status", (!upsell.active).toString());
    fetcher.submit(formData, { method: "POST" });
  };

  const getPlacementLabel = (placement) => {
    const placements = {
      "product_page": "Product Page",
      "product_description": "Below Description",
      "cart_drawer": "Cart Drawer",
      "cart_page": "Cart Page",
      "checkout": "Checkout Page"
    };
    return placements[placement] || placement;
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <Page>
      <TitleBar title="Upsell & Cross-Sell Dashboard" />
      
      <BlockStack gap="500">
        {error && (
          <Banner status="critical">
            Error: {error}
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

        {/* Pro Plan Required Banner */}
        {upsellBlocks.length > 0 && (
          <Banner status="info">
            <InlineStack align="space-between" wrap={false}>
              <Text variant="bodyMd">
                Pro Plan Required: This app requires a Pro subscription for all stores except development stores.
              </Text>
              {!hasActiveSubscription && (
                <Link to="/app/billing">
                  <Button size="slim">Upgrade to Pro</Button>
                </Link>
              )}
            </InlineStack>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Your Checkout Upsell
                </Text>
                
                {upsellBlocks.length === 0 ? (
                  <EmptyState
                    heading="No checkout upsell created yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    action={{
                      content: "Create your checkout upsell",
                      url: "/app/upsell"
                    }}
                  >
                    <Text variant="bodyMd" color="subdued">
                      Create a checkout upsell to recommend products during the checkout process and increase sales.
                    </Text>
                  </EmptyState>
                ) : (
                  <ResourceList
                    resourceName={{ singular: 'upsell block', plural: 'upsell blocks' }}
                    items={upsellBlocks}
                    renderItem={(upsell) => {
                      const { id, name, placement, productHandles, title, showCount, active, createdAt } = upsell;
                      const productCount = productHandles ? productHandles.split(',').filter(h => h.trim()).length : 0;
                      
                      return (
                        <ResourceItem
                          id={id}
                          accessibilityLabel={`Upsell block ${name}`}
                        >
                          <InlineStack align="space-between">
                            <BlockStack gap="200">
                              <InlineStack gap="300" align="start">
                                <Text variant="bodyMd" fontWeight="bold" as="h3">
                                  {name}
                                </Text>
                                <Badge status={active ? "success" : "attention"}>
                                  {active ? "Active" : "Inactive"}
                                </Badge>
                              </InlineStack>
                              
                              <InlineStack gap="400" wrap>
                                <Text variant="bodySm" color="subdued">
                                  <strong>Placement:</strong> {getPlacementLabel(placement)}
                                </Text>
                                <Text variant="bodySm" color="subdued">
                                  <strong>Products:</strong> {productCount}
                                </Text>
                                <Text variant="bodySm" color="subdued">
                                  <strong>Shows:</strong> {showCount} at a time
                                </Text>
                              </InlineStack>
                              
                              <Text variant="bodySm" color="subdued">
                                <strong>Title:</strong> "{title}"
                              </Text>
                              
                              <Text variant="bodySm" color="subdued">
                                Created: {new Date(createdAt).toLocaleDateString()}
                              </Text>
                            </BlockStack>
                            
                            <InlineStack gap="200">
                              <ButtonGroup>
                                <Button 
                                  size="slim" 
                                  icon={active ? ViewIcon : ViewIcon}
                                  onClick={() => toggleStatus(upsell)}
                                  loading={isLoading}
                                >
                                  {active ? "Deactivate" : "Activate"}
                                </Button>
                                <Link to={`/app/upsell?edit=${id}`}>
                                  <Button size="slim" icon={EditIcon}>
                                    Edit
                                  </Button>
                                </Link>
                                <Button 
                                  size="slim" 
                                  icon={DeleteIcon}
                                  tone="critical"
                                  onClick={() => handleDelete(upsell)}
                                  loading={isLoading}
                                >
                                  Delete
                                </Button>
                              </ButtonGroup>
                            </InlineStack>
                          </InlineStack>
                        </ResourceItem>
                      );
                    }}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Quick Stats */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Quick Stats
                  </Text>
                  
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Plan Status:</Text>
                      <Badge status={hasActiveSubscription ? "success" : "attention"}>
                        {hasActiveSubscription ? "Pro Plan" : "Development Store"}
                      </Badge>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Total Products in Upsell:</Text>
                      <Text variant="bodyMd" fontWeight="bold">
                        {upsellBlocks.reduce((total, upsell) => {
                          const productCount = upsell.productHandles ? upsell.productHandles.split(',').filter(h => h.trim()).length : 0;
                          return total + productCount;
                        }, 0)}
                      </Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Upsell Status:</Text>
                      <Badge status={upsellBlocks.length > 0 && upsellBlocks[0]?.active ? "success" : "attention"}>
                        {upsellBlocks.length > 0 ? (upsellBlocks[0]?.active ? "Active" : "Inactive") : "Not Created"}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Quick Actions
                  </Text>
                  
                  <BlockStack gap="200">
                    {upsellBlocks.length === 0 && (
                      <Link to="/app/upsell">
                        <Button fullWidth primary>
                          Create Your Checkout Upsell
                        </Button>
                      </Link>
                    )}
                    
                    {upsellBlocks.length > 0 && (
                      <Link to={`/app/upsell?edit=${upsellBlocks[0].id}`}>
                        <Button fullWidth primary>
                          Edit Your Checkout Upsell
                        </Button>
                      </Link>
                    )}
                    
                    <Link to="/app/billing">
                      <Button fullWidth outline>
                        {hasActiveSubscription ? "Manage Billing" : "Upgrade to Pro"}
                      </Button>
                    </Link>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Help */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Need Help?
                  </Text>
                  
                  <Text variant="bodyMd" color="subdued">
                    Learn how to create effective upsell blocks and maximize your sales.
                  </Text>
                  
                  <Button fullWidth outline>
                    View Documentation
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, upsell: null })}
        title="Delete Upsell Block"
        primaryAction={{
          content: "Delete",
          onAction: confirmDelete,
          loading: isLoading,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModal({ open: false, upsell: null }),
          },
        ]}
      >
        <Modal.Section>
          <Text>
            Are you sure you want to delete "{deleteModal.upsell?.name}"? This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}