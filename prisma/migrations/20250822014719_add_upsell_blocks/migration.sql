-- CreateTable
CREATE TABLE "UpsellBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "productHandles" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Recommended for you',
    "showCount" INTEGER NOT NULL DEFAULT 4,
    "autoSlide" BOOLEAN NOT NULL DEFAULT false,
    "slideDuration" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
