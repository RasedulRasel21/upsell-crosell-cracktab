# How to Manually Update Production App URLs

## The Problem

The Shopify CLI keeps deploying to the **staging app** instead of the **production app**, so the production app still shows old Fly.io URLs:

```
App URL: https://upsell-cross-sell-cracktab.fly.dev
Redirect URLs:
- https://upsell-cross-sell-cracktab.fly.dev/auth/callback
- https://upsell-cross-sell-cracktab.fly.dev/auth/shopify/callback
- https://upsell-cross-sell-cracktab.fly.dev/api/auth/callback
```

## Solution: Update URLs Manually in Shopify Partners Dashboard

Since the CLI won't cooperate, you need to update the URLs manually:

### Step 1: Go to Shopify Partners Dashboard

1. Navigate to: https://partners.shopify.com
2. Click on **Apps**
3. Select **Upsell Cross Sell Booster** (the production app, NOT "Upsell Cross Sell Booster - St")

### Step 2: Update App URL

1. In the left sidebar, click **Configuration**
2. Find the **App URL** section
3. Change from:
   ```
   https://upsell-cross-sell-cracktab.fly.dev
   ```
   To:
   ```
   https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app
   ```
4. Click **Save**

### Step 3: Update Redirect URLs

1. Still in the **Configuration** page
2. Find the **App setup** → **URLs** → **Allowed redirection URL(s)** section
3. Remove all the old Fly.io URLs:
   - ❌ `https://upsell-cross-sell-cracktab.fly.dev/auth/callback`
   - ❌ `https://upsell-cross-sell-cracktab.fly.dev/auth/shopify/callback`
   - ❌ `https://upsell-cross-sell-cracktab.fly.dev/api/auth/callback`

4. Add the new DigitalOcean URLs:
   - ✅ `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/auth/callback`
   - ✅ `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/auth/shopify/callback`
   - ✅ `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/auth/callback`

5. Click **Save**

## Correct Configuration

After updating, your production app configuration should look like this:

### App Details
- **App Name:** Upsell Cross Sell Booster
- **Client ID:** 304952a9812404378c88092ac78264ff

### URLs
- **App URL:** `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app`

### Redirect URLs
```
https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/auth/callback
https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/auth/shopify/callback
https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/auth/callback
```

### Scopes
```
read_products,unauthenticated_write_checkouts
```

### POS
- **Embed app in Shopify POS:** false

## Verification

After updating:

1. ✅ **Check the Configuration page** - All URLs should show DigitalOcean
2. ✅ **Test app installation** - Install on a development store
3. ✅ **Verify OAuth works** - The app should authenticate properly
4. ✅ **Test checkout extension** - Upsells should appear in checkout

## Why This Is Necessary

The Shopify CLI has a persistent issue where it's configured to use the staging app due to:
- `.env.staging` file presence
- Cached configuration in `.shopify/` directory
- Project-level app association

Even after:
- Deleting `.shopify/` directory
- Using `shopify app config use`
- Setting environment variables
- Removing staging config files

The CLI still deploys to the staging app. The manual update in Partners Dashboard is the most reliable solution to ensure your production app has the correct URLs.

## Important Notes

- ⚠️ After manually updating URLs, **DO NOT** run `shopify app deploy` without first ensuring it's targeting the production app
- ⚠️ The checkout extension is already deployed with correct DigitalOcean URLs in the code
- ✅ Both staging and production apps have the updated checkout extension code
- ✅ Only the production app's configuration URLs need manual updating
