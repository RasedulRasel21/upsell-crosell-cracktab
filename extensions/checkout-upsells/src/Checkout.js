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

      // Use DigitalOcean production URL
      const analyticsUrls = [
        `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/analytics`
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

            return result.id; // Return the analytics record ID
          }
        } catch (error) {

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

    // Helper function to get currency symbol
    function getCurrencySymbol(currencyCode) {
      const symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': '$', 'CAD': '$',
        'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': '$', 'MXN': '$',
        'SGD': '$', 'HKD': '$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺',
        'RUB': '₽', 'INR': '₹', 'BRL': 'R$', 'ZAR': 'R', 'DKK': 'kr',
        'PLN': 'zł', 'TWD': 'NT$', 'THB': '฿', 'MYR': 'RM'
      };
      return symbols[currencyCode] || currencyCode + ' ';
    }

    // Function to create product card
    function createProductCard(product) {
      const variant = product.variants?.edges?.[0]?.node;
      if (!variant) return null;

      const isAdding = addingToCart[variant.id] || false;

      // Debug: Log the full price object to see what currency is returned
      console.log('💰 Product price data:', {
        productTitle: product.title,
        priceAmount: variant.price?.amount,
        priceCurrency: variant.price?.currencyCode,
        fullPriceObject: JSON.stringify(variant.price)
      });

      // Use the currency from the product price - Storefront API returns price in store's currency
      const currencyCode = variant.price.currencyCode || 'USD';
      const currencySymbol = getCurrencySymbol(currencyCode);

      console.log('💱 Currency detection:', {
        currencyCode,
        currencySymbol,
        productTitle: product.title
      });

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
          `${currencySymbol}${compareAtPrice}`
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
        `${currencySymbol}${price}`
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


        if (apiSettings.properties) {
          try {
            const propertiesObj = JSON.parse(apiSettings.properties);
            // Convert object to array of {key, value} objects
            customAttributes = Object.entries(propertiesObj).map(([key, value]) => ({
              key: key,
              value: String(value)
            }));

          } catch (error) {


          }
        } else {

        }

        const result = await applyCartLinesChange({
          type: 'addCartLine',
          merchandiseId: variant.id,
          quantity: 1,
          attributes: customAttributes,
        });
        
        if (result.type === 'success') {

          buttonComponent.replaceChildren('✓ Added');

          // Track conversion analytics
          if (analyticsId) {

            await trackAnalytics(product, true, analyticsId);
          }

          // Remove product from display after successful add
          setTimeout(() => {
            renderProducts();
          }, 1000);
        } else {

          buttonComponent.replaceChildren('Error');
        }
      } catch (error) {

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

        
        // Use DigitalOcean production URL
        const apiUrls = [
          `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/upsells?shop=${shopDomain}&placement=checkout`
        ];

        let response;
        let lastError;
        
        for (const apiUrl of apiUrls) {
          try {

            response = await fetch(apiUrl);

            break;
          } catch (error) {

            lastError = error;
          }
        }
        
        if (!response) {
          throw lastError || new Error('All API endpoints failed');
        }
        const data = await response.json();
        



        // Update settings from API
        if (data.title) apiSettings.title = data.title;
        if (data.showCount) apiSettings.showCount = data.showCount;
        if (data.buttonText) apiSettings.buttonText = data.buttonText;
        if (data.upsellBlockId) apiSettings.upsellBlockId = data.upsellBlockId;
        if (data.properties) {
          apiSettings.properties = data.properties;

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
                              compareAtPrice {
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

            // Debug: Log raw collection data to check currency
            if (collectionData?.products?.edges?.[0]) {
              const firstProduct = collectionData.products.edges[0].node;
              const firstVariant = firstProduct?.variants?.edges?.[0]?.node;
              console.log('🔍 RAW COLLECTION DATA - First product:', {
                title: firstProduct?.title,
                variantPrice: firstVariant?.price,
                currencyFromAPI: firstVariant?.price?.currencyCode
              });
            }

            if (collectionData?.products?.edges?.length > 0) {
              productsToFetch = collectionData.products.edges.map(edge => edge.node);

            } else {






              // Try to fall back to product handles if available
              if (data.productHandles && data.productHandles.length > 0) {

                fetchMethod = 'handles';
                productsToFetch = data.productHandles.slice(0, 10);
              } else {

                loading = false;
                renderProducts();
                return;
              }
            }
          } catch (error) {

            loading = false;
            renderProducts();
            return;
          }
        }
        // Fallback to old product handles approach for backward compatibility
        else if (data.productHandles && data.productHandles.length > 0) {

          fetchMethod = 'handles';

          // Limit to maximum 10 products for checkout placement
          const limitedHandles = data.productHandles.slice(0, 10);

          productsToFetch = limitedHandles;
        }
        // No products to fetch
        else {

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
              

              return productQuery?.data?.product;
            } catch (error) {

              return null;
            }
          })
        );

        // Filter out null/invalid products and unavailable products
        productsData = productsData.filter(product => {
          if (!product) return false;
          const variant = product.variants?.edges?.[0]?.node;
          const isAvailable = variant?.availableForSale;

          return isAvailable;
        });
        }

        upsellProducts = productsData;

        
      } catch (error) {


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
    

  }
);