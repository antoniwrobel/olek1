import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import {
  getReservation,
  Reservation,
  getItemDetails,
  deleteReservation,
} from "~/models/reservation.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  reservation: Reservation;
  itemsParentDetails: { desc: string; name: string; id: string }[];
  itemsBorrowedDetails: ({ id: string; name: string; desc: string } | null)[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);

  invariant(params.reservationId, "reservationId not found");

  const reservation = await getReservation({
    userId,
    id: params.reservationId,
  });

  if (!reservation) {
    throw new Response("Not Found", { status: 404 });
  }

  const { itemsBorrowedDetails, itemParents } = await getItemDetails({
    id: reservation.id,
  });

  return json<LoaderData>({
    reservation,
    itemsParentDetails: itemParents,
    itemsBorrowedDetails,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.reservationId, "reservationId not found");

  await deleteReservation({ id: params.reservationId, userId });

  return redirect("/reservations");
};

export default function NoteDetailsPage() {
  const data = useLoaderData() as LoaderData;
  const isReservationReturned =
    data.reservation.confirmed && data.reservation.deleted;

  const formattedData = data.itemsBorrowedDetails.length
    ? data.itemsBorrowedDetails
    : data.itemsParentDetails.length
    ? data.itemsParentDetails
    : [];

  return (
    <div>
      <>
        {!isReservationReturned ? (
          <div className="flex text-base font-medium">
            <h3 className="text-2xl font-bold">Is ready: </h3>
            <h3 className="ml-2 text-2xl">
              {data.reservation.deletedByAdmin
                ? "This reservation has been rejected by admin"
                : data.reservation.confirmed
                ? "YES"
                : "NO"}
            </h3>
          </div>
        ) : null}

        <h3 className="text-2xl font-bold">
          Project Name: {data.reservation.projectName}
        </h3>
        <p className="py-2 pb-12">Project ID: {data.reservation.projectId}</p>
        <h2 className="pb-12 text-2xl font-bold">Items borrowed:</h2>

        {formattedData.map((itemParentDetails) => {
          if (!itemParentDetails) return;

          return (
            <p key={itemParentDetails.id}>
              {itemParentDetails.name} - {itemParentDetails.desc}
            </p>
          );
        })}

        {!data.reservation.deletedByAdmin && !data.reservation.confirmed && (
          <>
            <hr className="my-4" />
            <Form method="post">
              <button
                type="submit"
                className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
              >
                Delete
              </button>
            </Form>
          </>
        )}
      </>
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
