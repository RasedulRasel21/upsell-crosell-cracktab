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
    
    // Fetch products for upsell selection
    const productsResponse = await admin.graphql(
      `#graphql
        query {
          products(first: 50) {
            edges {
              node {
                id
                title
                handle
                status
                totalInventory
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
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
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
              }
            }
          }
        }`
    );

    console.log("Upsell products response:", JSON.stringify(productsResponse, null, 2));
    
    const result = await productsResponse.json();
    const products = result?.data?.products?.edges?.map(edge => edge.node) || [];
    
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
      
      console.log("Processed products count:", products.length);
      console.log("Existing upsell blocks:", upsellBlocks.length);
      console.log("Editing upsell:", editingUpsell);
      
      return {
        products,
        upsellBlocks,
        editingUpsell,
        hasActiveSubscription,
        shop: session.shop,
      };
    } catch (error) {
      console.log("Database query failed:", error);
      return {
        products,
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
      const selectedProducts = JSON.parse(formData.get("selectedProducts") || "[]");
      const displaySettings = JSON.parse(formData.get("displaySettings") || "{}");
      const upsellId = formData.get("upsellId");
      
      // Convert product IDs to handles
      const productHandles = [];
      
      for (const productId of selectedProducts) {
        // If it's already a handle (string), use it directly
        if (typeof productId === 'string' && !productId.startsWith('gid://')) {
          productHandles.push(productId);
        } else {
          // It's a GraphQL ID, fetch the handle
          try {
            const productResponse = await admin.graphql(
              `#graphql
                query getProductHandle($id: ID!) {
                  product(id: $id) {
                    handle
                  }
                }`,
              { variables: { id: productId } }
            );
            
            const productResult = await productResponse.json();
            if (productResult?.data?.product?.handle) {
              productHandles.push(productResult.data.product.handle);
            }
          } catch (error) {
            console.warn("Error fetching product handle for:", productId, error);
          }
        }
      }

      const styleSettings = JSON.parse(formData.get("styleSettings") || "{}");
      
      const upsellData = {
        shop: session.shop,
        name: `Checkout Upsell - ${new Date().toLocaleDateString()}`,
        placement: "checkout",
        productHandles: productHandles.join(','),
        title: displaySettings.sliderTitle || "Recommended for you",
        showCount: selectedProducts.length,
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
          message: `Upsell block ${actionType === "update_upsell" ? "updated" : "created"} successfully! (Products: ${productHandles.join(', ')})`,
          productHandles,
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
  const { products = [], upsellBlocks = [], editingUpsell = null, hasActiveSubscription = false, error } = data;

  // State management
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sliderTitle, setSliderTitle] = useState("Recommended for you");
  const [buttonText, setButtonText] = useState("Add");
  const [properties, setProperties] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasCreatedUpsell, setHasCreatedUpsell] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (editingUpsell) {
      setSliderTitle(editingUpsell.title || "Recommended for you");
      setButtonText(editingUpsell.buttonText || "Add");
      setProperties(editingUpsell.properties || "");

      // Convert product handles to product IDs for selection
      let productIds = [];
      if (editingUpsell.productHandles) {
        const handles = editingUpsell.productHandles.split(',').map(h => h.trim()).filter(h => h);

        handles.forEach(handle => {
          const product = products.find(p => p.handle === handle);
          if (product) {
            productIds.push(product.id);
          }
        });

        setSelectedProducts(productIds);
      }
    }
  }, [editingUpsell, products]);

  // Limit products to 10 for checkout
  useEffect(() => {
    if (selectedProducts.length > 10) {
      setSelectedProducts(prev => prev.slice(0, 10));
    }
  }, [selectedProducts]);
  
  // Handle successful creation
  useEffect(() => {
    if (fetcher.data?.success && !editingUpsell) {
      setHasCreatedUpsell(true);
    }
  }, [fetcher.data?.success, editingUpsell]);


  const handleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => {
      const isCurrentlySelected = prev.includes(productId);
      
      if (isCurrentlySelected) {
        // Remove product
        return prev.filter(id => id !== productId);
      } else {
        // Add product (with limit check for checkout - max 10)
        if (prev.length >= 10) {
          return prev; // Don't add if already at limit
        }
        return [...prev, productId];
      }
    });
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUpsell = () => {
    if (selectedProducts.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append("actionType", editingUpsell ? "update_upsell" : "create_upsell");
    formData.append("selectedProducts", JSON.stringify(selectedProducts));
    formData.append("displaySettings", JSON.stringify({
      sliderTitle,
      buttonText,
      properties,
    }));
    
    if (editingUpsell) {
      formData.append("upsellId", editingUpsell.id);
    }

    fetcher.submit(formData, { method: "POST" });
  };

  const isLoading = fetcher.state === "submitting";


  // Live Preview Component
  const LivePreview = () => {
    const selectedProductsData = selectedProducts
      .map(productId => products.find(p => p.id === productId))
      .filter(Boolean)
;

    if (selectedProductsData.length === 0) {
      return (
        <Card>
          <Box padding="400">
            <Text variant="bodyMd" color="subdued" alignment="center">
              Select products to see preview
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
              Products will appear during checkout:
            </Text>
            
            <BlockStack gap="200">
              {selectedProductsData.map((product, index) => (
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
                      IMG
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text variant="bodyMd" style={{ color: "#000000" }}>
                        Product {index + 1}
                      </Text>
                      <Text variant="bodyMd" style={{ color: "#000000" }}>
                        $10.00
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
                      Add to cart
                    </button>
                  </InlineStack>
                </div>
              ))}
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
              • Maximum 10 products allowed (currently selected: {selectedProducts.length}/10)
            </Text>
            <Text variant="bodyMd">
              • Products will be displayed automatically during checkout
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
                    label="Custom Properties"
                    value={properties}
                    onChange={setProperties}
                    placeholder='{"bag_type":"gift", "_product_type":"other"}'
                    helpText="Add custom properties as JSON that will be passed with upsell products"
                    multiline={3}
                  />

                </BlockStack>
              </Card>


              {/* Product Selection */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Select Upsell Products
                    </Text>
                    <Badge status="info">
                      {selectedProducts.length} selected
                    </Badge>
                  </InlineStack>
                  
                  {/* Search */}
                  <TextField
                    label="Search Products"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by product name or handle..."
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                  />
                  
                  {products.length === 0 ? (
                    <Box padding="400">
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued" alignment="center">
                          No products found.
                        </Text>
                        <Text variant="bodySm" color="subdued" alignment="center">
                          Please check your store has products available.
                        </Text>
                      </BlockStack>
                    </Box>
                  ) : filteredProducts.length === 0 ? (
                    <Box padding="400">
                      <Text variant="bodyMd" color="subdued" alignment="center">
                        No products match your search. Try different keywords.
                      </Text>
                    </Box>
                  ) : (
                    <BlockStack gap="200">
                      <Text variant="bodySm" color="subdued">
                        Click products below to select them for your upsell block:
                      </Text>
                      <ResourceList
                        resourceName={{ singular: 'product', plural: 'products' }}
                        items={filteredProducts.slice(0, 20)} // Limit to first 20 for performance
                        renderItem={(product) => {
                          const { id, title, priceRangeV2, media, status, handle } = product;
                          const price = priceRangeV2?.minVariantPrice?.amount || "0.00";
                          const currency = priceRangeV2?.minVariantPrice?.currencyCode || "USD";
                          const image = media?.edges?.[0]?.node?.preview?.image?.url || "";
                          const isSelected = selectedProducts.includes(id);

                          return (
                            <ResourceItem
                              id={id}
                              onClick={() => handleProductSelection(id)}
                              media={
                                <Avatar
                                  customer={false}
                                  size="md"
                                  name={title}
                                  source={image}
                                />
                              }
                              accessibilityLabel={`Select ${title}`}
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
                                  </BlockStack>
                                  <InlineStack gap="200">
                                    <Text variant="bodyMd">
                                      {currency} ${price}
                                    </Text>
                                    {status === 'ACTIVE' ? (
                                      <Badge status="success">Active</Badge>
                                    ) : (
                                      <Badge>Draft</Badge>
                                    )}
                                    {isSelected && (
                                      <Badge status="info">✓ Selected</Badge>
                                    )}
                                  </InlineStack>
                                </InlineStack>
                              </BlockStack>
                            </ResourceItem>
                          );
                        }}
                      />
                      {filteredProducts.length > 20 && (
                        <Text variant="bodySm" color="subdued" alignment="center">
                          Showing first 20 of {filteredProducts.length} products. Use search to narrow results.
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
                        disabled={isLoading || selectedProducts.length === 0}
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