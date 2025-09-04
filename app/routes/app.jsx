import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Check if upsell already exists
  let hasUpsell = false;
  let existingUpsellId = null;
  
  try {
    const { getUpsellBlocks } = await import("../models/upsell.server");
    const upsellBlocks = await getUpsellBlocks(session.shop);
    hasUpsell = upsellBlocks.length > 0;
    existingUpsellId = hasUpsell ? upsellBlocks[0]?.id : null;
  } catch (error) {
    hasUpsell = false;
    existingUpsellId = null;
  }

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    hasUpsell,
    existingUpsellId
  };
};

export default function App() {
  const { apiKey, hasUpsell, existingUpsellId } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        {hasUpsell ? (
          <Link to={`/app/upsell?edit=${existingUpsellId}`}>Edit Upsell</Link>
        ) : (
          <Link to="/app/upsell">Create Upsell</Link>
        )}
        <Link to="/app/billing">Billing & Plans</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
