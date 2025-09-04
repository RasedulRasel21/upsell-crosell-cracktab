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
    const productHandles = upsellBlock.productHandles 
      ? upsellBlock.productHandles.split(',').map(h => h.trim()).filter(h => h)
      : [];

    const data = {
      productHandles,
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