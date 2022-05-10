import { Link } from "@remix-run/react";

export default function NoteIndexPage() {
  return (
    <p>
      No item selected. Select item on the left, or{" "}
      <Link to="new" className="text-blue-500 underline">
        create a new item.
      </Link>
    </p>
  );
}
