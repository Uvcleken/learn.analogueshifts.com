import { Suspense } from "react";
import InstructorApplyPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <InstructorApplyPageClient />
    </Suspense>
  );
}
