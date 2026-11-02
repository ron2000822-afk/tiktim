import { ADMIN_COPY } from "../../../copy";
import { AddEventForm } from "./AddEventForm";

export default function AddEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.addEvent.title}</h1>
      <AddEventForm />
    </div>
  );
}
