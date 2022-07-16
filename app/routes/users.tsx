import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useActionData,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { useOptionalUser, useUser } from "~/utils";

import { requireUserId } from "~/session.server";
import {
  checkIfIsAdmin,
  getAllUsers,
  User,
  createAdmins,
} from "~/models/user.server";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useRef } from "react";

type LoaderData = {
  allUsers: Awaited<ReturnType<typeof getAllUsers>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const isAdmin = await checkIfIsAdmin(userId);

  if (!isAdmin) {
    throw new Response("Not Authorized", { status: 401 });
  }

  const allUsers = await getAllUsers();
  return json<LoaderData>({ allUsers });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);

  if (!checkIfIsAdmin(userId)) return;

  const formData = await request.formData();
  const admins = formData.get("admins") as string;
  const nonAdmins = formData.get("nonAdmins") as string;

  await createAdmins(admins.split(", "), nonAdmins.split(", "));

  return json<{ status: string }>({
    status: "Zaktualizowano",
  });
};

// Make some columns!
const defaultColumns: ColumnDef<User>[] = [
  {
    header: "header",
    columns: [
      // Data Column
      {
        accessorKey: "email",
        cell: (info) => info.getValue(),
        footer: (props) => props.column.id,
      },
      // Data Column
      {
        accessorFn: (row) => row.isAdmin,
        id: "isAdmin",
        cell: (info) => (info.getValue() ? "tak" : "nie"),
        header: () => <span>Is admin</span>,
        footer: (props) => props.column.id,
      },
      {
        id: "actions",
        cell: ({
          cell: {
            row: { original },
          },
        }) => {
          return (
            <input
              type="checkbox"
              defaultChecked={Boolean(original.isAdmin)}
              data-user-id={original.id}
            />
          );
        },
      },
    ],
  },
];

export default function AdminPage() {
  const data = useLoaderData() as LoaderData;
  const user = useOptionalUser();
  const actionData = useActionData();
  const table = useReactTable({
    data: data.allUsers,
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  useEffect(() => {
    if (actionData?.status) {
      alert(actionData.status);
    }
  }, [actionData]);

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/">Home</Link>
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
        <div className="flex-1 p-6">
          <Form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault();
              const adminsInputs = [
                ...document.querySelectorAll("[data-user-id]"),
              ];

              let adminUsers: string[] = [user?.id!];
              let nonAdminUsers: string[] = [];

              adminsInputs.map((input: any) => {
                return input.checked
                  ? adminUsers.push(input.dataset.userId)
                  : nonAdminUsers.push(input.dataset.userId);
              });

              const adminFormatted = adminUsers.join(", ");
              const nonAdminFormatted = nonAdminUsers.join(", ");

              submit(
                { admins: adminFormatted, nonAdmins: nonAdminFormatted },
                { method: "post" }
              );
            }}
          >
            <table>
              <thead>
                {table.getHeaderGroups().map((headerGroup, id) => {
                  if (id === 0) return;
                  return (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  );
                })}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  if (row.original.id === user?.id) return;
                  return (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              type="submit"
              style={{
                marginTop: "20px",
              }}
              className="rounded bg-slate-600 py-2 px-4 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
            >
              Zapisz
            </button>
          </Form>

          <div className="h-4" />

          <Outlet />
        </div>
      </main>
    </div>
  );
}
