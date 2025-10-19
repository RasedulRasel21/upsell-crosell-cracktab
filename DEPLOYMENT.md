# DigitalOcean Deployment Guide

## Quick Start Checklist

Before deploying, ensure you have:

- [ ] DigitalOcean account created
- [ ] GitHub/GitLab repository with latest code
- [ ] Shopify API Key from Partners Dashboard
- [ ] Shopify API Secret from Partners Dashboard
- [ ] Extension IDs from Shopify Partners Dashboard
- [ ] Planned app URL (from DigitalOcean after creation)

## Prerequisites

1. DigitalOcean account
2. Shopify Partner account with app credentials
3. Git repository pushed to GitHub/GitLab

## Required Environment Variables

⚠️ **CRITICAL**: All these variables MUST be set in DigitalOcean before deployment, or the app will crash with "empty appUrl configuration" error.

Configure these in your DigitalOcean App Platform settings (Settings → Environment Variables):

### Essential Variables (REQUIRED)

```bash
# Database - Use persistent volume path
DATABASE_URL=file:/data/prod.sqlite

# Shopify API Credentials (from Partners Dashboard → Apps → [Your App] → Configuration)
# ⚠️ REQUIRED - App will crash without these
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here

# App URL (use your DigitalOcean app URL)
# ⚠️ REQUIRED - Must match the URL where your app is deployed
# Format: https://your-app-name.ondigitalocean.app (NO trailing slash)
SHOPIFY_APP_URL=https://your-app-name.ondigitalocean.app

# Shopify Scopes (comma-separated, no spaces)
# ⚠️ REQUIRED
SCOPES=write_products,read_customer_events,read_orders

# Extension IDs (from Shopify Partners Dashboard → Extensions)
SHOPIFY_UPSELL_BLOCK_ID=your_upsell_block_extension_id
SHOPIFY_CHECKOUT_UPSELLS_ID=your_checkout_upsells_extension_id

# Environment
NODE_ENV=production
```

## Deployment Steps

### 1. Create DigitalOcean App

1. Log in to DigitalOcean
2. Navigate to "Apps" → "Create App"
3. Connect your GitHub/GitLab repository
4. Select the branch (usually `main`)

### 2. Configure Build Settings

DigitalOcean should auto-detect the Dockerfile. Verify:

- **Build Command**: Uses Dockerfile automatically
- **Run Command**: `npm run docker-start`
- **HTTP Port**: 3000

### 3. Add Persistent Volume for Database

**IMPORTANT**: SQLite requires persistent storage

1. In App Settings → Components → Add Volume
2. Configure:
   - **Name**: `sqlite-data`
   - **Mount Path**: `/data`
   - **Size**: 1GB (or more as needed)

### 4. Set Environment Variables

In App Settings → Environment Variables, add all required variables listed above.

### 5. Deploy

1. Click "Create Resources" or "Save & Deploy"
2. Wait for build to complete
3. Check deployment logs for errors

## Post-Deployment Steps

### 1. Update Shopify App URLs

In Shopify Partners Dashboard:

1. Go to your app → Configuration
2. Update:
   - **App URL**: `https://your-app-name.ondigitalocean.app`
   - **Allowed redirection URL(s)**:
     - `https://your-app-name.ondigitalocean.app/auth/callback`
     - `https://your-app-name.ondigitalocean.app/auth/shopify/callback`

### 2. Verify Database Migrations

Check deployment logs to ensure:
- `prisma generate` completed successfully
- `prisma migrate deploy` ran without errors

### 3. Test the App

1. Install app on a development store
2. Create test upsells
3. Verify checkout extensions load correctly
4. Check analytics tracking

## Troubleshooting

### Error: "Detected an empty appUrl configuration"

**Symptoms**:
```
Error: Detected an empty appUrl configuration, please make sure to set the necessary environment variables.
```

**Cause**: Missing `SHOPIFY_APP_URL` environment variable

**Solution**:
1. Go to DigitalOcean App → Settings → Environment Variables
2. Add `SHOPIFY_APP_URL` with your app's URL (e.g., `https://your-app-name.ondigitalocean.app`)
3. **Important**: Do NOT include trailing slash
4. Redeploy the app

### Container Exits with Non-Zero Code

**Symptoms**: Build succeeds but app crashes on startup

**Common Causes**:
1. Missing required environment variables (see list above)
2. Missing `DATABASE_URL` environment variable
3. Database path not writable (missing volume mount)
4. Missing Shopify credentials (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`)
5. Prisma migration failures

**Solutions**:
- **FIRST**: Verify ALL required environment variables are set:
  - `SHOPIFY_API_KEY`
  - `SHOPIFY_API_SECRET`
  - `SHOPIFY_APP_URL`
  - `SCOPES`
  - `DATABASE_URL`
- Check environment variables are set correctly (no extra spaces, quotes)
- Verify `/data` volume is mounted
- Review deployment logs for specific errors
- Ensure database migrations are included in repo

### Database Connection Errors

**Solution**: Ensure:
- `DATABASE_URL=file:/data/prod.sqlite`
- `/data` volume is mounted and writable
- Migrations ran successfully

### Shopify Authentication Errors

**Solution**: Verify:
- `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- `SHOPIFY_APP_URL` matches DigitalOcean app URL
- Redirect URLs in Partners Dashboard are correct

## Monitoring

### View Logs

```bash
# In DigitalOcean Console → Runtime Logs
# Look for:
# - "🏠 INDEX PAGE - Loader started"
# - "🔍 Production billing check"
# - Prisma migration messages
```

### Health Checks

DigitalOcean automatically monitors HTTP health. Your app should respond on port 3000.

## Scaling

### Horizontal Scaling

DigitalOcean App Platform supports auto-scaling. Configure in:
- App Settings → Resources → Container Count

### Database Scaling

For high traffic, consider migrating to PostgreSQL:

1. Create DigitalOcean managed PostgreSQL database
2. Update `DATABASE_URL` to PostgreSQL connection string
3. Update `schema.prisma`: `provider = "postgresql"`
4. Run migrations again

## Backup Strategy

### SQLite Database Backup

Since using persistent volume at `/data`:

1. Set up automated backups in DigitalOcean
2. Or use the included backup script:

```bash
# In your app console
npm run backup:prod
```

### Manual Backup

```bash
# SSH into container (if enabled)
cd /data
tar -czf backup-$(date +%Y%m%d).tar.gz prod.sqlite
```

## Migration from Fly.io

1. Export Fly.io database
2. Import to DigitalOcean volume
3. Update environment variables
4. Deploy to DigitalOcean
5. Update Shopify app URLs
6. Test thoroughly
7. Switch DNS/domains if needed
8. Shut down Fly.io app

## Support

For issues:
1. Check DigitalOcean Runtime Logs
2. Review Shopify Partners Dashboard for API errors
3. Verify all environment variables are set
4. Check GitHub repository issues
