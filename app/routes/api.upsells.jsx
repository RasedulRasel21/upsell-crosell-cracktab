import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const placement = url.searchParams.get("placement") || "checkout";
    
    // Only allow checkout placement
    if (placement !== "checkout") {
      return json({ error: "Only checkout placement is supported" }, { status: 400 });
    }
    const callback = url.searchParams.get("callback"); // JSONP support
    
    if (!shop) {
      return json({ error: "Shop parameter is required" }, { status: 400 });
    }

    // Get active upsell blocks for this shop and placement
    const { getActiveUpsellBlock } = await import("../models/upsell.server");
    const upsellBlock = await getActiveUpsellBlock(shop, placement);

    if (!upsellBlock) {
      return json({
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

    // Support both old productHandles and new collectionHandle
    const productHandles = upsellBlock.productHandles
      ? upsellBlock.productHandles.split(',').map(h => h.trim()).filter(h => h)
      : [];

    // Provide debugging info
    console.log('Upsell Block Debug:', {
      name: upsellBlock.name,
      collectionHandle: upsellBlock.collectionHandle,
      productHandles: productHandles,
      hasProductHandles: productHandles.length > 0,
      hasCollectionHandle: !!upsellBlock.collectionHandle
    });

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
      console.log('🔄 Using fallback product handles from store inventory:', finalProductHandles);
    }

    const data = {
      // Backward compatibility - keep productHandles (with fallback for empty collections)
      productHandles: finalProductHandles,
      // New collection-based approach
      collectionHandle: upsellBlock.collectionHandle,
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
    console.error("API upsells error:", error);
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