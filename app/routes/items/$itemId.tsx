import { Item, ItemParent } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import {
  getItemParent,
  getItemsList,
  deleteItem,
  restoreItem,
} from "~/models/item.server";

type LoaderData = {
  itemParent: ItemParent;
  items: Item[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.itemId, "itemId not found");

  const itemParent = await getItemParent({
    id: params.itemId,
  });

  const { allItems } = await getItemsList();

  if (!itemParent) {
    throw new Response("Not Found", { status: 404 });
  }

  const filteredItems = allItems.filter(
    ({ parentId, isDeleted }) => parentId === itemParent.id
  );

  return json<LoaderData>({ itemParent, items: filteredItems });
};

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.itemId, "itemId not found");
  const formData = await request.formData();

  const blockItemId = formData.get("block") as string;
  const unBlockItemId = formData.get("unblock") as string;

  if (blockItemId) {
    await deleteItem({ id: blockItemId, parentId: params.itemId });
  }

  if (unBlockItemId) {
    await restoreItem({ id: unBlockItemId, parentId: params.itemId });
  }

  return redirect(`/items/${params.itemId}`);
};

export default function NoteDetailsPage() {
  const data = useLoaderData() as LoaderData;

  return (
    <div>
      <h3 className="text-2xl font-bold">{data.itemParent.name}</h3>
      <p className="py-6">details: {data.itemParent.desc}</p>
      <p className="py-6">na stanie: {data.itemParent.quantity}</p>
      <hr className="my-4" />

      {data.items.map((item) => {
        return (
          <div key={item.id} className="flex">
            <p className="mr-4 py-4" style={{ minWidth: 340 }}>
              {item.id}
            </p>
            {!item.isDeleted ? (
              <Form method="post">
                <button
                  type="submit"
                  className="rounded bg-red-500  py-2 px-2 text-white hover:bg-red-600 focus:bg-red-400"
                >
                  <input type="hidden" name="block" value={item.id} />
                  Zablokuj
                </button>
              </Form>
            ) : (
              <Form method="post">
                <button
                  type="submit"
                  className="rounded bg-green-500  py-2 px-2 text-white hover:bg-green-600 focus:bg-green-400"
                >
                  <input type="hidden" name="unblock" value={item.id} />
                  Odblokuj
                </button>
              </Form>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return <div>An unexpected error occurred: {error.message}</div>;
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div>Note not found</div>;
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
