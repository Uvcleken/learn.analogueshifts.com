import { Suspense } from "react";
import EditCoursePageClient from "./client";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <EditCoursePageClient params={params} />
    </Suspense>
  );
}
