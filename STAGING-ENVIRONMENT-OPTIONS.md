# Staging Environment Setup Options

You have the **production app** running on DigitalOcean. Now you need a staging environment for the **staging app** ("Upsell Cross Sell Booster - St").

## Option 1: Local Development with Cloudflare Tunnel (Recommended)

**Best for:** Quick testing, development, and staging without additional costs.

### How It Works
- Run the app locally on your machine
- Use Shopify CLI's built-in Cloudflare Tunnel to expose it to the internet
- The staging app connects to your local server via the tunnel

### Setup

1. **Start local development server:**
   ```bash
   npm run dev -- --reset
   ```

2. **Select staging app when prompted:**
   - Organization: BeLuxurious
   - App: **Upsell Cross Sell Booster - St** (staging)
   - Config: `shopify.app.staging.toml`

3. **Automatic tunnel creation:**
   - Shopify CLI automatically creates a Cloudflare tunnel
   - You'll get a URL like: `https://something-random.trycloudflare.com`
   - This URL changes each time you restart the server

4. **Environment file:**
   ```bash
   # .env.staging (already exists)
   DATABASE_URL=file:staging.sqlite
   NODE_ENV=development
   ```

### Pros
- ✅ Free - no hosting costs
- ✅ Instant setup
- ✅ Easy debugging with local logs
- ✅ Hot reload for development

### Cons
- ❌ Server stops when you close your laptop
- ❌ URL changes every restart
- ❌ Only accessible when your computer is running
- ❌ Not suitable for client testing

---

## Option 2: Separate DigitalOcean App (Best for Production-Like Staging)

**Best for:** Permanent staging environment, client testing, CI/CD testing.

### How It Works
Create a completely separate DigitalOcean app for staging (in a new project or account).

### Setup

1. **Create a new DigitalOcean App:**
   - Go to: https://cloud.digitalocean.com/apps
   - Click **Create App**
   - Connect your GitHub repository
   - Use the same branch OR create a `staging` branch

2. **Configure the new app:**
   - **App Name:** `upsell-crosell-cracktab-staging`
   - **Build Command:** `npm run build`
   - **Run Command:** `npm run start`

3. **Add Environment Variables:**
   ```bash
   DATABASE_URL=file:/data/staging.sqlite
   SHOPIFY_API_KEY=6b9e2a7c98e68418ac8f3effc79113b2
   SHOPIFY_API_SECRET=[your staging app secret]
   SHOPIFY_APP_URL=https://[your-staging-app-url].ondigitalocean.app
   SCOPES=read_products,unauthenticated_write_checkouts
   SHOPIFY_UPSELL_BLOCK_ID=52229d14-8a57-481c-b8da-3d8df7ec0d71
   SHOPIFY_CHECKOUT_UPSELLS_ID=fb871067-9c1a-44b1-81fe-5d8fe1b96825
   NODE_ENV=production
   ```

4. **Add Persistent Volume:**
   - Name: `staging-data`
   - Mount Path: `/data`
   - Size: 1GB

5. **Update `shopify.app.staging.toml`:**
   ```toml
   application_url = "https://[your-staging-app-url].ondigitalocean.app"

   [auth]
   redirect_urls = [
     "https://[your-staging-app-url].ondigitalocean.app/auth/callback",
     "https://[your-staging-app-url].ondigitalocean.app/auth/shopify/callback",
     "https://[your-staging-app-url].ondigitalocean.app/api/auth/callback"
   ]
   ```

6. **Deploy to Shopify:**
   ```bash
   shopify app deploy --config shopify.app.staging.toml
   ```

### Pros
- ✅ Always running - 24/7 availability
- ✅ Production-like environment
- ✅ Permanent URL
- ✅ Great for team/client testing

### Cons
- ❌ Costs $5-12/month for another DigitalOcean app
- ❌ Requires separate database management
- ❌ More complex deployment

### Cost Estimate
- **DigitalOcean App:** $5/month (Basic tier)
- **Total:** ~$5-12/month

---

## Option 3: Use Railway, Render, or Fly.io for Staging

