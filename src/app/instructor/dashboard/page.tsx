import { Suspense } from "react";
import InstructorDashboardPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <InstructorDashboardPageClient />
    </Suspense>
  );
}
