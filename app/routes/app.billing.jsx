import { useLoaderData } from "@remix-run/react";
import { Button, Layout, Page, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const { appSubscriptions } = await billing.check();

  return {
    subscription: appSubscriptions?.[0],
    shop: session.shop,
  };
};

export default function Billing() {
  const { subscription, shop } = useLoaderData();

  console.log("subscription: ", subscription);

  const handleViewPlans = () => {
    const storeHandle = shop?.replace('.myshopify.com', '') || '';
    const appHandle = 'upsell-cross-sell-booster-staging';
    const url = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
    window.open(url, '_top');
  };

  return (
    <Page title="Billing">
      <Layout>
        <Layout.Section>
          {subscription && subscription.name === 'Pro' ? (
            <Banner title="You are subscribed to the Pro plan" status="success">
              <p>Manage your subscription or change plans.</p>
            </Banner>
          ) : (
            <Banner title="No active subscription" status="warning">
              <p>Subscribe to access premium features.</p>
            </Banner>
          )}
        </Layout.Section>
        <Layout.Section>
          <Button
            onClick={handleViewPlans}
            primary
          >
            View Plans
          </Button>
        </Layout.Section>
      </Layout>
    </Page>
  );
}