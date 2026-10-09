"use client";

import { Button } from "@/components/ui/button";

export function ErrorView({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          We could not load this page. Check your connection and try again.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
