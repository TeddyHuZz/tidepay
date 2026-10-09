"use client";

import { ErrorView } from "@/components/error-view";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <ErrorView reset={reset} />
    </main>
  );
}
