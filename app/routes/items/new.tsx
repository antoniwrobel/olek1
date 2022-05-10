import * as React from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
  createItemParent,
  getAvailableItemParents,
} from "~/models/item.server";

type ActionData = {
  errors?: {
    name?: string;
    desc?: string;
    quantity?: string;
  };
};

type LoaderData = {
  availableItemParents: Awaited<ReturnType<typeof getAvailableItemParents>>;
};

type AvailableItemParentsType = {
  availableItemParents: Awaited<
    ReturnType<typeof getAvailableItemParents>
  > | null;
};

export const loader: LoaderFunction = async () => {
  const availableItemParents = await getAvailableItemParents();

  if (!availableItemParents) {
    throw new Response("Not Devices Available", { status: 503 });
  }

  return json<LoaderData>({ availableItemParents });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const name = formData.get("name");
  const desc = formData.get("desc");
  const quantity = formData.get("quantity");

  if (typeof name !== "string" || name.length === 0) {
    return json<ActionData>(
      { errors: { name: "name name is required" } },
      { status: 400 }
    );
  }

  if (typeof desc !== "string" || desc.length === 0) {
    return json<ActionData>(
      { errors: { desc: "desc ID is required" } },
      { status: 400 }
    );
  }

  if (typeof quantity !== "string" || parseInt(quantity) <= 0) {
    return json<ActionData>(
      { errors: { quantity: "quantity is required" } },
      { status: 400 }
    );
  }

  const itemParent = await createItemParent({
    name,
    desc,
    quantity: parseInt(quantity),
  });

  return redirect(`/items/${itemParent.id}`);
};

export default function NewReservationPage() {
  const actionData = useActionData() as ActionData;
  const nameRef = React.useRef<HTMLInputElement>(null);
  const descRef = React.useRef<HTMLInputElement>(null);
  const quantityRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors?.desc) {
      descRef.current?.focus();
    } else if (actionData?.errors?.quantity) {
      quantityRef.current?.focus();
    }
  }, [actionData]);

  // const { availableItemParents } = useLoaderData<AvailableItemParentsType>();

  // if (!availableItemParents?.length) return <div>loading...</div>;

  return (
    <Form
      method="post"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      <div>
        <div>
          <label className="flex w-full flex-col gap-1">
            <span>name: </span>
            <input
              ref={nameRef}
              name="name"
              className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
              aria-invalid={actionData?.errors?.name ? true : undefined}
              aria-errormessage={
                actionData?.errors?.name ? "name-error" : undefined
              }
            />
          </label>
          {actionData?.errors?.name && (
            <div className="pt-1 text-red-700" id="name-error">
              {actionData.errors.name}
            </div>
          )}
        </div>

        <div>
          <label className="flex w-full flex-col gap-1">
            <span>desc: </span>
            <input
              ref={descRef}
              name="desc"
              className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
              aria-invalid={actionData?.errors?.desc ? true : undefined}
              aria-errormessage={
                actionData?.errors?.desc ? "desc-error" : undefined
              }
            />
          </label>
          {actionData?.errors?.desc && (
            <div className="pt-1 text-red-700" id="desc-error">
              {actionData.errors.desc}
            </div>
          )}
        </div>

        <div>
          <label className="flex w-full flex-col gap-1">
            <span>quantity: </span>
            <input
              ref={quantityRef}
              name="quantity"
              className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
              aria-invalid={actionData?.errors?.quantity ? true : undefined}
              aria-errormessage={
                actionData?.errors?.quantity ? "quantity-error" : undefined
              }
            />
          </label>
          {actionData?.errors?.quantity && (
            <div className="pt-1 text-red-700" id="quantity-error">
              {actionData.errors.quantity}
            </div>
          )}
        </div>
      </div>

      <div className="text-right">
        <button
          type="submit"
          className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Save
        </button>
      </div>
    </Form>
  );
}
