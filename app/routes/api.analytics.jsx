import { json } from "@remix-run/node";
import db from "../db.server";

// CORS headers for Shopify extensions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Shopify-Topic, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-API-Version",
  "Access-Control-Allow-Credentials": "false",
  "Access-Control-Max-Age": "86400"
};

export const action = async ({ request }) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json();
    const {
      shop,
      upsellBlockId,
      productId,
      variantId,
      productName,
      variantTitle,
      price,
      placement,
      customerHash,
      sessionId,
      addedToCart = false,
      updateExisting = null
    } = body;

    // Validate required fields
    if (!shop || !productId || !variantId || !productName || !price || !placement) {
      return json({ error: "Missing required fields" }, {
        status: 400,
        headers: corsHeaders
      });
    }

    // If this is an update for conversion, update existing record
    if (updateExisting && addedToCart) {
      try {
        const analytics = await db.upsellAnalytics.update({
          where: { id: updateExisting },
          data: { addedToCart: true }
        });

        console.log("📊 Analytics conversion updated:", {
          id: analytics.id,
          shop,
          productName,
          addedToCart: true
        });

        return json({ success: true, id: analytics.id, updated: true }, {
          headers: corsHeaders
        });
      } catch (error) {
        console.error("❌ Error updating analytics:", error);
        // Fall through to create new record if update fails
      }
    }

    // Create new analytics record
    const analytics = await db.upsellAnalytics.create({
      data: {
        shop,
        upsellBlockId: upsellBlockId || "unknown",
        productId,
        variantId,
        productName,
        variantTitle,
        price: parseFloat(price),
        placement,
        customerHash,
        sessionId,
        addedToCart,
      },
    });

    console.log("📊 Analytics tracked:", {
      id: analytics.id,
      shop,
      productName,
      price,
      placement,
      addedToCart
    });

    return json({ success: true, id: analytics.id }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Error tracking analytics:", error);
    return json({ error: "Internal server error" }, {
      status: 500,
      headers: corsHeaders
    });
  }
};

// GET endpoint for retrieving analytics data
export const loader = async ({ request }) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const placement = url.searchParams.get("placement");

    if (!shop) {
      return json({ error: "Shop parameter is required" }, {
        status: 400,
        headers: corsHeaders
      });
    }

    // Build where clause
    const where = { shop };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (placement) {
      where.placement = placement;
    }

    // Get analytics data
    const analytics = await db.upsellAnalytics.findMany({
      where,
      include: {
        upsellBlock: {
          select: {
            name: true,
            placement: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get summary statistics
    const summary = await db.upsellAnalytics.aggregate({
      where,
      _count: {
        id: true
      },
      _sum: {
        price: true
      }
    });

    // Get conversion stats
    const conversions = await db.upsellAnalytics.groupBy({
      by: ['addedToCart'],
      where,
      _count: {
        id: true
      }
    });

    // Get top products
    const topProducts = await db.upsellAnalytics.groupBy({
      by: ['productId', 'productName'],
      where,
      _count: {
        id: true
      },
      _sum: {
        price: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    return json({
      analytics,
      summary: {
        totalClicks: summary._count.id || 0,
        totalValue: summary._sum.price || 0
      },
      conversions: {
        clicked: conversions.find(c => !c.addedToCart)?._count.id || 0,
        converted: conversions.find(c => c.addedToCart)?._count.id || 0
      },
      topProducts
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Error fetching analytics:", error);
    return json({ error: "Internal server error" }, {
      status: 500,
      headers: corsHeaders
    });
  }
};

// OPTIONS handler for preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}