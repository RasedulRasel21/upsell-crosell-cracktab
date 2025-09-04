import prisma from "../db.server";

export async function getUpsellBlocks(shop) {
  try {
    return await prisma.upsellBlock.findMany({
      where: { 
        shop,
        placement: 'checkout' // Only fetch checkout upsells
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.warn("Could not fetch upsell blocks:", error.message);
    return [];
  }
}

export async function createUpsellBlock(data) {
  try {
    console.log("Creating upsell block with data:", data);
    const result = await prisma.upsellBlock.create({ data });
    console.log("Successfully created upsell block:", result);
    return result;
  } catch (error) {
    console.error("Database error creating upsell block:", error);
    throw error;
  }
}

export async function getActiveUpsellBlock(shop, placement = "checkout") {
  try {
    // Only allow checkout placement
    if (placement !== "checkout") {
      console.log(`Invalid placement requested: ${placement}. Only checkout is supported.`);
      return null;
    }
    
    console.log(`Fetching active upsell blocks for shop: ${shop}, placement: ${placement}`);
    const blocks = await prisma.upsellBlock.findMany({
      where: {
        shop: shop,
        placement: "checkout", // Force checkout placement
        active: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1,
    });
    
    console.log(`Found ${blocks.length} active upsell blocks`);
    if (blocks.length > 0) {
      console.log("Active upsell block:", blocks[0]);
    }
    
    return blocks.length > 0 ? blocks[0] : null;
  } catch (error) {
    console.error("Database error fetching active upsell block:", error);
    return null;
  }
}

export async function getUpsellBlock(id) {
  try {
    return await prisma.upsellBlock.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error("Database error fetching upsell block:", error);
    return null;
  }
}

export async function updateUpsellBlock(id, data) {
  try {
    console.log("Updating upsell block with data:", data);
    const result = await prisma.upsellBlock.update({
      where: { id },
      data
    });
    console.log("Successfully updated upsell block:", result);
    return result;
  } catch (error) {
    console.error("Database error updating upsell block:", error);
    throw error;
  }
}

export async function deleteUpsellBlock(id) {
  try {
    console.log("Deleting upsell block with id:", id);
    const result = await prisma.upsellBlock.delete({
      where: { id }
    });
    console.log("Successfully deleted upsell block:", result);
    return result;
  } catch (error) {
    console.error("Database error deleting upsell block:", error);
    throw error;
  }
}

export async function deleteAllUpsellBlocks(shop) {
  try {
    console.log("Deleting all upsell blocks for shop:", shop);
    const result = await prisma.upsellBlock.deleteMany({
      where: { shop }
    });
    console.log("Successfully deleted all upsell blocks for shop:", shop, "Count:", result.count);
    return result;
  } catch (error) {
    console.error("Database error deleting all upsell blocks for shop:", shop, error);
    throw error;
  }
}