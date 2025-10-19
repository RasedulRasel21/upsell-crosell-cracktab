import {
  extension,
  Banner,
  BlockStack,
  Button,
  Heading,
  Image,
  InlineLayout,
  InlineStack,
  Text,
  View,
} from '@shopify/ui-extensions/checkout';

export default extension(
  'purchase.checkout.block.render',
  async (root, api) => {
    console.log('🚀 CHECKOUT EXTENSION LOADING!');
    
    const { query, shop, cartLines, applyCartLinesChange } = api;
    
    // State variables
    let upsellProducts = [];
    let loading = true;
    let addingToCart = {};
    
    // Settings from API
    let apiSettings = {
      layout: 'slider',
      showCount: 4,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      buttonColor: '#1a73e8',
      borderRadius: 8,
      padding: 16,
      centerPadding: true,
      buttonText: 'Add',
      title: 'Recommended for you',
      properties: '',
      upsellBlockId: null
    };

    // Analytics tracking function
    async function trackAnalytics(product, addedToCart = false, existingAnalyticsId = null) {
      const variant = product.variants?.edges?.[0]?.node;
      if (!variant) return null;

      const shopDomain = shop?.myshopifyDomain || shop?.domain;
      if (!shopDomain) return null;

      const analyticsData = {
        shop: shopDomain,
        upsellBlockId: apiSettings.upsellBlockId,
        productId: product.id,
        variantId: variant.id,
        productName: product.title,
        variantTitle: variant.title !== product.title ? variant.title : null,
        price: parseFloat(variant.price.amount),
        placement: 'checkout',
        addedToCart
      };

      // If we have an existing analytics ID, this is a conversion update
      if (existingAnalyticsId && addedToCart) {
        analyticsData.updateExisting = existingAnalyticsId;
      }

      // Try multiple analytics endpoints (staging first for staging deployment)
      const analyticsUrls = [
        `https://upsell-cross-sell-booster-st.fly.dev/api/analytics`,
        `https://upsell-cross-sell-cracktab.fly.dev/api/analytics`,
        `https://consisting-came-extension-alternative.trycloudflare.com/api/analytics`
      ];

      for (const analyticsUrl of analyticsUrls) {
        try {
          const response = await fetch(analyticsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(analyticsData)
          });

          if (response.ok) {
            const result = await response.json();
            console.log('📊 Analytics tracked successfully:', analyticsData);
            return result.id; // Return the analytics record ID
          }
        } catch (error) {
          console.log('❌ Analytics tracking failed for:', analyticsUrl, error.message);
        }
      }
      return null;
    }

    // Create main container
    const mainContainer = root.createComponent(View, {
      padding: 'base',
      border: 'base',
      borderRadius: 'base',
      background: 'base'
    });
    
    // Create title element
    const titleElement = root.createComponent(
      Heading,
      { level: 2 },
      apiSettings.title
    );
    
    // Create products container
    const productsContainer = root.createComponent(BlockStack, {
      spacing: 'base'
    });
    
    // Add components to main container
    const containerContent = root.createComponent(BlockStack, {
      spacing: 'base'
    });
    containerContent.appendChild(titleElement);
    containerContent.appendChild(productsContainer);
    mainContainer.appendChild(containerContent);
    
    root.appendChild(mainContainer);

    // Function to create product card
    function createProductCard(product) {
      const variant = product.variants?.edges?.[0]?.node;
      if (!variant) return null;
      
      const isAdding = addingToCart[variant.id] || false;
      const price = parseFloat(variant.price.amount).toFixed(2);
      const compareAtPrice = variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount).toFixed(2) : null;
      const hasDiscount = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price);
      
      // Create product container
      const productContainer = root.createComponent(View, {
        padding: 'base',
        border: 'base',
        borderRadius: 'base',
        background: 'base'
      });
      
      // Create inline layout for product display
      const productLayout = root.createComponent(InlineLayout, {
        spacing: 'base',
        blockAlignment: 'center',
        columns: ['auto', 'fill', 'auto']
      });
      
      // Product image - always show image container
      const imageView = root.createComponent(View, {
        maxInlineSize: 80,
        minInlineSize: 80,
        background: 'subdued'
      });
      
      if (product.featuredImage?.url) {
        const productImage = root.createComponent(Image, {
          source: product.featuredImage.url,
          alt: product.featuredImage.altText || product.title,
          aspectRatio: 1,
          fit: 'cover'
        });
        imageView.appendChild(productImage);
      } else {
        // Placeholder for products without images
        const placeholderText = root.createComponent(
          Text,
          {
            size: 'small',
            appearance: 'subdued',
            inlineAlignment: 'center',
            blockAlignment: 'center'
          },
          '📦'
        );
        imageView.appendChild(placeholderText);
      }
      
      productLayout.appendChild(imageView);
      
      // Product info
      const productInfo = root.createComponent(BlockStack, {
        spacing: 'tight'
      });
      
      // Product title
      const productTitle = root.createComponent(
        Text,
        { 
          size: 'medium',
          emphasis: 'bold'
        },
        product.title
      );
      productInfo.appendChild(productTitle);
      
      // Price info
      const priceInfo = root.createComponent(InlineStack, {
        spacing: 'tight',
        blockAlignment: 'center'
      });
      
      if (hasDiscount) {
        // Old price
        const oldPrice = root.createComponent(
          Text,
          { 
            size: 'small',
            appearance: 'subdued',
            decoration: 'strikethrough'
          },
          `$${compareAtPrice}`
        );
        priceInfo.appendChild(oldPrice);
        
        // Discount
        const discount = Math.round(((parseFloat(compareAtPrice) - parseFloat(price)) / parseFloat(compareAtPrice)) * 100);
        const discountText = root.createComponent(
          Text,
          { 
            size: 'small',
            emphasis: 'bold',
            appearance: 'critical'
          },
          `${discount}% off`
        );
        priceInfo.appendChild(discountText);
      }
      
      // Current price
      const currentPrice = root.createComponent(
        Text,
        { 
          size: 'medium',
          emphasis: 'bold'
        },
        `$${price}`
      );
      priceInfo.appendChild(currentPrice);
      
      productInfo.appendChild(priceInfo);
      productLayout.appendChild(productInfo);
      
      // Add to cart button
      const buttonView = root.createComponent(View, {});
      const addButton = root.createComponent(
        Button,
        {
          kind: 'primary',
          size: 'small',
          loading: isAdding,
          disabled: isAdding,
          onPress: async () => {
            // Track click analytics immediately
            const analyticsId = await trackAnalytics(product, false);
            // Then attempt to add to cart
            await addToCart(product, addButton, analyticsId);
          }
        },
        isAdding ? 'Adding...' : apiSettings.buttonText
      );
      buttonView.appendChild(addButton);
      productLayout.appendChild(buttonView);
      
      productContainer.appendChild(productLayout);
      return productContainer;
    }
    
    // Add to cart function
    async function addToCart(product, buttonComponent, analyticsId = null) {
      const variant = product.variants?.edges?.[0]?.node;
      if (!variant) return;
      
      addingToCart[variant.id] = true;
      buttonComponent.updateProps({ loading: true, disabled: true });
      
      try {
        // Parse custom properties if they exist and convert to array format
        let customAttributes = [];
        console.log('🔍 Properties available in apiSettings:', apiSettings.properties);

        if (apiSettings.properties) {
          try {
            const propertiesObj = JSON.parse(apiSettings.properties);
            // Convert object to array of {key, value} objects
            customAttributes = Object.entries(propertiesObj).map(([key, value]) => ({
              key: key,
              value: String(value)
            }));
            console.log('✅ Using custom properties:', customAttributes);
          } catch (error) {
            console.warn('⚠️ Invalid properties JSON, skipping:', apiSettings.properties);
            console.error('JSON Parse Error:', error);
          }
        } else {
          console.log('ℹ️ No properties found in apiSettings');
        }

        const result = await applyCartLinesChange({
          type: 'addCartLine',
          merchandiseId: variant.id,
          quantity: 1,
          attributes: customAttributes,
        });
        
        if (result.type === 'success') {
          console.log('✅ Successfully added to cart');
          buttonComponent.replaceChildren('✓ Added');

          // Track conversion analytics
          if (analyticsId) {
            console.log('📊 Tracking conversion for analytics ID:', analyticsId);
            await trackAnalytics(product, true, analyticsId);
          }

          // Remove product from display after successful add
          setTimeout(() => {
            renderProducts();
          }, 1000);
        } else {
          console.error('Failed to add to cart:', result.message);
          buttonComponent.replaceChildren('Error');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        buttonComponent.replaceChildren('Error');
      } finally {
        addingToCart[variant.id] = false;
        setTimeout(() => {
          buttonComponent.updateProps({ loading: false, disabled: false });
          buttonComponent.replaceChildren(apiSettings.buttonText);
        }, 2000);
      }
    }
    
    // Function to render products
    function renderProducts() {
      // Clear existing products
      productsContainer.replaceChildren();
      
      if (loading) {
        const loadingText = root.createComponent(
          Text,
          { 
            size: 'medium',
            appearance: 'subdued'
          },
          'Loading recommendations...'
        );
        productsContainer.appendChild(loadingText);
        return;
      }
      
      if (upsellProducts.length === 0) {
        const noProductsText = root.createComponent(
          Text,
          { 
            size: 'medium',
            appearance: 'subdued'
          },
          'No recommendations available at this time.'
        );
        productsContainer.appendChild(noProductsText);
        return;
      }
      
      // Filter and display products
      const displayProducts = upsellProducts
        .filter(product => {
          const variant = product.variants?.edges?.[0]?.node;
          if (!variant?.availableForSale) return false;
          
          // Check if not already in cart
          try {
            if (cartLines && typeof cartLines[Symbol.iterator] === 'function') {
              const cartArray = Array.from(cartLines);
              const isInCart = cartArray.some(line => line?.merchandise?.id === variant.id);
              return !isInCart;
            }
          } catch (error) {
            console.log('Cart lines not available, showing all products');
          }
          return true;
        })
        .slice(0, apiSettings.showCount);
      
      displayProducts.forEach(product => {
        const productCard = createProductCard(product);
        if (productCard) {
          productsContainer.appendChild(productCard);
        }
      });
    }
    
    // Fetch upsell products
    async function fetchUpsellProducts() {
      try {
        const shopDomain = shop?.myshopifyDomain || shop?.domain;
        console.log('🏪 Shop domain detected:', shopDomain);
        
        // Try multiple possible URLs (staging first for staging deployment)
        const apiUrls = [
          `https://upsell-cross-sell-booster-st.fly.dev/api/upsells?shop=${shopDomain}&placement=checkout`,
          `https://upsell-cross-sell-cracktab.fly.dev/api/upsells?shop=${shopDomain}&placement=checkout`,
          `https://consisting-came-extension-alternative.trycloudflare.com/api/upsells?shop=${shopDomain}&placement=checkout`
        ];
        
        // Log available environment info for debugging
        console.log('🔍 Extension environment:', {
          shopDomain,
          origin: typeof window !== 'undefined' ? window.location?.origin : 'undefined',
          href: typeof window !== 'undefined' ? window.location?.href : 'undefined'
        });
        
        let response;
        let lastError;
        
        for (const apiUrl of apiUrls) {
          try {
            console.log('🔄 Trying to fetch from:', apiUrl);
            response = await fetch(apiUrl);
            console.log('✅ Successfully connected to:', apiUrl);
            break;
          } catch (error) {
            console.log('❌ Failed to connect to:', apiUrl, error.message);
            lastError = error;
          }
        }
        
        if (!response) {
          throw lastError || new Error('All API endpoints failed');
        }
        const data = await response.json();
        
        console.log('📦 Checkout upsell API response:', data);
        console.log('🔍 Properties from API:', data.properties);

        // Update settings from API
        if (data.title) apiSettings.title = data.title;
        if (data.showCount) apiSettings.showCount = data.showCount;
        if (data.buttonText) apiSettings.buttonText = data.buttonText;
        if (data.upsellBlockId) apiSettings.upsellBlockId = data.upsellBlockId;
        if (data.properties) {
          apiSettings.properties = data.properties;
          console.log('✅ Properties set in apiSettings:', apiSettings.properties);
        }
        if (data.layout) apiSettings.layout = data.layout;
        if (data.backgroundColor) apiSettings.backgroundColor = data.backgroundColor;
        if (data.textColor) apiSettings.textColor = data.textColor;
        if (data.buttonColor) apiSettings.buttonColor = data.buttonColor;
        if (data.borderRadius) apiSettings.borderRadius = data.borderRadius;
        if (data.padding) apiSettings.padding = data.padding;
        if (data.centerPadding !== undefined) apiSettings.centerPadding = data.centerPadding;
        
        // Update title
        titleElement.replaceChildren(apiSettings.title);
        
        let productsToFetch = [];
        let fetchMethod = '';

        // Check if we have collection handle (new approach)
        if (data.collectionHandle) {
          console.log('🛍️ Fetching products from collection:', data.collectionHandle);
          fetchMethod = 'collection';

          // Fetch products from collection using Storefront API
          try {
            const collectionQuery = await query(
              `query getCollectionProducts($handle: String!, $first: Int!) {
                collection(handle: $handle) {
                  id
                  title
                  products(first: $first) {
                    edges {
                      node {
                        id
                        title
                        handle
                        description
                        featuredImage {
                          url
                          altText
                        }
                        variants(first: 1) {
                          edges {
                            node {
                              id
                              title
                              availableForSale
                              price {
                                amount
                                currencyCode
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }`,
              { variables: { handle: data.collectionHandle, first: data.showCount || 10 } }
            );

            const collectionData = collectionQuery.data?.collection;
            console.log('🔍 Collection query result:', collectionQuery);

            if (collectionData?.products?.edges?.length > 0) {
              productsToFetch = collectionData.products.edges.map(edge => edge.node);
              console.log(`📊 Found ${productsToFetch.length} products in collection`);
            } else {
              console.log('⚠️ No products found in collection. Reasons could be:');
              console.log('   1. Collection does not exist');
              console.log('   2. Collection exists but has no products');
              console.log('   3. All products in collection are out of stock');
              console.log('🔄 Falling back to product handles if available...');

              // Try to fall back to product handles if available
              if (data.productHandles && data.productHandles.length > 0) {
                console.log('✅ Using product handles as fallback:', data.productHandles);
                fetchMethod = 'handles';
                productsToFetch = data.productHandles.slice(0, 10);
              } else {
                console.log('❌ No fallback product handles available');
                loading = false;
                renderProducts();
                return;
              }
            }
          } catch (error) {
            console.error('❌ Error fetching collection products:', error);
            loading = false;
            renderProducts();
            return;
          }
        }
        // Fallback to old product handles approach for backward compatibility
        else if (data.productHandles && data.productHandles.length > 0) {
          console.log('🛍️ Product handles to fetch:', data.productHandles);
          fetchMethod = 'handles';

          // Limit to maximum 10 products for checkout placement
          const limitedHandles = data.productHandles.slice(0, 10);
          console.log(`📊 Limited to ${limitedHandles.length} products for checkout`);
          productsToFetch = limitedHandles;
        }
        // No products to fetch
        else {
          console.log('⚠️ No product handles or collection handle returned from API');
          loading = false;
          renderProducts();
          return;
        }
        
        // Process products based on fetch method
        let productsData = [];

        if (fetchMethod === 'collection') {
          // Products already fetched from collection
          productsData = productsToFetch.filter(product => {
            // Filter out unavailable products
            const variant = product.variants?.edges?.[0]?.node;
            return variant?.availableForSale;
          });
        } else if (fetchMethod === 'handles') {
          // Query products using Storefront API by handles (legacy)
          productsData = await Promise.all(
            productsToFetch.map(async (handle) => {
            try {
              console.log(`🔍 Querying product: ${handle}`);
              
              const productQuery = await query(
                `query getProduct($handle: String!) {
                  product(handle: $handle) {
                    id
                    title
                    handle
                    description
                    featuredImage {
                      url
                      altText
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          id
                          title
                          availableForSale
                          price {
                            amount
                            currencyCode
                          }
                          compareAtPrice {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }`,
                { variables: { handle } }
              );
              
              console.log(`✅ Product query result for ${handle}:`, productQuery);
              return productQuery?.data?.product;
            } catch (error) {
              console.error(`❌ Error querying product ${handle}:`, error);
              return null;
            }
          })
        );

        // Filter out null/invalid products and unavailable products
        productsData = productsData.filter(product => {
          if (!product) return false;
          const variant = product.variants?.edges?.[0]?.node;
          const isAvailable = variant?.availableForSale;
          console.log(`🔍 Product ${product.title}: available = ${isAvailable}`);
          return isAvailable;
        });
        }

        upsellProducts = productsData;
        console.log(`🎯 Final valid products (${upsellProducts.length}):`, upsellProducts.map(p => p.title));
        
      } catch (error) {
        console.error('❌ Failed to fetch checkout upsell products:', error);
        console.log('🚨 API connection failed - no products will be shown');
        upsellProducts = [];
      } finally {
        loading = false;
        renderProducts();
      }
    }
    
    // Initial load
    await fetchUpsellProducts();
    
    // Re-render when cart changes
    if (cartLines && typeof cartLines.subscribe === 'function') {
      cartLines.subscribe(renderProducts);
    }
    
    console.log('✅ Extension rendered successfully');
  }
);