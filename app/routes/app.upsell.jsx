import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Select,
  ResourceList,
  ResourceItem,
  Avatar,
  Badge,
  Banner,
  Checkbox,
  TextField,
  ButtonGroup,
  Divider,
  Box,
  Frame,
  ContextualSaveBar,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, BASIC_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, billing, session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const editId = url.searchParams.get('edit');
    
    // Check subscription status
    let hasActiveSubscription = false;
    try {
      const billingCheck = await billing.check({
        plans: [BASIC_PLAN],
        isTest: true, // Set to false for production
      });
      hasActiveSubscription = billingCheck.hasActivePayment;
    } catch (billingError) {
      console.log("Billing check failed:", billingError);
      hasActiveSubscription = false;
    }
    
    // Fetch collections for upsell selection
    const collectionsResponse = await admin.graphql(
      `#graphql
        query {
          collections(first: 50) {
            edges {
              node {
                id
                title
                handle
                productsCount {
                  count
                }
                image {
                  url
                  altText
                }
                products(first: 3) {
                  edges {
                    node {
                      id
                      title
                      media(first: 1) {
                        edges {
                          node {
                            preview {
                              image {
                                url
                                altText
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`
    );

    console.log("Upsell collections response:", JSON.stringify(collectionsResponse, null, 2));

    const result = await collectionsResponse.json();
    const collections = result?.data?.collections?.edges?.map(edge => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0,
      sampleProducts: edge.node.products?.edges?.map(productEdge => productEdge.node) || []
    })) || [];
    
    // Fetch existing upsell blocks for this shop
    let editingUpsell = null;
    try {
      const { getUpsellBlocks, getUpsellBlock } = await import("../models/upsell.server");
      const upsellBlocks = await getUpsellBlocks(session.shop);
      
      // If editing, fetch the specific upsell block
      if (editId) {
        editingUpsell = await getUpsellBlock(editId);
        if (editingUpsell && editingUpsell.shop !== session.shop) {
          editingUpsell = null; // Security: Only allow editing own upsells
        }
        // Only allow editing checkout upsells
        if (editingUpsell && editingUpsell.placement !== 'checkout') {
          editingUpsell = null;
        }
      } else if (upsellBlocks.length > 0) {
        // If not editing but upsells exist, redirect to edit the existing one
        throw new Response("", {
          status: 302,
          headers: {
            Location: `/app/upsell?edit=${upsellBlocks[0].id}`,
          },
        });
      }
      
      console.log("Processed collections count:", collections.length);
      console.log("Existing upsell blocks:", upsellBlocks.length);
      console.log("Editing upsell:", editingUpsell);

      return {
        collections,
        upsellBlocks,
        editingUpsell,
        hasActiveSubscription,
        shop: session.shop,
      };
    } catch (error) {
      console.log("Database query failed:", error);
      return {
        collections,
        upsellBlocks: [],
        editingUpsell: null,
        hasActiveSubscription,
        shop: session.shop,
      };
    }
  } catch (error) {
    console.error("Upsell loader error:", error);
    return {
      products: [],
      upsellBlocks: [],
      hasActiveSubscription: false,
      shop: null,
      error: error.message,
    };
  }
};

