"use client";

import { ErrorView } from "@/components/error-view";

// Keeps the sidebar and top bar mounted when a console page fails.
export default function ConsoleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} />;
}
