import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        neutral: "bg-neutral-soft text-neutral-soft-foreground",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
