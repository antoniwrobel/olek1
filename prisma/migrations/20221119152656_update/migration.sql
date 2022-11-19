-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "parentId" TEXT NOT NULL,
    "taken" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "reservationId" TEXT,
    CONSTRAINT "Item_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ItemParent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("createdAt", "id", "parentId", "reservationId", "taken", "updatedAt") SELECT "createdAt", "id", "parentId", "reservationId", "taken", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
