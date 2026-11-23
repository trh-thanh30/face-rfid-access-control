import { Suspense } from "react";
import { AccessEventsView } from "@/src/views/access-events/access-events.view";
export default function AccessEventsPage() {
  return (
    <Suspense fallback={null}>
      <AccessEventsView />
    </Suspense>
  );
}
