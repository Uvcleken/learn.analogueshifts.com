import { Suspense } from "react";
import LearnPageClient from "./client";

export default function Page({ params }: { params: Promise<{ course_id: string }> }) {
  return (
    <Suspense>
      <LearnPageClient params={params} />
    </Suspense>
  );
}
