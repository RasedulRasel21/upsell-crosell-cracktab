# Local Staging Environment - Quick Start Guide

Your local staging environment is now configured! Here's how to use it.

## What Was Configured

✅ **shopify.app.staging.toml** - Updated for local development
- Application URL: `https://localhost:3000`
- Automatic URL updates enabled
- Redirect URLs: Auto-managed by Shopify CLI

✅ **.env.staging** - Local development environment
- Database: `staging.sqlite` (local file)
- Node environment: `development`
- Staging app credentials configured

## How to Start Staging App Locally

### Method 1: Using npm script (Recommended)

```bash
npm run dev -- --reset
```

When prompted:
1. **Select organization:** BeLuxurious
2. **Select app:** Upsell Cross Sell Booster - St
3. **Select config:** shopify.app.staging.toml

The CLI will:
- Start local server on port 3000
- Create Cloudflare Tunnel automatically
- Update staging app URLs in Shopify Partners
- Show you the installation URL

### Method 2: Direct Shopify command

```bash
shopify app dev --config shopify.app.staging.toml --reset
```

## What Happens Next

1. **Tunnel Created:**
   ```
   ✓ Cloudflare Tunnel created
   ✓ URL: https://random-name-1234.trycloudflare.com
   ```

2. **URLs Auto-Updated:**
   - Shopify Partners Dashboard automatically updated
   - App URL and redirect URLs point to the tunnel

3. **Server Started:**
   ```
   ✓ Remix running at http://localhost:3000
   ✓ GraphiQL: http://localhost:3000/graphiql
   ```

4. **Installation URL:**
   ```
   ✓ Install your app: https://admin.shopify.com/store/[store]/oauth/install?client_id=6b9e2a7c98e68418ac8f3effc79113b2
   ```

## Testing Your Staging App

### Step 1: Install on Development Store

Copy the installation URL from the terminal and paste it in your browser, or:

```
Go to: Shopify Partners → Apps → Upsell Cross Sell Booster - St → Test your app
```

### Step 2: Verify It's Working

1. **Dashboard loads:** Check if the app dashboard appears
2. **Create an upsell:** Test creating a new upsell block
3. **Check database:** `staging.sqlite` file created in project root

### Step 3: Test Checkout Extension

1. Add products to cart
2. Go to checkout
3. Upsells should appear (if configured)

## Database

### Location
Your staging database is stored locally:
```
/Users/mdrasedulislamrasel/Downloads/APP/Upsell & Cross Sell - Cracktab/staging.sqlite
```

### Run Migrations

If you need to update the database schema:

```bash
# Apply migrations
DATABASE_URL=file:staging.sqlite npx prisma migrate dev

# Or reset database
DATABASE_URL=file:staging.sqlite npx prisma migrate reset --force

# View data
DATABASE_URL=file:staging.sqlite npx prisma studio
```

## Important Notes

### ⚠️ Tunnel URL Changes Every Restart

The Cloudflare Tunnel URL is temporary and changes each time you restart the server:
- **First start:** `https://abc123.trycloudflare.com`
- **After restart:** `https://xyz789.trycloudflare.com`

The Shopify CLI automatically updates the URLs in Partners Dashboard, so this is normal!

### ⚠️ Server Must Keep Running

Your local server must stay running for the app to work:
- Don't close the terminal
- Don't close your laptop (or it will sleep)
- Ctrl+C stops the server

### ⚠️ Separate Database from Production

- **Production:** Uses DigitalOcean database (`prod.sqlite`)
- **Staging:** Uses local database (`staging.sqlite`)
- **Development:** Uses local database (`dev.sqlite`)

They are completely separate! Changes in staging won't affect production.

## Stopping the Server

Press `Ctrl+C` in the terminal to stop the development server.

The Cloudflare Tunnel will automatically close.

## Troubleshooting

### Issue: "App not found"

**Solution:** Make sure you selected the correct app:
```bash
npm run dev -- --reset
```
Select "Upsell Cross Sell Booster - St" (not the production app)

### Issue: "Port 3000 already in use"

**Solution:** Stop other apps using port 3000:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Then restart
npm run dev
```

### Issue: Tunnel not working

**Solution:**
1. Check your internet connection
2. Restart the dev server
3. Try `npm run dev -- --reset`

### Issue: Database errors

**Solution:** Reset the staging database:
```bash
DATABASE_URL=file:staging.sqlite npx prisma migrate reset --force
```

## Switching Between Apps

### To switch back to production app:
```bash
npm run dev -- --reset
# Select: Upsell Cross Sell Booster (production)
```

### To switch to staging app:
```bash
npm run dev -- --reset
# Select: Upsell Cross Sell Booster - St (staging)
```

## File Structure

```
.
├── .env                    # Production environment
├── .env.staging            # Staging environment (local)
├── shopify.app.toml        # Production config
├── shopify.app.staging.toml # Staging config
├── dev.sqlite              # Development database
├── staging.sqlite          # Staging database (created on first run)
└── prod.sqlite             # Not used locally (only on DigitalOcean)
```

## Next Steps

1. **Start the server:**
   ```bash
   npm run dev -- --reset
   ```

2. **Install on a dev store** using the URL from the terminal

3. **Test your features** before deploying to production

4. **When ready for production:**
   - Stop staging server
   - Deploy to production: `shopify app deploy`

---

## Quick Commands Reference

```bash
# Start staging server
npm run dev -- --reset

# View staging database
DATABASE_URL=file:staging.sqlite npx prisma studio

# Reset staging database
DATABASE_URL=file:staging.sqlite npx prisma migrate reset --force

# Deploy to production (when ready)
shopify app deploy --force

# Stop server
Ctrl+C
```

---

Ready to start? Run:

```bash
npm run dev -- --reset
```

And select the staging app when prompted! 🚀
