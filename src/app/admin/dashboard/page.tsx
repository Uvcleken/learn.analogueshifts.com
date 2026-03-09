import { Suspense } from "react";
import AdminDashboardPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <AdminDashboardPageClient />
    </Suspense>
  );
}
