-- CreateTable
CREATE TABLE "UpsellAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "upsellBlockId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantTitle" TEXT,
    "price" REAL NOT NULL,
    "placement" TEXT NOT NULL,
    "customerHash" TEXT,
    "sessionId" TEXT,
    "addedToCart" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UpsellAnalytics_upsellBlockId_fkey" FOREIGN KEY ("upsellBlockId") REFERENCES "UpsellBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UpsellAnalytics_shop_idx" ON "UpsellAnalytics"("shop");

-- CreateIndex
CREATE INDEX "UpsellAnalytics_upsellBlockId_idx" ON "UpsellAnalytics"("upsellBlockId");

-- CreateIndex
CREATE INDEX "UpsellAnalytics_createdAt_idx" ON "UpsellAnalytics"("createdAt");

-- CreateIndex
CREATE INDEX "UpsellAnalytics_addedToCart_idx" ON "UpsellAnalytics"("addedToCart");
