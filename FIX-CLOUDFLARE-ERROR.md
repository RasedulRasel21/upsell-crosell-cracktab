# Fix Cloudflare Tunnel Error 1033

## The Problem

You're seeing this error:
```
Error 1033: Cloudflare Tunnel error
techrepublic-arabia-div-reg.trycloudflare.com
```

This happens when the checkout extension is trying to reach an old Cloudflare Tunnel URL from a previous development session.

## Solution: Redeploy the Checkout Extension

The checkout extension code is already updated with the correct DigitalOcean URL, but you need to deploy it to Shopify:

### Step 1: Deploy to Production App

```bash
# Deploy to production app
shopify app deploy --force
```

When prompted, select:
- **Organization:** BeLuxurious
- **App:** Upsell Cross Sell Booster (NOT the staging one)

### Step 2: If It Deploys to Staging Instead

If the CLI keeps deploying to the staging app, temporarily rename the staging config:

```bash
# Rename staging config
mv shopify.app.staging.toml shopify.app.staging.toml.backup
mv .env.staging .env.staging.backup

# Deploy to production
shopify app deploy --force

# Restore staging config
mv shopify.app.staging.toml.backup shopify.app.staging.toml
mv .env.staging.backup .env.staging
```

### Step 3: Verify in Shopify Partners

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Navigate to **Apps** → **Upsell Cross Sell Booster**
3. Go to **Extensions** → **checkout-upsells**
4. Verify the latest version is deployed and active

## Why This Happened

The Cloudflare Tunnel URL (`techrepublic-arabia-div-reg.trycloudflare.com`) was created when you previously ran:

```bash
shopify app dev
```

This creates a temporary tunnel for development. The error occurs because:
1. That tunnel is no longer active
2. An old version of your extension was deployed with that URL
3. The extension is trying to reach the old development URL

## Current Configuration

Your checkout extension code is already updated with the correct URL:

```javascript
// Analytics URL (line 67-68)
const analyticsUrls = [
  `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/analytics`
];

// API URL (line 402-403)
const apiUrls = [
  `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/upsells?shop=${shopDomain}&placement=checkout`
];
```

## After Deployment

Once deployed, the extension will:
- ✅ Use the DigitalOcean production URL
- ✅ No longer try to reach Cloudflare Tunnel
- ✅ Work correctly in checkout

## For Development

If you want to test locally, use:

```bash
# Start development server
npm run dev -- --reset
```

This will create a NEW Cloudflare tunnel for development (different from the old one causing errors).

## Verification Steps

After deployment:

1. **Test on a Development Store:**
   - Install the app on a test store
   - Add a product to cart
   - Go to checkout
   - Verify upsells appear without errors

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Should see: `✅ Successfully connected to: https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/api/upsells...`

3. **No More Cloudflare Errors:**
   - No Error 1033
   - No Tunnel errors
   - Extension loads properly