**Best for:** Cost-effective staging with generous free tiers.

### Railway (Recommended for Staging)

1. **Sign up:** https://railway.app (Free tier: $5 credit/month)

2. **Deploy from GitHub:**
   - Create new project
   - Connect GitHub repo
   - Railway auto-detects Remix app

3. **Environment Variables:**
   ```bash
   DATABASE_URL=file:/data/staging.sqlite
   SHOPIFY_API_KEY=6b9e2a7c98e68418ac8f3effc79113b2
   SHOPIFY_API_SECRET=[staging secret]
   SHOPIFY_APP_URL=https://[your-app].railway.app
   SCOPES=read_products,unauthenticated_write_checkouts
   NODE_ENV=production
   ```

4. **Add Volume for SQLite:**
   - Add a volume service
   - Mount at `/data`

### Render.com

1. **Sign up:** https://render.com (Free tier available)

2. **New Web Service:**
   - Connect GitHub
   - Build Command: `npm run build`
   - Start Command: `npm run start`

3. **Add Disk for SQLite:**
   - Add disk in dashboard
   - Mount path: `/data`

### Pros
- ✅ Free tier or very cheap ($5/month)
- ✅ Permanent URL
- ✅ Easy GitHub integration
- ✅ Auto-deploy on git push

### Cons
- ❌ Free tiers may have cold starts
- ❌ Learning curve for new platform

---

## Option 4: Ngrok for Local Development (Alternative to Cloudflare)

**Best for:** Development when you need a more stable tunnel than Cloudflare.

### Setup

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Sign up:** https://ngrok.com (Free tier available)

3. **Start your local server:**
   ```bash
   npm run dev
   ```

4. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

5. **Update staging app URLs:**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Update in Shopify Partners Dashboard

### Pros
- ✅ Free tier available
- ✅ More stable than Cloudflare tunnels
- ✅ Can configure custom domains (paid)
- ✅ Request inspection dashboard

### Cons
- ❌ Still requires your computer to be running
- ❌ URL changes on restart (unless paid plan)

---

## Recommended Approach

Based on your needs:

### For Active Development (Right Now)
→ **Option 1: Local with Shopify CLI Cloudflare Tunnel**
- Fastest to set up
- Free
- Perfect for testing changes

### For Team/Client Testing
→ **Option 3: Railway or Render (Free Tier)**
- Always available
- Free or very cheap
- Production-like environment

### For Production-Grade Staging
→ **Option 2: Separate DigitalOcean App**
- Same platform as production
- Most reliable
- Worth the $5/month if you deploy frequently

---

## Quick Start: Local Staging (Option 1)

Since you already have `shopify.app.staging.toml` configured, start immediately:

```bash
# 1. Start development server
npm run dev -- --reset

# 2. When prompted, select:
#    - Org: BeLuxurious
#    - App: Upsell Cross Sell Booster - St
#    - Config: shopify.app.staging.toml

# 3. Install on a development store
#    The CLI will show you the installation URL
```

The Cloudflare tunnel URL will be automatically created and configured!

---

## Database Considerations

Each staging option uses SQLite. Here's how databases work:

### Local Development
```bash
DATABASE_URL=file:staging.sqlite  # Creates staging.sqlite in project root
```

### Cloud Hosting (DigitalOcean, Railway, Render)
```bash
DATABASE_URL=file:/data/staging.sqlite  # Uses persistent volume
```

### Migrations
Run migrations for staging:
```bash
# Local
DATABASE_URL=file:staging.sqlite npx prisma migrate deploy

# Or for dev migrations
DATABASE_URL=file:staging.sqlite npx prisma migrate dev
```

---

## What I Recommend for You

Since you want to test staging without costs:

1. **Start with Option 1** (Local + Cloudflare Tunnel)
   - Use this for daily development
   - Test features before deploying to production

2. **If you need 24/7 staging**, upgrade to **Option 3** (Railway)
   - Deploy staging to Railway (free tier)
   - Keep production on DigitalOcean
   - Best of both worlds!

Would you like me to help you set up any of these options?
