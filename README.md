# Upsell & Cross Sell - Cracktab

A Shopify app built with Remix that provides upsell and cross-sell functionality through checkout extensions.

## Project Structure

- **Main App**: Remix-based Shopify app for managing upsells
- **Checkout Extension**: Shopify UI extension that displays upsells in checkout
- **Database**: SQLite with Prisma ORM
- **Deployment**: DigitalOcean App Platform

## Key Configuration Files

- `shopify.app.toml` - Main Shopify app configuration
- `Dockerfile` - Production deployment configuration
- `extensions/checkout-upsells/` - Checkout extension source code
- `DEPLOYMENT.md` - Detailed deployment guide for DigitalOcean

## Authentication Setup

The app uses Shopify App Remix framework with OAuth authentication:

- **Auth Handler**: `app/routes/auth.$.jsx` - Handles OAuth callbacks
- **Server Config**: `app/shopify.server.js` - Core authentication setup
- **Required Scopes**: `read_products,unauthenticated_write_checkouts`

## Common Issues and Solutions

### 1. Checkout Extension Product Loading Issues

**Problem**: Products not loading in production checkout extension despite successful API connection.

**Symptoms**:
- Console shows successful API connection
- Response contains empty product arrays: `{productHandles: Array(0), collectionHandle: null}`
- Extension displays "No recommendations available"

**Root Cause**: Extension connecting to wrong server or empty database.

**Solution**:
Ensure the checkout extension is pointing to your production DigitalOcean URL in `extensions/checkout-upsells/src/Checkout.js`:

```javascript
const apiUrls = [
  `https://your-app-name.ondigitalocean.app/api/upsells?shop=${shopDomain}&placement=checkout`
];
```

### 2. Pro Plan Banner Removal

**Problem**: Pro Plan banner persisting after code removal and deployment.

**Solution**: Ensure deployment:
1. Remove banner code from `app/routes/app._index.jsx`
2. Deploy to Shopify extension: `npm run deploy`
3. Commit changes and push to trigger DigitalOcean auto-deploy

### 3. Analytics Showing 0 Despite Successful Tracking

**Problem**: Analytics data is being tracked successfully (visible in console logs like "📊 Analytics tracked successfully") but the production analytics dashboard shows 0 for all metrics.

**Symptoms**:
- Console shows successful analytics tracking
- Production dashboard displays all zeros for clicks, conversions, and revenue
- Logs show messages like "📊 Analytics tracked successfully" and "📊 Tracking conversion for analytics ID: xxx"

**Root Cause**: Analytics endpoints pointing to wrong server or database.

**Solution**:
Update analytics URL in `extensions/checkout-upsells/src/Checkout.js`:

```javascript
const analyticsUrls = [
  `https://your-app-name.ondigitalocean.app/api/analytics`
];
```

**Deployment Required**: After fixing URLs, deploy:
1. Deploy Shopify extension: `npm run deploy`
2. Commit and push changes to trigger DigitalOcean deployment

### 4. Shopify App Deployment Errors

**Problem**: "Unsupported section(s) in app configuration: billing, env"

**Solution**: Remove unsupported sections from `shopify.app.toml`:
```toml
# Remove these sections if they exist
[env]  # Not supported
[billing]  # Not supported
```

### 5. Product Availability Filtering

**Problem**: Products being filtered out inconsistently between collection and handle methods.

**Solution**: Standardize filtering logic in checkout extension:

```javascript
// Consistent availability check
productsData = productsData.filter(product => {
  if (!product) return false;
  const variant = product.variants?.edges?.[0]?.node;
  const isAvailable = variant?.availableForSale;
  console.log(`🔍 Product ${product.title}: available = ${isAvailable}`);
  return isAvailable;
});
```

## Deployment Process

### Staging Deployment
```bash
# Deploy to Shopify
npm run deploy:staging

# Deploy to Fly.io staging
flyctl deploy --config fly.staging.toml
```

### Production Deployment
```bash
# Deploy to Shopify
npm run deploy

# Deploy to Fly.io production
flyctl deploy --config fly.toml
```

### Database Operations
```bash
# Backup production database
npm run backup:prod

# Restore database from backup
npm run backup:restore

