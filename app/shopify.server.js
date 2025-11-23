import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

// Define billing plans with proper Shopify configuration
export const MONTHLY_PLAN = {
  name: "Upsell & Cross-Sell Pro",
  price: 15.00,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS",
  trialDays: 7,
};

// Legacy export for backward compatibility
export const BASIC_PLAN = MONTHLY_PLAN;

// Plan configurations
export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    checkoutUpsellsAllowed: true,  // Checkout upsells allowed
    productUpsellsAllowed: true,   // Product page upsells allowed
    upsellLimit: null,              // Unlimited upsells
    features: [
      "Unlimited product page upsells",
      "Checkout page upsells",
      "Up to 10 products per upsell",
      "Customizable styling",
      "Basic analytics",
      "Community support"
    ]
  },
  PRO: {
    name: "Pro",
    price: 15,
    checkoutUpsellsAllowed: true,  // Checkout upsells allowed
    productUpsellsAllowed: true,   // Product page upsells also allowed
    upsellLimit: null,              // Unlimited upsells
    features: [
      "Everything in Free",
      "Checkout page upsells",
      "Unlimited product page upsells",
      "Up to 10 products per upsell",
      "Advanced analytics",
      "Custom button text",
      "Custom properties",
      "Priority support",
      "7-day free trial"
    ],
    trialDays: 7
  }
};

// Helper function to check if a shop has a Pro subscription
export async function hasActiveSubscription(billing) {
  try {
    const { appSubscriptions } = await billing.check();
    return appSubscriptions && appSubscriptions.length > 0;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
}

// Helper function to get current plan
export async function getCurrentPlan(billing) {
  try {
    const { appSubscriptions } = await billing.check();
    if (appSubscriptions && appSubscriptions.length > 0) {
      return PLANS.PRO;
    }
    return PLANS.FREE;
  } catch (error) {
    console.error("Error getting current plan:", error);
    return PLANS.FREE;
  }
}
