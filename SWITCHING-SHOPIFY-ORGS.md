# How to Switch Partner Organizations in Shopify CLI

## Reset App Configuration

To switch between different Shopify partner organizations or apps, use the `--reset` flag:

```bash
npm run dev -- --reset
```

This will:
- Clear cached app configuration in `.shopify/`
- Prompt you to select a new organization
- Prompt you to select a new app
- Allow you to choose which config file to use (`shopify.app.toml` or `shopify.app.staging.toml`)

## Deploy to Different App

To deploy to a different app:

```bash
shopify app deploy --reset
```

## Manually Reset Configuration

If the above doesn't work, you can manually delete the cache:

```bash
# Remove the CLI cache
rm -rf .shopify

# Then run dev or deploy
npm run dev
# or
shopify app deploy
```

## Available Apps

### Production App
- **Name:** Upsell Cross Sell Booster
- **Client ID:** 304952a9812404378c88092ac78264ff
- **Config File:** `shopify.app.toml`

### Staging App
- **Name:** Upsell Cross Sell Booster - St
- **Client ID:** 6b9e2a7c98e68418ac8f3effc79113b2
- **Config File:** `shopify.app.staging.toml`

## Organization

- **Name:** BeLuxurious
- **Partner Dashboard:** https://partners.shopify.com
