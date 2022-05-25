import type {
  User,
  Item,
  Reservation,
  FinishedReservation,
} from "@prisma/client";

import { prisma } from "~/db.server";
import { checkIfIsAdmin } from "./user.server";

export type { Item, Reservation } from "@prisma/client";

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
  const items = await prisma.item.findMany({
    where: {
      reservationId: id,
    },
    select: {
      parentId: true,
      id: true,
    },
  });

  const itemParentIdsArray: string[] = [];

  items.map(({ parentId }) => {
    return itemParentIdsArray.push(parentId);
  });

  const itemParents = await prisma.itemParent.findMany({
    where: {
      id: {
        in: itemParentIdsArray,
      },
    },
    select: {
      id: true,
      name: true,
      desc: true,
    },
  });

  const itemsBorrowed = await prisma.finishedReservation.findMany({
    where: {
      reservationId: id,
    },
    select: {
      item: true,
      itemId: true,
    },
  });

  const detailsPromise = itemsBorrowed.map(async ({ item }) => {
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

  const itemsBorrowedDetails = await Promise.all(detailsPromise);

  return { itemParents, items, itemsBorrowedDetails };
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
  itemIds: Item["id"][];
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

  await prisma.item.updateMany({
    where: {
      id: {
        in: itemIds,
      },
    },
    data: {
      reservationId: createdReservation.id,
      taken: true,
    },
  });

  await prisma.itemParent.updateMany({
    where: {
      items: {
        some: {
          reservationId: createdReservation.id,
        },
      },
    },
    data: {
      quantity: {
        decrement: 1,
      },
    },
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

  await prisma.itemParent.updateMany({
    where: {
      items: {
        some: {
          reservationId: reservation.id,
        },
      },
    },
    data: {
      quantity: {
        increment: 1,
      },
    },
  });

  const allBorrowedItems = await prisma.item.findMany({
    where: {
      reservationId: reservation.id,
    },
  });

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

  await Promise.all(createFinishedReservationPromise);

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

  await prisma.itemParent.updateMany({
    where: {
      items: {
        some: {
          reservationId: reservation.id,
        },
      },
    },
    data: {
      quantity: {
        increment: 1,
      },
    },
  });

  const borrowedItems = await prisma.item.findMany({
    where: {
      reservationId: reservation.id,
    },
    select: {
      id: true,
    },
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

  const updateFinishedPromise = borrowedItems.map((item) => {
    return prisma.finishedReservation.create({
      data: {
        reservationId: reservation.id,
        itemId: item.id,
      },
    });
  });

  await Promise.all(updateFinishedPromise);

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

  await prisma.itemParent.updateMany({
    where: {
      items: {
        some: {
          reservationId: reservation.id,
        },
      },
    },
    data: {
      quantity: {
        increment: 1,
      },
    },
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
