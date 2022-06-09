import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import type { FinishedReservation, User } from "@prisma/client";
import invariant from "tiny-invariant";

import {
  Reservation,
  getItemDetails,
  confirmReservation,
  getAdminReservation,
  adminRejectReservation,
  deleteReservation,
  returnReservation,
} from "~/models/reservation.server";
import { getUserById } from "~/models/user.server";
import { requireUserId } from "~/session.server";
import { CLIENT_RENEG_WINDOW } from "tls";

type LoaderData = {
  reservation: Reservation;
  itemsParentDetails: { desc: string; name: string; id: string }[];
  userEmail: User["email"];
  itemsDetails: { id: string; parentId: string }[];
  itemsBorrowedDetails: ({ id: string; name: string; desc: string } | null)[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.reservationId, "reservationId not found");

  const reservation = await getAdminReservation({
    id: params.reservationId,
  });

  if (!reservation) {
    throw new Response("Reservation Not Found", { status: 404 });
  }

  const itemDetails = await getItemDetails({
    id: reservation.id,
  });

  const user = await getUserById(reservation?.userId);

  if (!user) {
    throw new Response("User Not Found", { status: 404 });
  }

  return json<LoaderData>({
    reservation,
    itemsParentDetails: itemDetails.itemParents,
    itemsDetails: itemDetails.items,
    itemsBorrowedDetails: itemDetails.itemsBorrowedDetails,
    userEmail: user.email,
  });
};

type ActionType = "Reject" | "Confirm" | "Return";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.reservationId, "reservationId not found");

  const formData = await request.formData();
  const action = formData.get("action") as ActionType;

  if (action === "Confirm") {
    await confirmReservation({ id: params.reservationId, userId });
  }

  if (action === "Return") {
    await returnReservation({ id: params.reservationId });
  }

  if (action === "Reject") {
    await adminRejectReservation({ id: params.reservationId });
  }

  return redirect("/list-of-reservations");
};

export default function NoteDetailsPage() {
  const data = useLoaderData() as LoaderData;

  const formattedData = data.itemsBorrowedDetails.length
    ? data.itemsBorrowedDetails
    : data.itemsParentDetails.length
    ? data.itemsParentDetails
    : [];

  return (
    <div>
      <h3 className="text-2xl font-bold">User email: {data.userEmail}</h3>
      <h2 className="text-2xl font-bold">
        Project Name: {data.reservation.projectName}
      </h2>
      <p className="py-2 pb-12">Project ID: {data.reservation.projectId}</p>
      <h2 className="pb-12 text-2xl font-bold">Items borrowed:</h2>

      {formattedData.map((itemParentDetails) => {
        if (!itemParentDetails) return;

        const { id, name, desc } = itemParentDetails;

        const itemId = data.itemsDetails.findIndex(
          (itemDetail) => itemDetail.parentId === id
        );

        const itemDetails = data.itemsDetails[itemId];
        const itemQty = {};

        data.itemsParentDetails.map((itemParent) => {
          const { id } = itemParent;
          //@ts-ignore
          itemQty[id] = data.itemsDetails.filter(
            (e) => e.parentId === id
          ).length;
        });
        return (
          <p key={id}>
            {name} - {desc} - {/* @ts-ignore */}
            <small>{itemParentDetails.itemId}</small>
            {/* @ts-ignore */}
            <small>{itemQty[itemDetails.parentId]}</small>
          </p>
        );
      })}

      <hr className="my-4" />
      {data.reservation.confirmed && !data.reservation.deleted ? (
        <Form method="post">
          <button
            type="submit"
            className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            <input type="hidden" name="action" value="Return" />
            Return
          </button>
        </Form>
      ) : data.reservation.deletedByAdmin ||
        (data.reservation.deleted && data.reservation.confirmed) ? null : (
        <div className="flex">
          <Form method="post">
            <button
              type="submit"
              className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
            >
              <input type="hidden" name="action" value="Confirm" />
              Confirm
            </button>
          </Form>
          <Form method="post" className="ml-3">
            <button
              type="submit"
              className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
            >
              <input type="hidden" name="action" value="Reject" />
              Reject
            </button>
          </Form>
        </div>
      )}
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
