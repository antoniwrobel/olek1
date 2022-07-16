import * as React from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import { requireUserId } from "~/session.server";
import { createReservation } from "~/models/reservation.server";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getAvailableItemParents } from "~/models/item.server";
import { useState } from "react";
import DatePicker from "react-datepicker";
import moment from "moment";

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
  const reservedDevices = formData.getAll("reservedDevices") as string[];

  if (typeof startDate !== "string" || startDate.length === 0) {
    return json<ActionData>(
      { errors: { startDate: "stat date field is required" } },
      { status: 400 }
    );
  }

  if (typeof endDate !== "string" || endDate.length === 0) {
    return json<ActionData>(
      { errors: { endDate: "end date field is required" } },
      { status: 400 }
    );
  }

  if (typeof projectName !== "string" || projectName.length === 0) {
    return json<ActionData>(
      { errors: { projectName: "this field is required" } },
      { status: 400 }
    );
  }

  if (typeof projectId !== "string" || projectId.length === 0) {
    return json<ActionData>(
      { errors: { projectId: "this field is required" } },
      { status: 400 }
    );
  }

  if (
    typeof reservedDevices !== "object" ||
    !reservedDevices.some((e) => e.trim())
  ) {
    return json<ActionData>(
      { errors: { reservedDevices: "this field is required" } },
      { status: 400 }
    );
  }

  const parentItems = {};
  const filteredReservedDevices = reservedDevices.filter((reservedDevice) =>
    Boolean(reservedDevice)
  );

  filteredReservedDevices.map((device) => {
    const [ids, name] = device.split("===");
    const idsArray = ids.split("_");
    //@ts-ignore
    parentItems[name] = idsArray;
  });

  const formattedStartDate = new Date(startDate);
  const formattedEndDate = new Date(endDate);

  const reservation = await createReservation({
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    projectName,
    projectId,
    userId,
    itemIds: parentItems,
  });

  if (!reservation) return null;

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

  if (!availableItemParents?.length)
    return <div>brak sprzetu w magazynie...</div>;

  const tomorrow = moment().add(1, "day").toDate();

  const [startDate, setStartDate] = useState<Date | null>();
  const [endDate, setEndDate] = useState<Date | null>();

  const onChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;

    setStartDate(start);
    setEndDate(end);
  };

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
          {availableItemParents.map((parentItem) => {
            const { id, name, items, quantity } = parentItem;
            const allAvailableItems = items.filter((e) => !e.taken);

            if (!quantity) return;

            return (
              <div key={id}>
                <select name="reservedDevices" id="reservedDevices">
                  <option value={""}>0</option>
                  {allAvailableItems.map((item, idx) => {
                    const itemsIds =
                      allAvailableItems
                        .slice(0, idx + 1)
                        .map((item) => item.id)
                        .join("_") +
                      "===" +
                      id;

                    return (
                      <option key={item.id} value={itemsIds}>
                        {idx + 1}
                      </option>
                    );
                  })}
                </select>

                <label htmlFor="reservedDevices">
                  {name} - zostało {quantity}
                </label>
              </div>
            );
          })}
          {actionData?.errors?.reservedDevices && (
            <div className="pt-1 text-red-700" id="reservedDevices-error">
              {actionData.errors.reservedDevices}
            </div>
          )}
        </div>

        <div style={{ marginTop: "30px" }}>
          <DatePicker
            selected={startDate}
            onChange={onChange}
            startDate={startDate}
            endDate={endDate}
            minDate={tomorrow}
            selectsRange
            inline
            calendarStartDay={1}
          />
          <input type="hidden" name="startDate" value={startDate?.toString()} />
          <input type="hidden" name="endDate" value={endDate?.toString()} />
        </div>

        {/* <label
          style={{ marginTop: "50px" }}
          className="flex w-full flex-col gap-1"
        >
          <span>Od kiedy: </span>
          <input
            ref={startDateRef}
            name="startDate"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            aria-invalid={actionData?.errors?.startDate ? true : undefined}
            aria-errormessage={
              actionData?.errors?.startDate ? "startDate-error" : undefined
            }
          />
        </label> */}
        {actionData?.errors?.startDate && (
          <div className="pt-1 text-red-700" id="startDate-error">
            {actionData.errors.startDate}
          </div>
        )}
        {actionData?.errors?.endDate && (
          <div className="pt-1 text-red-700" id="endDate-error">
            {actionData.errors.endDate}
          </div>
        )}
      </div>

      {/* <div>
        <label className="flex w-full flex-col gap-1">
          <span>Do kiedy: </span>
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
      </div> */}

      <div>
        <label className="flex w-full flex-col gap-1">
          <span>Nazwa projektu: </span>
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
          <span>ID projektu: </span>
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
