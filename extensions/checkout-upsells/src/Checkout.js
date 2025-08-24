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
      showCount: 2,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      buttonColor: '#1a73e8',
      borderRadius: 8,
      padding: 16,
      centerPadding: true,
      buttonText: 'Add',
      title: 'Recommended for you'
    };

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
          onPress: () => addToCart(product, addButton)
        },
        isAdding ? 'Adding...' : apiSettings.buttonText
      );
      buttonView.appendChild(addButton);
      productLayout.appendChild(buttonView);
      
      productContainer.appendChild(productLayout);
      return productContainer;
    }
    
    // Add to cart function
    async function addToCart(product, buttonComponent) {
      const variant = product.variants?.edges?.[0]?.node;
      if (!variant) return;
      
      addingToCart[variant.id] = true;
      buttonComponent.updateProps({ loading: true, disabled: true });
      
      try {
        const result = await applyCartLinesChange({
          type: 'addCartLine',
          merchandiseId: variant.id,
          quantity: 1,
        });
        
        if (result.type === 'success') {
          console.log('✅ Successfully added to cart');
          buttonComponent.replaceChildren('✓ Added');
          
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
        
        // Try multiple possible API endpoints
        const apiUrls = [
          `https://safari-recommend-documentary-fishing.trycloudflare.com/api/upsells?shop=${shopDomain}&placement=checkout`,
          `https://boc-wagner-writer-morning.trycloudflare.com/api/upsells?shop=${shopDomain}&placement=checkout`
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
        
        // Update settings from API
        if (data.title) apiSettings.title = data.title;
        if (data.showCount) apiSettings.showCount = data.showCount;
        if (data.buttonText) apiSettings.buttonText = data.buttonText;
        if (data.layout) apiSettings.layout = data.layout;
        if (data.backgroundColor) apiSettings.backgroundColor = data.backgroundColor;
        if (data.textColor) apiSettings.textColor = data.textColor;
        if (data.buttonColor) apiSettings.buttonColor = data.buttonColor;
        if (data.borderRadius) apiSettings.borderRadius = data.borderRadius;
        if (data.padding) apiSettings.padding = data.padding;
        if (data.centerPadding !== undefined) apiSettings.centerPadding = data.centerPadding;
        
        // Update title
        titleElement.replaceChildren(apiSettings.title);
        
        if (!data.productHandles || data.productHandles.length === 0) {
          console.log('⚠️ No product handles returned from API');
          loading = false;
          renderProducts();
          return;
        }
        
        console.log('🛍️ Product handles to fetch:', data.productHandles);
        
        // Query products using Storefront API
        const productsData = await Promise.all(
          data.productHandles.map(async (handle) => {
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
        
        upsellProducts = productsData.filter(Boolean);
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