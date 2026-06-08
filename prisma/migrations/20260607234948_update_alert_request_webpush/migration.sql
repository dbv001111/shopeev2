/*
  Warnings:

  - You are about to drop the column `telegram_chat_id` on the `AlertRequest` table. All the data in the column will be lost.
  - Added the required column `subscription_json` to the `AlertRequest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AlertRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "subscription_json" TEXT NOT NULL,
    "target_price" REAL NOT NULL,
    "is_triggered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertRequest_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AlertRequest" ("created_at", "id", "is_triggered", "product_id", "target_price") SELECT "created_at", "id", "is_triggered", "product_id", "target_price" FROM "AlertRequest";
DROP TABLE "AlertRequest";
ALTER TABLE "new_AlertRequest" RENAME TO "AlertRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
