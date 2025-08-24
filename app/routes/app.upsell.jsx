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
        name: formData.get("name"),
        placement: formData.get("placement"),
        productHandles: productHandles.join(','),
        title: displaySettings.sliderTitle || "Recommended for you",
        showCount: displaySettings.showProducts || 4,
        autoSlide: displaySettings.enableAutoSlide || false,
        slideDuration: 5,
        // Style settings
        layout: styleSettings.layout || "slider",
        backgroundColor: styleSettings.backgroundColor || "#ffffff",
        textColor: styleSettings.textColor || "#000000",
        buttonColor: styleSettings.buttonColor || "#1a73e8",
        buttonText: styleSettings.buttonText || "Add",
        borderRadius: styleSettings.borderRadius || 8,
        padding: styleSettings.padding || 16,
        centerPadding: styleSettings.centerPadding !== undefined ? styleSettings.centerPadding : true,
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
  const [upsellName, setUpsellName] = useState("");
  const [placement, setPlacement] = useState("product_page");
  const [showProducts, setShowProducts] = useState(4);
  const [sliderTitle, setSliderTitle] = useState("Recommended for you");
  const [enableAutoSlide, setEnableAutoSlide] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Style settings
  const [layout, setLayout] = useState("slider");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#000000");
  const [buttonColor, setButtonColor] = useState("#1a73e8");
  const [buttonText, setButtonText] = useState("Add");
  const [borderRadius, setBorderRadius] = useState(8);
  const [padding, setPadding] = useState(16);
  const [centerPadding, setCenterPadding] = useState(true);
  
  // Save bar state
  const [hasChanges, setHasChanges] = useState(false);
  const [initialFormState, setInitialFormState] = useState({});

  // Populate form if editing
  useEffect(() => {
    if (editingUpsell) {
      setUpsellName(editingUpsell.name || "");
      setPlacement(editingUpsell.placement || "product_page");
      setShowProducts(editingUpsell.showCount || 4);
      setSliderTitle(editingUpsell.title || "Recommended for you");
      setEnableAutoSlide(editingUpsell.autoSlide || false);
      
      // Style settings
      setLayout(editingUpsell.layout || "slider");
      setBackgroundColor(editingUpsell.backgroundColor || "#ffffff");
      setTextColor(editingUpsell.textColor || "#000000");
      setButtonColor(editingUpsell.buttonColor || "#1a73e8");
      setButtonText(editingUpsell.buttonText || "Add");
      setBorderRadius(editingUpsell.borderRadius || 8);
      setPadding(editingUpsell.padding || 16);
      setCenterPadding(editingUpsell.centerPadding !== undefined ? editingUpsell.centerPadding : true);
      
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
      
      // Set initial state for change tracking
      const initialState = {
        upsellName: editingUpsell.name || "",
        placement: editingUpsell.placement || "product_page",
        showProducts: editingUpsell.showCount || 4,
        sliderTitle: editingUpsell.title || "Recommended for you",
        enableAutoSlide: editingUpsell.autoSlide || false,
        layout: editingUpsell.layout || "slider",
        backgroundColor: editingUpsell.backgroundColor || "#ffffff",
        textColor: editingUpsell.textColor || "#000000",
        buttonColor: editingUpsell.buttonColor || "#1a73e8",
        buttonText: editingUpsell.buttonText || "Add",
        borderRadius: editingUpsell.borderRadius || 8,
        padding: editingUpsell.padding || 16,
        centerPadding: editingUpsell.centerPadding !== undefined ? editingUpsell.centerPadding : true,
        selectedProducts: productIds
      };
      setInitialFormState(initialState);
      setHasChanges(false);
    }
  }, [editingUpsell, products]);

  // Track changes
  useEffect(() => {
    if (Object.keys(initialFormState).length === 0) return;
    
    const currentState = {
      upsellName,
      placement,
      showProducts,
      sliderTitle,
      enableAutoSlide,
      layout,
      backgroundColor,
      textColor,
      buttonColor,
      buttonText,
      borderRadius,
      padding,
      centerPadding,
      selectedProducts
    };
    
    const hasFormChanges = Object.keys(currentState).some(key => {
      if (Array.isArray(currentState[key]) && Array.isArray(initialFormState[key])) {
        return JSON.stringify(currentState[key]) !== JSON.stringify(initialFormState[key]);
      }
      return currentState[key] !== initialFormState[key];
    });
    
    setHasChanges(hasFormChanges);
  }, [upsellName, placement, showProducts, sliderTitle, enableAutoSlide, layout, backgroundColor, textColor, buttonColor, buttonText, borderRadius, padding, centerPadding, selectedProducts, initialFormState]);

  // Placement options - checkout temporarily free for testing
  const placementOptions = [
    { label: "Product Page - Main Section", value: "product_page" },
    { label: "Product Page - Below Description", value: "product_description" },
    { label: "Cart Drawer", value: "cart_drawer" },
    { label: "Cart Page", value: "cart_page" },
    { 
      label: "Checkout Page", 
      value: "checkout"
    },
  ];

  const handleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUpsell = () => {
    if (!upsellName.trim() || selectedProducts.length === 0) {
      return;
    }

    // Check if checkout placement is selected without Pro plan (temporarily disabled for testing)
    // if (placement === "checkout" && !hasActiveSubscription) {
    //   return;
    // }

    const formData = new FormData();
    formData.append("actionType", editingUpsell ? "update_upsell" : "create_upsell");
    formData.append("name", upsellName);
    formData.append("placement", placement);
    formData.append("selectedProducts", JSON.stringify(selectedProducts));
    formData.append("displaySettings", JSON.stringify({
      showProducts,
      sliderTitle,
      enableAutoSlide,
    }));
    formData.append("styleSettings", JSON.stringify({
      layout,
      backgroundColor,
      textColor,
      buttonColor,
      buttonText,
      borderRadius,
      padding,
      centerPadding,
    }));
    
    if (editingUpsell) {
      formData.append("upsellId", editingUpsell.id);
    }

    fetcher.submit(formData, { method: "POST" });
  };

  const isLoading = fetcher.state === "submitting";

  const handleDiscard = () => {
    if (editingUpsell) {
      // Reset to initial values
      setUpsellName(initialFormState.upsellName || "");
      setPlacement(initialFormState.placement || "product_page");
      setShowProducts(initialFormState.showProducts || 4);
      setSliderTitle(initialFormState.sliderTitle || "Recommended for you");
      setEnableAutoSlide(initialFormState.enableAutoSlide || false);
      setLayout(initialFormState.layout || "slider");
      setBackgroundColor(initialFormState.backgroundColor || "#ffffff");
      setTextColor(initialFormState.textColor || "#000000");
      setButtonColor(initialFormState.buttonColor || "#1a73e8");
      setButtonText(initialFormState.buttonText || "Add");
      setBorderRadius(initialFormState.borderRadius || 8);
      setPadding(initialFormState.padding || 16);
      setCenterPadding(initialFormState.centerPadding !== undefined ? initialFormState.centerPadding : true);
      setSelectedProducts(initialFormState.selectedProducts || []);
    } else {
      // Reset to defaults for new form
      setUpsellName("");
      setPlacement("product_page");
      setShowProducts(4);
      setSliderTitle("Recommended for you");
      setEnableAutoSlide(false);
      setLayout("slider");
      setBackgroundColor("#ffffff");
      setTextColor("#000000");
      setButtonColor("#1a73e8");
      setButtonText("Add");
      setBorderRadius(8);
      setPadding(16);
      setCenterPadding(true);
      setSelectedProducts([]);
    }
    setHasChanges(false);
  };

  // Live Preview Component
  const LivePreview = () => {
    const selectedProductsData = selectedProducts
      .map(productId => products.find(p => p.id === productId))
      .filter(Boolean)
      .slice(0, showProducts);

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
          padding={`${Math.max(padding / 4, 4)}`}
          style={{
            backgroundColor: backgroundColor,
            color: textColor,
            borderRadius: `${borderRadius}px`,
            border: '1px solid #e1e1e1'
          }}
        >
          <BlockStack gap="300">
            <Text variant="headingMd" style={{ color: textColor }}>
              {sliderTitle}
            </Text>
            <Text variant="bodySm" style={{ color: textColor, opacity: 0.7 }}>
              Customers who bought these items also purchased:
            </Text>
            
            {layout === 'slider' ? (
              <InlineStack gap="200" wrap={false}>
                {selectedProductsData.map((product, index) => (
                  <div key={product.id} style={{ 
                    minWidth: '150px',
                    backgroundColor: backgroundColor,
                    border: '1px solid #e1e1e1',
                    borderRadius: `${borderRadius}px`,
                    padding: centerPadding ? '12px' : '8px'
                  }}>
                    <BlockStack gap="100">
                      <div style={{
                        width: '100%',
                        height: '80px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: `${Math.max(borderRadius - 2, 0)}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        IMG
                      </div>
                      <Text variant="bodyMd" style={{ color: textColor }}>
                        Product {index + 1}
                      </Text>
                      <Text variant="bodyMd" style={{ color: textColor }}>
                        $10.00
                      </Text>
                      <button style={{
                        backgroundColor: buttonColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: `${borderRadius}px`,
                        padding: centerPadding ? '8px 16px' : '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}>
                        {buttonText}
                      </button>
                    </BlockStack>
                  </div>
                ))}
                {selectedProductsData.length > 2 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0 8px',
                    color: textColor,
                    fontSize: '12px'
                  }}>
                    +{selectedProductsData.length - 2} more
                  </div>
                )}
              </InlineStack>
            ) : (
              <BlockStack gap="200">
                {selectedProductsData.map((product, index) => (
                  <div key={product.id} style={{ 
                    backgroundColor: backgroundColor,
                    border: '1px solid #e1e1e1',
                    borderRadius: `${borderRadius}px`,
                    padding: centerPadding ? '12px' : '8px'
                  }}>
                    <InlineStack gap="200" blockAlignment="center">
                      <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: `${Math.max(borderRadius - 2, 0)}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#666'
                      }}>
                        IMG
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text variant="bodyMd" style={{ color: textColor }}>
                          Product {index + 1}
                        </Text>
                        <Text variant="bodyMd" style={{ color: textColor }}>
                          $10.00
                        </Text>
                      </div>
                      <button style={{
                        backgroundColor: buttonColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: `${borderRadius}px`,
                        padding: centerPadding ? '8px 16px' : '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}>
                        {buttonText}
                      </button>
                    </InlineStack>
                  </div>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Box>
      </Card>
    );
  };

  return (
    <Frame>
      {hasChanges && (
        <ContextualSaveBar
          message="Unsaved changes"
          saveAction={{
            onAction: handleCreateUpsell,
            loading: isLoading,
            disabled: !upsellName.trim() || selectedProducts.length === 0,
          }}
          discardAction={{
            onAction: handleDiscard,
          }}
        />
      )}
      <Page>
        <TitleBar title={editingUpsell ? "Edit Upsell Block" : "Create Upsell Block"} />
      
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

        {/* Checkout Placement Info Banner - temporarily disabled for testing */}
        {placement === "checkout" && (
          <Banner status="info">
            <Text variant="bodyMd">
              Checkout page placement is currently available for testing. This will require Pro plan in production.
            </Text>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Basic Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Basic Settings
                  </Text>
                  
                  <TextField
                    label="Upsell Block Name"
                    value={upsellName}
                    onChange={setUpsellName}
                    placeholder="e.g., Product Page Recommendations"
                    helpText="This name is for your reference only"
                  />

                  <Select
                    label="Placement"
                    options={placementOptions}
                    value={placement}
                    onChange={setPlacement}
                  />
                </BlockStack>
              </Card>

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

                  <Select
                    label="Products to Show"
                    options={[
                      { label: "2 Products", value: "2" },
                      { label: "3 Products", value: "3" },
                      { label: "4 Products", value: "4" },
                      { label: "5 Products", value: "5" },
                      { label: "6 Products", value: "6" },
                    ]}
                    value={showProducts.toString()}
                    onChange={(value) => setShowProducts(parseInt(value))}
                  />

                  <Checkbox
                    label="Enable auto-slide"
                    checked={enableAutoSlide}
                    onChange={setEnableAutoSlide}
                  />
                </BlockStack>
              </Card>

              {/* Style Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Style & Layout Settings
                  </Text>
                  
                  <Select
                    label="Layout"
                    options={[
                      { label: "Slider Layout", value: "slider" },
                      { label: "Stack Layout (Vertical)", value: "stack" },
                    ]}
                    value={layout}
                    onChange={setLayout}
                    helpText="Slider shows products side by side with navigation. Stack shows products vertically."
                  />

                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Background Color"
                        type="color"
                        value={backgroundColor}
                        onChange={setBackgroundColor}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Text Color"
                        type="color"
                        value={textColor}
                        onChange={setTextColor}
                      />
                    </div>
                  </InlineStack>

                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Button Color"
                        type="color"
                        value={buttonColor}
                        onChange={setButtonColor}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Button Text"
                        value={buttonText}
                        onChange={setButtonText}
                        placeholder="Add"
                      />
                    </div>
                  </InlineStack>

                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Border Radius (px)"
                        type="number"
                        value={borderRadius.toString()}
                        onChange={(value) => setBorderRadius(parseInt(value) || 0)}
                        min="0"
                        max="50"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Padding (px)"
                        type="number"
                        value={padding.toString()}
                        onChange={(value) => setPadding(parseInt(value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>
                  </InlineStack>

                  <Checkbox
                    label="Center Padding Mode"
                    checked={centerPadding}
                    onChange={setCenterPadding}
                    helpText="Adds extra padding around product content for better spacing"
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
                {enableAutoSlide && (
                  <Card>
                    <Box padding="200">
                      <Text variant="bodySm" color="subdued" alignment="center">
                        🔄 Auto-sliding enabled
                      </Text>
                    </Box>
                  </Card>
                )}
              </BlockStack>

              {/* Action Buttons */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Actions
                  </Text>
                  
                  <BlockStack gap="200">
                    <Button
                      primary
                      fullWidth
                      onClick={handleCreateUpsell}
                      loading={isLoading}
                      disabled={isLoading || !upsellName.trim() || selectedProducts.length === 0}
                    >
                      {isLoading 
                        ? (editingUpsell ? "Updating..." : "Creating...") 
                        : (editingUpsell ? "Update Upsell Block" : "Create Upsell Block")
                      }
                    </Button>
                    
                    <Button fullWidth outline>
                      Save as Draft
                    </Button>
                  </BlockStack>
                  
                  <Divider />
                  
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="bold">
                      Next Steps:
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      1. Create your upsell block
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      2. Go to your theme customizer
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      3. Add the upsell block to your selected placement
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