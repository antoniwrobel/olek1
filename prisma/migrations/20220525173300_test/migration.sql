/*
  Warnings:

  - Added the required column `itemId` to the `FinishedReservation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinishedReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "FinishedReservation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinishedReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FinishedReservation" ("id", "reservationId") SELECT "id", "reservationId" FROM "FinishedReservation";
DROP TABLE "FinishedReservation";
ALTER TABLE "new_FinishedReservation" RENAME TO "FinishedReservation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
