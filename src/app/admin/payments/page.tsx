import { Suspense } from "react";
import AdminPaymentsPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <AdminPaymentsPageClient />
    </Suspense>
  );
}
