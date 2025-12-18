#!/usr/bin/env node

/**
 * Restore Production Data to PostgreSQL
 *
 * This script restores the upsell blocks from the September 16 backup.
 * Run this from the DigitalOcean Console.
 *
 * Usage: node scripts/restore-production-data.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const upsellData = [
  {
    id: "cmfjgdkgn0001o8mecdk6b989",
    shop: "cracktab-apps.myshopify.com",
    name: "Checkout Upsell - 9/14/2025",
    placement: "checkout",
    productHandles: null,
    collectionHandle: "upsell",
    title: "Recommended for you",
    showCount: 10,
    autoSlide: false,
    slideDuration: 5,
    active: true,
    layout: "stack",
    columns: 1,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    buttonColor: "#1a73e8",
    buttonText: "Add",
    borderRadius: 8,
    padding: 16,
    centerPadding: true,
    properties: "",
    createdAt: new Date(1757839709399),
    updatedAt: new Date(1757839709399)
  },
  {
    id: "cmfjrtpvj0000o0nx5sphh7d4",
    shop: "the-conscious-bar.myshopify.com",
    name: "Checkout Upsell - 9/14/2025",
    placement: "checkout",
    productHandles: null,
    collectionHandle: "upsell-checkout",
    title: "Recommended for you",
    showCount: 10,
    autoSlide: false,
    slideDuration: 5,
    active: true,
    layout: "stack",
    columns: 1,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    buttonColor: "#1a73e8",
    buttonText: "Add",
    borderRadius: 8,
    padding: 16,
    centerPadding: true,
    properties: JSON.stringify({_type: "checkout_upsell"}),
    createdAt: new Date(1757858938687),
    updatedAt: new Date(1757858938687)
  }
];

async function restoreData() {
  console.log('🔄 Starting data restoration...\n');

  try {
    // Check current data
    const existingCount = await prisma.upsellBlock.count();
    console.log(`📊 Current upsell blocks in database: ${existingCount}\n`);

    if (existingCount > 0) {
      console.log('⚠️  Database already has data. This will create duplicates if the same IDs exist.');
      console.log('   Consider running: await prisma.upsellBlock.deleteMany({}) first\n');
    }

    // Restore each upsell block
    console.log(`📦 Restoring ${upsellData.length} upsell blocks...\n`);

    for (const upsell of upsellData) {
      try {
        const restored = await prisma.upsellBlock.upsert({
          where: { id: upsell.id },
          create: upsell,
          update: upsell
        });
        console.log(`✅ Restored: ${restored.shop} - ${restored.name}`);
      } catch (error) {
        console.error(`❌ Failed to restore ${upsell.shop}:`, error.message);
      }
    }

    // Verify
    const finalCount = await prisma.upsellBlock.count();
    console.log(`\n✅ Restoration complete!`);
    console.log(`📊 Total upsell blocks now: ${finalCount}`);

    // Show all upsells
    const allUpsells = await prisma.upsellBlock.findMany({
      select: {
        shop: true,
        name: true,
        active: true,
        placement: true
      }
    });

    console.log('\n📋 Current upsells in database:');
    allUpsells.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.shop} - ${u.name} (${u.active ? 'active' : 'inactive'})`);
    });

  } catch (error) {
    console.error('\n❌ Restoration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreData()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
