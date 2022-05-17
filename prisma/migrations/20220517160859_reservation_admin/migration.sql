-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("confirmed", "createdAt", "deleted", "endDate", "id", "projectId", "projectName", "startDate", "updatedAt", "userId") SELECT "confirmed", "createdAt", "deleted", "endDate", "id", "projectId", "projectName", "startDate", "updatedAt", "userId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
