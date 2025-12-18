-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellBlock" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "productHandles" TEXT,
    "collectionHandle" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Recommended for you',
    "showCount" INTEGER NOT NULL DEFAULT 4,
    "autoSlide" BOOLEAN NOT NULL DEFAULT false,
    "slideDuration" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'slider',
    "columns" INTEGER NOT NULL DEFAULT 4,
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonColor" TEXT NOT NULL DEFAULT '#1a73e8',
    "buttonText" TEXT NOT NULL DEFAULT 'Add',
    "borderRadius" INTEGER NOT NULL DEFAULT 8,
    "padding" INTEGER NOT NULL DEFAULT 16,
    "centerPadding" BOOLEAN NOT NULL DEFAULT true,
    "properties" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellAnalytics" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "upsellBlockId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantTitle" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "placement" TEXT NOT NULL,
    "customerHash" TEXT,
    "sessionId" TEXT,
    "addedToCart" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsellAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpsellAnalytics_shop_idx" ON "UpsellAnalytics"("shop");

-- CreateIndex
CREATE INDEX "UpsellAnalytics_upsellBlockId_idx" ON "UpsellAnalytics"("upsellBlockId");

-- CreateIndex
CREATE INDEX "UpsellAnalytics_createdAt_idx" ON "UpsellAnalytics"("createdAt");

-- CreateIndex
CREATE INDEX "UpsellAnalytics_addedToCart_idx" ON "UpsellAnalytics"("addedToCart");

-- AddForeignKey
ALTER TABLE "UpsellAnalytics" ADD CONSTRAINT "UpsellAnalytics_upsellBlockId_fkey" FOREIGN KEY ("upsellBlockId") REFERENCES "UpsellBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
