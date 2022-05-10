import { ItemParent } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { getItemParent, deleteItemParent } from "~/models/item.server";

type LoaderData = {
  itemParent: ItemParent;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.itemId, "itemId not found");

  const itemParent = await getItemParent({
    id: params.itemId,
  });

  if (!itemParent) {
    throw new Response("Not Found", { status: 404 });
  }
  return json<LoaderData>({ itemParent });
};

export const action: ActionFunction = async ({ params }) => {
  invariant(params.itemId, "itemId not found");

  await deleteItemParent({ id: params.itemId });

  return redirect("/items");
};

export default function NoteDetailsPage() {
  const data = useLoaderData() as LoaderData;

  return (
    <div>
      <h3 className="text-2xl font-bold">
        ItemParentName: {data.itemParent.name}
      </h3>
      <p className="py-6">details: {data.itemParent.desc}</p>
      <p className="py-6">na stanie: {data.itemParent.quantity}</p>
      <hr className="my-4" />
      <Form method="post">
        <button
          type="submit"
          className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Delete
        </button>
      </Form>
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
