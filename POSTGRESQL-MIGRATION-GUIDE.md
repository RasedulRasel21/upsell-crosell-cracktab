# PostgreSQL Migration Guide

## Why PostgreSQL is Better

✅ **Automatic backups** by DigitalOcean
✅ **No data loss** on deployments
✅ **Better performance** for production
✅ **Easier scaling** as your app grows
✅ **No need for persistent volumes**

---

## Step-by-Step Migration

### Step 1: Get PostgreSQL Connection String

1. In your DigitalOcean app page (the screenshot you shared)
2. Look for **Connection Details** section
3. Copy the **Connection String** - it looks like:

```
postgresql://db_username:password@host-name.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

**Important:** The connection string contains sensitive credentials - keep it secure!

### Step 2: Update Environment Variables in DigitalOcean

1. Go to your app → **Settings** tab
2. Find **App-Level Environment Variables**
3. Click **Edit**
4. Find `DATABASE_URL` and update it to your PostgreSQL connection string:

```
DATABASE_URL=postgresql://db_username:password@host:port/database?sslmode=require
```

**Replace the SQLite URL** (`file:/data/prod.sqlite` or `file:dev.sqlite`) with your PostgreSQL connection string.

5. Click **Save**

### Step 3: Reset and Create New Migration

Since we're switching databases, we need to create a fresh migration for PostgreSQL.

**On your local machine, run:**

```bash
# Delete old SQLite migrations
rm -rf prisma/migrations

# Create fresh PostgreSQL migration
DATABASE_URL="postgresql://localhost:5432/temp_db?sslmode=disable" npx prisma migrate dev --name init_postgresql

# Or if you don't have PostgreSQL locally, skip the migration
# The production deployment will handle it
```

**Note:** If you don't have PostgreSQL locally, that's okay! Skip this step - the production deployment will create the tables automatically.

### Step 4: Commit Changes

```bash
git add .
git commit -m "Migrate to PostgreSQL database

- Update schema.prisma to use PostgreSQL
- Add GDPR compliance webhooks
- Fix data persistence issue"

git push
```

### Step 5: Deploy to DigitalOcean

DigitalOcean will automatically deploy when you push to your main branch.

**Watch the deployment logs** for:
```
✅ Generated Prisma Client
✅ Prisma migrations applied successfully
🚀 Server started on port 3000
```

---

## Migrating Existing Data (If You Have Active Stores)

If you have existing data in SQLite that you need to migrate:

### Option 1: Recreate Manually (Recommended if minimal data)

If you only have a few upsell blocks:
1. Let the new database deploy
2. Manually recreate the upsell configurations
3. This is often faster and cleaner

### Option 2: Export and Import (If you have lots of data)

I can create a migration script to:
1. Export data from SQLite
2. Import into PostgreSQL
3. Preserve all existing upsells and analytics

**Let me know if you need this option.**

---

## Step 6: Verify Everything Works

After deployment:

1. **Test the app:**
   - Install on a test store (or use existing store)
   - Create a new upsell block
   - Check that it appears in the checkout

2. **Verify GDPR webhooks:**
   - Go to Shopify Partners Dashboard
   - Check your app's webhook subscriptions
   - You should see:
     - `customers/data_request`
     - `customers/redact`
     - `shop/redact`

3. **Test data persistence:**
   - Note down an upsell block ID
   - Deploy again (make a small change)
   - Verify the upsell block still exists

---

## What Gets Fixed

This migration solves **both issues**:

✅ **Data Persistence:** PostgreSQL data is automatically backed up and never lost
✅ **GDPR Compliance:** Webhooks are configured and will be registered on deployment
✅ **Better Performance:** PostgreSQL is optimized for production workloads
✅ **Easier Scaling:** DigitalOcean handles database scaling automatically

---

## Rollback Plan (If Something Goes Wrong)

If you need to rollback:

1. In DigitalOcean, go to your app → **Settings**
2. Change `DATABASE_URL` back to SQLite: `file:/data/prod.sqlite`
3. The app will redeploy with SQLite
4. You can revert the code changes in git

But with PostgreSQL, you shouldn't need to rollback!

---

## Environment Variables Checklist

Before deploying, verify these are set in DigitalOcean:

```bash
✅ DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
✅ NODE_ENV=production
✅ SHOPIFY_API_KEY=304952a9812404378c88092ac78264ff
✅ SHOPIFY_API_SECRET=<from_partners_dashboard>
✅ SHOPIFY_APP_URL=https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app
✅ SCOPES=read_products,unauthenticated_write_checkouts
✅ SHOPIFY_UPSELL_BLOCK_ID=52229d14-8a57-481c-b8da-3d8df7ec0d71
✅ SHOPIFY_CHECKOUT_UPSELLS_ID=fb871067-9c1a-44b1-81fe-5d8fe1b96825
```

---

## Next Steps

1. Get PostgreSQL connection string from DigitalOcean
2. Update `DATABASE_URL` environment variable
3. Commit and push changes (triggers auto-deploy)
4. Verify deployment succeeds
5. Test your app
6. ✅ Done! Your data is now safe and GDPR compliant

---

## Need Help?

If you encounter any issues:
1. Check the DigitalOcean Runtime Logs
2. Verify the PostgreSQL connection string is correct
3. Make sure all environment variables are set
4. Share the specific error message
