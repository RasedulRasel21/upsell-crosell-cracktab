import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  Badge,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Divider,
  Box,
  Grid,
  Select,
  TextField,
  EmptyState,
} from "@shopify/polaris";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const placement = url.searchParams.get("placement") || "all";

    // Build where clause
    const where = { shop };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = {
        gte: thirtyDaysAgo
      };
    }

    if (placement !== "all") {
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
      },
      take: 500 // Limit to prevent performance issues
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

    // Get daily stats for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await db.upsellAnalytics.findMany({
      where: {
        ...where,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true,
        addedToCart: true,
        price: true
      }
    });

    // Process daily stats for charts
    const dailyChartData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyChartData[dateKey] = {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        clicks: 0,
        conversions: 0,
        revenue: 0
      };
    }

    dailyStats.forEach(stat => {
      const dateKey = stat.createdAt.toISOString().split('T')[0];
      if (dailyChartData[dateKey]) {
        dailyChartData[dateKey].clicks += 1;
        if (stat.addedToCart) {
          dailyChartData[dateKey].conversions += 1;
          dailyChartData[dateKey].revenue += stat.price;
        }
      }
    });

    const chartData = Object.values(dailyChartData);

    // Get placement breakdown for pie chart
    const placementBreakdown = await db.upsellAnalytics.groupBy({
      by: ['placement'],
      where,
      _count: {
        id: true
      }
    });

    return json({
      analytics: analytics.map(item => ({
        id: item.id,
        productName: item.productName,
        variantTitle: item.variantTitle,
        price: item.price,
        placement: item.placement,
        addedToCart: item.addedToCart,
        upsellBlockName: item.upsellBlock?.name || "Unknown",
        createdAt: item.createdAt
      })),
      summary: {
        totalClicks: summary._count.id || 0,
        totalValue: summary._sum.price || 0
      },
      conversions: {
        clicked: conversions.find(c => !c.addedToCart)?._count.id || 0,
        converted: conversions.find(c => c.addedToCart)?._count.id || 0
      },
      topProducts: topProducts.map(p => ({
        productName: p.productName,
        clicks: p._count.id,
        totalValue: p._sum.price || 0
      })),
      dailyStats,
      chartData,
      placementBreakdown: placementBreakdown.map(p => ({
        name: p.placement === 'checkout' ? 'Checkout' : 'Cart',
        value: p._count.id,
        color: p.placement === 'checkout' ? '#5C6AC4' : '#00A0B0'
      }))
    });

  } catch (error) {
    console.error("Analytics loader error:", error);
    return json({ error: "Failed to load analytics data" }, { status: 500 });
  }
};

