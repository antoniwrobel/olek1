import * as React from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import { requireUserId } from "~/session.server";
import { createReservation } from "~/models/reservation.server";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getAvailableItemParents } from "~/models/item.server";
import invariant from "tiny-invariant";

type ActionData = {
  errors?: {
    title?: string;
    body?: string;
    startDate?: string;
    endDate?: string;
    projectName?: string;
    projectId?: string;
    reservedDevices?: string;
    availableDevices?: string;
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
  const userId = await requireUserId(request);

  const formData = await request.formData();

  const startDate = formData.get("startDate");
  const endDate = formData.get("endDate");
  const projectName = formData.get("projectName");
  const projectId = formData.get("projectId");
  const reservedDevices = formData.getAll("reservedDevices");

  if (typeof projectName !== "string" || projectName.length === 0) {
    return json<ActionData>(
      { errors: { projectName: "Project name is required" } },
      { status: 400 }
    );
  }

  if (typeof projectId !== "string" || projectId.length === 0) {
    return json<ActionData>(
      { errors: { projectId: "Project ID is required" } },
      { status: 400 }
    );
  }

  if (typeof projectId !== "string" || projectId.length === 0) {
    return json<ActionData>(
      { errors: { projectId: "Project ID is required" } },
      { status: 400 }
    );
  }

  if (typeof startDate !== "string" || startDate.length === 0) {
    return json<ActionData>(
      { errors: { startDate: "StartDate is required" } },
      { status: 400 }
    );
  }

  if (typeof endDate !== "string" || endDate.length === 0) {
    return json<ActionData>(
      { errors: { endDate: "EndDate is required" } },
      { status: 400 }
    );
  }

  if (typeof reservedDevices !== "object" || reservedDevices.length === 0) {
    return json<ActionData>(
      { errors: { reservedDevices: "ReservedDevices are required" } },
      { status: 400 }
    );
  }

  const formattedStartDate = new Date(startDate);
  const formattedEndDate = new Date(endDate);
  const itemIds = [...reservedDevices] as string[];

  const reservation = await createReservation({
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    projectName,
    projectId,
    userId,
    itemIds,
  });

  return redirect(`/reservations/${reservation.id}`);
};

export default function NewReservationPage() {
  const actionData = useActionData() as ActionData;
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);
  const projectNameRef = React.useRef<HTMLInputElement>(null);
  const projectIdRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.projectName) {
      projectNameRef.current?.focus();
    } else if (actionData?.errors?.projectId) {
      projectIdRef.current?.focus();
    } else if (actionData?.errors?.endDate) {
      endDateRef.current?.focus();
    } else if (actionData?.errors?.startDate) {
      startDateRef.current?.focus();
    }
  }, [actionData]);

  const { availableItemParents } = useLoaderData<AvailableItemParentsType>();

  if (!availableItemParents?.length) return <div>loading...</div>;

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
          {availableItemParents.map((item) => {
            const { id, name, items } = item;
            const [{ id: singleID }] = items.filter((e) => !e.taken);

            if (!item.quantity) return;

            return (
              <div key={id}>
                <input
                  id={singleID}
                  value={singleID}
                  type="checkbox"
                  name="reservedDevices"
                />
                <label htmlFor={singleID}>
                  {name} - zostało {item.quantity}
                </label>
              </div>
            );
          })}
        </div>

        <label className="flex w-full flex-col gap-1">
          <span>startDate: </span>
          <input
            ref={startDateRef}
            name="startDate"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            aria-invalid={actionData?.errors?.startDate ? true : undefined}
            aria-errormessage={
              actionData?.errors?.startDate ? "startDate-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.startDate && (
          <div className="pt-1 text-red-700" id="startDate-error">
            {actionData.errors.startDate}
          </div>
        )}
      </div>

      <div>
        <label className="flex w-full flex-col gap-1">
          <span>endDate: </span>
          <input
            ref={endDateRef}
            name="endDate"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            aria-invalid={actionData?.errors?.endDate ? true : undefined}
            aria-errormessage={
              actionData?.errors?.endDate ? "endDate-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.endDate && (
          <div className="pt-1 text-red-700" id="endDate-error">
            {actionData.errors.endDate}
          </div>
        )}
      </div>

      <div>
        <label className="flex w-full flex-col gap-1">
          <span>projectName: </span>
          <input
            ref={projectNameRef}
            name="projectName"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            aria-invalid={actionData?.errors?.projectName ? true : undefined}
            aria-errormessage={
              actionData?.errors?.projectName ? "projectName-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.projectName && (
          <div className="pt-1 text-red-700" id="projectName-error">
            {actionData.errors.projectName}
          </div>
        )}
      </div>

      <div>
        <label className="flex w-full flex-col gap-1">
          <span>projectId: </span>
          <input
            ref={projectIdRef}
            name="projectId"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            aria-invalid={actionData?.errors?.projectId ? true : undefined}
            aria-errormessage={
              actionData?.errors?.endDate ? "projectId-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.projectId && (
          <div className="pt-1 text-red-700" id="projectId-error">
            {actionData.errors.projectId}
          </div>
        )}
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
