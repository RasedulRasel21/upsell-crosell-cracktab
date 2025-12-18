import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const providedSecret = url.searchParams.get("secret");
    const adminSecret = process.env.ADMIN_SECRET || "change-this-secret-123";

    // Simple authentication check
    if (providedSecret !== adminSecret) {
      return json(
        {
          error: "Unauthorized",
          message: "Add ?secret=YOUR_SECRET to the URL"
        },
        { status: 401 }
      );
    }

    // Get all upsell blocks
    const upsells = await prisma.upsellBlock.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get unique shops
    const uniqueShops = [...new Set(upsells.map((u) => u.shop))];

    // Calculate stats
    const stats = {
      totalUpsells: upsells.length,
      activeUpsells: upsells.filter((u) => u.active).length,
      totalShops: uniqueShops.length,
    };

    // Group by shop
    const byShop = {};
    upsells.forEach((upsell) => {
      if (!byShop[upsell.shop]) {
        byShop[upsell.shop] = [];
      }
      byShop[upsell.shop].push(upsell);
    });

    return json({
      success: true,
      stats,
      upsells,
      byShop,
      shops: uniqueShops,
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);
    return json(
      {
        error: "Server Error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
};

export default function AdminDashboard() {
  const data = useLoaderData();

  // Handle errors
  if (data.error) {
    return (
      <html>
        <head>
          <title>Error - Admin Dashboard</title>
          <style>{`
            body { font-family: system-ui; padding: 40px; background: #f5f5f5; }
            .error { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
            h1 { color: #d32f2f; margin: 0 0 10px; }
            p { color: #666; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
          `}</style>
        </head>
        <body>
          <div className="error">
            <h1>❌ {data.error}</h1>
            <p>{data.message}</p>
            {data.stack && <pre>{data.stack}</pre>}
          </div>
        </body>
      </html>
    );
  }

  const { stats, upsells, byShop, shops } = data;

  return (
    <html>
      <head>
        <title>Admin Dashboard</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .container { max-width: 1400px; margin: 0 auto; }
          h1 { color: #333; margin-bottom: 30px; }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .stat-label { color: #666; font-size: 14px; margin-bottom: 8px; }
          .stat-value { color: #1976d2; font-size: 36px; font-weight: bold; }
          .section {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          h2 { margin-bottom: 20px; color: #333; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
          th { background: #f8f9fa; font-weight: 600; }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          .badge-active { background: #d4edda; color: #155724; }
          .badge-inactive { background: #f8d7da; color: #721c24; }
          .shop-header {
            background: #e3f2fd;
            padding: 12px;
            margin: 20px 0 10px;
            border-radius: 4px;
            font-weight: 600;
            color: #1976d2;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>🔧 Admin Dashboard</h1>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Total Stores</div>
              <div className="stat-value">{stats.totalShops}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total Upsells</div>
              <div className="stat-value">{stats.totalUpsells}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Active Upsells</div>
              <div className="stat-value">{stats.activeUpsells}</div>
            </div>
          </div>

          <div className="section">
            <h2>All Upsells by Store</h2>
            {shops.length === 0 ? (
              <p style={{ color: '#666' }}>No upsells created yet</p>
            ) : (
              <>
                {shops.map((shop) => (
                  <div key={shop}>
                    <div className="shop-header">{shop}</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Placement</th>
                          <th>Collection</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byShop[shop].map((u) => (
                          <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>{u.placement}</td>
                            <td>{u.collectionHandle || u.productHandles || "N/A"}</td>
                            <td>
                              <span className={`badge ${u.active ? 'badge-active' : 'badge-inactive'}`}>
                                {u.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="section">
            <details>
              <summary style={{ cursor: 'pointer', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                📄 View Raw JSON Data
              </summary>
              <pre style={{ marginTop: '10px', background: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
                {JSON.stringify({ stats, upsells }, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </body>
    </html>
  );
}
