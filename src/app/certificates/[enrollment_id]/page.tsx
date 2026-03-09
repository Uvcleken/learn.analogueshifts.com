import { Suspense } from "react";
import CertificatePageClient from "./client";

export default function Page({ params }: { params: Promise<{ enrollment_id: string }> }) {
  return (
    <Suspense>
      <CertificatePageClient params={params} />
    </Suspense>
  );
}
