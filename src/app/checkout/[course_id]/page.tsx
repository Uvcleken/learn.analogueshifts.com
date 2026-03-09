import { Suspense } from "react";
import CheckoutPageClient from "./client";

export default function Page({ params }: { params: Promise<{ course_id: string }> }) {
  return (
    <Suspense>
      <CheckoutPageClient params={params} />
    </Suspense>
  );
}
