import { Suspense } from "react";
import AdminCoursesPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <AdminCoursesPageClient />
    </Suspense>
  );
}
