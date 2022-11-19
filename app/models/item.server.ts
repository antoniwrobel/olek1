import type { Item, ItemParent } from "@prisma/client";

import { prisma } from "~/db.server";

export type { Item, Reservation } from "@prisma/client";

export async function getItemParent({ id }: { id: Item["id"] }) {
  return prisma.itemParent.findFirst({
    where: {
      id,
    },
  });
}

export async function deleteItemParent({ id }: { id: Item["id"] }) {
  return prisma.itemParent.delete({
    where: {
      id,
    },
  });
}

export async function deleteItem({
  id,
  parentId,
}: {
  id: Item["id"];
  parentId: string;
}) {
  await prisma.itemParent.update({
    where: {
      id: parentId,
    },
    data: {
      quantity: {
        decrement: 1,
      },
    },
  });

  return prisma.item.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
  });
}

export async function restoreItem({
  id,
  parentId,
}: {
  id: Item["id"];
  parentId: string;
}) {
  await prisma.itemParent.update({
    where: {
      id: parentId,
    },
    data: {
      quantity: {
        increment: 1,
      },
    },
  });

  return prisma.item.update({
    where: {
      id,
    },
    data: {
      isDeleted: false,
    },
  });
}

export async function getItemsList() {
  const allItemsPromise = prisma.item.findMany({
    where: {
      taken: false,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const allParentsPromise = prisma.itemParent.findMany({});

  const [allItems, allParents] = await Promise.all([
    allItemsPromise,
    allParentsPromise,
  ]);

  return {
    allItems,
    allParents,
  };
}

export function getAvailableItemParents() {
  return prisma.itemParent.findMany({
    where: {
      quantity: {
        gt: 0,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      items: true,
      name: true,
      desc: true,
      quantity: true,
    },
  });
}

export async function createItemParent({
  name,
  desc,
  quantity,
}: Pick<ItemParent, "name" | "desc" | "quantity">) {
  const createdParentItem = await prisma.itemParent.create({
    data: {
      name,
      desc,
      quantity,
    },
  });

  const createdItemsPromise = Array.from({
    length: createdParentItem.quantity,
  }).map(() => {
    return createItem({ parentId: createdParentItem.id });
  });

  await Promise.all(createdItemsPromise);

  return createdParentItem;
}

function createItem({ parentId }: Pick<Item, "parentId">) {
  return prisma.item.create({
    data: {
      parentId: parentId,
    },
  });
}
