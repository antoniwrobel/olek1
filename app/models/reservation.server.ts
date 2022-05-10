import type { User, Item, Reservation, ItemParent } from "@prisma/client";

import { prisma } from "~/db.server";

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

export async function getItemDetails({ id }: { id: Reservation["id"] }) {
  const itemParentIds = await prisma.item.findMany({
    where: {
      reservationId: id,
    },
    select: {
      parentId: true,
    },
  });

  const itemParentIdsArray: string[] = [];

  itemParentIds.map(({ parentId }) => {
    if (!parentId) return;
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

  return itemParents;
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

export async function deleteReservation({
  id,
  userId,
}: Pick<Reservation, "id"> & { userId: User["id"] }) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id,
      userId: userId,
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
    },
  });

  return prisma.reservation.deleteMany({
    where: { id, userId },
  });
}