# Setup development database
npm run setup:dev
```

## Environment Configuration

### Production URLs
- App: https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app
- API: https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/upsells

See `DEPLOYMENT.md` for complete deployment instructions.

## Development Scripts

```bash
# Start development server
npm run dev

# Start with staging config
npm run dev:staging

# Build application
npm run build

# Run linting
npm run lint

# Database operations
npm run prisma generate
npm run prisma migrate dev
```

## Troubleshooting

### Extension Not Loading
1. Check console logs in browser dev tools during checkout
2. Verify API endpoints are accessible
3. Confirm shop domain is correctly detected
4. Ensure products have available variants

### API Connection Issues
1. Check DigitalOcean app runtime logs
2. Verify all environment variables are set correctly
3. Test API endpoint directly in browser
4. Ensure DATABASE_URL is configured

### Database Issues
1. Check database file exists: `ls -la *.sqlite`
2. Run migrations: `npx prisma migrate deploy`
3. Verify schema: `npx prisma studio`

## Key Files to Monitor

- `extensions/checkout-upsells/src/Checkout.js` - Main extension logic
- `app/routes/api.upsells.tsx` - API endpoint for upsell data
- `app/routes/app._index.jsx` - Main app dashboard
- `Dockerfile` - Production deployment configuration
- `DEPLOYMENT.md` - Deployment guide

## Analytics System

### Overview
The app now includes comprehensive analytics tracking to monitor upsell performance and customer engagement. The analytics system tracks user interactions with upsells and provides detailed reporting through the dashboard.

### What is CORS?
**CORS (Cross-Origin Resource Sharing)** is a security mechanism that controls which websites can access your API from the browser. When Shopify checkout extensions try to send analytics data to your app, browsers enforce CORS policy to prevent malicious websites from making unauthorized requests.

**Why was CORS needed?**
- Shopify checkout extensions run from `https://extensions.shopifycdn.com`
- Our analytics API runs from your DigitalOcean app URL
- Without proper CORS headers, the browser blocks these cross-origin requests

