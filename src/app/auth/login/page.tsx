import { Suspense } from "react";
import LoginPageClient from "./client";

export default function Page() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
