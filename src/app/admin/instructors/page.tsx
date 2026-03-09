import { Suspense } from "react";
import AdminInstructorsPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <AdminInstructorsPageClient />
    </Suspense>
  );
}