**CORS Solution Implemented:**
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Shopify-Topic, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-API-Version",
  "Access-Control-Allow-Credentials": "false",
  "Access-Control-Max-Age": "86400"
};
```

### Data Storage Architecture
**Database:** SQLite with Prisma ORM
- **Production Database:** SQLite file stored on Fly.io production server (`/data/sqlite.db`)
- **Staging Database:** SQLite file stored on Fly.io staging server (`/data/staging.sqlite`)
- **Local Development:** SQLite file in project directory (`dev.sqlite`)

**Analytics Data Model:**
```sql
model UpsellAnalytics {
  id            String   @id @default(cuid())
  shop          String
  upsellBlockId String?
  productId     String
  variantId     String
  productName   String
  variantTitle  String?
  price         Float
  placement     String   // "checkout" or "cart"
  customerHash  String?
  sessionId     String?
  addedToCart   Boolean  @default(false)
  createdAt     DateTime @default(now())

  upsellBlock   UpsellBlock? @relation(fields: [upsellBlockId], references: [id])
}
```

### Analytics Functionality

#### 1. Data Collection (`/api/analytics` endpoint)
- **Tracks Click Events:** When customers click on upsell products
- **Tracks Conversions:** When customers successfully add upsells to cart
- **Data Points Collected:**
  - Shop domain
  - Product details (ID, name, variant, price)
  - Placement (checkout/cart)
  - Customer session information
  - Conversion status (clicked vs added to cart)

#### 2. Dashboard Analytics (`/app/analytics` page)
- **Summary Statistics:** Total clicks, conversions, conversion rate, total value
- **Date Range Filtering:** Today, Yesterday, Last 7/30/90 days, All time
- **Placement Filtering:** Checkout, Cart, or All placements
- **Interactive Charts & Graphs:**
  - Daily Performance Chart (Area chart showing clicks and conversions over last 7 days)
  - Revenue Trend Chart (Line chart displaying revenue trends)
  - Placement Breakdown (Pie chart showing distribution between checkout and cart)
- **Top Products Report:** Most clicked products with performance metrics
- **Recent Activity:** Detailed log of all customer interactions

#### 3. Double Counting Fix
**Problem:** Analytics were being tracked twice - once on click and once on successful add to cart
**Solution:** Modified checkout extension to track analytics only once per interaction:

```javascript
// Fixed tracking logic
onPress: async () => {
  const analyticsId = await trackAnalytics(product, false); // Track click
  await addToCart(product, addButton, analyticsId); // Update if conversion happens
}
```

#### 4. Date Range Enhancements
Added "Today" and "Yesterday" options with proper timezone handling:
```javascript
if (value === "today") {
  startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
}
```

### Database Operations
**No External Database Services Used** - The app uses SQLite files stored locally on each Fly.io server:
- Simple and reliable for single-instance deployments
- No additional database hosting costs
- Automatic backups through Fly.io volume snapshots
- Database file is mounted to persistent volume at `/data`

### Deployment Architecture
**Two-Stage Deployment Process:**
1. **Shopify App Deploy:** Updates app configuration and extension code
   ```bash
   npm run deploy  # Updates Shopify Partner Dashboard
   ```

2. **DigitalOcean Server Deploy:** Automatic deployment on git push
   - Commit and push changes to trigger deployment
   - Monitor deployment in DigitalOcean dashboard

**Why Both Are Needed:**
- Shopify deployment updates the checkout extension JavaScript code
- DigitalOcean deployment updates the server-side analytics API that receives the data
- Both must be updated to ensure extension and server are compatible

### Technical Implementation Details

#### Key Files for Analytics:
- `app/routes/api.analytics.jsx` - Analytics API endpoint with CORS support
- `app/routes/app.analytics.jsx` - Analytics dashboard interface with charts
- `extensions/checkout-upsells/src/Checkout.js` - Extension tracking logic
- `prisma/schema.prisma` - Database schema with UpsellAnalytics model

#### Chart Dependencies:
- **Recharts**: Professional charting library for React applications
- **Chart Types**: Area charts, Line charts, Pie charts with responsive design
- **Interactive Features**: Hover tooltips, legends, and responsive sizing

#### Environment Configuration:
- **Production:** `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app`
- **Database Migration:** Handled automatically via Prisma on deployment
- **Environment Variables:** Configured in DigitalOcean App Platform settings

#### Performance Optimizations:
- Limited analytics queries to 500 records for dashboard performance
- Indexed database queries by shop and createdAt
- Efficient data aggregation using Prisma groupBy and aggregate functions

## Support

For issues related to:
- **Shopify Integration**: Check Shopify Partner Dashboard
- **DigitalOcean Deployment**: Check runtime logs in DigitalOcean dashboard
- **Database**: Use Prisma Studio for data inspection (`npx prisma studio`)
- **Extensions**: Enable browser dev tools during checkout testing
- **Analytics**: Check `/api/analytics` endpoint directly for data validation
- **CORS Issues**: Verify headers in browser dev tools Network tab
- **Deployment Guide**: See `DEPLOYMENT.md` for detailed instructions

## Prerequisites

Before you begin, you'll need the following:

1. **Node.js**: [Download and install](https://nodejs.org/en/download/) it if you haven't already.
2. **Shopify Partner Account**: [Create an account](https://partners.shopify.com/signup) if you don't have one.
3. **Test Store**: Set up either a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) or a [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store) for testing your app.

## Local Development

```bash
npm install
npm run dev
```

Press P to open the URL to your app. Once you click install, you can start development.

Local development is powered by [the Shopify CLI](https://shopify.dev/docs/apps/tools/cli). It logs into your partners account, connects to an app, provides environment variables, updates remote config, creates a tunnel and provides commands to generate extensions.

### Authenticating and querying data

To authenticate and query data you can use the `shopify` const that is exported from `/app/shopify.server.js`:

```js
export async function loader({ request }) {
  const { admin } = await shopify.authenticate.admin(request);

  const response = await admin.graphql(`
    {
      products(first: 25) {
        nodes {
          title
          description
        }
      }
    }`);

  const {
    data: {
      products: { nodes },
    },
  } = await response.json();

  return nodes;
}
```

This template comes preconfigured with examples of:

1. Setting up your Shopify app in [/app/shopify.server.ts](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/shopify.server.ts)
2. Querying data using Graphql. Please see: [/app/routes/app.\_index.tsx](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/routes/app._index.tsx).
3. Responding to webhooks in individual files such as [/app/routes/webhooks.app.uninstalled.tsx](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/routes/webhooks.app.uninstalled.tsx) and [/app/routes/webhooks.app.scopes_update.tsx](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/routes/webhooks.app.scopes_update.tsx)

Please read the [documentation for @shopify/shopify-app-remix](https://www.npmjs.com/package/@shopify/shopify-app-remix#authenticating-admin-requests) to understand what other API's are available.

## Deployment

### Application Storage

This template uses [Prisma](https://www.prisma.io/) to store session data, by default using an [SQLite](https://www.sqlite.org/index.html) database.
The database is defined as a Prisma schema in `prisma/schema.prisma`.

This use of SQLite works in production if your app runs as a single instance.
The database that works best for you depends on the data your app needs and how it is queried.
You can run your database of choice on a server yourself or host it with a SaaS company.
Here's a short list of databases providers that provide a free tier to get started:

| Database   | Type             | Hosters                                                                                                                                                                                                                               |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MySQL      | SQL              | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mysql), [Planet Scale](https://planetscale.com/), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/mysql) |
| PostgreSQL | SQL              | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-postgresql), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/postgres)                                   |
| Redis      | Key-value        | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-redis), [Amazon MemoryDB](https://aws.amazon.com/memorydb/)                                                                                                        |
| MongoDB    | NoSQL / Document | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mongodb), [MongoDB Atlas](https://www.mongodb.com/atlas/database)                                                                                                  |

To use one of these, you can use a different [datasource provider](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datasource) in your `schema.prisma` file, or a different [SessionStorage adapter package](https://github.com/Shopify/shopify-api-js/blob/main/packages/shopify-api/docs/guides/session-storage.md).

### Build

Remix handles building the app for you, by running the command below with the package manager of your choice:

Using yarn:

```shell
yarn build
```

Using npm:

```shell
npm run build
```

Using pnpm:

```shell
pnpm run build
```

## Hosting

When you're ready to set up your app in production, see the `DEPLOYMENT.md` guide for deploying to DigitalOcean App Platform.

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.

### Hosting on Vercel

Using the Vercel Preset is recommended when hosting your Shopify Remix app on Vercel. You'll also want to ensure imports that would normally come from `@remix-run/node` are imported from `@vercel/remix` instead. Learn more about hosting Remix apps on Vercel [here](https://vercel.com/docs/frameworks/remix).

```diff
// vite.config.ts
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
+ import { vercelPreset } from '@vercel/remix/vite';

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
+     presets: [vercelPreset()],
    }),
    tsconfigPaths(),
  ],
});
```

## Troubleshooting

### Database tables don't exist

If you get this error:

```
The table `main.Session` does not exist in the current database.
```

You need to create the database for Prisma. Run the `setup` script in `package.json` using your preferred package manager.

### Navigating/redirecting breaks an embedded app

Embedded Shopify apps must maintain the user session, which can be tricky inside an iFrame. To avoid issues:

1. Use `Link` from `@remix-run/react` or `@shopify/polaris`. Do not use `<a>`.
2. Use the `redirect` helper returned from `authenticate.admin`. Do not use `redirect` from `@remix-run/node`
3. Use `useSubmit` or `<Form/>` from `@remix-run/react`. Do not use a lowercase `<form/>`.

This only applies if your app is embedded, which it will be by default.

### Non Embedded

Shopify apps are best when they are embedded in the Shopify Admin, which is how this template is configured. If you have a reason to not embed your app please make the following changes:

1. Ensure `embedded = false` is set in [shopify.app.toml`](./shopify.app.toml). [Docs here](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration#global).
2. Pass `isEmbeddedApp: false` to `shopifyApp()` in `./app/shopify.server.js|ts`.
3. Change the `isEmbeddedApp` prop to `isEmbeddedApp={false}` for the `AppProvider` in `/app/routes/app.jsx|tsx`.
4. Remove the `@shopify/app-bridge-react` dependency from [package.json](./package.json) and `vite.config.ts|js`.
5. Remove anything imported from `@shopify/app-bridge-react`.  For example: `NavMenu`, `TitleBar` and `useAppBridge`.

### OAuth goes into a loop when I change my app's scopes

If you change your app's scopes and authentication goes into a loop and fails with a message from Shopify that it tried too many times, you might have forgotten to update your scopes with Shopify.
To do that, you can run the `deploy` CLI command.

Using yarn:

```shell
yarn deploy
```

Using npm:

```shell
npm run deploy
```

Using pnpm:

```shell
pnpm run deploy
```

### My shop-specific webhook subscriptions aren't updated

If you are registering webhooks in the `afterAuth` hook, using `shopify.registerWebhooks`, you may find that your subscriptions aren't being updated.  

Instead of using the `afterAuth` hook, the recommended approach is to declare app-specific webhooks in the `shopify.app.toml` file.  This approach is easier since Shopify will automatically update changes to webhook subscriptions every time you run `deploy` (e.g: `npm run deploy`).  Please read these guides to understand more:

1. [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions)
2. [Create a subscription tutorial](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?framework=remix&deliveryMethod=https)

If you do need shop-specific webhooks, please keep in mind that the package calls `afterAuth` in 2 scenarios:

- After installing the app
- When an access token expires

During normal development, the app won't need to re-authenticate most of the time, so shop-specific subscriptions aren't updated. To force your app to update the subscriptions, you can uninstall and reinstall it in your development store. That will force the OAuth process and call the `afterAuth` hook.

### Admin created webhook failing HMAC validation

Webhooks subscriptions created in the [Shopify admin](https://help.shopify.com/en/manual/orders/notifications/webhooks) will fail HMAC validation. This is because the webhook payload is not signed with your app's secret key.  There are 2 solutions:

1. Use [app-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions) defined in your toml file instead (recommended)
2. Create [webhook subscriptions](https://shopify.dev/docs/api/shopify-app-remix/v1/guide-webhooks) using the `shopifyApp` object.

Test your webhooks with the [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger) or by triggering events manually in the Shopify admin(e.g. Updating the product title to trigger a `PRODUCTS_UPDATE`).

### Incorrect GraphQL Hints

By default the [graphql.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension for VS Code will assume that GraphQL queries or mutations are for the [Shopify Admin API](https://shopify.dev/docs/api/admin). This is a sensible default, but it may not be true if:

1. You use another Shopify API such as the storefront API.
2. You use a third party GraphQL API.

in this situation, please update the [.graphqlrc.ts](https://github.com/Shopify/shopify-app-template-remix/blob/main/.graphqlrc.ts) config.

### First parameter has member 'readable' that is not a ReadableStream.

See [hosting on Vercel](#hosting-on-vercel).

### Admin object undefined on webhook events triggered by the CLI

When you trigger a webhook event using the Shopify CLI, the `admin` object will be `undefined`. This is because the CLI triggers an event with a valid, but non-existent, shop. The `admin` object is only available when the webhook is triggered by a shop that has installed the app.

Webhooks triggered by the CLI are intended for initial experimentation testing of your webhook configuration. For more information on how to test your webhooks, see the [Shopify CLI documentation](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger).

### Using Defer & await for streaming responses

To test [streaming using defer/await](https://remix.run/docs/en/main/guides/streaming) during local development you'll need to use the Shopify CLI slightly differently:

1. First setup ngrok: https://ngrok.com/product/secure-tunnels
2. Create an ngrok tunnel on port 8080: `ngrok http 8080`.
3. Copy the forwarding address. This should be something like: `https://f355-2607-fea8-bb5c-8700-7972-d2b5-3f2b-94ab.ngrok-free.app`
4. In a separate terminal run `yarn shopify app dev --tunnel-url=TUNNEL_URL:8080` replacing `TUNNEL_URL` for the address you copied in step 3.

By default the CLI uses a cloudflare tunnel. Unfortunately it cloudflare tunnels wait for the Response stream to finish, then sends one chunk.

This will not affect production, since tunnels are only for local development.

### Using MongoDB and Prisma

By default this template uses SQLlite as the database. It is recommended to move to a persisted database for production. If you choose to use MongoDB, you will need to make some modifications to the schema and prisma configuration. For more information please see the [Prisma MongoDB documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb).

Alternatively you can use a MongDB database directly with the [MongoDB session storage adapter](https://github.com/Shopify/shopify-app-js/tree/main/packages/apps/session-storage/shopify-app-session-storage-mongodb).

#### Mapping the id field

In MongoDB, an ID must be a single field that defines an @id attribute and a @map("\_id") attribute.
The prisma adapter expects the ID field to be the ID of the session, and not the \_id field of the document.

To make this work you can add a new field to the schema that maps the \_id field to the id field. For more information see the [Prisma documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#defining-an-id-field)

```prisma
model Session {
  session_id  String    @id @default(auto()) @map("_id") @db.ObjectId
  id          String    @unique
...
}
```

#### Error: The "mongodb" provider is not supported with this command

MongoDB does not support the [prisma migrate](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview) command. Instead, you can use the [prisma db push](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#db-push) command and update the `shopify.web.toml` file with the following commands. If you are using MongoDB please see the [Prisma documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb) for more information.

```toml
[commands]
predev = "npx prisma generate && npx prisma db push"
dev = "npm exec remix vite:dev"
```

#### Prisma needs to perform transactions, which requires your mongodb server to be run as a replica set

See the [Prisma documentation](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/mongodb/connect-your-database-node-mongodb) for connecting to a MongoDB database.

### I want to use Polaris v13.0.0 or higher

Currently, this template is set up to work on node v18.20 or higher. However, `@shopify/polaris` is limited to v12 because v13 can only run on node v20+.

You don't have to make any changes to the code in order to be able to upgrade Polaris to v13, but you'll need to do the following:

- Upgrade your node version to v20.10 or higher.
- Update your `Dockerfile` to pull `FROM node:20-alpine` instead of `node:18-alpine`

### "nbf" claim timestamp check failed

This error will occur of the `nbf` claim timestamp check failed. This is because the JWT token is expired.
If you  are consistently getting this error, it could be that the clock on your machine is not in sync with the server.

To fix this ensure you have enabled `Set time and date automatically` in the `Date and Time` settings on your computer.

## Benefits

Shopify apps are built on a variety of Shopify tools to create a great merchant experience.

<!-- TODO: Uncomment this after we've updated the docs -->
<!-- The [create an app](https://shopify.dev/docs/apps/getting-started/create) tutorial in our developer documentation will guide you through creating a Shopify app using this template. -->

The Remix app template comes with the following out-of-the-box functionality:

- [OAuth](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#authenticating-admin-requests): Installing the app and granting permissions
- [GraphQL Admin API](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#using-the-shopify-admin-graphql-api): Querying or mutating Shopify admin data
- [Webhooks](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#authenticating-webhook-requests): Callbacks sent by Shopify when certain events occur
- [AppBridge](https://shopify.dev/docs/api/app-bridge): This template uses the next generation of the Shopify App Bridge library which works in unison with previous versions.
- [Polaris](https://polaris.shopify.com/): Design system that enables apps to create Shopify-like experiences

## Tech Stack

This template uses [Remix](https://remix.run). The following Shopify tools are also included to ease app development:

- [Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix) provides authentication and methods for interacting with Shopify APIs.
- [Shopify App Bridge](https://shopify.dev/docs/apps/tools/app-bridge) allows your app to seamlessly integrate your app within Shopify's Admin.
- [Polaris React](https://polaris.shopify.com/) is a powerful design system and component library that helps developers build high quality, consistent experiences for Shopify merchants.
- [Webhooks](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#authenticating-webhook-requests): Callbacks sent by Shopify when certain events occur
- [Polaris](https://polaris.shopify.com/): Design system that enables apps to create Shopify-like experiences

## Resources

- [Remix Docs](https://remix.run/docs/en/v1)
- [Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix)
- [Introduction to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [App authentication](https://shopify.dev/docs/apps/auth)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [App extensions](https://shopify.dev/docs/apps/app-extensions/list)
- [Shopify Functions](https://shopify.dev/docs/api/functions)
- [Getting started with internationalizing your app](https://shopify.dev/docs/apps/best-practices/internationalization/getting-started)
