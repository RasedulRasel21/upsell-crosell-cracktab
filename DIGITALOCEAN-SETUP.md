# DigitalOcean Environment Variables Setup Guide

## Current Error

You're seeing this error because `DATABASE_URL` is not set:

```
Error: Environment variable not found: DATABASE_URL.
```

## Step-by-Step Fix

### Step 1: Access DigitalOcean App Settings

1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Click on **Apps** in the left sidebar
3. Click on your app: `upsell-crosell-cracktab`
4. Click on **Settings** tab at the top

### Step 2: Navigate to Environment Variables

1. Scroll down to **App-Level Environment Variables** section
2. Click the **Edit** button

### Step 3: Add All Required Variables

Click **Add Variable** for each of these and enter the values:

#### Variable 1: DATABASE_URL
```
Key: DATABASE_URL
Value: file:/data/prod.sqlite
```
✅ This tells Prisma where to store the SQLite database

#### Variable 2: SHOPIFY_API_KEY
```
Key: SHOPIFY_API_KEY
Value: 304952a9812404378c88092ac78264ff
```
✅ Your Shopify App API Key (from your .env file)

#### Variable 3: SHOPIFY_API_SECRET
```
Key: SHOPIFY_API_SECRET
Value: [Get from Shopify Partners Dashboard]
```
⚠️ **Where to find this:**
1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Click **Apps**
3. Click your app name
4. Click **Configuration**
5. Under **Client credentials**, click **Show** to reveal the secret
6. Copy and paste it here

#### Variable 4: SHOPIFY_APP_URL
```
Key: SHOPIFY_APP_URL
Value: https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app
```
✅ Your DigitalOcean app URL (shown at top of app page)
⚠️ **Important:** No trailing slash!

#### Variable 5: SCOPES
```
Key: SCOPES
Value: read_products,unauthenticated_write_checkouts
```
✅ Shopify API scopes (comma-separated, no spaces)

#### Variable 6: SHOPIFY_UPSELL_BLOCK_ID
```
Key: SHOPIFY_UPSELL_BLOCK_ID
Value: 52229d14-8a57-481c-b8da-3d8df7ec0d71
```
✅ Your theme extension ID

#### Variable 7: SHOPIFY_CHECKOUT_UPSELLS_ID
```
Key: SHOPIFY_CHECKOUT_UPSELLS_ID
Value: fb871067-9c1a-44b1-81fe-5d8fe1b96825
```
✅ Your checkout extension ID

#### Variable 8: NODE_ENV
```
Key: NODE_ENV
Value: production
```
✅ Tells the app it's running in production mode

### Step 4: Add Persistent Volume for Database

**CRITICAL:** Without this, your database will be deleted on each deployment!

1. In your app settings, click on your **Component** (usually named after your app)
2. Scroll to **Volumes** section
3. Click **Add Volume**
4. Configure:
   - **Name**: `sqlite-data`
   - **Mount Path**: `/data` (exactly as shown)
   - **Size**: `1 GB` (can increase later if needed)
5. Click **Create**

### Step 5: Save and Deploy

1. Click **Save** at the bottom of the environment variables section
2. DigitalOcean will automatically trigger a new deployment
3. Wait for deployment to complete (watch the **Runtime Logs** tab)

### Step 6: Verify Success

After deployment completes, check the **Runtime Logs**. You should see:

✅ **Success indicators:**
```
✔ Generated Prisma Client
✔ Prisma migrations applied successfully
Server started on port 3000
```

❌ **If you still see errors:**
- Double-check all environment variables are spelled correctly
- Ensure no extra spaces in variable values
- Verify the volume is mounted at `/data`
- Check that `DATABASE_URL=file:/data/prod.sqlite` (not `file:dev.sqlite`)

## Checklist

Before clicking Save, verify:

- [ ] `DATABASE_URL` = `file:/data/prod.sqlite`
- [ ] `SHOPIFY_API_KEY` = `304952a9812404378c88092ac78264ff`
- [ ] `SHOPIFY_API_SECRET` = (your secret from Partners Dashboard)
- [ ] `SHOPIFY_APP_URL` = `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app`
- [ ] `SCOPES` = `read_products,unauthenticated_write_checkouts`
- [ ] `SHOPIFY_UPSELL_BLOCK_ID` = `52229d14-8a57-481c-b8da-3d8df7ec0d71`
- [ ] `SHOPIFY_CHECKOUT_UPSELLS_ID` = `fb871067-9c1a-44b1-81fe-5d8fe1b96825`
- [ ] `NODE_ENV` = `production`
- [ ] Volume mounted at `/data` with size 1GB

## Next Steps After Successful Deployment

1. **Update Shopify App URLs** in Partners Dashboard:
   - App URL: `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app`
   - Redirect URLs: `https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app/auth/callback`

2. **Test the app:**
   - Install on a test store
   - Create an upsell
   - Verify checkout extension loads
   - Check analytics tracking

## Common Issues

### Error: "empty appUrl configuration"
**Cause:** `SHOPIFY_APP_URL` not set or has trailing slash
**Fix:** Set `SHOPIFY_APP_URL` without trailing slash

### Error: "DATABASE_URL not found"
**Cause:** Missing `DATABASE_URL` environment variable
**Fix:** Add `DATABASE_URL=file:/data/prod.sqlite`

### Database resets on deployment
**Cause:** No persistent volume mounted
**Fix:** Add volume at `/data` mount path

### App crashes immediately after deployment
**Cause:** Missing required environment variables
**Fix:** Verify all 8 variables above are set correctly

## Need Help?

If deployment still fails:
1. Copy the full error from Runtime Logs
2. Check that all environment variables are exactly as shown above
3. Verify the volume is mounted at `/data`
4. Ensure there are no typos in variable names or values
