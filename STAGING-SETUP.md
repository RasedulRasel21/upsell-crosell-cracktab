# Staging Environment Setup Guide

## Prerequisites

1. **New Fly.io Account** (your staging account)
2. **New GitHub Repository** for staging
3. **Staging Shopify App** created in Partners dashboard

## Step 1: Create Staging GitHub Repository

1. Create a new repository on GitHub (e.g., `upsell-cross-sell-staging`)
2. Push this codebase to the new repository:

```bash
# Add remote for staging repo
git remote add staging https://github.com/YOUR_USERNAME/upsell-cross-sell-staging.git

# Push to staging repo
git push staging main
```

## Step 2: Update Staging Configuration

### Update these files with your staging credentials:

**1. `.env.staging`**
- Replace `SHOPIFY_API_KEY` with your staging app's client ID
- Replace `SHOPIFY_API_SECRET` with your staging app's client secret

**2. `shopify.app.staging.toml`**
- Replace `client_id` with your staging app's client ID
- Update `application_url` to your desired staging URL
- Update all redirect URLs

**3. `fly.staging.toml`**
- Update `app` name to your desired Fly.io app name

## Step 3: Set Up Fly.io Staging

### Login to your staging Fly.io account:
```bash
flyctl auth login
```

### Create staging app:
```bash
flyctl apps create upsell-cross-sell-staging --config fly.staging.toml
```

### Set staging environment secrets:
```bash
flyctl secrets set \
  SHOPIFY_API_KEY=your_staging_client_id \
  SHOPIFY_API_SECRET=your_staging_client_secret \
  SHOPIFY_APP_URL=https://upsell-cross-sell-staging.fly.dev \
  SCOPES=read_orders,read_products,unauthenticated_write_checkouts \
  --config fly.staging.toml
```

### Deploy to staging:
```bash
npm run deploy:staging
```

## Step 4: GitHub Actions Setup

### Add these secrets to your staging repository:

1. Go to your staging repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `FLY_API_TOKEN_STAGING`: Your staging Fly.io API token

### The workflow will automatically deploy when you push to main/staging branches.

## Step 5: Link Shopify App to Staging

```bash
npm run config:link:staging
```

## Commands Reference

### Development Commands:
- `npm run dev:staging` - Run staging app locally
- `npm run config:link:staging` - Link to staging Shopify app
- `npm run deploy:staging` - Deploy to staging Fly.io

### Database Commands:
- `npm run setup:staging` - Setup staging database

## Environment Structure

```
Production:  your-production-repo → Fly.io (production account)
Staging:     your-staging-repo    → Fly.io (staging account)
Local:       same repo            → localhost
```

## Benefits

✅ **Complete separation** - No risk to production
✅ **Automated deployments** - GitHub Actions CI/CD
✅ **Real environment testing** - Actual Fly.io deployment
✅ **Easy setup** - All configs pre-made
✅ **Independent scaling** - Separate Fly.io accounts

## Next Steps

1. Create the staging GitHub repo
2. Update all configuration files with your staging credentials
3. Deploy to staging Fly.io
4. Test the staging environment
5. Set up GitHub Actions for automated deployments