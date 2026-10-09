import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="28" height="28" rx="6" fill="var(--primary)" />
      <path
        d="M5 15c3 0 3-4 6-4s3 4 6 4 3-4 6-4M5 20c3 0 3-4 6-4s3 4 6 4 3-4 6-4"
        stroke="var(--primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">TidePay</span>
    </span>
  );
}
