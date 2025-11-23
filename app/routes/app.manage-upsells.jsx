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
  Select,
  Tabs,
} from "@shopify/polaris";
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, billing, session } = await authenticate.admin(request);

    // Check subscription status
    let hasActiveSubscription = false;
    try {
      const { appSubscriptions } = await billing.check();
      const subscription = appSubscriptions?.[0];
      hasActiveSubscription = subscription && subscription.name === 'Pro';
    } catch (billingError) {
      console.error("Billing check failed:", billingError);
      hasActiveSubscription = false;
    }

    // Fetch existing upsell blocks for this shop
    try {
      const { getUpsellBlocks } = await import("../models/upsell.server");
      const upsellBlocks = await getUpsellBlocks(session.shop);

      // Fetch collection names for upsell blocks that have collectionHandle
      const upsellBlocksWithCollections = await Promise.all(
        upsellBlocks.map(async (upsell) => {
          if (upsell.collectionHandle) {
            try {
              const collectionResponse = await admin.graphql(
                `#graphql
                  query getCollectionByHandle($handle: String!) {
                    collectionByHandle(handle: $handle) {
                      id
                      title
                      handle
                    }
                  }`,
                { variables: { handle: upsell.collectionHandle } }
              );

              const collectionResult = await collectionResponse.json();
              if (collectionResult?.data?.collectionByHandle) {
                return {
                  ...upsell,
                  collectionName: collectionResult.data.collectionByHandle.title,
                };
              }
            } catch (error) {
              console.warn("Error fetching collection name for:", upsell.collectionHandle, error);
            }
          }
          return upsell;
        })
      );

      return {
        upsellBlocks: upsellBlocksWithCollections,
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
  await authenticate.admin(request);
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

export default function ManageUpsells() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [deleteModal, setDeleteModal] = useState({ open: false, upsell: null });
  const [filterPlacement, setFilterPlacement] = useState("all");

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

  const getPlacementBadge = (placement) => {
    return placement === "checkout" ? (
      <Badge status="info">Pro</Badge>
    ) : (
      <Badge status="success">Free</Badge>
    );
  };

  // Filter upsells by placement
  const filteredUpsells = filterPlacement === "all"
    ? upsellBlocks
    : upsellBlocks.filter(u => u.placement === filterPlacement);

  // Group upsells by placement
  const upsellsByPlacement = {
    product_page: upsellBlocks.filter(u => u.placement === "product_page"),
    cart_page: upsellBlocks.filter(u => u.placement === "cart_page"),
    cart_drawer: upsellBlocks.filter(u => u.placement === "cart_drawer"),
    checkout: upsellBlocks.filter(u => u.placement === "checkout"),
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <Page
      title="Manage Upsells"
      primaryAction={{
        content: "Create New Upsell",
        icon: PlusIcon,
        url: "/app/upsell"
      }}
    >
      <TitleBar title="Manage Upsells" />

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

        {/* Summary Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" color="subdued">Total Upsells</Text>
                <Text variant="heading2xl" as="h2">{upsellBlocks.length}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" color="subdued">Active Upsells</Text>
                <Text variant="heading2xl" as="h2">{upsellBlocks.filter(u => u.active).length}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" color="subdued">Plan Status</Text>
                <Badge status={hasActiveSubscription ? "success" : "attention"}>
                  {hasActiveSubscription ? "Pro Plan" : "Free Plan"}
                </Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Filter by Placement */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Filter by Placement</Text>
            <Select
              label="Show upsells for"
              options={[
                { label: "All Placements", value: "all" },
                { label: `Product Page (${upsellsByPlacement.product_page.length})`, value: "product_page" },
                { label: `Cart Page (${upsellsByPlacement.cart_page.length})`, value: "cart_page" },
                { label: `Cart Drawer (${upsellsByPlacement.cart_drawer.length})`, value: "cart_drawer" },
                { label: `Checkout Page (${upsellsByPlacement.checkout.length})`, value: "checkout" },
              ]}
              value={filterPlacement}
              onChange={setFilterPlacement}
            />
          </BlockStack>
        </Card>

        {/* Upsells List */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Your Upsells {filterPlacement !== "all" && `- ${getPlacementLabel(filterPlacement)}`}
            </Text>

            {filteredUpsells.length === 0 ? (
              <EmptyState
                heading={filterPlacement === "all" ? "No upsells created yet" : `No ${getPlacementLabel(filterPlacement).toLowerCase()} upsells`}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: "Create your first upsell",
                  url: "/app/upsell"
                }}
              >
                <Text variant="bodyMd" color="subdued">
                  Create upsells to recommend products and increase sales across your store.
                </Text>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'upsell', plural: 'upsells' }}
                items={filteredUpsells}
                renderItem={(upsell) => {
                  const { id, name, placement, productHandles, title, showCount, active, createdAt, collectionName } = upsell;
                  const productCount = productHandles ? productHandles.split(',').filter(h => h.trim()).length : 0;

                  return (
                    <ResourceItem
                      id={id}
                      accessibilityLabel={`Upsell ${name}`}
                    >
                      <InlineStack align="space-between">
                        <BlockStack gap="200">
                          <InlineStack gap="300" align="start" wrap={false}>
                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                              {name}
                            </Text>
                            <Badge status={active ? "success" : "attention"}>
                              {active ? "Active" : "Inactive"}
                            </Badge>
                            {getPlacementBadge(placement)}
                          </InlineStack>

                          <InlineStack gap="400" wrap>
                            <Text variant="bodySm" color="subdued">
                              <strong>Placement:</strong> {getPlacementLabel(placement)}
                            </Text>
                            <Text variant="bodySm" color="subdued">
                              <strong>Collection:</strong> {collectionName || `${productCount} Legacy Products`}
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

        {/* Quick Actions */}
        {!hasActiveSubscription && upsellBlocks.some(u => u.placement === "checkout") === false && (
          <Banner status="info">
            <BlockStack gap="200">
              <Text variant="bodyMd" fontWeight="bold">
                Want to add checkout upsells?
              </Text>
              <Text variant="bodyMd">
                Upgrade to Pro to unlock checkout upsells and boost your average order value.
              </Text>
              <Button url="/app/billing">View Plans</Button>
            </BlockStack>
          </Banner>
        )}
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
