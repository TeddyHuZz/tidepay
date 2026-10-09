import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page or plan you are looking for does not exist, or the link is out of date.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to overview</Link>
      </Button>
    </main>
  );
}
