import { Link } from "@remix-run/react";

export default function NoteIndexPage() {
  return (
    <p>
      No reservation selected. Select a reservation on the left, or{" "}
      <Link to="new" className="text-blue-500 underline">
        create a new reservation.
      </Link>
    </p>
  );
}
