import { Suspense } from "react";
import AdminCourseReviewPageClient from "./client";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <AdminCourseReviewPageClient params={params} />
    </Suspense>
  );
}
