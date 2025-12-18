# Fix Database Data Loss on Deployments

## Problem
Your database is being reset on each deployment because there's no persistent volume configured in DigitalOcean.

## Solution Overview
1. Backup current production database
2. Add persistent volume in DigitalOcean
3. Verify environment variables
4. Deploy with new configuration
5. Restore the database backup

---

## PHASE 1: Backup Current Production Database

### Method 1: Using DigitalOcean Console (Recommended)

1. Go to https://cloud.digitalocean.com/apps
2. Click on your app: `upsell-crosell-cracktab`
3. Click the **Console** tab (top right)
4. When the console opens, paste this command:

```bash
# Find the current database
find /app -name "*.sqlite" -type f -ls
ls -lh /data/*.sqlite 2>/dev/null
echo "DATABASE_URL: $DATABASE_URL"
```

5. Take note of where the database file is located

### Method 2: Download via DigitalOcean API (if Console doesn't work)

Contact DigitalOcean support to enable SFTP or SSH access to download `/data/prod.sqlite` or the database file you found.

### Save Your Findings

Write down:
- Current database location: `_________________`
- Database file size: `_________________`
- Does `/data` directory exist? `_________________`

---

## PHASE 2: Add Persistent Volume

### Step 1: Access DigitalOcean Settings

1. Go to https://cloud.digitalocean.com/apps
2. Click on `upsell-crosell-cracktab`
3. Click **Settings** tab

### Step 2: Add Volume

1. Find your component/service in the list
2. Click on the component name
3. Scroll to **Volumes** section
4. Click **Add Volume**

### Step 3: Configure Volume

Enter these exact values:
- **Name**: `sqlite-data`
- **Mount Path**: `/data`
- **Size**: `1 GB` (you can increase later)

Click **Create**

---

## PHASE 3: Verify Environment Variables

In the same Settings page:

1. Scroll to **App-Level Environment Variables**
2. Click **Edit**
3. Verify or add these variables:

```bash
DATABASE_URL=file:/data/prod.sqlite
NODE_ENV=production
SHOPIFY_API_KEY=304952a9812404378c88092ac78264ff
SHOPIFY_API_SECRET=<your_secret_from_partners_dashboard>
SHOPIFY_APP_URL=https://upsell-crosell-cracktab-app-bthv4.ondigitalocean.app
SCOPES=read_products,unauthenticated_write_checkouts
SHOPIFY_UPSELL_BLOCK_ID=52229d14-8a57-481c-b8da-3d8df7ec0d71
SHOPIFY_CHECKOUT_UPSELLS_ID=fb871067-9c1a-44b1-81fe-5d8fe1b96825
```

**CRITICAL**: Make sure `DATABASE_URL=file:/data/prod.sqlite` (not `file:dev.sqlite`)

---

## PHASE 4: Deploy with GDPR Webhooks

### Important Note

Since we also added GDPR webhooks to fix the App Store compliance issue, this deployment will:
1. ✅ Set up persistent storage (so data won't be lost anymore)
2. ✅ Add GDPR webhooks (to prevent app removal)

### Deploy

1. Click **Save** at the bottom of the environment variables page
2. DigitalOcean will automatically start deploying
3. Wait for deployment to complete (5-10 minutes)
4. Watch the **Runtime Logs** tab for any errors

### Expected Log Output

You should see:
```
✅ Backup created (or skipped if no database yet)
✅ Generated Prisma Client
✅ Prisma migrations applied successfully
🚀 Server started on port 3000
```

---

## PHASE 5: Restore Your Database (If You Had Data)

### If you backed up data in Phase 1:

1. Go to **Console** tab in your DigitalOcean app
2. Check if the database was created:

```bash
ls -lh /data/
```

3. You'll need to upload your backup. Options:

**Option A: Use DigitalOcean SFTP** (if enabled)
**Option B: Contact me and we can create an upload endpoint**
**Option C: Recreate data manually** (if minimal)

---

## PHASE 6: Verify Data Persistence

After everything is set up:

1. Go to your app in a browser
2. Create a test upsell block
3. Note the details
4. Trigger a new deployment (make a small code change)
5. After deployment, check if the test upsell block still exists

If it exists, data persistence is working! ✅

---

## Future Deployments

Now that persistent storage is configured:

✅ **Database will persist** across deployments
✅ **GDPR webhooks** are configured
✅ **Automatic backups** run before each deployment
✅ **You can deploy safely** without losing data

---

## Troubleshooting

### Database still gets reset

**Check:**
1. Is the volume mounted at `/data`?
2. Is `DATABASE_URL=file:/data/prod.sqlite`?
3. Check logs for database errors

### App won't start after deployment

**Check:**
1. All environment variables are set
2. No typos in `DATABASE_URL`
3. Volume is properly mounted
4. Check Runtime Logs for specific errors

### Can't find current database

**If no database exists yet:**
- That's okay! Just set up the volume and environment variables
- On first deployment, a new database will be created
- All future data will persist

---

## Summary Checklist

- [ ] Found current database location (or confirmed none exists)
- [ ] Added persistent volume at `/data` with 1GB
- [ ] Set `DATABASE_URL=file:/data/prod.sqlite`
- [ ] Verified all environment variables
- [ ] Deployed successfully
- [ ] Checked Runtime Logs for errors
- [ ] Verified data persists after deployment
- [ ] GDPR webhooks are active

---

## Need Help?

If you encounter issues:
1. Check Runtime Logs in DigitalOcean
2. Verify all checklist items above
3. Share the specific error message
