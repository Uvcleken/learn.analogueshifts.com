import { Suspense } from "react";
import AdminNewCoursePageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <AdminNewCoursePageClient />
    </Suspense>
  );
}
