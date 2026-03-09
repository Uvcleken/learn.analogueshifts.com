import { Suspense } from "react";
import NewCoursePageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <NewCoursePageClient />
    </Suspense>
  );
}
