import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const placement = url.searchParams.get("placement") || "checkout";
    const callback = url.searchParams.get("callback"); // JSONP support

    if (!shop) {
      return json({ error: "Shop parameter is required" }, { status: 400 });
    }

    // All upsells are now free - no plan restrictions

    // Get active upsell blocks for this shop and placement
    const { getActiveUpsellBlock } = await import("../models/upsell.server");
    const upsellBlock = await getActiveUpsellBlock(shop, placement);

    if (!upsellBlock) {
      return json({
        products: [],
        productHandles: [],
        collectionHandle: null,
        title: "Recommended for you",
        showCount: 4,
        autoSlide: false,
        slideDuration: 5
      }, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Fetch products from collection using Storefront API
    let products = [];
    if (upsellBlock.collectionHandle) {
      try {
        // Use Shopify's public Storefront API
        const storefrontUrl = `https://${shop}/api/2024-01/graphql.json`;
        const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

        // If no storefront token, fetch from store directly using collection handle
        const collectionUrl = `https://${shop}/collections/${upsellBlock.collectionHandle}/products.json?limit=${upsellBlock.showCount || 10}`;

        const response = await fetch(collectionUrl);
        if (response.ok) {
          const data = await response.json();
          products = data.products || [];
        }
      } catch (error) {
        // Continue without products
      }
    }

    // Support both old productHandles and new collectionHandle
    const productHandles = upsellBlock.productHandles
      ? upsellBlock.productHandles.split(',').map(h => h.trim()).filter(h => h)
      : [];

    // TEMPORARY FIX: If using collection but no product handles, provide actual product handles
    // This ensures the checkout extension has something to work with while the collection is being set up
    let finalProductHandles = productHandles;
    if (upsellBlock.collectionHandle && productHandles.length === 0) {
      // These are actual product handles from the conscious bar store
      finalProductHandles = [
        'lions-mane-mushroom-2400mg-90-capsules',
        'sleep-well-mushroom-blend-2400mg-90-capsules',
        'cordyceps-mushroom-extract-2400mg-90-capsules',
        'turkey-tail-mushroom-extract-2400mg-90-capsules',
        'reishi-mushroom-extract-2400mg-90-capsules'
      ];
    }

    const data = {
      // Product data
      products: products,
      // Backward compatibility - keep productHandles (with fallback for empty collections)
      productHandles: finalProductHandles,
      // New collection-based approach
      collectionHandle: upsellBlock.collectionHandle,
      // Analytics tracking
      upsellBlockId: upsellBlock.id,
      title: upsellBlock.title,
      showCount: upsellBlock.showCount,
      autoSlide: upsellBlock.autoSlide,
      slideDuration: upsellBlock.slideDuration,
      // Style settings
      layout: upsellBlock.layout,
      columns: upsellBlock.columns,
      backgroundColor: upsellBlock.backgroundColor,
      textColor: upsellBlock.textColor,
      buttonColor: upsellBlock.buttonColor,
      buttonText: upsellBlock.buttonText,
      properties: upsellBlock.properties,
      borderRadius: upsellBlock.borderRadius,
      padding: upsellBlock.padding,
      centerPadding: upsellBlock.centerPadding,
    };

    // JSONP support for cross-origin requests
    if (callback) {
      return new Response(
        `${callback}(${JSON.stringify(data)})`,
        {
          headers: {
            "Content-Type": "application/javascript",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    return json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error) {
    return json({ error: "Internal server error" }, { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
};

export const options = async ({ request }) => {
  // Handle CORS preflight requests
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
    },
  });
};