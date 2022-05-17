import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { useOptionalUser, useUser } from "~/utils";
import { getAllReservations } from "~/models/reservation.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  allReservations: Awaited<ReturnType<typeof getAllReservations>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);

  const allReservations = await getAllReservations();
  return json<LoaderData>({ allReservations });
};

export default function NotesPage() {
  const data = useLoaderData() as LoaderData;
  const user = useOptionalUser();

  const reservationToConfirm = data.allReservations?.filter(
    (reservation) =>
      !reservation.deletedByAdmin &&
      reservation.confirmed === false &&
      !reservation.deleted
  );
  const reservationConfirmed = data.allReservations?.filter(
    (reservation) => reservation.confirmed === true && !reservation.deleted
  );

  const reservationRejected = data.allReservations?.filter(
    (reservation) => reservation.deletedByAdmin === true
  );

  const reservationReturned = data.allReservations?.filter(
    (reservation) =>
      reservation.deleted === true && reservation.confirmed === true
  );

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/">List of reservations</Link>
        </h1>
        <p>{user?.email}</p>
        <Form action="/logout" method="post">
          <button
            type="submit"
            className="rounded bg-slate-600 py-2 px-4 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
          >
            Logout
          </button>
        </Form>
      </header>

      <main className="flex h-full bg-white">
        <div className="h-full w-80 border-r bg-gray-50">
          {!data.allReservations ? (
            <p className="p-4">No items yet</p>
          ) : (
            <>
              <ol>
                do potwierdzenia:
                {reservationToConfirm?.map((reservation) => (
                  <li key={reservation.id}>
                    <NavLink
                      className={({ isActive }) =>
                        `block border-b p-4 text-xl ${
                          isActive ? "bg-white" : ""
                        }`
                      }
                      to={reservation.id}
                    >
                      📝 {reservation.projectName} - {reservation.projectId}
                    </NavLink>
                  </li>
                ))}
              </ol>
              <hr />
              <ol>
                potwierdzone:
                {reservationConfirmed?.map((reservation) => (
                  <li key={reservation.id}>
                    <NavLink
                      className={({ isActive }) =>
                        `block border-b p-4 text-xl ${
                          isActive ? "bg-white" : ""
                        }`
                      }
                      to={reservation.id}
                    >
                      📝 {reservation.projectName} - {reservation.projectId}
                    </NavLink>
                  </li>
                ))}
              </ol>
              <hr />
              <ol>
                odrzucone:
                {reservationRejected?.map((reservation) => (
                  <li key={reservation.id}>
                    <NavLink
                      className={({ isActive }) =>
                        `block border-b p-4 text-xl ${
                          isActive ? "bg-white" : ""
                        }`
                      }
                      to={reservation.id}
                    >
                      📝 {reservation.projectName} - {reservation.projectId}
                    </NavLink>
                  </li>
                ))}
              </ol>
              <hr />
              <ol>
                zwrocone:
                {reservationReturned?.map((reservation) => (
                  <li key={reservation.id}>
                    <NavLink
                      className={({ isActive }) =>
                        `block border-b p-4 text-xl ${
                          isActive ? "bg-white" : ""
                        }`
                      }
                      to={reservation.id}
                    >
                      📝 {reservation.projectName} - {reservation.projectId}
                    </NavLink>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
