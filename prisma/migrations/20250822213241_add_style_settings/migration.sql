-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UpsellBlock" (
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
    "layout" TEXT NOT NULL DEFAULT 'slider',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonColor" TEXT NOT NULL DEFAULT '#1a73e8',
    "buttonText" TEXT NOT NULL DEFAULT 'Add',
    "borderRadius" INTEGER NOT NULL DEFAULT 8,
    "padding" INTEGER NOT NULL DEFAULT 16,
    "centerPadding" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UpsellBlock" ("active", "autoSlide", "createdAt", "id", "name", "placement", "productHandles", "shop", "showCount", "slideDuration", "title", "updatedAt") SELECT "active", "autoSlide", "createdAt", "id", "name", "placement", "productHandles", "shop", "showCount", "slideDuration", "title", "updatedAt" FROM "UpsellBlock";
DROP TABLE "UpsellBlock";
ALTER TABLE "new_UpsellBlock" RENAME TO "UpsellBlock";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
