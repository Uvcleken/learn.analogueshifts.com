import { Suspense } from "react";
import RegisterPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <RegisterPageClient />
    </Suspense>
  );
}