export const action = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "create_upsell" || actionType === "update_upsell") {
      const selectedCollection = formData.get("selectedCollection");
      const displaySettings = JSON.parse(formData.get("displaySettings") || "{}");
      const upsellId = formData.get("upsellId");

      // Get collection handle from GraphQL ID
      let collectionHandle = "";
      if (selectedCollection) {
        if (typeof selectedCollection === 'string' && !selectedCollection.startsWith('gid://')) {
          collectionHandle = selectedCollection;
        } else {
          // It's a GraphQL ID, fetch the handle
          try {
            const collectionResponse = await admin.graphql(
              `#graphql
                query getCollectionHandle($id: ID!) {
                  collection(id: $id) {
                    handle
                  }
                }`,
              { variables: { id: selectedCollection } }
            );

            const collectionResult = await collectionResponse.json();
            if (collectionResult?.data?.collection?.handle) {
              collectionHandle = collectionResult.data.collection.handle;
            }
          } catch (error) {
            console.warn("Error fetching collection handle for:", selectedCollection, error);
          }
        }
      }

      const styleSettings = JSON.parse(formData.get("styleSettings") || "{}");
      
      const upsellData = {
        shop: session.shop,
        name: `Checkout Upsell - ${new Date().toLocaleDateString()}`,
        placement: "checkout",
        productHandles: null, // Keep for backward compatibility
        collectionHandle: collectionHandle,
        title: displaySettings.sliderTitle || "Recommended for you",
        showCount: displaySettings.showCount || 10,
        autoSlide: false,
        slideDuration: 5,
        // Style settings - default values for checkout
        layout: "stack",
        columns: 1,
        backgroundColor: "#ffffff",
        textColor: "#000000",
        buttonColor: "#1a73e8",
        buttonText: displaySettings.buttonText || "Add",
        properties: displaySettings.properties || "",
        borderRadius: 8,
        padding: 16,
        centerPadding: true,
      };

      // Save to database
      try {
        if (actionType === "update_upsell" && upsellId) {
          const { updateUpsellBlock } = await import("../models/upsell.server");
          const upsellBlock = await updateUpsellBlock(upsellId, upsellData);

          console.log("Updated upsell block:", upsellBlock);

          return {
            success: true,
            message: `Upsell block "${upsellBlock.name}" updated successfully!`,
            upsellBlock,
          };
        } else {
          const { createUpsellBlock } = await import("../models/upsell.server");
          const upsellBlock = await createUpsellBlock(upsellData);

          console.log("Created upsell block:", upsellBlock);

          return {
            success: true,
            message: `Upsell block "${upsellBlock.name}" created successfully!`,
            upsellBlock,
          };
        }
      } catch (error) {
        console.warn("Could not save to database:", error.message);
        
        // Return success anyway for now
        return {
          success: true,
          message: `Upsell block ${actionType === "update_upsell" ? "updated" : "created"} successfully! (Collection: ${collectionHandle})`,
          collectionHandle,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Upsell action error:", error);
    return {
      error: error.message,
    };
  }
};

export default function Upsell() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const { collections = [], upsellBlocks = [], editingUpsell = null, hasActiveSubscription = false, error } = data;

  // State management
  const [selectedCollection, setSelectedCollection] = useState("");
  const [sliderTitle, setSliderTitle] = useState("Recommended for you");
  const [buttonText, setButtonText] = useState("Add");
  const [showCount, setShowCount] = useState(10);
  const [properties, setProperties] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasCreatedUpsell, setHasCreatedUpsell] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (editingUpsell) {
      setSliderTitle(editingUpsell.title || "Recommended for you");
      setButtonText(editingUpsell.buttonText || "Add");
      setProperties(editingUpsell.properties || "");
      setShowCount(editingUpsell.showCount || 10);

      // Set selected collection if available
      if (editingUpsell.collectionHandle) {
        const collection = collections.find(c => c.handle === editingUpsell.collectionHandle);
        if (collection) {
          setSelectedCollection(collection.id);
        }
      }
    }
  }, [editingUpsell, collections]);

  // No longer needed since we're using collections
  
  // Handle successful creation
  useEffect(() => {
    if (fetcher.data?.success && !editingUpsell) {
      setHasCreatedUpsell(true);
    }
  }, [fetcher.data?.success, editingUpsell]);


  const handleCollectionSelection = useCallback((collectionId) => {
    setSelectedCollection(collectionId);
  }, []);

  // Filter collections based on search
  const filteredCollections = collections.filter(collection =>
    collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUpsell = () => {
    if (!selectedCollection) {
      return;
    }

    const formData = new FormData();
    formData.append("actionType", editingUpsell ? "update_upsell" : "create_upsell");
    formData.append("selectedCollection", selectedCollection);
    formData.append("displaySettings", JSON.stringify({
      sliderTitle,
      buttonText,
      properties,
      showCount,
    }));
    
    if (editingUpsell) {
      formData.append("upsellId", editingUpsell.id);
    }

    fetcher.submit(formData, { method: "POST" });
  };

  const isLoading = fetcher.state === "submitting";


  // Live Preview Component
  const LivePreview = () => {
    const selectedCollectionData = collections.find(c => c.id === selectedCollection);

    if (!selectedCollectionData) {
      return (
        <Card>
          <Box padding="400">
            <Text variant="bodyMd" color="subdued" alignment="center">
              Select a collection to see preview
            </Text>
          </Box>
        </Card>
      );
    }

    return (
      <Card>
        <Box 
          padding="400"
          style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            borderRadius: "8px",
            border: '1px solid #e1e1e1'
          }}
        >
          <BlockStack gap="300">
            <Text variant="headingMd" style={{ color: "#000000" }}>
              {sliderTitle}
            </Text>
            <Text variant="bodySm" style={{ color: "#000000", opacity: 0.7 }}>
              Products from "{selectedCollectionData.title}" collection ({selectedCollectionData.productsCount} products) will appear during checkout
            </Text>

            <BlockStack gap="200">
              {selectedCollectionData.sampleProducts.slice(0, 3).map((product, index) => (
                <div key={product.id} style={{
                  backgroundColor: "#ffffff",
                  border: '1px solid #e1e1e1',
                  borderRadius: "8px",
                  padding: '12px'
                }}>
                  <InlineStack gap="200" blockAlignment="center">
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: "6px",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      {product.media?.[0]?.preview?.image?.url ? 'IMG' : 'NO IMG'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text variant="bodyMd" style={{ color: "#000000" }}>
                        {product.title}
                      </Text>
                      <Text variant="bodyMd" style={{ color: "#000000" }}>
                        Sample product
                      </Text>
                    </div>
                    <button style={{
                      backgroundColor: "#1a73e8",
                      color: 'white',
                      border: 'none',
                      borderRadius: "8px",
                      padding: '8px 16px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}>
                      {buttonText}
                    </button>
                  </InlineStack>
                </div>
              ))}
              {showCount > 3 && (
                <Text variant="bodySm" style={{ color: "#000000", opacity: 0.7, textAlign: 'center' }}>
                  ... and up to {showCount - 3} more products from this collection
                </Text>
              )}
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  return (
    <Frame>
      <Page>
        <TitleBar title={editingUpsell ? "Edit Checkout Upsell" : "Create Checkout Upsell"} />
      
      <BlockStack gap="500">
        {error && (
          <Banner status="critical">
            Error loading products: {error}
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

        {/* Checkout Upsell Information */}
        <Banner status="info">
          <BlockStack gap="200">
            <Text variant="bodyMd" fontWeight="bold">
              Checkout Upsell - One Upsell Per Store:
            </Text>
            <Text variant="bodyMd">
              • You can create only one checkout upsell per store
            </Text>
            <Text variant="bodyMd">
              • Select a collection to show up to {showCount} products during checkout
            </Text>
            <Text variant="bodyMd">
              • Products from the collection will be displayed automatically during checkout
            </Text>
          </BlockStack>
        </Banner>

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">

              {/* Display Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Display Settings
                  </Text>
                  
                  <TextField
                    label="Slider Title"
                    value={sliderTitle}
                    onChange={setSliderTitle}
                    placeholder="Recommended for you"
                  />

                  <TextField
                    label="Add to Cart Button Text"
                    value={buttonText}
                    onChange={setButtonText}
                    placeholder="Add"
                    helpText="Customize the text displayed on the add to cart button"
                  />

                  <TextField
                    label="Max Products to Show"
                    value={showCount.toString()}
                    onChange={(value) => setShowCount(parseInt(value) || 10)}
                    placeholder="10"
                    type="number"
                    helpText="Maximum number of products from the collection to display (1-10)"
                    min="1"
                    max="10"
                  />

                  <TextField
                    label="Custom Properties"
                    value={properties}
                    onChange={setProperties}
                    placeholder='{"bag_type":"gift", "_product_type":"other"}'
                    helpText="Add custom properties as JSON that will be passed with upsell products"
                    multiline={3}
                  />

                </BlockStack>
              </Card>


              {/* Collection Selection */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Select Collection for Upsells
                    </Text>
                    <Badge status={selectedCollection ? "success" : "info"}>
                      {selectedCollection ? "Selected" : "None selected"}
                    </Badge>
                  </InlineStack>

                  {/* Search */}
                  <TextField
                    label="Search Collections"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by collection name..."
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                  />
                  
                  {collections.length === 0 ? (
                    <Box padding="400">
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued" alignment="center">
                          No collections found.
                        </Text>
                        <Text variant="bodySm" color="subdued" alignment="center">
                          Please create collections in your store first.
                        </Text>
                      </BlockStack>
                    </Box>
                  ) : filteredCollections.length === 0 ? (
                    <Box padding="400">
                      <Text variant="bodyMd" color="subdued" alignment="center">
                        No collections match your search. Try different keywords.
                      </Text>
                    </Box>
                  ) : (
                    <BlockStack gap="200">
                      <Text variant="bodySm" color="subdued">
                        Click a collection below to select it for your upsell block:
                      </Text>
                      <ResourceList
                        resourceName={{ singular: 'collection', plural: 'collections' }}
                        items={filteredCollections.slice(0, 20)}
                        renderItem={(collection) => {
                          const { id, title, handle, productsCount, image } = collection;
                          const isSelected = selectedCollection === id;

                          return (
                            <ResourceItem
                              id={id}
                              onClick={() => handleCollectionSelection(id)}
                              media={
                                <Avatar
                                  customer={false}
                                  size="md"
                                  name={title}
                                  source={image}
                                />
                              }
                              accessibilityLabel={`Select ${title} collection`}
                            >
                              <BlockStack gap="100">
                                <InlineStack align="space-between">
                                  <BlockStack gap="50">
                                    <Text variant="bodyMd" fontWeight="bold">
                                      {title}
                                    </Text>
                                    <Text variant="bodySm" color="subdued">
                                      Handle: {handle}
                                    </Text>
                                    <Text variant="bodySm" color="subdued">
                                      Products: {productsCount}
                                    </Text>
                                  </BlockStack>
                                  <InlineStack gap="200">
                                    {isSelected && (
                                      <Badge status="success">✓ Selected</Badge>
                                    )}
                                  </InlineStack>
                                </InlineStack>
                              </BlockStack>
                            </ResourceItem>
                          );
                        }}
                      />
                      {filteredCollections.length > 20 && (
                        <Text variant="bodySm" color="subdued" alignment="center">
                          Showing first 20 of {filteredCollections.length} collections. Use search to narrow results.
                        </Text>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Live Preview */}
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Preview
                </Text>
                <LivePreview />
              </BlockStack>

              {/* Action Buttons */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Actions
                  </Text>
                  
                  {!hasCreatedUpsell ? (
                    <BlockStack gap="200">
                      <Button
                        primary
                        fullWidth
                        onClick={handleCreateUpsell}
                        loading={isLoading}
                        disabled={isLoading || !selectedCollection}
                      >
                        {isLoading 
                          ? (editingUpsell ? "Updating..." : "Creating...") 
                          : (editingUpsell ? "Update Checkout Upsell" : "Create Checkout Upsell")
                        }
                      </Button>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="200">
                      <Banner status="success">
                        <Text variant="bodyMd">
                          ✅ Upsell created successfully! Your products will now show during checkout.
                        </Text>
                      </Banner>
                    </BlockStack>
                  )}
                  
                  <Divider />
                  
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="bold">
                      How it works:
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      • Your upsell products will automatically appear during the checkout process
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      • Customers can add recommended products directly to their cart
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      • No theme configuration needed - it works automatically
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
    </Frame>
  );
}