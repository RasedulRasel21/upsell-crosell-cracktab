#!/usr/bin/env node

/**
 * Migration Script: SQLite to PostgreSQL
 *
 * This script migrates all data from SQLite to PostgreSQL
 *
 * Usage:
 *   1. Make sure your local SQLite database has the production data
 *   2. Set POSTGRES_URL environment variable
 *   3. Run: node scripts/migrate-sqlite-to-postgres.js
 *
 * Example:
 *   POSTGRES_URL="postgresql://user:pass@host:port/db" node scripts/migrate-sqlite-to-postgres.js
 */

import { PrismaClient as SQLitePrismaClient } from '@prisma/client';
import pkg from 'pg';
const { Client } = pkg;

console.log('🔄 SQLite to PostgreSQL Migration Tool\n');

// Validate environment variables
const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  console.error('❌ Error: POSTGRES_URL environment variable not set');
  console.error('\nUsage:');
  console.error('  POSTGRES_URL="postgresql://user:pass@host:port/db" node scripts/migrate-sqlite-to-postgres.js\n');
  process.exit(1);
}

// SQLite database path
const sqliteUrl = process.env.DATABASE_URL || 'file:./dev.sqlite';
console.log(`📂 Source (SQLite): ${sqliteUrl}`);
console.log(`📦 Destination (PostgreSQL): ${postgresUrl.replace(/:[^:@]+@/, ':****@')}\n`);

async function migrate() {
  // Connect to SQLite
  console.log('🔌 Connecting to SQLite...');
  const sqlite = new SQLitePrismaClient({
    datasources: {
      db: {
        url: sqliteUrl,
      },
    },
  });

  // Connect to PostgreSQL
  console.log('🔌 Connecting to PostgreSQL...');
  const postgres = new Client({
    connectionString: postgresUrl,
  });
  await postgres.connect();

  try {
    // Check PostgreSQL connection
    const result = await postgres.query('SELECT NOW()');
    console.log(`✅ PostgreSQL connected at ${result.rows[0].now}\n`);

    // Migrate Sessions
    console.log('📋 Migrating Sessions...');
    const sessions = await sqlite.session.findMany();
    console.log(`   Found ${sessions.length} sessions`);

    if (sessions.length > 0) {
      for (const session of sessions) {
        await postgres.query(
          `INSERT INTO "Session" (id, shop, state, "isOnline", scope, expires, "accessToken", "userId", "firstName", "lastName", email, "accountOwner", locale, collaborator, "emailVerified")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) DO UPDATE SET
             shop = EXCLUDED.shop,
             state = EXCLUDED.state`,
          [
            session.id,
            session.shop,
            session.state,
            session.isOnline,
            session.scope,
            session.expires,
            session.accessToken,
            session.userId ? session.userId.toString() : null,
            session.firstName,
            session.lastName,
            session.email,
            session.accountOwner,
            session.locale,
            session.collaborator,
            session.emailVerified,
          ]
        );
      }
      console.log(`   ✅ Migrated ${sessions.length} sessions\n`);
    } else {
      console.log(`   ℹ️  No sessions to migrate\n`);
    }

    // Migrate UpsellBlocks
    console.log('📋 Migrating Upsell Blocks...');
    const upsellBlocks = await sqlite.upsellBlock.findMany();
    console.log(`   Found ${upsellBlocks.length} upsell blocks`);

    if (upsellBlocks.length > 0) {
      for (const block of upsellBlocks) {
        await postgres.query(
          `INSERT INTO "UpsellBlock" (
            id, shop, name, placement, "productHandles", "collectionHandle",
            title, "showCount", "autoSlide", "slideDuration", active,
            layout, columns, "backgroundColor", "textColor", "buttonColor",
            "buttonText", "borderRadius", padding, "centerPadding", properties,
            "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            active = EXCLUDED.active`,
          [
            block.id,
            block.shop,
            block.name,
            block.placement,
            block.productHandles,
            block.collectionHandle,
            block.title,
            block.showCount,
            block.autoSlide,
            block.slideDuration,
            block.active,
            block.layout,
            block.columns,
            block.backgroundColor,
            block.textColor,
            block.buttonColor,
            block.buttonText,
            block.borderRadius,
            block.padding,
            block.centerPadding,
            block.properties,
            block.createdAt,
            block.updatedAt,
          ]
        );
      }
      console.log(`   ✅ Migrated ${upsellBlocks.length} upsell blocks\n`);
    } else {
      console.log(`   ℹ️  No upsell blocks to migrate\n`);
    }

    // Migrate UpsellAnalytics
    console.log('📋 Migrating Upsell Analytics...');
    const analytics = await sqlite.upsellAnalytics.findMany();
    console.log(`   Found ${analytics.length} analytics records`);

    if (analytics.length > 0) {
      for (const record of analytics) {
        await postgres.query(
          `INSERT INTO "UpsellAnalytics" (
            id, shop, "upsellBlockId", "productId", "variantId",
            "productName", "variantTitle", price, placement,
            "customerHash", "sessionId", "addedToCart", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING`,
          [
            record.id,
            record.shop,
            record.upsellBlockId,
            record.productId,
            record.variantId,
            record.productName,
            record.variantTitle,
            record.price,
            record.placement,
            record.customerHash,
            record.sessionId,
            record.addedToCart,
            record.createdAt,
          ]
        );
      }
      console.log(`   ✅ Migrated ${analytics.length} analytics records\n`);
    } else {
      console.log(`   ℹ️  No analytics to migrate\n`);
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Update DATABASE_URL in DigitalOcean to your PostgreSQL connection string');
    console.log('2. Deploy your app');
    console.log('3. Verify data in production\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sqlite.$disconnect();
    await postgres.end();
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
