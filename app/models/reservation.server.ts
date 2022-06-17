import type {
  User,
  Item,
  Reservation,
  FinishedReservation,
} from "@prisma/client";

import { prisma } from "~/db.server";
import { checkIfIsAdmin } from "./user.server";

export type { Item, Reservation } from "@prisma/client";

//@ts-ignore
export const findOcc = (arr, key) => {
  //@ts-ignore
  let arr2 = [];

  //@ts-ignore
  arr.forEach((x) => {
    if (
      //@ts-ignore
      arr2.some((val) => {
        return val[key] == x[key];
      })
    ) {
      //@ts-ignore
      arr2.forEach((k) => {
        if (k[key] === x[key]) {
          k["qty"]++;
        }
      });
    } else {
      let a = {};
      //@ts-ignore
      a[key] = x[key];
      //@ts-ignore
      a["qty"] = 1;
      arr2.push(a);
    }
  });

  //@ts-ignore
  return arr2;
};

export async function getReservation({
  id,
  userId,
}: Pick<Reservation, "id"> & {
  userId: User["id"];
}) {
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId },
  });

  return reservation;
}

export async function confirmReservation({
  id,
  userId,
}: Pick<Reservation, "id"> & {
  userId: User["id"];
}) {
  if (!checkIfIsAdmin(userId)) return;

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      confirmed: true,
    },
  });

  return reservation;
}

export async function getAdminReservation({ id }: Pick<Reservation, "id">) {
  const reservation = await prisma.reservation.findFirst({
    where: { id },
  });

  return reservation;
}

export async function getItemDetails({ id }: { id: Reservation["id"] }) {
  const itemsBorrowed = await prisma.finishedReservation.findMany({
    where: {
      reservationId: id,
    },
    select: {
      item: true,
      itemId: true,
    },
  });

  const itemsReserved = await prisma.item.findMany({
    where: {
      reservationId: id,
    },
    select: {
      id: true,
      parent: true,
    },
  });

  const detailsBorrowedPromise = itemsBorrowed.map(async ({ item }) => {
    const dbObj = await prisma.itemParent.findFirst({
      where: {
        id: item.parentId,
      },
      select: {
        id: true,
        name: true,
        desc: true,
      },
    });
    //@ts-ignore
    dbObj.itemId = item.id;
    return dbObj;
  });

  const detailsReservedPromise = itemsReserved.map(async ({ parent, id }) => {
    const dbObj = await prisma.itemParent.findFirst({
      where: {
        id: parent?.id,
      },
      select: {
        id: true,
        name: true,
        desc: true,
      },
    });
    //@ts-ignore
    dbObj.itemId = id;
    return dbObj;
  });

  const itemsBorrowedDetails = await Promise.all(detailsBorrowedPromise);
  const itemsReservedDetails = await Promise.all(detailsReservedPromise);

  return { itemsReservedDetails, itemsBorrowedDetails };
}

export function getReservationsListItems({ userId }: { userId: User["id"] }) {
  return prisma.reservation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createReservation({
  startDate,
  endDate,
  projectName,
  projectId,
  userId,
  itemIds,
}: Pick<Reservation, "startDate" | "endDate" | "projectName" | "projectId"> & {
  userId: User["id"];
  itemIds: { [key: string]: Item["id"][] };
}) {
  const createdReservation = await prisma.reservation.create({
    data: {
      startDate,
      endDate,
      projectName,
      projectId,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });

  if (!createdReservation) return;

  const itemsToUpdate: string[] = [];

  Object.keys(itemIds).map((key) => itemsToUpdate.push(...itemIds[key]));

  await prisma.item.updateMany({
    where: {
      id: {
        in: itemsToUpdate,
      },
    },
    data: {
      reservationId: createdReservation.id,
      taken: true,
    },
  });

  Object.keys(itemIds).map(async (parentId) => {
    return await prisma.itemParent.update({
      where: {
        id: parentId,
      },
      data: {
        quantity: {
          decrement: itemIds[parentId].length,
        },
      },
    });
  });

  return createdReservation;
}

export async function returnReservation({ id }: Pick<Reservation, "id">) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id,
    },
  });

  if (!reservation) return;

  const allBorrowedItems = await prisma.item.findMany({
    where: {
      reservationId: reservation.id,
    },
  });

  const countedParents = findOcc(allBorrowedItems, "parentId");

  const countedParentsPromise = countedParents.map((parent) =>
    prisma.itemParent.update({
      where: {
        id: parent.parentId,
      },
      data: {
        quantity: {
          increment: parent.qty,
        },
      },
    })
  );

  const createFinishedReservationPromise = allBorrowedItems.map((item) => {
    return prisma.finishedReservation.create({
      data: {
        reservationId: reservation.id,
        itemId: item.id,
      },
    });
  });

  await prisma.item.updateMany({
    where: {
      reservationId: reservation.id,
    },
    data: {
      taken: false,
      reservationId: null,
    },
  });

  await Promise.all([
    ...createFinishedReservationPromise,
    ...countedParentsPromise,
  ]);

  return prisma.reservation.update({
    where: { id },
    data: {
      deleted: true,
    },
  });
}

export async function adminRejectReservation({ id }: Pick<Reservation, "id">) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id,
    },
  });

  if (!reservation) return;

  const allBorrowedItems = await prisma.item.findMany({
    where: {
      reservationId: reservation.id,
    },
  });

  const countedParents = findOcc(allBorrowedItems, "parentId");

  const countedParentsPromise = countedParents.map((parent) =>
    prisma.itemParent.update({
      where: {
        id: parent.parentId,
      },
      data: {
        quantity: {
          increment: parent.qty,
        },
      },
    })
  );

  const createFinishedReservationPromise = allBorrowedItems.map((item) => {
    return prisma.finishedReservation.create({
      data: {
        reservationId: reservation.id,
        itemId: item.id,
      },
    });
  });

  await prisma.item.updateMany({
    where: {
      reservationId: reservation.id,
    },
    data: {
      taken: false,
      reservationId: null,
    },
  });

  await Promise.all([
    ...createFinishedReservationPromise,
    ...countedParentsPromise,
  ]);

  return prisma.reservation.update({
    where: { id },
    data: {
      deletedByAdmin: true,
    },
  });
}

export async function deleteReservation({
  id,
  userId,
}: Pick<Reservation, "id"> & {
  userId: User["id"];
}) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!reservation) return;

  ///
  const allBorrowedItems = await prisma.item.findMany({
    where: {
      reservationId: reservation.id,
    },
  });

  const countedParents = findOcc(allBorrowedItems, "parentId");

  const countedParentsPromise = countedParents.map((parent) =>
    prisma.itemParent.update({
      where: {
        id: parent.parentId,
      },
      data: {
        quantity: {
          increment: parent.qty,
        },
      },
    })
  );

  const createFinishedReservationPromise = allBorrowedItems.map((item) => {
    return prisma.finishedReservation.create({
      data: {
        reservationId: reservation.id,
        itemId: item.id,
      },
    });
  });

  await prisma.item.updateMany({
    where: {
      reservationId: reservation.id,
    },
    data: {
      taken: false,
      reservationId: null,
    },
  });

  await Promise.all([
    ...createFinishedReservationPromise,
    ...countedParentsPromise,
  ]);

  return prisma.reservation.update({
    where: { id },
    data: {
      deleted: true,
    },
  });
}

export const getAllReservations = async () => {
  const allReservation = await prisma.reservation.findMany({});

  if (!allReservation.length) return;

  return allReservation;
};
