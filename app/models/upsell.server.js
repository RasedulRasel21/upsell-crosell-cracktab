import prisma from "../db.server";

export async function getUpsellBlocks(shop) {
  try {
    return await prisma.upsellBlock.findMany({
      where: {
        shop
        // Fetch ALL upsell types (product_page, cart_page, cart_drawer, checkout)
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function createUpsellBlock(data) {
  try {
    const result = await prisma.upsellBlock.create({ data });
    return result;
  } catch (error) {
    throw error;
  }
}

export async function getActiveUpsellBlock(shop, placement = "checkout") {
  try {
    const blocks = await prisma.upsellBlock.findMany({
      where: {
        shop: shop,
        placement: placement,
        active: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1,
    });

    return blocks.length > 0 ? blocks[0] : null;
  } catch (error) {
    return null;
  }
}

export async function getUpsellBlock(id) {
  try {
    return await prisma.upsellBlock.findUnique({
      where: { id }
    });
  } catch (error) {
    return null;
  }
}

export async function updateUpsellBlock(id, data) {
  try {
    const result = await prisma.upsellBlock.update({
      where: { id },
      data
    });
    return result;
  } catch (error) {
    throw error;
  }
}

export async function deleteUpsellBlock(id) {
  try {
    const result = await prisma.upsellBlock.delete({
      where: { id }
    });
    return result;
  } catch (error) {
    throw error;
  }
}

export async function deleteAllUpsellBlocks(shop) {
  try {
    const result = await prisma.upsellBlock.deleteMany({
      where: { shop }
    });
    return result;
  } catch (error) {
    throw error;
  }
}