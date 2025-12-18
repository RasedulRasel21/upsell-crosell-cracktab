import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Text,
  BlockStack,
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { prisma } = await import("../db.server");

  // Get all upsell blocks with basic stats
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

  // Get total stats
  const totalUpsells = upsells.length;
  const activeUpsells = upsells.filter((u) => u.active).length;
  const uniqueShops = new Set(upsells.map((u) => u.shop)).size;

  return json({
    upsells,
    stats: {
      totalUpsells,
      activeUpsells,
      uniqueShops,
    },
  });
};

export default function AdminView() {
  const { upsells, stats } = useLoaderData();

  const rows = upsells.map((upsell) => [
    upsell.shop,
    upsell.name,
    upsell.placement,
    upsell.collectionHandle || upsell.productHandles || "N/A",
    upsell.active ? (
      <Badge tone="success">Active</Badge>
    ) : (
      <Badge tone="critical">Inactive</Badge>
    ),
    upsell.showCount,
    upsell._count.analytics,
    new Date(upsell.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page
      title="Admin View - All Upsells"
      subtitle="View all upsell blocks across all stores"
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Stats Cards */}
            <Layout>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">
                      Total Upsells
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {stats.totalUpsells}
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">
                      Active Upsells
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {stats.activeUpsells}
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">
                      Stores Using App
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {stats.uniqueShops}
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            {/* Data Table */}
            <Card>
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "numeric",
                  "numeric",
                  "text",
                ]}
                headings={[
                  "Store",
                  "Name",
                  "Placement",
                  "Collection/Products",
                  "Status",
                  "Show Count",
                  "Analytics",
                  "Created",
                ]}
                rows={rows}
              />
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
