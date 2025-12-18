import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

/**
 * Admin Dashboard - App Owner Only
 *
 * Access: https://your-app.com/admin/dashboard?secret=YOUR_SECRET_KEY
 *
 * Set ADMIN_SECRET environment variable in DigitalOcean
 */

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const providedSecret = url.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET || "change-this-secret-123";

  // Simple authentication check
  if (providedSecret !== adminSecret) {
    return json(
      { error: "Unauthorized. Add ?secret=YOUR_SECRET to the URL" },
      { status: 401 }
    );
  }

  const { prisma } = await import("../db.server");

  // Get all upsell blocks
  const upsells = await prisma.upsellBlock.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          analytics: true,
        },
      },
    },
  });

  // Get all sessions (stores that have installed the app)
  const sessions = await prisma.session.findMany({
    select: {
      shop: true,
      isOnline: true,
      accessToken: true,
    },
    distinct: ['shop'],
  });

  // Calculate stats
  const totalUpsells = upsells.length;
  const activeUpsells = upsells.filter((u) => u.active).length;
  const uniqueShops = new Set(upsells.map((u) => u.shop)).size;
  const totalStores = sessions.length;

  // Group upsells by store
  const upsellsByStore = {};
  upsells.forEach((upsell) => {
    if (!upsellsByStore[upsell.shop]) {
      upsellsByStore[upsell.shop] = [];
    }
    upsellsByStore[upsell.shop].push(upsell);
  });

  return json({
    stats: {
      totalUpsells,
      activeUpsells,
      uniqueShops,
      totalStores,
    },
    upsells,
    sessions,
    upsellsByStore,
  });
};

export default function AdminDashboard() {
  const { stats, upsells, sessions, upsellsByStore } = useLoaderData();

  return (
    <html>
      <head>
        <title>Admin Dashboard - Upsell App</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .container { max-width: 1400px; margin: 0 auto; }
          h1 { color: #333; margin-bottom: 10px; }
          .subtitle { color: #666; margin-bottom: 30px; }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .stat-label { color: #666; font-size: 14px; margin-bottom: 5px; }
          .stat-value { color: #1a73e8; font-size: 32px; font-weight: bold; }
          .section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          h2 { color: #333; margin-bottom: 15px; font-size: 20px; }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
          .badge-active { background: #d4edda; color: #155724; }
          .badge-inactive { background: #f8d7da; color: #721c24; }
          .store-group {
            margin-bottom: 30px;
            border-left: 3px solid #1a73e8;
            padding-left: 15px;
          }
          .store-name {
            font-size: 18px;
            font-weight: 600;
            color: #1a73e8;
            margin-bottom: 10px;
          }
          pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>🔧 Admin Dashboard</h1>
          <p className="subtitle">App Owner View - All Stores & Upsells</p>

          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">Total Stores</div>
              <div className="stat-value">{stats.totalStores}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Upsells</div>
              <div className="stat-value">{stats.totalUpsells}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Upsells</div>
              <div className="stat-value">{stats.activeUpsells}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Stores with Upsells</div>
              <div className="stat-value">{stats.uniqueShops}</div>
            </div>
          </div>

          <div className="section">
            <h2>📊 All Upsells by Store</h2>
            {Object.keys(upsellsByStore).length === 0 ? (
              <p style={{ color: '#666' }}>No upsells created yet</p>
            ) : (
              Object.entries(upsellsByStore).map(([shop, shopUpsells]) => (
                <div key={shop} className="store-group">
                  <div className="store-name">{shop}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Placement</th>
                        <th>Collection/Products</th>
                        <th>Status</th>
                        <th>Show Count</th>
                        <th>Analytics</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopUpsells.map((upsell) => (
                        <tr key={upsell.id}>
                          <td>{upsell.name}</td>
                          <td>{upsell.placement}</td>
                          <td>{upsell.collectionHandle || upsell.productHandles || "N/A"}</td>
                          <td>
                            <span className={`badge ${upsell.active ? 'badge-active' : 'badge-inactive'}`}>
                              {upsell.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{upsell.showCount}</td>
                          <td>{upsell._count.analytics}</td>
                          <td>{new Date(upsell.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>

          <div className="section">
            <h2>🏪 Installed Stores</h2>
            {sessions.length === 0 ? (
              <p style={{ color: '#666' }}>No stores have installed the app yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Upsells</th>
                    <th>Has Access Token</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.shop}>
                      <td>{session.shop}</td>
                      <td>{upsellsByStore[session.shop]?.length || 0}</td>
                      <td>
                        <span className={`badge ${session.accessToken ? 'badge-active' : 'badge-inactive'}`}>
                          {session.accessToken ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section">
            <h2>📄 Raw Data (JSON)</h2>
            <details>
              <summary style={{ cursor: 'pointer', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                Click to view raw JSON data
              </summary>
              <pre>{JSON.stringify({ stats, upsells, sessions }, null, 2)}</pre>
            </details>
          </div>
        </div>
      </body>
    </html>
  );
}
