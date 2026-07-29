import { Suspense } from "react";
import JoinPage from "./JoinClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-lg">Loading join…</main>}>
      <JoinPage />
    </Suspense>
  );
}