export default function Analytics() {
  const data = useLoaderData();
  const [dateRange, setDateRange] = useState("30");
  const [placement, setPlacement] = useState("all");

  const fetcher = useFetcher();

  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);
    const searchParams = new URLSearchParams();

    if (value !== "all") {
      let startDate, endDate;

      if (value === "today") {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else if (value === "yesterday") {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(value));
      }

      searchParams.set("startDate", startDate.toISOString());
      searchParams.set("endDate", endDate.toISOString());
    }

    if (placement !== "all") {
      searchParams.set("placement", placement);
    }

    fetcher.load(`/app/analytics?${searchParams.toString()}`);
  }, [placement, fetcher]);

  const handlePlacementChange = useCallback((value) => {
    setPlacement(value);
    const searchParams = new URLSearchParams();

    if (dateRange !== "all") {
      let startDate, endDate;

      if (dateRange === "today") {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else if (dateRange === "yesterday") {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
      }

      searchParams.set("startDate", startDate.toISOString());
      searchParams.set("endDate", endDate.toISOString());
    }

    if (value !== "all") {
      searchParams.set("placement", value);
    }

    fetcher.load(`/app/analytics?${searchParams.toString()}`);
  }, [dateRange, fetcher]);

  const currentData = fetcher.data || data;

  if (currentData.error) {
    return (
      <Page title="Analytics">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text variant="bodyMd" tone="critical">
                  Error loading analytics: {currentData.error}
                </Text>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { analytics, summary, conversions, topProducts, chartData, placementBreakdown } = currentData;
  const conversionRate = summary.totalClicks > 0
    ? ((conversions.converted / summary.totalClicks) * 100).toFixed(1)
    : "0";

  // Prepare table data
  const tableRows = analytics.map(item => [
    item.productName + (item.variantTitle ? ` - ${item.variantTitle}` : ""),
    `$${item.price.toFixed(2)}`,
    item.placement,
    item.upsellBlockName,
    item.addedToCart ? <Badge tone="success">Converted</Badge> : <Badge>Clicked</Badge>,
    new Date(item.createdAt).toLocaleDateString()
  ]);

  return (
    <Page
      title="Analytics"
      subtitle="Track upsell performance and customer engagement"
    >
      <Layout>
        {/* Filters */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <InlineStack gap="400" align="start">
                <Box minWidth="200px">
                  <Select
                    label="Date Range"
                    options={[
                      { label: "Today", value: "today" },
                      { label: "Yesterday", value: "yesterday" },
                      { label: "Last 7 days", value: "7" },
                      { label: "Last 30 days", value: "30" },
                      { label: "Last 90 days", value: "90" },
                      { label: "All time", value: "all" }
                    ]}
                    value={dateRange}
                    onChange={handleDateRangeChange}
                  />
                </Box>
                <Box minWidth="200px">
                  <Select
                    label="Placement"
                    options={[
                      { label: "All placements", value: "all" },
                      { label: "Checkout", value: "checkout" },
                      { label: "Cart", value: "cart" }
                    ]}
                    value={placement}
                    onChange={handlePlacementChange}
                  />
                </Box>
              </InlineStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Summary Stats */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="100">
                    <Text variant="bodyMd" tone="subdued">Total Clicks</Text>
                    <Text variant="headingLg">{summary.totalClicks}</Text>
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="100">
                    <Text variant="bodyMd" tone="subdued">Conversions</Text>
                    <Text variant="headingLg">{conversions.converted}</Text>
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="100">
                    <Text variant="bodyMd" tone="subdued">Conversion Rate</Text>
                    <Text variant="headingLg">{conversionRate}%</Text>
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="100">
                    <Text variant="bodyMd" tone="subdued">Total Value</Text>
                    <Text variant="headingLg">${summary.totalValue.toFixed(2)}</Text>
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Charts Section */}
        <Layout.Section>
          <Grid>
            {/* Daily Performance Chart */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 8, lg: 8, xl: 8 }}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="400">
                    <Text variant="headingMd">Daily Performance (Last 7 Days)</Text>
                    {chartData && chartData.length > 0 ? (
                      <Box minHeight="300px">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                              formatter={(value, name) => [
                                name === 'revenue' ? `$${value.toFixed(2)}` : value,
                                name === 'clicks' ? 'Clicks' : name === 'conversions' ? 'Conversions' : 'Revenue'
                              ]}
                            />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="clicks"
                              stackId="1"
                              stroke="#5C6AC4"
                              fill="#5C6AC4"
                              fillOpacity={0.6}
                              name="Clicks"
                            />
                            <Area
                              type="monotone"
                              dataKey="conversions"
                              stackId="2"
                              stroke="#00A0B0"
                              fill="#00A0B0"
                              fillOpacity={0.8}
                              name="Conversions"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <EmptyState
                        heading="No chart data available"
                        content="Charts will appear here once you have analytics data for the last 7 days."
                      />
                    )}
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>

            {/* Placement Breakdown */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="400">
                    <Text variant="headingMd">Clicks by Placement</Text>
                    {placementBreakdown && placementBreakdown.length > 0 ? (
                      <Box minHeight="250px">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={placementBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {placementBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <EmptyState
                        heading="No placement data"
                        content="Placement breakdown will appear here once you have analytics data."
                      />
                    )}
                  </BlockStack>
                </Box>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Revenue Chart */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd">Revenue Trend (Last 7 Days)</Text>
                {chartData && chartData.length > 0 ? (
                  <Box minHeight="200px">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#00A0B0"
                          strokeWidth={3}
                          dot={{ fill: '#00A0B0', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <EmptyState
                    heading="No revenue data available"
                    content="Revenue trends will appear here once you have conversion data."
                  />
                )}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Top Products */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd">Top Performing Products</Text>
                {topProducts.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'numeric']}
                    headings={['Product', 'Clicks', 'Total Value']}
                    rows={topProducts.map(product => [
                      product.productName,
                      product.clicks,
                      `$${product.totalValue.toFixed(2)}`
                    ])}
                  />
                ) : (
                  <EmptyState
                    heading="No product data yet"
                    content="Analytics will appear here once customers start interacting with your upsells."
                  />
                )}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Recent Activity */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd">Recent Activity</Text>
                {analytics.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Product', 'Price', 'Placement', 'Upsell Block', 'Status', 'Date']}
                    rows={tableRows}
                    pagination={{
                      hasNext: false,
                      hasPrevious: false,
                      onNext: () => {},
                      onPrevious: () => {}
                    }}
                  />
                ) : (
                  <EmptyState
                    heading="No analytics data yet"
                    content="Start promoting your upsells to see customer engagement analytics here."
                  />
                )}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}