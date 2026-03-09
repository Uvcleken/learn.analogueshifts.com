import { Suspense } from "react";
import DashboardPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <DashboardPageClient />
    </Suspense>
  );
}
